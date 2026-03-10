import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// ─── Courses ──────────────────────────────────────────────────────────────────
export const getCourses = () => api.get('/courses').then((r) => r.data);
export const getCourse = (id) => api.get(`/courses/${id}`).then((r) => r.data);
export const createCourse = (data) => api.post('/courses', data).then((r) => r.data);
export const updateCourse = (id, data) => api.patch(`/courses/${id}`, data).then((r) => r.data);
export const deleteCourse = (id) => api.delete(`/courses/${id}`);

// ─── Sections ─────────────────────────────────────────────────────────────────
export const createSection = (courseId, data) =>
  api.post(`/courses/${courseId}/sections`, data).then((r) => r.data);
export const updateSection = (courseId, sectionId, data) =>
  api.patch(`/courses/${courseId}/sections/${sectionId}`, data).then((r) => r.data);
export const deleteSection = (courseId, sectionId) =>
  api.delete(`/courses/${courseId}/sections/${sectionId}`);
export const reorderSections = (courseId, orderedIds) =>
  api.put(`/courses/${courseId}/sections/reorder`, { orderedIds }).then((r) => r.data);

// ─── Items ────────────────────────────────────────────────────────────────────
export const createItem = (courseId, sectionId, data) =>
  api.post(`/courses/${courseId}/sections/${sectionId}/items`, data).then((r) => r.data);
export const updateItem = (courseId, sectionId, itemId, data) =>
  api
    .patch(`/courses/${courseId}/sections/${sectionId}/items/${itemId}`, data)
    .then((r) => r.data);
export const deleteItem = (courseId, sectionId, itemId) =>
  api.delete(`/courses/${courseId}/sections/${sectionId}/items/${itemId}`);
export const reorderItems = (courseId, sectionId, orderedIds) =>
  api
    .put(`/courses/${courseId}/sections/${sectionId}/items/reorder`, { orderedIds })
    .then((r) => r.data);
