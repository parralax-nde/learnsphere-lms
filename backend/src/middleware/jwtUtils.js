const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'learnsphere-jwt-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'learnsphere-refresh-secret-change-in-production';

const generateAccessToken = (payload) =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: '30m' });

const generateRefreshToken = (payload) =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);

const verifyRefreshToken = (token) => jwt.verify(token, JWT_REFRESH_SECRET);

module.exports = { generateAccessToken, generateRefreshToken, verifyAccessToken, verifyRefreshToken };
