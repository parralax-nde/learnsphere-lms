import { Router } from 'express';
import { register, verifyEmail } from '../controllers/authController.js';
import { registerValidation } from '../middleware/validation.js';

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

export default router;
