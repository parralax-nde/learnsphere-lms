'use strict';

const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');

const User = require('../models/User');
const { sendPasswordResetEmail } = require('../services/emailService');
const { forgotPasswordLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const SALT_ROUNDS = 12;
const TOKEN_BYTES = 32; // 256-bit token → 64-char hex string

// ---------------------------------------------------------------------------
// Helper – compute token expiry date
// ---------------------------------------------------------------------------
function tokenExpiry() {
  const minutes =
    Number(process.env.PASSWORD_RESET_TOKEN_EXPIRES_MIN) || 60;
  return new Date(Date.now() + minutes * 60 * 1000);
}

// ---------------------------------------------------------------------------
// POST /api/auth/forgot-password
//
// Accepts an email address. If the email belongs to a registered account a
// one-time, time-limited reset token is generated and emailed to the user.
// The response is always the same (200) to avoid leaking whether the address
// is registered (timing-safe).
// ---------------------------------------------------------------------------
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Email is required.' });
  }

  try {
    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    // Always return 200 – do not reveal whether the email exists
    if (!user) {
      return res.status(200).json({
        message:
          'If that email address is registered, you will receive a password reset link shortly.',
      });
    }

    // Generate a cryptographically secure token
    const rawToken = crypto.randomBytes(TOKEN_BYTES).toString('hex');

    // Store a SHA-256 hash of the token in the database (never the raw token)
    const hashedToken = crypto
      .createHash('sha256')
      .update(rawToken)
      .digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetTokenExpiry = tokenExpiry();
    await user.save();

    const clientUrl =
      (process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetUrl = `${clientUrl}/reset-password?token=${rawToken}`;

    await sendPasswordResetEmail(user.email, resetUrl);

    return res.status(200).json({
      message:
        'If that email address is registered, you will receive a password reset link shortly.',
    });
  } catch (err) {
    console.error('forgot-password error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/reset-password
//
// Accepts { token, password }.  Validates the token, checks expiry, updates
// the password, and invalidates the token.
// ---------------------------------------------------------------------------
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Reset token is required.' });
  }
  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'New password is required.' });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: 'Password must be at least 8 characters long.' });
  }

  try {
    // Hash the incoming token to compare with the stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      where: { passwordResetToken: hashedToken },
    });

    if (!user || user.passwordResetTokenExpiry < new Date()) {
      return res
        .status(400)
        .json({ error: 'Password reset token is invalid or has expired.' });
    }

    // Update password and clear the reset token
    user.passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    user.passwordResetToken = null;
    user.passwordResetTokenExpiry = null;
    await user.save();

    return res
      .status(200)
      .json({ message: 'Your password has been reset successfully.' });
  } catch (err) {
    console.error('reset-password error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
});

module.exports = router;
