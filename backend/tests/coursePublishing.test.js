import request from 'supertest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';
import { signAccessToken } from '../src/middleware/jwtUtils.js';

const prisma = new PrismaClient();

// Migrate the test database before running tests
beforeAll(() => {
  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: 'file:./tests/test.db' },
    stdio: 'pipe',
  });
});

// Clean up between tests
beforeEach(async () => {
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createUser(overrides = {}) {
  const bcrypt = (await import('bcryptjs')).default;
  return prisma.user.create({
    data: {
      email: overrides.email || `user_${Date.now()}@example.com`,
      passwordHash: await bcrypt.hash('Password1!', 4),
      name: overrides.name || 'Test User',
      role: overrides.role || 'STUDENT',
      isEmailVerified: overrides.isEmailVerified !== undefined ? overrides.isEmailVerified : true,
    },
  });
}

function tokenFor(user) {
  return `Bearer ${signAccessToken(user)}`;
}

async function createCourse(instructorId, overrides = {}) {
  return prisma.course.create({
    data: {
      title: overrides.title || 'Test Course',
      description: overrides.description || 'A test course description',
      category: overrides.category || 'Technology',
      status: overrides.status || 'DRAFT',
      instructorId,
      rejectionNote: overrides.rejectionNote || null,
      submittedAt: overrides.submittedAt || null,
      publishedAt: overrides.publishedAt || null,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/courses/:id/publish  (ADMIN only)
// ---------------------------------------------------------------------------

describe('POST /api/courses/:id/publish', () => {
  it('publishes a PENDING_REVIEW course as admin', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/publish`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe('PUBLISHED');
    expect(res.body.course.publishedAt).toBeTruthy();
  });

  it('sets reviewedById to the admin user id', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    await request(app)
      .post(`/api/courses/${course.id}/publish`)
      .set('Authorization', tokenFor(admin));

    const updated = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updated.reviewedById).toBe(admin.id);
  });

  it('returns 409 when trying to publish a DRAFT course', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'DRAFT' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/publish`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(409);
  });

  it('returns 409 when trying to publish an already PUBLISHED course', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PUBLISHED' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/publish`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(409);
  });

  it('returns 403 when an instructor tries to publish', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/publish`)
      .set('Authorization', tokenFor(instructor));

    expect(res.status).toBe(403);
  });

  it('returns 403 when a student tries to publish', async () => {
    const student = await createUser({ role: 'STUDENT' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/publish`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    const res = await request(app).post(`/api/courses/${course.id}/publish`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent course', async () => {
    const admin = await createUser({ role: 'ADMIN' });

    const res = await request(app)
      .post('/api/courses/nonexistent-id/publish')
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// POST /api/courses/:id/unpublish  (ADMIN only)
// ---------------------------------------------------------------------------

describe('POST /api/courses/:id/unpublish', () => {
  it('unpublishes a PUBLISHED course as admin, returning it to DRAFT', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/courses/${course.id}/unpublish`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe('DRAFT');
    expect(res.body.course.publishedAt).toBeNull();
  });

  it('clears publishedAt after unpublishing', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    await request(app)
      .post(`/api/courses/${course.id}/unpublish`)
      .set('Authorization', tokenFor(admin));

    const updated = await prisma.course.findUnique({ where: { id: course.id } });
    expect(updated.publishedAt).toBeNull();
    expect(updated.status).toBe('DRAFT');
  });

  it('returns 409 when trying to unpublish a DRAFT course', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'DRAFT' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/unpublish`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(409);
  });

  it('returns 409 when trying to unpublish a PENDING_REVIEW course', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/unpublish`)
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(409);
  });

  it('returns 403 when an instructor tries to unpublish', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PUBLISHED' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/unpublish`)
      .set('Authorization', tokenFor(instructor));

    expect(res.status).toBe(403);
  });

  it('returns 403 when a student tries to unpublish', async () => {
    const student = await createUser({ role: 'STUDENT' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PUBLISHED' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/unpublish`)
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PUBLISHED' });

    const res = await request(app).post(`/api/courses/${course.id}/unpublish`);
    expect(res.status).toBe(401);
  });

  it('returns 404 for a non-existent course', async () => {
    const admin = await createUser({ role: 'ADMIN' });

    const res = await request(app)
      .post('/api/courses/nonexistent-id/unpublish')
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(404);
  });

  it('allows re-submitting an unpublished course for review', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, {
      status: 'PUBLISHED',
      publishedAt: new Date(),
    });

    // Unpublish
    await request(app)
      .post(`/api/courses/${course.id}/unpublish`)
      .set('Authorization', tokenFor(admin));

    // Re-submit for review
    const submitRes = await request(app)
      .post(`/api/courses/${course.id}/submit`)
      .set('Authorization', tokenFor(instructor));

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.course.status).toBe('PENDING_REVIEW');
  });
});

// ---------------------------------------------------------------------------
// POST /api/courses/:id/submit  (INSTRUCTOR only)
// ---------------------------------------------------------------------------

describe('POST /api/courses/:id/submit', () => {
  it('transitions a DRAFT course to PENDING_REVIEW', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'DRAFT' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/submit`)
      .set('Authorization', tokenFor(instructor));

    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe('PENDING_REVIEW');
    expect(res.body.course.submittedAt).toBeTruthy();
  });

  it('transitions a REJECTED course to PENDING_REVIEW', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, {
      status: 'REJECTED',
      rejectionNote: 'Needs more detail',
    });

    const res = await request(app)
      .post(`/api/courses/${course.id}/submit`)
      .set('Authorization', tokenFor(instructor));

    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe('PENDING_REVIEW');
    expect(res.body.course.rejectionNote).toBeNull();
  });

  it('returns 403 if another instructor tries to submit', async () => {
    const instructor1 = await createUser({ role: 'INSTRUCTOR' });
    const instructor2 = await createUser({ role: 'INSTRUCTOR', email: 'inst2@example.com' });
    const course = await createCourse(instructor1.id, { status: 'DRAFT' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/submit`)
      .set('Authorization', tokenFor(instructor2));

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// POST /api/courses/:id/reject  (ADMIN only)
// ---------------------------------------------------------------------------

describe('POST /api/courses/:id/reject', () => {
  it('rejects a PENDING_REVIEW course with a note', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/reject`)
      .set('Authorization', tokenFor(admin))
      .send({ note: 'Content needs improvement' });

    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe('REJECTED');
    expect(res.body.course.rejectionNote).toBe('Content needs improvement');
  });

  it('returns 403 when an instructor tries to reject', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });
    const course = await createCourse(instructor.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .post(`/api/courses/${course.id}/reject`)
      .set('Authorization', tokenFor(instructor));

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Course visibility access control
// ---------------------------------------------------------------------------

describe('GET /api/courses — visibility', () => {
  it('students see only PUBLISHED courses', async () => {
    const student = await createUser({ role: 'STUDENT' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });

    await createCourse(instructor.id, { status: 'DRAFT', title: 'Draft Course' });
    await createCourse(instructor.id, { status: 'PENDING_REVIEW', title: 'Pending Course' });
    await createCourse(instructor.id, { status: 'PUBLISHED', title: 'Published Course' });

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', tokenFor(student));

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].title).toBe('Published Course');
  });

  it('instructors see only their own courses', async () => {
    const instructor1 = await createUser({ role: 'INSTRUCTOR' });
    const instructor2 = await createUser({ role: 'INSTRUCTOR', email: 'inst2@example.com' });

    await createCourse(instructor1.id, { title: 'Course A' });
    await createCourse(instructor2.id, { title: 'Course B' });

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', tokenFor(instructor1));

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].title).toBe('Course A');
  });

  it('admins see all courses', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor1 = await createUser({ role: 'INSTRUCTOR' });
    const instructor2 = await createUser({ role: 'INSTRUCTOR', email: 'inst2@example.com' });

    await createCourse(instructor1.id, { status: 'DRAFT' });
    await createCourse(instructor2.id, { status: 'PUBLISHED' });
    await createCourse(instructor1.id, { status: 'PENDING_REVIEW' });

    const res = await request(app)
      .get('/api/courses')
      .set('Authorization', tokenFor(admin));

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(3);
  });

  it('unauthenticated users see only PUBLISHED courses', async () => {
    const instructor = await createUser({ role: 'INSTRUCTOR' });

    await createCourse(instructor.id, { status: 'DRAFT' });
    await createCourse(instructor.id, { status: 'PUBLISHED', title: 'Public Course' });

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].title).toBe('Public Course');
  });
});

// ---------------------------------------------------------------------------
// Full publish/unpublish workflow
// ---------------------------------------------------------------------------

describe('Full publish/unpublish workflow', () => {
  it('completes the full DRAFT → PENDING_REVIEW → PUBLISHED → DRAFT cycle', async () => {
    const admin = await createUser({ role: 'ADMIN' });
    const instructor = await createUser({ role: 'INSTRUCTOR' });

    // 1. Create course (DRAFT)
    const createRes = await request(app)
      .post('/api/courses')
      .set('Authorization', tokenFor(instructor))
      .send({ title: 'My Course', description: 'Great content', category: 'Tech' });

    expect(createRes.status).toBe(201);
    const courseId = createRes.body.course.id;
    expect(createRes.body.course.status).toBe('DRAFT');

    // 2. Submit for review (DRAFT → PENDING_REVIEW)
    const submitRes = await request(app)
      .post(`/api/courses/${courseId}/submit`)
      .set('Authorization', tokenFor(instructor));

    expect(submitRes.status).toBe(200);
    expect(submitRes.body.course.status).toBe('PENDING_REVIEW');

    // 3. Publish (PENDING_REVIEW → PUBLISHED)
    const publishRes = await request(app)
      .post(`/api/courses/${courseId}/publish`)
      .set('Authorization', tokenFor(admin));

    expect(publishRes.status).toBe(200);
    expect(publishRes.body.course.status).toBe('PUBLISHED');
    expect(publishRes.body.course.publishedAt).toBeTruthy();

    // 4. Course is now visible to students
    const student = await createUser({ role: 'STUDENT' });
    const listRes = await request(app)
      .get('/api/courses')
      .set('Authorization', tokenFor(student));

    expect(listRes.body.courses).toHaveLength(1);

    // 5. Unpublish (PUBLISHED → DRAFT)
    const unpublishRes = await request(app)
      .post(`/api/courses/${courseId}/unpublish`)
      .set('Authorization', tokenFor(admin));

    expect(unpublishRes.status).toBe(200);
    expect(unpublishRes.body.course.status).toBe('DRAFT');
    expect(unpublishRes.body.course.publishedAt).toBeNull();

    // 6. Course is no longer visible to students
    const listRes2 = await request(app)
      .get('/api/courses')
      .set('Authorization', tokenFor(student));

    expect(listRes2.body.courses).toHaveLength(0);
  });
});
