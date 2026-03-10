'use strict';

require('dotenv').config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const express = require('express');
const authRouter = require('./routes/auth');

const app = express();

app.use(express.json());

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

// Auth routes (password reset lives here)
app.use('/api/auth', authRouter);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

module.exports = app;
