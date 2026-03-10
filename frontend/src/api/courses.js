import api from './client.js';

export const listCourses = () => api.get('/courses').then((r) => r.data);

export const listPending = () => api.get('/courses/pending').then((r) => r.data);

export const getCourse = (id) => api.get(`/courses/${id}`).then((r) => r.data);

export const createCourse = (data) => api.post('/courses', data).then((r) => r.data);

export const updateCourse = (id, data) =>
  api.put(`/courses/${id}`, data).then((r) => r.data);

export const deleteCourse = (id) => api.delete(`/courses/${id}`);

export const submitCourse = (id) =>
  api.post(`/courses/${id}/submit`).then((r) => r.data);

export const approveCourse = (id) =>
  api.post(`/courses/${id}/approve`).then((r) => r.data);

export const rejectCourse = (id, note) =>
  api.post(`/courses/${id}/reject`, { note }).then((r) => r.data);
