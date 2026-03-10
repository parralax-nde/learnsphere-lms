import { Router } from 'express';
import { register, login, refresh, verifyEmail } from '../controllers/authController.js';
import { registerValidation, loginValidation } from '../middleware/validation.js';

const router = Router();

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user with email and password
 * @access Public
 */
router.post('/register', registerValidation, register);

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate a user and return access + refresh tokens
 * @access Public
 */
router.post('/login', loginValidation, login);

/**
 * @route  POST /api/auth/refresh
 * @desc   Rotate a refresh token and return new tokens
 * @access Public
 */
router.post('/refresh', refresh);

/**
 * @route  GET /api/auth/verify-email
 * @desc   Verify a user's email address using a token
 * @access Public
 */
router.get('/verify-email', verifyEmail);

export default router;
