import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import quizRoutes from './routes/quizRoutes.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/quizzes', quizRoutes);

export default app;
