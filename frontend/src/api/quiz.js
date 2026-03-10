import axios from 'axios';

const base = '/api/quizzes';

export const listQuizzes = () => axios.get(base).then(r => r.data);
export const getQuiz = (id) => axios.get(`${base}/${id}`).then(r => r.data);
export const createQuiz = (data) => axios.post(base, data).then(r => r.data);
export const updateQuiz = (id, data) => axios.put(`${base}/${id}`, data).then(r => r.data);
export const deleteQuiz = (id) => axios.delete(`${base}/${id}`);

export const addQuestion = (quizId, data) =>
  axios.post(`${base}/${quizId}/questions`, data).then(r => r.data);
export const updateQuestion = (quizId, questionId, data) =>
  axios.put(`${base}/${quizId}/questions/${questionId}`, data).then(r => r.data);
export const deleteQuestion = (quizId, questionId) =>
  axios.delete(`${base}/${quizId}/questions/${questionId}`);

export const submitAttempt = (quizId, data) =>
  axios.post(`${base}/${quizId}/attempts`, data).then(r => r.data);
export const listAttempts = (quizId) =>
  axios.get(`${base}/${quizId}/attempts`).then(r => r.data);
export const getAttempt = (quizId, attemptId) =>
  axios.get(`${base}/${quizId}/attempts/${attemptId}`).then(r => r.data);
export const gradeAnswer = (quizId, attemptId, answerId, data) =>
  axios.patch(`${base}/${quizId}/attempts/${attemptId}/answers/${answerId}/grade`, data)
    .then(r => r.data);
