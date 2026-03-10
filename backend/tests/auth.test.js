const request = require('supertest');
const app = require('../src/app');
const userStore = require('../src/models/userStore');
const tokenStore = require('../src/models/tokenStore');

const TEST_USER = {
  email: 'alice@example.com',
  password: 'SecureP@ss1',
  firstName: 'Alice',
  lastName: 'Smith',
};

beforeEach(async () => {
  userStore._clearAll();
  tokenStore._clearAll();
  await userStore.create(TEST_USER);
});

afterAll(() => {
  userStore._clearAll();
  tokenStore._clearAll();
});

// ─── Login ────────────────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
  it('returns 200 with tokens on valid credentials', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Login successful.');
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toMatchObject({ email: TEST_USER.email.toLowerCase() });
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when the email does not exist', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: TEST_USER.password });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('returns 401 when the password is incorrect', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('returns 422 when the email format is invalid', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: TEST_USER.password });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 422 when the password is missing', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 422 when both fields are missing', async () => {
    const res = await request(app).post('/auth/login').send({});

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
  });

  it('does not expose the password hash in the response', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
  });

  it('is case-insensitive for the email', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email.toUpperCase(), password: TEST_USER.password });

    expect(res.status).toBe(200);
  });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
  let accessToken;
  let refreshToken;

  beforeEach(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('returns 200 and confirms logout on valid token', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Logout successful. Please clear your tokens.');
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).post('/auth/logout').send({ refreshToken });

    expect(res.status).toBe(401);
  });

  it('blacklists the access token after logout so it cannot be reused', async () => {
    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken });

    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Token has been revoked.');
  });

  it('succeeds even when no refresh token is provided in the body', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(200);
  });

  it('returns 401 when using a malformed access token', async () => {
    const res = await request(app)
      .post('/auth/logout')
      .set('Authorization', 'Bearer totally.invalid.token');

    expect(res.status).toBe(401);
  });
});

// ─── Token Refresh ────────────────────────────────────────────────────────────

describe('POST /auth/refresh', () => {
  let refreshToken;

  beforeEach(async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });
    refreshToken = res.body.refreshToken;
  });

  it('returns a new access token from a valid refresh token', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('returns 400 when no refresh token is provided', async () => {
    const res = await request(app).post('/auth/refresh').send({});

    expect(res.status).toBe(400);
  });

  it('returns 401 when the refresh token is malformed', async () => {
    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'bad.token.value' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalidated refresh token (post-logout)', async () => {
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    const { accessToken: at, refreshToken: rt } = loginRes.body;

    await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${at}`)
      .send({ refreshToken: rt });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: rt });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Refresh token has been invalidated. Please log in again.');
  });
});

// ─── Authenticate Middleware ──────────────────────────────────────────────────

describe('GET /health (unauthenticated route sanity check)', () => {
  it('returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});
