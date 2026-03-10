import { Router } from 'express';
import { register, verifyEmail, login } from '../controllers/authController.js';
import { registerValidation, loginValidation } from '../middleware/validation.js';

const router = Router();

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user with email and password
 * @access Public
 */
router.post('/register', registerValidation, register);

/**
 * @route  GET /api/auth/verify-email
 * @desc   Verify a user's email address using a token
 * @access Public
 */
router.get('/verify-email', verifyEmail);

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate a user and return a JWT access token
 * @access Public
 */
router.post('/login', loginValidation, login);

export default router;
