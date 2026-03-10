'use strict';

require('dotenv').config();

const sequelize = require('./config/database');
const app = require('./app');

const PORT = Number(process.env.PORT) || 3000;

async function start() {
  await sequelize.sync({ alter: true });
  app.listen(PORT, () => {
    console.log(`LearnSphere API listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
