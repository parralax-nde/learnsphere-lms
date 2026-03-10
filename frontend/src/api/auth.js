import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Register a new user.
 */
export async function registerUser(email, password, name = '') {
  const { data } = await api.post('/auth/register', { email, password, name });
  return data;
}

/**
 * Log in with email and password.
 * Returns { accessToken, refreshToken, user }.
 */
export async function loginUser(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

/**
 * Verify email address using the token from the verification link.
 */
export async function verifyEmail(token) {
  const { data } = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
  return data;
}
