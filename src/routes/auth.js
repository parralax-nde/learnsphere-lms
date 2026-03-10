'use strict';

const express = require('express');
const passport = require('passport');
const { signToken, requireAuth } = require('../middleware/auth');
const UserModel = require('../models/User');

const router = express.Router();

/**
 * GET /auth/google
 *
 * Initiates the Google OAuth 2.0 authorisation flow.
 * The user is redirected to Google's consent screen where they grant
 * the application access to their profile and email.
 */
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['openid', 'profile', 'email'],
    session: false,
  })
);

/**
 * GET /auth/google/callback
 *
 * Google redirects the user here after the consent screen.
 * On success a signed JWT is issued and the user is redirected to the
 * frontend application with the token in the query string.
 * On failure the user is redirected to the frontend login page with an
 * error indicator.
 */
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL || ''}/login?error=oauth_failed`,
  }),
  (req, res) => {
    const token = signToken(req.user);
    const frontendUrl = process.env.FRONTEND_URL || '';
    res.redirect(`${frontendUrl}/auth/callback?token=${encodeURIComponent(token)}`);
  }
);

/**
 * GET /auth/me
 *
 * Returns the authenticated user's public profile.
 * Requires a valid Bearer JWT in the Authorization header.
 */
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: UserModel.toPublic(req.user) });
});

/**
 * POST /auth/logout
 *
 * Stateless logout acknowledgement.
 * Since JWTs are stateless the client is responsible for discarding the
 * token.  This endpoint provides a conventional logout hook that can be
 * extended with token revocation (e.g. a blocklist) in the future.
 */
router.post('/logout', requireAuth, (_req, res) => {
  res.json({ message: 'Logged out successfully. Please discard your token.' });
});

module.exports = router;
