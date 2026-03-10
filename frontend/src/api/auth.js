import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/**
 * Register a new user.
 *
 * @param {string} email
 * @param {string} password
 * @param {string} [role='STUDENT'] - 'STUDENT' or 'INSTRUCTOR'
 */
export function registerUser(email, password, role = 'STUDENT') {
  return api.post('/auth/register', { email, password, role });
}

/**
 * Verify a user's email using the token from the verification email.
 *
 * @param {string} token
 */
export function verifyEmail(token) {
  return api.get('/auth/verify-email', { params: { token } });
}

/**
 * Log in with email and password.
 * Returns `{ token, user: { id, email, role } }`.
 *
 * @param {string} email
 * @param {string} password
 */
export function loginUser(email, password) {
  return api.post('/auth/login', { email, password });
}
