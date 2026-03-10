import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * Upload a new avatar image for the authenticated user.
 *
 * @param {File} file - The image file to upload.
 * @param {string} authToken - JWT auth token.
 * @param {function(number): void} [onProgress] - Optional progress callback (0-100).
 * @returns {Promise<{avatarUrl: string, message: string}>}
 */
export async function uploadAvatar(file, authToken, onProgress) {
  const formData = new FormData();
  formData.append('avatar', file);

  const response = await axios.post(`${API_BASE_URL}/profile/avatar`, formData, {
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: onProgress
      ? (progressEvent) => {
          const percent = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          onProgress(percent);
        }
      : undefined,
  });

  return response.data;
}

/**
 * Delete the authenticated user's avatar.
 *
 * @param {string} authToken - JWT auth token.
 * @returns {Promise<{message: string}>}
 */
export async function deleteAvatar(authToken) {
  const response = await axios.delete(`${API_BASE_URL}/profile/avatar`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  return response.data;
}
