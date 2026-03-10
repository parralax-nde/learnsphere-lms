'use strict';

require('dotenv').config();

const express = require('express');
const passport = require('passport');
const { configurePassport } = require('./config/passport');
const authRouter = require('./routes/auth');

/**
 * Create and configure the Express application.
 * Exported separately from the server entry-point so that it can be
 * imported by tests without binding to a port.
 */
function createApp() {
  configurePassport();

  const app = express();

  app.use(express.json());
  app.use(passport.initialize());

  // Health check
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  // Auth routes: /auth/google, /auth/google/callback, /auth/me, /auth/logout
  app.use('/auth', authRouter);

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found.' });
  });

  // Centralised error handler
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error.' });
  });

  return app;
}

module.exports = { createApp };
