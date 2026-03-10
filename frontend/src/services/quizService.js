import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Create a new quiz.
 *
 * @param {{ title: string, description?: string, questions?: Array }} quizData
 * @param {string} authToken - JWT auth token.
 * @returns {Promise<{ quiz: object, message: string }>}
 */
export async function createQuiz(quizData, authToken) {
  const response = await axios.post(`${API_BASE_URL}/quizzes`, quizData, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
}

/**
 * Retrieve a quiz by ID.
 *
 * @param {string} quizId
 * @param {string} authToken - JWT auth token.
 * @returns {Promise<{ quiz: object }>}
 */
export async function getQuiz(quizId, authToken) {
  const response = await axios.get(`${API_BASE_URL}/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
}

/**
 * Update an existing quiz.
 *
 * @param {string} quizId
 * @param {{ title?: string, description?: string, questions?: Array }} updates
 * @param {string} authToken - JWT auth token.
 * @returns {Promise<{ quiz: object, message: string }>}
 */
export async function updateQuiz(quizId, updates, authToken) {
  const response = await axios.put(`${API_BASE_URL}/quizzes/${quizId}`, updates, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
}

/**
 * Delete a quiz by ID.
 *
 * @param {string} quizId
 * @param {string} authToken - JWT auth token.
 * @returns {Promise<{ message: string }>}
 */
export async function deleteQuiz(quizId, authToken) {
  const response = await axios.delete(`${API_BASE_URL}/quizzes/${quizId}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  return response.data;
}
