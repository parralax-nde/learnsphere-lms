import express from 'express';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import authRoutes from './routes/authRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Rate limiting — disabled in test environment to prevent test interference
const isTest = process.env.NODE_ENV === 'test';

// Strict limit for authentication endpoints (login / register)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  skip: () => isTest,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// General API limit for lesson routes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  skip: () => isTest,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/lessons', apiLimiter, lessonRoutes);

export default app;
