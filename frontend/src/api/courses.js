import axios from 'axios';

/**
 * Create an axios instance pre-configured with the Authorization header from
 * the access token stored in sessionStorage.
 */
function getApi() {
  const token = sessionStorage.getItem('accessToken');
  return axios.create({
    baseURL: '/api',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

/**
 * List courses. Role-based: students see published only,
 * instructors see their own, admins see all.
 */
export async function listCourses() {
  const { data } = await getApi().get('/courses');
  return data.courses;
}

/**
 * Get a single course by ID.
 */
export async function getCourse(id) {
  const { data } = await getApi().get(`/courses/${id}`);
  return data.course;
}

/**
 * Create a new course (INSTRUCTOR or ADMIN).
 */
export async function createCourse(payload) {
  const { data } = await getApi().post('/courses', payload);
  return data.course;
}

/**
 * Update an existing course (DRAFT or REJECTED only).
 */
export async function updateCourse(id, payload) {
  const { data } = await getApi().put(`/courses/${id}`, payload);
  return data.course;
}

/**
 * Delete a course (DRAFT only).
 */
export async function deleteCourse(id) {
  await getApi().delete(`/courses/${id}`);
}

/**
 * Submit a course for admin review (DRAFT or REJECTED → PENDING_REVIEW).
 */
export async function submitCourse(id) {
  const { data } = await getApi().post(`/courses/${id}/submit`);
  return data.course;
}

/**
 * Publish an approved course (PENDING_REVIEW → PUBLISHED). Admin only.
 */
export async function publishCourse(id) {
  const { data } = await getApi().post(`/courses/${id}/publish`);
  return data.course;
}

/**
 * Reject a course under review. Admin only.
 */
export async function rejectCourse(id, note = '') {
  const { data } = await getApi().post(`/courses/${id}/reject`, { note });
  return data.course;
}

/**
 * Unpublish a published course, returning it to DRAFT status. Admin only.
 * The course content is retained and can be re-published or edited later.
 */
export async function unpublishCourse(id) {
  const { data } = await getApi().post(`/courses/${id}/unpublish`);
  return data.course;
}
