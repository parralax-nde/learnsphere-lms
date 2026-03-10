import request from 'supertest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const TEST_DB = 'file:./tests/test.db';

function dbPush() {
  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: TEST_DB },
    stdio: 'pipe',
  });
}

beforeAll(() => {
  dbPush();
});

beforeEach(async () => {
  await prisma.lesson.deleteMany();
  await prisma.course.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------

describe('POST /api/auth/register', () => {
  const validPayload = {
    email: 'alice@example.com',
    password: 'Str0ng!Pass',
  };

  it('returns 201 and a success message for valid credentials', async () => {
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/registration successful/i);
    expect(res.body.userId).toBeDefined();
  });

  it('stores a hashed password (not plaintext) in the database', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const user = await prisma.user.findUnique({ where: { email: validPayload.email } });

    expect(user).not.toBeNull();
    expect(user.passwordHash).not.toBe(validPayload.password);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$.{56}$/);
  });

  it('creates a user with isEmailVerified = false by default', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const user = await prisma.user.findUnique({ where: { email: validPayload.email } });

    expect(user.isEmailVerified).toBe(false);
    expect(user.emailVerifyToken).toBeTruthy();
    expect(user.emailVerifyTokenExpiry).not.toBeNull();
  });

  it('defaults new user role to STUDENT', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const user = await prisma.user.findUnique({ where: { email: validPayload.email } });
    expect(user.role).toBe('STUDENT');
  });

  it('allows registering as INSTRUCTOR', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...validPayload, role: 'INSTRUCTOR' });
    expect(res.status).toBe(201);
    const user = await prisma.user.findUnique({ where: { email: validPayload.email } });
    expect(user.role).toBe('INSTRUCTOR');
  });

  it('returns 409 when the email is already registered', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send(validPayload);
    expect(res.status).toBe(409);
  });

  it('returns 422 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Str0ng!Pass' });
    expect(res.status).toBe(422);
  });

  it('returns 422 when password lacks a special character', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'Str0ngPass' });
    expect(res.status).toBe(422);
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

