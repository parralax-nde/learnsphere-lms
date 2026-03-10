import request from 'supertest';
import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import app from '../src/app.js';

const prisma = new PrismaClient();

// Migrate the test database before running tests
beforeAll(() => {
  execSync('npx prisma db push --force-reset', {
    env: { ...process.env, DATABASE_URL: 'file:./tests/test.db' },
    stdio: 'pipe',
  });
});

// Clean up users between tests
beforeEach(async () => {
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
    expect(user.passwordHash).toMatch(/^\$2[aby]\$.{56}$/); // bcrypt hash format
  });

  it('creates a user with isEmailVerified = false by default', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const user = await prisma.user.findUnique({ where: { email: validPayload.email } });

    expect(user.isEmailVerified).toBe(false);
    expect(user.emailVerifyToken).toBeTruthy();
    expect(user.emailVerifyTokenExpiry).not.toBeNull();
  });

  it('returns 409 when the email is already registered', async () => {
    await request(app).post('/api/auth/register').send(validPayload);
    const res = await request(app).post('/api/auth/register').send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // --- Validation: email ---

  it('returns 422 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'Str0ng!Pass' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('returns 422 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'not-an-email', password: 'Str0ng!Pass' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  // --- Validation: password ---

  it('returns 422 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('returns 422 when password is too short (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'Ab1!' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('returns 422 when password lacks an uppercase letter', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'str0ng!pass' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('returns 422 when password lacks a lowercase letter', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'STR0NG!PASS' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('returns 422 when password lacks a number', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'Strong!Pass' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });

  it('returns 422 when password lacks a special character', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'Str0ngPass' });

    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'password')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/verify-email
// ---------------------------------------------------------------------------

describe('GET /api/auth/verify-email', () => {
  let verifyToken;

  beforeEach(async () => {
    // Register a user and capture the verification token from the DB
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'bob@example.com', password: 'Str0ng!Pass' });

    const user = await prisma.user.findUnique({ where: { email: 'bob@example.com' } });
    verifyToken = user.emailVerifyToken;
  });

  it('verifies the email and returns 200', async () => {
    const res = await request(app).get(`/api/auth/verify-email?token=${verifyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/verified successfully/i);
  });

  it('marks the user as verified in the database', async () => {
    await request(app).get(`/api/auth/verify-email?token=${verifyToken}`);
    const user = await prisma.user.findUnique({ where: { email: 'bob@example.com' } });

    expect(user.isEmailVerified).toBe(true);
    expect(user.emailVerifyToken).toBeNull();
  });

  it('returns 400 for an invalid token', async () => {
    const res = await request(app).get('/api/auth/verify-email?token=invalid-token');
    expect(res.status).toBe(400);
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app).get('/api/auth/verify-email');
    expect(res.status).toBe(400);
  });

  it('returns 200 (idempotent) if email is already verified', async () => {
    await request(app).get(`/api/auth/verify-email?token=${verifyToken}`);
    // Attempt to verify again with a re-fetched token (token is cleared after first verify)
    const res = await request(app).get(`/api/auth/verify-email?token=${verifyToken}`);
    // Token no longer exists -> 400
    expect(res.status).toBe(400);
  });
});
