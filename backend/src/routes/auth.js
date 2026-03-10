const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { register, login, refresh, logout, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = Router();

// Strict rate limit for credential endpoints (login / register / refresh)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

// General rate limit for session endpoints (logout / me)
const sessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.post('/refresh', authLimiter, refresh);
router.post('/logout', sessionLimiter, logout);
router.get('/me', sessionLimiter, authenticate, me);

module.exports = router;
