const { body, validationResult } = require('express-validator');
const userStore = require('../models/userStore');
const tokenStore = require('../models/tokenStore');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../middleware/jwtUtils');

/**
 * Validation rules for the login request body.
 */
const loginValidationRules = [
  body('email').isEmail().withMessage('A valid email address is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

/**
 * POST /auth/login
 *
 * Authenticates a user with their email and password.
 * Returns a short-lived access token and a long-lived refresh token.
 */
async function login(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ message: 'Validation failed.', errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const user = userStore.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const passwordValid = await userStore.verifyPassword(password, user.passwordHash);
    if (!passwordValid) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const safeUser = userStore.sanitize(user);
    const accessToken = generateAccessToken(safeUser);
    const refreshToken = generateRefreshToken(safeUser);

    return res.status(200).json({
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: safeUser,
    });
  } catch (err) {
    console.error('[auth/login] Unexpected error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
}

/**
 * POST /auth/logout
 *
 * Invalidates the user's current access token and, if provided, their refresh token.
 * The client must also delete the tokens from its local storage.
 *
 * Requires: Authorization: Bearer <accessToken> header.
 * Body (optional): { refreshToken: string }
 */
function logout(req, res) {
  const accessPayload = req.user;

  tokenStore.blacklistToken(accessPayload.jti);

  const { refreshToken } = req.body;
  if (refreshToken) {
    try {
      const refreshPayload = verifyRefreshToken(refreshToken);
      tokenStore.invalidateRefreshToken(refreshPayload.jti);
    } catch (_err) {
      // If the refresh token is already invalid or malformed, ignore silently.
    }
  }

  return res.status(200).json({ message: 'Logout successful. Please clear your tokens.' });
}

/**
 * POST /auth/refresh
 *
 * Issues a new access token using a valid, non-invalidated refresh token.
 * Body: { refreshToken: string }
 */
async function refresh(req, res) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required.' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);

    const user = userStore.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }

    const safeUser = userStore.sanitize(user);
    const accessToken = generateAccessToken(safeUser);

    return res.status(200).json({ accessToken });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Refresh token has expired. Please log in again.' });
    }
    if (err.code === 'TOKEN_REVOKED') {
      return res.status(401).json({ message: 'Refresh token has been invalidated. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid refresh token.' });
  }
}

module.exports = { login, logout, refresh, loginValidationRules };
