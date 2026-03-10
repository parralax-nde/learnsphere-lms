const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('crypto');

const ACCESS_SECRET = process.env.JWT_SECRET || 'learnsphere_jwt_secret';
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'learnsphere_refresh_secret';
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES_IN || '30m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

function generateAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

function generateRefreshToken(userId) {
  const jti = require('crypto').randomUUID();
  const token = jwt.sign({ sub: userId, jti }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES,
  });
  return { token, jti };
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
