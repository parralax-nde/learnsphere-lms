import crypto from 'crypto';

const TOKEN_EXPIRY_HOURS = 24;

/**
 * Generates a cryptographically secure, URL-safe verification token.
 */
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Returns the expiry date for a verification token (24 hours from now).
 */
export function getTokenExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + TOKEN_EXPIRY_HOURS);
  return expiry;
}

/**
 * Checks whether a given token expiry date has passed.
 */
export function isTokenExpired(expiry: Date): boolean {
  return new Date() > expiry;
}
