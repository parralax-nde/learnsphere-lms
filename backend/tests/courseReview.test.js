import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';

const prisma = new PrismaClient();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function registerAndLogin(data) {
  const res = await request(app).post('/api/auth/register').send(data);
  return res.body.token;
}

async function createInstructor(n = 1) {
  return registerAndLogin({
    email: `instructor${n}@test.com`,
    password: 'Password1!',
    name: `Instructor ${n}`,
    role: 'INSTRUCTOR',
  });
}

async function createAdmin(n = 1) {
  return registerAndLogin({
    email: `admin${n}@test.com`,
    password: 'Password1!',
    name: `Admin ${n}`,
    role: 'ADMIN',
  });
}

// ── Setup/teardown ────────────────────────────────────────────────────────────

beforeEach(async () => {
  // Clean DB before each test (cascade deletes handle sections)
  await prisma.courseSection.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Auth', () => {
  it('registers a new user and returns a token', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'user@test.com',
      password: 'Password1!',
      name: 'Test User',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('STUDENT');
  });

  it('rejects duplicate emails', async () => {
    const data = { email: 'dup@test.com', password: 'Password1!', name: 'Dup' };
    await request(app).post('/api/auth/register').send(data);
    const res = await request(app).post('/api/auth/register').send(data);
    expect(res.status).toBe(409);
  });

  it('logs in with correct credentials', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'login@test.com',
      password: 'Password1!',
      name: 'Login User',
    });
    const res = await request(app).post('/api/auth/login').send({
      email: 'login@test.com',
      password: 'Password1!',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    await request(app).post('/api/auth/register').send({
      email: 'wrongpw@test.com',
      password: 'Password1!',
      name: 'Wrong',
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'wrongpw@test.com', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('returns current user with /me', async () => {
    const token = await createInstructor(99);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('INSTRUCTOR');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Course CRUD tests
// ─────────────────────────────────────────────────────────────────────────────

describe('Course CRUD', () => {
  it('instructor can create a course', async () => {
    const token = await createInstructor();
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Intro to Testing',
        description: 'Learn testing basics',
        sections: [{ title: 'Lesson 1', content: 'Content here' }],
      });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('DRAFT');
    expect(res.body.sections).toHaveLength(1);
  });

  it('student cannot create a course', async () => {
    const token = await registerAndLogin({
      email: 'student@test.com',
      password: 'Password1!',
      name: 'Student',
      role: 'STUDENT',
    });
    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Nope', description: 'Nope' });
    expect(res.status).toBe(403);
  });

  it('instructor can update a DRAFT course', async () => {
    const token = await createInstructor();
    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Old Title', description: 'Desc' });

    const res = await request(app)
      .put(`/api/courses/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('New Title');
  });

  it('instructor can delete a DRAFT course', async () => {
    const token = await createInstructor();
    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'To Delete', description: 'Desc' });

    const res = await request(app)
      .delete(`/api/courses/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  it('instructor cannot view another instructor course', async () => {
    const token1 = await createInstructor(1);
    const token2 = await createInstructor(2);

    const created = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${token1}`)
      .send({ title: 'Private', description: 'Desc' });

    const res = await request(app)
      .get(`/api/courses/${created.body.id}`)
      .set('Authorization', `Bearer ${token2}`);
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Course Review Workflow
// ─────────────────────────────────────────────────────────────────────────────

describe('Course Review & Approval Workflow', () => {
  let instructorToken;
  let adminToken;
  let courseId;

  beforeEach(async () => {
    instructorToken = await createInstructor();
    adminToken = await createAdmin();

    const res = await request(app)
      .post('/api/courses')
      .set('Authorization', `Bearer ${instructorToken}`)
      .send({
        title: 'JavaScript 101',
        description: 'Learn JS from scratch',
        sections: [
          { title: 'Variables', content: 'Let, const, var explained' },
          { title: 'Functions', content: 'Arrow functions and closures' },
        ],
      });
    courseId = res.body.id;
  });

  describe('Submit for review (DRAFT → PENDING_REVIEW)', () => {
    it('instructor can submit a DRAFT course for review', async () => {
      const res = await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING_REVIEW');
      expect(res.body.submittedAt).toBeTruthy();
    });

    it('cannot submit a course with no sections', async () => {
      const emptyCourse = await request(app)
        .post('/api/courses')
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Empty', description: 'No sections' });

      const res = await request(app)
        .post(`/api/courses/${emptyCourse.body.id}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/section/i);
    });

    it('cannot submit a course not owned by the instructor', async () => {
      const token2 = await createInstructor(2);
      const res = await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${token2}`);
      expect(res.status).toBe(403);
    });

    it('admin cannot submit a course for review', async () => {
      // First verify admin can list courses
      const adminListRes = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(adminListRes.status).toBe(200);

      // Admin trying to submit should fail (not their course and wrong role endpoint)
      const res = await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(403);
    });

    it('cannot re-submit an already PENDING_REVIEW course', async () => {
      await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);

      const res = await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(400);
    });

    it('cannot edit a PENDING_REVIEW course', async () => {
      await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);

      const res = await request(app)
        .put(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Changed' });
      expect(res.status).toBe(400);
    });
  });

  describe('Admin approval (PENDING_REVIEW → PUBLISHED)', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);
    });

    it('admin can approve a PENDING_REVIEW course', async () => {
      const res = await request(app)
        .post(`/api/courses/${courseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PUBLISHED');
      expect(res.body.reviewedAt).toBeTruthy();
    });

    it('instructor cannot approve a course', async () => {
      const res = await request(app)
        .post(`/api/courses/${courseId}/approve`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(403);
    });

    it('cannot approve a course not in PENDING_REVIEW status', async () => {
      // Approve first time
      await request(app)
        .post(`/api/courses/${courseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      // Try to approve again
      const res = await request(app)
        .post(`/api/courses/${courseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('approved course cannot be edited by instructor', async () => {
      await request(app)
        .post(`/api/courses/${courseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      const res = await request(app)
        .put(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'Changed' });
      expect(res.status).toBe(400);
    });
  });

  describe('Admin rejection (PENDING_REVIEW → REJECTED)', () => {
    beforeEach(async () => {
      await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);
    });

    it('admin can reject a PENDING_REVIEW course with a note', async () => {
      const res = await request(app)
        .post(`/api/courses/${courseId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Please add more examples and fix grammar issues.' });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('REJECTED');
      expect(res.body.rejectionNote).toBe('Please add more examples and fix grammar issues.');
      expect(res.body.reviewedAt).toBeTruthy();
    });

    it('rejection requires a note', async () => {
      const res = await request(app)
        .post(`/api/courses/${courseId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: '' });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/note/i);
    });

    it('instructor cannot reject a course', async () => {
      const res = await request(app)
        .post(`/api/courses/${courseId}/reject`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ note: 'Rejecting my own course' });
      expect(res.status).toBe(403);
    });

    it('instructor can re-edit a REJECTED course', async () => {
      await request(app)
        .post(`/api/courses/${courseId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Needs work' });

      const res = await request(app)
        .put(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'JavaScript 101 (Revised)' });
      expect(res.status).toBe(200);
      expect(res.body.title).toBe('JavaScript 101 (Revised)');
      expect(res.body.status).toBe('REJECTED'); // status unchanged until re-submit
    });

    it('instructor can re-submit a REJECTED course', async () => {
      await request(app)
        .post(`/api/courses/${courseId}/reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ note: 'Needs work' });

      await request(app)
        .put(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${instructorToken}`)
        .send({ title: 'JS 101 v2' });

      const res = await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING_REVIEW');
      expect(res.body.rejectionNote).toBeNull();
    });
  });

  describe('Admin review queue', () => {
    it('admin can view all pending courses', async () => {
      await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);

      const res = await request(app)
        .get('/api/courses/pending')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].status).toBe('PENDING_REVIEW');
    });

    it('instructor cannot access the pending queue', async () => {
      const res = await request(app)
        .get('/api/courses/pending')
        .set('Authorization', `Bearer ${instructorToken}`);
      expect(res.status).toBe(403);
    });

    it('admin sees all courses when listing', async () => {
      await request(app)
        .post(`/api/courses/${courseId}/submit`)
        .set('Authorization', `Bearer ${instructorToken}`);

      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });
});
