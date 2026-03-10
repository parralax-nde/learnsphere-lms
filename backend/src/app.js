require('dotenv').config();
const express = require('express');
const cors = require('cors');
const avatarRouter = require('./routes/avatar');

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Routes
app.use('/api/profile/avatar', avatarRouter);

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
