const { Router } = require('express');
const { authenticate } = require('../middleware/authenticate');
const { login, logout, refresh, loginValidationRules } = require('../controllers/authController');

const router = Router();

/**
 * POST /auth/login
 * Authenticates a user and returns JWT access + refresh tokens.
 */
router.post('/login', loginValidationRules, login);

/**
 * POST /auth/logout
 * Invalidates the current access token (and optionally the refresh token).
 * Requires a valid Bearer access token.
 */
router.post('/logout', authenticate, logout);

/**
 * POST /auth/refresh
 * Issues a new access token from a valid refresh token.
 */
router.post('/refresh', refresh);

module.exports = router;
