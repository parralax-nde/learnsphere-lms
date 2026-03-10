'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for the forgot-password endpoint.
 *
 * Default: 5 requests per 15-minute window per IP.
 * Override via environment variables:
 *   FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MIN
 *   FORGOT_PASSWORD_RATE_LIMIT_MAX
 *
 * In the test environment (NODE_ENV=test) the limiter is disabled so that
 * test suites can exercise the endpoint without hitting artificial limits.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs:
    (Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MIN) || 15) *
    60 *
    1000,
  max: Number(process.env.FORGOT_PASSWORD_RATE_LIMIT_MAX) || 5,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: {
    error:
      'Too many password reset requests from this IP. Please try again later.',
  },
});

module.exports = { forgotPasswordLimiter };
