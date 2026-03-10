import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { validationResult } from 'express-validator';
import { sendVerificationEmail } from '../services/emailService.js';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * POST /api/auth/register
 *
 * Registers a new user with email and password:
 *  1. Validates request body (handled by express-validator middleware)
 *  2. Checks for an existing account with the same email
 *  3. Hashes the password with bcrypt
 *  4. Creates the user record with a time-limited email verification token
 *  5. Sends a verification email (or logs the link in development)
 */
export async function register(req, res) {
  // 1. Check validation errors from middleware
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      message: 'Validation failed.',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }

  const { email, password } = req.body;

  try {
    // 2. Reject duplicate email – use a vague error to avoid user enumeration
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({
        message: 'An account with that email already exists.',
      });
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // 4. Generate a cryptographically random verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyTokenExpiry = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    // 5. Persist user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        emailVerifyToken,
        emailVerifyTokenExpiry,
      },
    });

    // 6. Send verification email (non-blocking: failure is logged, not propagated)
    try {
      await sendVerificationEmail(email, emailVerifyToken);
    } catch (emailErr) {
      console.error('Failed to send verification email:', emailErr);
    }

    return res.status(201).json({
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: user.id,
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
}

/**
 * GET /api/auth/verify-email?token=<token>
 *
 * Verifies a user's email address using the token sent during registration.
 */
export async function verifyEmail(req, res) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ message: 'Verification token is required.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification token.' });
    }

    if (user.emailVerifyTokenExpiry < new Date()) {
      return res.status(400).json({ message: 'Verification token has expired. Please register again.' });
    }

    if (user.isEmailVerified) {
      return res.status(200).json({ message: 'Email is already verified.' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyTokenExpiry: null,
      },
    });

    return res.status(200).json({ message: 'Email verified successfully. You can now log in.' });
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json({ message: 'An unexpected error occurred. Please try again.' });
  }
}
