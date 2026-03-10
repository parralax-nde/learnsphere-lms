import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { register, login, refresh, verifyEmail } from '../controllers/authController.js';
import { registerValidation, loginValidation } from '../middleware/validation.js';

const router = Router();

// Strict rate limit for authentication endpoints to mitigate brute-force attacks.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts, please try again later.' },
});

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user with email and password
 * @access Public
 */
router.post('/register', authLimiter, registerValidation, register);

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate a user and return access + refresh tokens
 * @access Public
 */
router.post('/login', authLimiter, loginValidation, login);

/**
 * @route  POST /api/auth/refresh
 * @desc   Rotate a refresh token and return new tokens
 * @access Public
 */
router.post('/refresh', authLimiter, refresh);

/**
 * @route  GET /api/auth/verify-email
 * @desc   Verify a user's email address using a token
 * @access Public
 */
router.get('/verify-email', verifyEmail);

export default router;
