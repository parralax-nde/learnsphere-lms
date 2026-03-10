const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const authRoutes = require('./routes/auth');

const app = express();

app.use(express.json());
app.use(cors());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP. Please try again after 15 minutes.' },
  skip: () => process.env.NODE_ENV === 'test',
});

app.use('/auth', authLimiter, authRoutes);

app.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

app.use((_req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((err, _req, res, _next) => {
  console.error('[app] Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error.' });
});

module.exports = app;
