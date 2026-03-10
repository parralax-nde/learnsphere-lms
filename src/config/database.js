'use strict';

const { Sequelize } = require('sequelize');

const DATABASE_URL = process.env.DATABASE_URL || 'sqlite::memory:';

const sequelize = new Sequelize(DATABASE_URL, {
  logging: false,
  dialect: DATABASE_URL.startsWith('postgres') ? 'postgres' : 'sqlite',
  storage: DATABASE_URL.startsWith('sqlite:.')
    ? DATABASE_URL.replace('sqlite:', '')
    : undefined,
});

module.exports = sequelize;
