import api from './client.js';

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data);

export const register = (email, password, name, role) =>
  api.post('/auth/register', { email, password, name, role }).then((r) => r.data);

export const getMe = () => api.get('/auth/me').then((r) => r.data);
