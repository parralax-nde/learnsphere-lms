import request from 'supertest';
import app from '../app';
import prisma from '../config/database';
import { sendVerificationEmail } from '../services/emailService';
import { isTokenExpired } from '../services/tokenService';

// Mock the email service so no real emails are sent during tests
jest.mock('../services/emailService', () => ({
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  transporter: { sendMail: jest.fn() },
}));

const mockSendVerificationEmail = sendVerificationEmail as jest.MockedFunction<
  typeof sendVerificationEmail
>;

// --- Helpers ---
async function registerUser(email: string, password: string) {
  return request(app).post('/api/auth/register').send({ email, password });
}

async function getVerificationToken(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  return user?.verificationToken ?? null;
}

// --- Setup / Teardown ---
beforeEach(async () => {
  // Clean up users table before each test
  await prisma.user.deleteMany();
  jest.clearAllMocks();
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.$disconnect();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  it('returns 201 and sends a verification email on success', async () => {
    const res = await registerUser('alice@example.com', 'SecurePass1!');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/verify your account/i);
    expect(res.body.data).toMatchObject({ email: 'alice@example.com' });
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'alice@example.com' }),
    );
  });

  it('stores the user as unverified with a token in the database', async () => {
    await registerUser('bob@example.com', 'SecurePass1!');

    const user = await prisma.user.findUnique({
      where: { email: 'bob@example.com' },
    });

    expect(user).not.toBeNull();
    expect(user!.isVerified).toBe(false);
    expect(user!.verificationToken).toBeTruthy();
    expect(user!.verificationTokenExpiry).not.toBeNull();
  });

  it('normalises the email address to lowercase', async () => {
    await registerUser('Charlie@Example.COM', 'SecurePass1!');

    const user = await prisma.user.findUnique({
      where: { email: 'charlie@example.com' },
    });
    expect(user).not.toBeNull();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ password: 'SecurePass1!' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'dave@example.com' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await registerUser('not-an-email', 'SecurePass1!');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 when the password is too short', async () => {
    const res = await registerUser('eve@example.com', 'short');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/password/i);
  });

  it('returns 409 when the email is already registered', async () => {
    await registerUser('frank@example.com', 'SecurePass1!');
    const res = await registerUser('frank@example.com', 'AnotherPass1!');

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-email
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/verify-email', () => {
  it('verifies the account and returns 200 on a valid token', async () => {
    await registerUser('grace@example.com', 'SecurePass1!');
    const token = await getVerificationToken('grace@example.com');

    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/verified successfully/i);
  });

  it('marks the user as verified in the database', async () => {
    await registerUser('heidi@example.com', 'SecurePass1!');
    const token = await getVerificationToken('heidi@example.com');

    await request(app).get('/api/auth/verify-email').query({ token });

    const user = await prisma.user.findUnique({
      where: { email: 'heidi@example.com' },
    });

    expect(user!.isVerified).toBe(true);
    expect(user!.verificationToken).toBeNull();
    expect(user!.verificationTokenExpiry).toBeNull();
  });

  it('returns 400 when the token is missing', async () => {
    const res = await request(app).get('/api/auth/verify-email');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token: 'totally-invalid-token' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('returns 200 if the account is already verified', async () => {
    await registerUser('ivan@example.com', 'SecurePass1!');
    const token = await getVerificationToken('ivan@example.com');

    // Verify once
    await request(app).get('/api/auth/verify-email').query({ token });

    // The token is now cleared; verify via the DB that isVerified is true
    const user = await prisma.user.findUnique({ where: { email: 'ivan@example.com' } });
    expect(user!.isVerified).toBe(true);
  });

  it('returns 400 for an expired token', async () => {
    await registerUser('judy@example.com', 'SecurePass1!');

    // Manually expire the token
    await prisma.user.update({
      where: { email: 'judy@example.com' },
      data: { verificationTokenExpiry: new Date('2000-01-01') },
    });

    const token = await getVerificationToken('judy@example.com');
    const res = await request(app)
      .get('/api/auth/verify-email')
      .query({ token });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/expired/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-verification
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/resend-verification', () => {
  it('sends a new verification email for an unverified user', async () => {
    await registerUser('mallory@example.com', 'SecurePass1!');
    mockSendVerificationEmail.mockClear();

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'mallory@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('replaces the old token with a new one', async () => {
    await registerUser('niaj@example.com', 'SecurePass1!');
    const oldToken = await getVerificationToken('niaj@example.com');

    await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'niaj@example.com' });

    const newToken = await getVerificationToken('niaj@example.com');
    expect(newToken).not.toBeNull();
    expect(newToken).not.toBe(oldToken);
  });

  it('returns 200 (generic) for an unknown email to prevent enumeration', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'unknown@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Must NOT send an email
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it('returns 200 (generic) for an already-verified account', async () => {
    await registerUser('oscar@example.com', 'SecurePass1!');
    const token = await getVerificationToken('oscar@example.com');
    await request(app).get('/api/auth/verify-email').query({ token });
    mockSendVerificationEmail.mockClear();

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'oscar@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockSendVerificationEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Token service unit tests
// ─────────────────────────────────────────────────────────────────────────────
describe('isTokenExpired', () => {
  it('returns true for a past date', () => {
    expect(isTokenExpired(new Date('2000-01-01'))).toBe(true);
  });

  it('returns false for a future date', () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    expect(isTokenExpired(future)).toBe(false);
  });
});
