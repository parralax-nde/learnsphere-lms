'use strict';

/**
 * Tests for the auth middleware (signToken + requireAuth).
 */

const jwt = require('jsonwebtoken');

// Set up environment before requiring the modules under test
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.GOOGLE_CLIENT_ID = 'test-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/google/callback';

describe('auth middleware', () => {
  let signToken;
  let requireAuth;
  let UserModel;

  beforeEach(() => {
    jest.resetModules();
    ({ signToken, requireAuth } = require('../../src/middleware/auth'));
    UserModel = require('../../src/models/User');
  });

  // ---------------------------------------------------------------------------
  // signToken
  // ---------------------------------------------------------------------------
  describe('signToken', () => {
    it('returns a JWT that contains sub, email and name claims', () => {
      const user = { id: 'user-uuid', email: 'alice@example.com', name: 'Alice' };
      const token = signToken(user);
      const payload = jwt.verify(token, 'test-secret');

      expect(payload.sub).toBe('user-uuid');
      expect(payload.email).toBe('alice@example.com');
      expect(payload.name).toBe('Alice');
    });

    it('generates different tokens for different users', () => {
      const t1 = signToken({ id: 'u1', email: 'a@x.com', name: 'A' });
      const t2 = signToken({ id: 'u2', email: 'b@x.com', name: 'B' });
      expect(t1).not.toBe(t2);
    });
  });

  // ---------------------------------------------------------------------------
  // requireAuth
  // ---------------------------------------------------------------------------
  describe('requireAuth', () => {
    function makeReqRes(authHeader) {
      const req = { headers: {} };
      if (authHeader !== undefined) req.headers['authorization'] = authHeader;

      const res = {
        _status: null,
        _body: null,
        status(code) { this._status = code; return this; },
        json(body)   { this._body  = body; return this; },
      };

      return { req, res };
    }

    it('calls next() and attaches user for a valid token', () => {
      const user = UserModel.createFromGoogle({
        googleId: 'gid-mw',
        email: 'mw@example.com',
        name: 'MW User',
        avatar: null,
      });
      const token = signToken(user);

      const { req, res } = makeReqRes(`Bearer ${token}`);
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toEqual(user);
    });

    it('returns 401 when Authorization header is absent', () => {
      const { req, res } = makeReqRes(undefined);
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
    });

    it('returns 401 when token scheme is not Bearer', () => {
      const { req, res } = makeReqRes('Basic sometoken');
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
    });

    it('returns 401 with "Token has expired" for an expired token', () => {
      const expired = jwt.sign(
        { sub: 'uid', email: 'x@x.com', name: 'X' },
        'test-secret',
        { expiresIn: -1 }
      );

      const { req, res } = makeReqRes(`Bearer ${expired}`);
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
      expect(res._body.error).toMatch(/expired/i);
    });

    it('returns 401 for a tampered token', () => {
      const token = jwt.sign({ sub: 'uid' }, 'wrong-secret');

      const { req, res } = makeReqRes(`Bearer ${token}`);
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
    });

    it('returns 401 when the user referenced by the token no longer exists', () => {
      const token = jwt.sign(
        { sub: 'nonexistent-uuid', email: 'ghost@x.com', name: 'Ghost' },
        'test-secret',
        { expiresIn: '1h' }
      );

      const { req, res } = makeReqRes(`Bearer ${token}`);
      const next = jest.fn();

      requireAuth(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res._status).toBe(401);
    });
  });
});