describe('POST /api/auth/login', () => {
  const email = 'instructor@example.com';
  const password = 'Str0ng!Pass';

  async function registerAndVerify(userEmail, userPassword, role = 'INSTRUCTOR') {
    await request(app)
      .post('/api/auth/register')
      .send({ email: userEmail, password: userPassword, role });
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyTokenExpiry: null },
    });
    return user;
  }

  it('returns 200 and a JWT token for valid credentials', async () => {
    await registerAndVerify(email, password);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('INSTRUCTOR');
  });

  it('returns 401 for a wrong password', async () => {
    await registerAndVerify(email, password);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPass1!' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for an unknown email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password });
    expect(res.status).toBe(401);
  });

  it('returns 403 when email is not verified', async () => {
    await request(app).post('/api/auth/register').send({ email, password });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Lesson + Course API
// ---------------------------------------------------------------------------

describe('Lesson API', () => {
  let token;
  let courseId;

  const instructorEmail = 'instructor@example.com';
  const instructorPassword = 'Str0ng!Pass';

  async function setupInstructor() {
    await request(app)
      .post('/api/auth/register')
      .send({ email: instructorEmail, password: instructorPassword, role: 'INSTRUCTOR' });
    const user = await prisma.user.findUnique({ where: { email: instructorEmail } });
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyTokenExpiry: null },
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: instructorEmail, password: instructorPassword });
    token = loginRes.body.token;
  }

  async function setupCourse() {
    const res = await request(app)
      .post('/api/lessons/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Introduction to Testing', description: 'Learn testing basics' });
    courseId = res.body.course.id;
  }

  beforeEach(async () => {
    await setupInstructor();
    await setupCourse();
  });

  // --- Auth guard ---

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/lessons/courses');
    expect(res.status).toBe(401);
  });

  // --- Course endpoints ---

  it('lists courses for the instructor', async () => {
    const res = await request(app)
      .get('/api/lessons/courses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].title).toBe('Introduction to Testing');
  });

  it('creates a course', async () => {
    const res = await request(app)
      .post('/api/lessons/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Advanced Testing' });
    expect(res.status).toBe(201);
    expect(res.body.course.title).toBe('Advanced Testing');
  });

  it('returns 422 when course title is missing', async () => {
    const res = await request(app)
      .post('/api/lessons/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No title' });
    expect(res.status).toBe(422);
  });

  // --- Lesson CRUD ---

  it('creates a lesson with sanitized HTML content', async () => {
    const content = '<h1>Hello</h1><script>alert("xss")</script><p>World</p>';
    const res = await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lesson 1', content });

    expect(res.status).toBe(201);
    expect(res.body.lesson.title).toBe('Lesson 1');
    // Script tag must be stripped
    expect(res.body.lesson.content).not.toContain('<script>');
    expect(res.body.lesson.content).toContain('<h1>Hello</h1>');
    expect(res.body.lesson.content).toContain('<p>World</p>');
  });

  it('strips dangerous attributes from lesson content', async () => {
    const content = '<p onclick="evil()">Click me</p><img src="http://example.com/img.png" onerror="evil()">';
    const res = await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lesson 2', content });

    expect(res.status).toBe(201);
    expect(res.body.lesson.content).not.toContain('onclick');
    expect(res.body.lesson.content).not.toContain('onerror');
  });

  it('preserves safe formatting tags in lesson content', async () => {
    const content = '<h2>Title</h2><p><strong>Bold</strong> and <em>italic</em></p><ul><li>Item 1</li></ul><pre><code>const x = 1;</code></pre>';
    const res = await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lesson 3', content });

    expect(res.status).toBe(201);
    expect(res.body.lesson.content).toContain('<h2>');
    expect(res.body.lesson.content).toContain('<strong>');
    expect(res.body.lesson.content).toContain('<em>');
    expect(res.body.lesson.content).toContain('<ul>');
    expect(res.body.lesson.content).toContain('<pre>');
    expect(res.body.lesson.content).toContain('<code>');
  });

  it('lists lessons for a course', async () => {
    await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lesson A', content: '<p>Content A</p>' });

    const res = await request(app)
      .get(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lessons).toHaveLength(1);
    expect(res.body.lessons[0].title).toBe('Lesson A');
    // Content is not returned in list view (only in single-lesson view)
    expect(res.body.lessons[0].content).toBeUndefined();
  });

  it('gets a single lesson with full content', async () => {
    const createRes = await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lesson B', content: '<p>Full content</p>' });
    const lessonId = createRes.body.lesson.id;

    const res = await request(app)
      .get(`/api/lessons/courses/${courseId}/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lesson.content).toContain('<p>Full content</p>');
  });

  it('updates a lesson', async () => {
    const createRes = await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Old Title', content: '<p>Old</p>' });
    const lessonId = createRes.body.lesson.id;

    const res = await request(app)
      .put(`/api/lessons/courses/${courseId}/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title', content: '<p>New content</p>' });

    expect(res.status).toBe(200);
    expect(res.body.lesson.title).toBe('New Title');
    expect(res.body.lesson.content).toContain('New content');
  });

  it('deletes a lesson', async () => {
    const createRes = await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'To Delete', content: '<p>Bye</p>' });
    const lessonId = createRes.body.lesson.id;

    const deleteRes = await request(app)
      .delete(`/api/lessons/courses/${courseId}/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(deleteRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/api/lessons/courses/${courseId}/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 when accessing a lesson from another instructor', async () => {
    // Register second instructor
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'other@example.com', password: 'Str0ng!Pass', role: 'INSTRUCTOR' });
    const otherUser = await prisma.user.findUnique({ where: { email: 'other@example.com' } });
    await prisma.user.update({
      where: { id: otherUser.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyTokenExpiry: null },
    });
    const otherLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'other@example.com', password: 'Str0ng!Pass' });
    const otherToken = otherLogin.body.token;

    // Other instructor should not see first instructor's lessons
    const res = await request(app)
      .get(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(res.status).toBe(404);
  });

  it('returns 403 when a STUDENT tries to create a lesson', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'student@example.com', password: 'Str0ng!Pass', role: 'STUDENT' });
    const student = await prisma.user.findUnique({ where: { email: 'student@example.com' } });
    await prisma.user.update({
      where: { id: student.id },
      data: { isEmailVerified: true, emailVerifyToken: null, emailVerifyTokenExpiry: null },
    });
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'student@example.com', password: 'Str0ng!Pass' });
    const studentToken = studentLogin.body.token;

    const res = await request(app)
      .post(`/api/lessons/courses/${courseId}/lessons`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Unauthorized', content: '<p>Nope</p>' });
    expect(res.status).toBe(403);
  });
});
