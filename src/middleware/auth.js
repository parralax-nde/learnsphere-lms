'use strict';

const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

/**
 * Sign a short-lived JWT for the given user.
 * @param {{ id: string, email: string, name: string }} user
 * @returns {string} signed JWT
 */
function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

/**
 * Express middleware that validates a Bearer JWT from the Authorization header.
 * Attaches the resolved user to `req.user` on success.
 *
 * On failure it responds with 401 Unauthorized.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header with Bearer token required.' });
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    const message =
      err.name === 'TokenExpiredError' ? 'Token has expired.' : 'Invalid token.';
    return res.status(401).json({ error: message });
  }

  const user = UserModel.findById(payload.sub);
  if (!user) {
    return res.status(401).json({ error: 'User not found.' });
  }

  req.user = user;
  next();
}

module.exports = { signToken, requireAuth };
