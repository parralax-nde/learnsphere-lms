import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../config/database';
import { sendVerificationEmail } from '../services/emailService';
import {
  generateVerificationToken,
  getTokenExpiry,
  isTokenExpired,
} from '../services/tokenService';
import { createError } from '../middleware/errorHandler';

const router = Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN_LENGTH = 8;
const BCRYPT_ROUNDS = 10;

/**
 * POST /api/auth/register
 * Registers a new user and sends a verification email.
 */
router.post(
  '/register',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body as {
        email?: string;
        password?: string;
      };

      // Validate input
      if (!email || !password) {
        return next(createError('Email and password are required.', 400));
      }

      if (!EMAIL_REGEX.test(email)) {
        return next(createError('Invalid email format.', 400));
      }

      if (password.length < PASSWORD_MIN_LENGTH) {
        return next(
          createError(
            `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
            400,
          ),
        );
      }

      // Check for existing user
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        return next(
          createError('An account with this email already exists.', 409),
        );
      }

      // Hash password and create user with verification token
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = getTokenExpiry();

      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          verificationToken,
          verificationTokenExpiry,
        },
      });

      // Build verification URL and send email
      const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
      const verificationUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

      await sendVerificationEmail({ to: user.email, verificationUrl });

      res.status(201).json({
        success: true,
        message:
          'Registration successful. Please check your email to verify your account.',
        data: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * GET /api/auth/verify-email
 * Validates the verification token and activates the user's account.
 */
router.get(
  '/verify-email',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.query as { token?: string };

      if (!token) {
        return next(createError('Verification token is required.', 400));
      }

      const user = await prisma.user.findUnique({
        where: { verificationToken: token },
      });

      if (!user) {
        return next(createError('Invalid verification token.', 400));
      }

      if (user.isVerified) {
        res.status(200).json({
          success: true,
          message: 'Your account has already been verified. You can log in.',
        });
        return;
      }

      if (!user.verificationTokenExpiry || isTokenExpired(user.verificationTokenExpiry)) {
        return next(
          createError(
            'Verification token has expired. Please request a new verification email.',
            400,
          ),
        );
      }

      // Activate the account and clear the token
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isVerified: true,
          verificationToken: null,
          verificationTokenExpiry: null,
        },
      });

      res.status(200).json({
        success: true,
        message: 'Email verified successfully. Your account is now active.',
      });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * POST /api/auth/resend-verification
 * Resends the verification email for an unverified account.
 */
router.post(
  '/resend-verification',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body as { email?: string };

      if (!email) {
        return next(createError('Email is required.', 400));
      }

      if (!EMAIL_REGEX.test(email)) {
        return next(createError('Invalid email format.', 400));
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Return a generic success message to avoid email enumeration attacks
      if (!user || user.isVerified) {
        res.status(200).json({
          success: true,
          message:
            'If your email is registered and unverified, a new verification link has been sent.',
        });
        return;
      }

      // Generate a fresh token and resend
      const verificationToken = generateVerificationToken();
      const verificationTokenExpiry = getTokenExpiry();

      await prisma.user.update({
        where: { id: user.id },
        data: { verificationToken, verificationTokenExpiry },
      });

      const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
      const verificationUrl = `${appUrl}/api/auth/verify-email?token=${verificationToken}`;

      await sendVerificationEmail({ to: user.email, verificationUrl });

      res.status(200).json({
        success: true,
        message:
          'If your email is registered and unverified, a new verification link has been sent.',
      });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
