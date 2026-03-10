const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');
const tokenStore = require('../models/tokenStore');

/**
 * Generate a short-lived access token for a user.
 * @param {Object} user
 * @returns {string} Signed JWT access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: uuidv4(),
    },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

/**
 * Generate a long-lived refresh token for a user.
 * @param {Object} user
 * @returns {string} Signed JWT refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      jti: uuidv4(),
    },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

/**
 * Verify an access token and ensure it has not been blacklisted.
 * @param {string} token
 * @returns {Object} Decoded token payload
 * @throws {Error} If the token is invalid or blacklisted
 */
function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.jwt.accessSecret);

  if (tokenStore.isBlacklisted(payload.jti)) {
    const err = new Error('Token has been revoked');
    err.code = 'TOKEN_REVOKED';
    throw err;
  }

  return payload;
}

/**
 * Verify a refresh token and ensure it has not been invalidated.
 * @param {string} token
 * @returns {Object} Decoded token payload
 * @throws {Error} If the token is invalid or invalidated
 */
function verifyRefreshToken(token) {
  const payload = jwt.verify(token, config.jwt.refreshSecret);

  if (tokenStore.isRefreshTokenInvalid(payload.jti)) {
    const err = new Error('Refresh token has been invalidated');
    err.code = 'TOKEN_REVOKED';
    throw err;
  }

  return payload;
}

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
