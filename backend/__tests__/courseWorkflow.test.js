/**
 * Integration tests for Course Draft/Publish Workflow
 *
 * Tests the full lifecycle:
 *   DRAFT → PENDING_REVIEW → PUBLISHED
 *   DRAFT → PENDING_REVIEW → REJECTED → DRAFT → PENDING_REVIEW → PUBLISHED
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const request = require('supertest');
const app = require('../src/server');
const prisma = require('../src/models/prismaClient');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function registerAndLogin(email, password, name, role = 'STUDENT') {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name, role });
  expect(res.status).toBe(201);
  return res.body.accessToken;
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  // Clean up DB before tests
  await prisma.course.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.course.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ─── Auth tests ───────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('registers a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'auth-test@example.com', password: 'Secret1!', name: 'Auth Test' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body.user.role).toBe('STUDENT');
  });

  it('logs in with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@example.com', password: 'Secret1!' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'auth-test@example.com', password: 'wrong' });
    expect(res.status).toBe(401);
  });
});

// ─── Course Workflow tests ─────────────────────────────────────────────────────

describe('Course Draft/Publish Workflow', () => {
  let instructorToken;
  let adminToken;
  let courseId;

  beforeAll(async () => {
    instructorToken = await registerAndLogin(
      'instructor@example.com',
      'Instructor1!',
      'Test Instructor',
      'INSTRUCTOR'
    );
    adminToken = await registerAndLogin(
      'admin@example.com',
      'Admin1!',
      'Test Admin',
      'ADMIN'
    );
  });

  // ── CREATE ──────────────────────────────────────────────────────────────────

  it('instructor can create a course (default DRAFT)', async () => {
    const res = await request(app)
      .post('/api/courses')
      .set(authHeader(instructorToken))
      .send({ title: 'Intro to Testing', description: 'A comprehensive guide to testing.' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.title).toBe('Intro to Testing');
    courseId = res.body.id;
  });

  it('student cannot create a course', async () => {
    const studentToken = await registerAndLogin(
      'student@example.com',
      'Student1!',
      'Test Student',
      'STUDENT'
    );
    const res = await request(app)
      .post('/api/courses')
      .set(authHeader(studentToken))
      .send({ title: 'Student Course', description: 'Should not be allowed.' });
    expect(res.status).toBe(403);
  });

  // ── READ ────────────────────────────────────────────────────────────────────

  it('instructor can see their own DRAFT course', async () => {
    const res = await request(app)
      .get(`/api/courses/${courseId}`)
      .set(authHeader(instructorToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
  });

  it('student cannot see a DRAFT course', async () => {
    const studentToken = await registerAndLogin(
      'student2@example.com',
      'Student1!',
      'Student 2',
      'STUDENT'
    );
    const res = await request(app)
      .get(`/api/courses/${courseId}`)
      .set(authHeader(studentToken));
    expect(res.status).toBe(404);
  });

  // ── UPDATE ──────────────────────────────────────────────────────────────────

  it('instructor can update their DRAFT course', async () => {
    const res = await request(app)
      .put(`/api/courses/${courseId}`)
      .set(authHeader(instructorToken))
      .send({ category: 'Engineering' });
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Engineering');
  });

  // ── SUBMIT FOR REVIEW ────────────────────────────────────────────────────────

  it('instructor can submit DRAFT course for review → PENDING_REVIEW', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/submit`)
      .set(authHeader(instructorToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_REVIEW');
    expect(res.body.submittedAt).not.toBeNull();
  });

  it('instructor cannot edit a PENDING_REVIEW course', async () => {
    const res = await request(app)
      .put(`/api/courses/${courseId}`)
      .set(authHeader(instructorToken))
      .send({ title: 'Modified' });
    expect(res.status).toBe(400);
  });

  it('instructor cannot submit a PENDING_REVIEW course again', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/submit`)
      .set(authHeader(instructorToken));
    expect(res.status).toBe(400);
  });

  // ── ADMIN LIST: should see PENDING_REVIEW ────────────────────────────────────

  it('admin can list all courses including PENDING_REVIEW', async () => {
    const res = await request(app)
      .get('/api/courses')
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    const pending = res.body.filter((c) => c.status === 'PENDING_REVIEW');
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  // ── REJECT ───────────────────────────────────────────────────────────────────

  it('admin can reject a PENDING_REVIEW course → REJECTED', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/reject`)
      .set(authHeader(adminToken))
      .send({ rejectionNote: 'Please improve the description.' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('REJECTED');
    expect(res.body.rejectionNote).toBe('Please improve the description.');
    expect(res.body.reviewedAt).not.toBeNull();
  });

  it('instructor can edit a REJECTED course', async () => {
    const res = await request(app)
      .put(`/api/courses/${courseId}`)
      .set(authHeader(instructorToken))
      .send({ description: 'Updated: A comprehensive and improved guide.' });
    expect(res.status).toBe(200);
    expect(res.body.description).toBe('Updated: A comprehensive and improved guide.');
  });

  it('instructor can re-submit a REJECTED course → PENDING_REVIEW', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/submit`)
      .set(authHeader(instructorToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PENDING_REVIEW');
    expect(res.body.rejectionNote).toBeNull();
  });

  // ── PUBLISH ──────────────────────────────────────────────────────────────────

  it('admin can publish a PENDING_REVIEW course → PUBLISHED', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/publish`)
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
    expect(res.body.publishedAt).not.toBeNull();
  });

  it('student can see a PUBLISHED course', async () => {
    const studentToken = await registerAndLogin(
      'student3@example.com',
      'Student1!',
      'Student 3',
      'STUDENT'
    );
    const res = await request(app)
      .get(`/api/courses/${courseId}`)
      .set(authHeader(studentToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PUBLISHED');
  });

  it('student listing only shows PUBLISHED courses', async () => {
    const studentToken = await registerAndLogin(
      'student4@example.com',
      'Student1!',
      'Student 4',
      'STUDENT'
    );
    const res = await request(app)
      .get('/api/courses')
      .set(authHeader(studentToken));
    expect(res.status).toBe(200);
    expect(res.body.every((c) => c.status === 'PUBLISHED')).toBe(true);
  });

  // ── UNPUBLISH ────────────────────────────────────────────────────────────────

  it('admin can unpublish a PUBLISHED course → DRAFT', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/unpublish`)
      .set(authHeader(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.publishedAt).toBeNull();
  });

  // ── DELETE ──────────────────────────────────────────────────────────────────

  it('instructor can delete their DRAFT course', async () => {
    const del = await request(app)
      .delete(`/api/courses/${courseId}`)
      .set(authHeader(instructorToken));
    expect(del.status).toBe(200);
  });

  it('deleted course returns 404', async () => {
    const res = await request(app)
      .get(`/api/courses/${courseId}`)
      .set(authHeader(instructorToken));
    expect(res.status).toBe(404);
  });
});

// ─── Permission boundary tests ────────────────────────────────────────────────

describe('Permission boundaries', () => {
  let instructorToken;
  let anotherInstructorToken;
  let adminToken;
  let courseId;

  beforeAll(async () => {
    instructorToken = await registerAndLogin(
      'inst-a@example.com',
      'Pass1!',
      'Instructor A',
      'INSTRUCTOR'
    );
    anotherInstructorToken = await registerAndLogin(
      'inst-b@example.com',
      'Pass1!',
      'Instructor B',
      'INSTRUCTOR'
    );
    adminToken = await registerAndLogin(
      'admin2@example.com',
      'Pass1!',
      'Admin 2',
      'ADMIN'
    );

    const res = await request(app)
      .post('/api/courses')
      .set(authHeader(instructorToken))
      .send({ title: 'Private Course', description: 'Belongs to Instructor A' });
    courseId = res.body.id;
  });

  it('another instructor cannot edit the course', async () => {
    const res = await request(app)
      .put(`/api/courses/${courseId}`)
      .set(authHeader(anotherInstructorToken))
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  it('another instructor cannot submit the course', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/submit`)
      .set(authHeader(anotherInstructorToken));
    expect(res.status).toBe(403);
  });

  it('instructor cannot publish a course (admin only)', async () => {
    // First submit
    await request(app)
      .post(`/api/courses/${courseId}/submit`)
      .set(authHeader(instructorToken));

    const res = await request(app)
      .post(`/api/courses/${courseId}/publish`)
      .set(authHeader(instructorToken));
    expect(res.status).toBe(403);
  });

  it('instructor cannot reject a course (admin only)', async () => {
    const res = await request(app)
      .post(`/api/courses/${courseId}/reject`)
      .set(authHeader(instructorToken));
    expect(res.status).toBe(403);
  });

  it('cannot publish a DRAFT course directly', async () => {
    // Create a fresh draft
    const cr = await request(app)
      .post('/api/courses')
      .set(authHeader(instructorToken))
      .send({ title: 'Draft Only', description: 'Not submitted yet' });
    const draftId = cr.body.id;

    const res = await request(app)
      .post(`/api/courses/${draftId}/publish`)
      .set(authHeader(adminToken));
    expect(res.status).toBe(400);
  });
});
