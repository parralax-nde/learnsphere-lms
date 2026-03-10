'use strict';

/**
 * Integration tests for authentication routes.
 *
 * We stub passport's Google strategy so that we can exercise the callback
 * route without making real HTTP calls to Google.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Environment must be set before any application module is required
process.env.JWT_SECRET = 'test-secret-routes';
process.env.JWT_EXPIRES_IN = '1h';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';
process.env.FRONTEND_URL = 'http://localhost:5173';

describe('Auth routes', () => {
  let app;
  let UserModel;

  beforeEach(() => {
    jest.resetModules();

    // Stub passport-google-oauth20 so it never hits Google's servers
    jest.mock('passport-google-oauth20', () => {
      const Strategy = jest.fn().mockImplementation((_options, verify) => {
        return { name: 'google', _verify: verify };
      });
      return { Strategy };
    });

    // Stub passport.authenticate for the /google/callback route so we can
    // inject a pre-built user without a real OAuth code exchange.
    jest.mock('passport', () => {
      const original = jest.requireActual('passport');
      const mock = Object.create(original);

      mock.authenticate = jest.fn((strategy, options) => {
        if (strategy === 'google' && options && options.failureRedirect) {
          // This is the callback handler — inject a fake user
          return (req, res, next) => {
            const { UserModel: UM } = require('../../src/models/User');
            // Attach a fake user to simulate a successful Google callback
            req.user = req._fakeUser;
            next();
          };
        }
        // For the initial /google redirect, return a simple redirect stub
        return (_req, res) => res.redirect('https://accounts.google.com/o/oauth2/auth?stub=1');
      });

      return mock;
    });

    // Use fresh modules after mocking
    UserModel = require('../../src/models/User');
    const { createApp } = require('../../src/app');
    app = createApp();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // GET /health
  // ---------------------------------------------------------------------------
  it('GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // ---------------------------------------------------------------------------
  // GET /auth/google  (initial redirect)
  // ---------------------------------------------------------------------------
  it('GET /auth/google redirects to Google consent screen', async () => {
    const res = await request(app).get('/auth/google').redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('accounts.google.com');
  });

  // ---------------------------------------------------------------------------
  // GET /auth/me  (protected)
  // ---------------------------------------------------------------------------
  describe('GET /auth/me', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns the user profile for a valid token', async () => {
      const user = UserModel.createFromGoogle({
        googleId: 'gid-route-me',
        email: 'route@example.com',
        name: 'Route User',
        avatar: 'https://example.com/avatar.jpg',
      });

      const token = jwt.sign(
        { sub: user.id, email: user.email, name: user.name },
        'test-secret-routes',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('route@example.com');
      expect(res.body.user.name).toBe('Route User');
      expect(res.body.user.avatar).toBe('https://example.com/avatar.jpg');
      expect(res.body.user.googleId).toBeUndefined(); // not exposed
    });
  });

  // ---------------------------------------------------------------------------
  // POST /auth/logout
  // ---------------------------------------------------------------------------
  describe('POST /auth/logout', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(app).post('/auth/logout');
      expect(res.status).toBe(401);
    });

    it('acknowledges logout for a valid token', async () => {
      const user = UserModel.createFromGoogle({
        googleId: 'gid-route-logout',
        email: 'logout@example.com',
        name: 'Logout User',
        avatar: null,
      });

      const token = jwt.sign(
        { sub: user.id, email: user.email, name: user.name },
        'test-secret-routes',
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/logged out/i);
    });
  });

  // ---------------------------------------------------------------------------
  // 404
  // ---------------------------------------------------------------------------
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/no-such-route');
    expect(res.status).toBe(404);
  });
});
