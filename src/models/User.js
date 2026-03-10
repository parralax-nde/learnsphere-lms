'use strict';

const { randomUUID } = require('crypto');

/**
 * In-memory user store.
 * Replace with a persistent database (e.g. PostgreSQL, MongoDB) in production.
 */
const users = new Map();

/**
 * @typedef {Object} User
 * @property {string} id         - UUID primary key
 * @property {string} googleId   - Google account subject identifier
 * @property {string} email      - Verified email from Google profile
 * @property {string} name       - Display name from Google profile
 * @property {string|null} avatar - Profile picture URL from Google
 * @property {Date}   createdAt
 * @property {Date}   updatedAt
 */

/**
 * Find a user by their Google subject identifier.
 * @param {string} googleId
 * @returns {User|undefined}
 */
function findByGoogleId(googleId) {
  for (const user of users.values()) {
    if (user.googleId === googleId) return user;
  }
  return undefined;
}

/**
 * Find a user by their email address.
 * @param {string} email
 * @returns {User|undefined}
 */
function findByEmail(email) {
  for (const user of users.values()) {
    if (user.email === email) return user;
  }
  return undefined;
}

/**
 * Find a user by their internal UUID.
 * @param {string} id
 * @returns {User|undefined}
 */
function findById(id) {
  return users.get(id);
}

/**
 * Create a new user from a Google profile.
 * @param {{ googleId: string, email: string, name: string, avatar: string|null }} profile
 * @returns {User}
 */
function createFromGoogle({ googleId, email, name, avatar }) {
  const now = new Date();
  const user = {
    id: randomUUID(),
    googleId,
    email,
    name,
    avatar: avatar || null,
    createdAt: now,
    updatedAt: now,
  };
  users.set(user.id, user);
  return user;
}

/**
 * Link an existing account to a Google profile (upsert googleId + avatar).
 * @param {string} id       - Internal user UUID
 * @param {{ googleId: string, avatar: string|null }} updates
 * @returns {User|undefined}
 */
function linkGoogleAccount(id, { googleId, avatar }) {
  const user = users.get(id);
  if (!user) return undefined;
  user.googleId = googleId;
  if (avatar) user.avatar = avatar;
  user.updatedAt = new Date();
  return user;
}

/**
 * Return a public-safe representation of a user (no internal store references).
 * @param {User} user
 * @returns {{ id: string, email: string, name: string, avatar: string|null, createdAt: Date }}
 */
function toPublic(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
}

module.exports = { findByGoogleId, findByEmail, findById, createFromGoogle, linkGoogleAccount, toPublic };
