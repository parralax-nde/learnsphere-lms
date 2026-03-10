'use strict';

require('dotenv').config();

const { createApp } = require('./src/app');

const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`LearnSphere LMS server running on port ${PORT}`);
  console.log(`Google OAuth: GET http://localhost:${PORT}/auth/google`);
});
