/**
 * Token blacklist for invalidated access tokens (logout).
 * Stored as a Set of JTI (JWT ID) strings.
 *
 * In production, replace with a Redis store with TTL equal to the token's
 * remaining lifetime so that the blacklist self-cleans.
 */
const blacklistedJtis = new Set();

/**
 * Invalidated refresh tokens stored by user ID.
 * Maps userId -> Set of invalidated refresh token JTIs.
 */
const invalidatedRefreshTokens = new Set();

/**
 * Add a token's JTI to the blacklist.
 * @param {string} jti
 */
function blacklistToken(jti) {
  blacklistedJtis.add(jti);
}

/**
 * Check whether a token JTI has been blacklisted.
 * @param {string} jti
 * @returns {boolean}
 */
function isBlacklisted(jti) {
  return blacklistedJtis.has(jti);
}

/**
 * Invalidate a refresh token JTI.
 * @param {string} jti
 */
function invalidateRefreshToken(jti) {
  invalidatedRefreshTokens.add(jti);
}

/**
 * Check whether a refresh token JTI is invalidated.
 * @param {string} jti
 * @returns {boolean}
 */
function isRefreshTokenInvalid(jti) {
  return invalidatedRefreshTokens.has(jti);
}

/**
 * Clear all blacklisted entries (used in tests).
 */
function _clearAll() {
  blacklistedJtis.clear();
  invalidatedRefreshTokens.clear();
}

module.exports = { blacklistToken, isBlacklisted, invalidateRefreshToken, isRefreshTokenInvalid, _clearAll };
