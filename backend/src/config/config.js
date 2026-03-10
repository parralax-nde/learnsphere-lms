require('dotenv').config();

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'default-access-secret-change-in-prod',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret-change-in-prod',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12,
  },
};

module.exports = config;
