import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Register a new user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{message: string, userId: string}>}
 */
export async function registerUser(email, password) {
  const { data } = await api.post('/auth/register', { email, password });
  return data;
}

/**
 * Verify email address using the token from the verification link.
 * @param {string} token
 * @returns {Promise<{message: string}>}
 */
export async function verifyEmail(token) {
  const { data } = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  return data;
}
