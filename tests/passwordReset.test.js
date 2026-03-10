'use strict';

// Load test environment variables before anything else
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const app = require('../src/app');
const sequelize = require('../src/config/database');
const User = require('../src/models/User');

// Mock the email service so tests don't need an SMTP server
jest.mock('../src/services/emailService', () => ({
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const { sendPasswordResetEmail } = require('../src/services/emailService');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function createUser(overrides = {}) {
  return User.create({
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}-${Math.random()}@example.com`,
    passwordHash: await bcrypt.hash('OriginalPass1!', 12),
    ...overrides,
  });
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// ---------------------------------------------------------------------------
// Setup / Teardown
// ---------------------------------------------------------------------------
beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterEach(async () => {
  jest.clearAllMocks();
  await User.destroy({ where: {}, truncate: true });
});

afterAll(async () => {
  await sequelize.close();
});

// ===========================================================================
// POST /api/auth/forgot-password
// ===========================================================================
describe('POST /api/auth/forgot-password', () => {
  it('returns 200 and a generic message for a registered email', async () => {
    const user = await createUser();

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password reset link/i);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      user.email,
      expect.stringContaining('/reset-password?token='),
    );
  });

  it('returns 200 and a generic message for an unregistered email (no enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password reset link/i);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });

  it('stores a hashed token and expiry on the user record', async () => {
    const user = await createUser();

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });

    await user.reload();

    expect(user.passwordResetToken).toBeTruthy();
    expect(user.passwordResetToken).toHaveLength(64); // SHA-256 hex
    expect(user.passwordResetTokenExpiry).toBeInstanceOf(Date);
    expect(user.passwordResetTokenExpiry.getTime()).toBeGreaterThan(Date.now());
  });

  it('generates a different token on each call', async () => {
    const user = await createUser();

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });
    await user.reload();
    const firstHash = user.passwordResetToken;

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: user.email });
    await user.reload();
    const secondHash = user.passwordResetToken;

    expect(firstHash).not.toBe(secondHash);
  });

  it('is case-insensitive for email lookup', async () => {
    const user = await createUser({ email: 'Jane@Example.com' });
    // After normalization, the stored email is lowercase
    const normalizedEmail = 'jane@example.com';

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'JANE@EXAMPLE.COM' });

    expect(res.status).toBe(200);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      normalizedEmail,
      expect.any(String),
    );
  });
});

// ===========================================================================
// POST /api/auth/reset-password
// ===========================================================================
describe('POST /api/auth/reset-password', () => {
  async function createUserWithToken(overrides = {}) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = sha256(rawToken);
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const user = await createUser({
      passwordResetToken: hashedToken,
      passwordResetTokenExpiry: expiry,
      ...overrides,
    });

    return { user, rawToken };
  }

  it('resets the password and clears the token when token is valid', async () => {
    const { user, rawToken } = await createUserWithToken();
    const newPassword = 'NewSecurePass99!';

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: newPassword });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/password has been reset/i);

    await user.reload();
    expect(user.passwordResetToken).toBeNull();
    expect(user.passwordResetTokenExpiry).toBeNull();

    // Verify the new password was actually stored correctly
    const matches = await bcrypt.compare(newPassword, user.passwordHash);
    expect(matches).toBe(true);
  });

  it('returns 400 for an unknown token', async () => {
    const fakeToken = crypto.randomBytes(32).toString('hex');

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: fakeToken, password: 'NewPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });

  it('returns 400 for an expired token', async () => {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const expiredExpiry = new Date(Date.now() - 1000); // 1 second in the past

    await createUser({
      passwordResetToken: sha256(rawToken),
      passwordResetTokenExpiry: expiredExpiry,
    });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'NewPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ password: 'NewPass123!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token is required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'sometoken' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password is required/i);
  });

  it('returns 400 when password is too short', async () => {
    const { rawToken } = await createUserWithToken();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/i);
  });

  it('cannot reuse a token after it has been consumed', async () => {
    const { rawToken } = await createUserWithToken();
    const newPassword = 'ValidPass1!';

    // First reset – should succeed
    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: newPassword });

    // Second reset with the same token – should fail
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, password: 'AnotherPass2@' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });
});
