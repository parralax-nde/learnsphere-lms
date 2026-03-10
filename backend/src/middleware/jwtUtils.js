import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const ACCESS_TOKEN_TTL = '30m';
const REFRESH_TOKEN_TTL = '7d';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set.');
  return secret;
}

/**
 * Sign a short-lived access token containing user identity.
 */
export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    getSecret(),
    { expiresIn: ACCESS_TOKEN_TTL },
  );
}

/**
 * Sign a long-lived refresh token with a unique jti for rotation/revocation.
 * Returns { token, jti, expiresAt }.
 */
export function signRefreshToken(userId) {
  const jti = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
  const token = jwt.sign({ sub: userId, jti }, getSecret(), {
    expiresIn: REFRESH_TOKEN_TTL,
  });
  return { token, jti, expiresAt };
}

/**
 * Verify a JWT and return its decoded payload.
 * Throws if invalid or expired.
 */
export function verifyToken(token) {
  return jwt.verify(token, getSecret());
}
