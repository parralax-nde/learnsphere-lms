import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// ---------------------------------------------------------------------------
// Quiz CRUD
// ---------------------------------------------------------------------------

export async function listQuizzes() {
  const { data } = await api.get('/quizzes');
  return data;
}

export async function getQuiz(id) {
  const { data } = await api.get(`/quizzes/${id}`);
  return data;
}

export async function createQuiz(payload) {
  const { data } = await api.post('/quizzes', payload);
  return data;
}

export async function updateQuiz(id, payload) {
  const { data } = await api.put(`/quizzes/${id}`, payload);
  return data;
}

export async function deleteQuiz(id) {
  await api.delete(`/quizzes/${id}`);
}

// ---------------------------------------------------------------------------
// Question management (answer key + scoring rules)
// ---------------------------------------------------------------------------

export async function addQuestion(quizId, payload) {
  const { data } = await api.post(`/quizzes/${quizId}/questions`, payload);
  return data;
}

export async function updateQuestion(quizId, questionId, payload) {
  const { data } = await api.put(`/quizzes/${quizId}/questions/${questionId}`, payload);
  return data;
}

export async function deleteQuestion(quizId, questionId) {
  await api.delete(`/quizzes/${quizId}/questions/${questionId}`);
}

// ---------------------------------------------------------------------------
// Quiz attempts & scoring
// ---------------------------------------------------------------------------

export async function submitAttempt(quizId, payload) {
  const { data } = await api.post(`/quizzes/${quizId}/attempts`, payload);
  return data;
}

export async function getAttempt(quizId, attemptId) {
  const { data } = await api.get(`/quizzes/${quizId}/attempts/${attemptId}`);
  return data;
}

export async function listAttempts(quizId) {
  const { data } = await api.get(`/quizzes/${quizId}/attempts`);
  return data;
}

// ---------------------------------------------------------------------------
// Manual grading
// ---------------------------------------------------------------------------

export async function gradeAnswer(quizId, attemptId, answerId, payload) {
  const { data } = await api.patch(
    `/quizzes/${quizId}/attempts/${attemptId}/answers/${answerId}/grade`,
    payload,
  );
  return data;
}
