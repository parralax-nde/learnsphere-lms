const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/config');

/**
 * In-memory user store.
 * In production, replace this with a database (e.g. PostgreSQL, MongoDB).
 */
const users = new Map();

/**
 * Find a user by email address.
 * @param {string} email
 * @returns {Object|undefined}
 */
function findByEmail(email) {
  for (const user of users.values()) {
    if (user.email.toLowerCase() === email.toLowerCase()) {
      return user;
    }
  }
  return undefined;
}

/**
 * Find a user by their unique ID.
 * @param {string} id
 * @returns {Object|undefined}
 */
function findById(id) {
  return users.get(id);
}

/**
 * Create and persist a new user with a hashed password.
 * @param {Object} params
 * @param {string} params.email
 * @param {string} params.password - Plain-text password (will be hashed)
 * @param {string} [params.firstName]
 * @param {string} [params.lastName]
 * @param {string} [params.role]
 * @returns {Promise<Object>} The newly created user (without passwordHash)
 */
async function create({ email, password, firstName = '', lastName = '', role = 'student' }) {
  if (findByEmail(email)) {
    const err = new Error('Email is already registered');
    err.code = 'EMAIL_TAKEN';
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, config.bcrypt.saltRounds);
  const id = uuidv4();
  const now = new Date().toISOString();

  const user = {
    id,
    email: email.toLowerCase(),
    passwordHash,
    firstName,
    lastName,
    role,
    isVerified: false,
    createdAt: now,
    updatedAt: now,
  };

  users.set(id, user);

  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}

/**
 * Validate a plain-text password against a stored hash.
 * @param {string} plainPassword
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
async function verifyPassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Return a user object without sensitive fields.
 * @param {Object} user
 * @returns {Object}
 */
function sanitize(user) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

/**
 * Clear all users (used in tests).
 */
function _clearAll() {
  users.clear();
}

module.exports = { findByEmail, findById, create, verifyPassword, sanitize, _clearAll };
