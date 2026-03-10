import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/**
 * Attaches the Authorization header using the JWT stored in localStorage.
 */
function authHeader() {
  const token = localStorage.getItem('ls_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export function listCourses() {
  return api.get('/lessons/courses', { headers: authHeader() });
}

export function createCourse(title, description = '') {
  return api.post('/lessons/courses', { title, description }, { headers: authHeader() });
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export function listLessons(courseId) {
  return api.get(`/lessons/courses/${courseId}/lessons`, { headers: authHeader() });
}

export function getLesson(courseId, lessonId) {
  return api.get(`/lessons/courses/${courseId}/lessons/${lessonId}`, { headers: authHeader() });
}

export function createLesson(courseId, title, content, order = 0) {
  return api.post(
    `/lessons/courses/${courseId}/lessons`,
    { title, content, order },
    { headers: authHeader() },
  );
}

export function updateLesson(courseId, lessonId, data) {
  return api.put(
    `/lessons/courses/${courseId}/lessons/${lessonId}`,
    data,
    { headers: authHeader() },
  );
}

export function deleteLesson(courseId, lessonId) {
  return api.delete(`/lessons/courses/${courseId}/lessons/${lessonId}`, { headers: authHeader() });
}
