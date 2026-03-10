import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

/**
 * Attach a JWT to every outgoing request.
 * Call this once after a user logs in:  setAuthToken(token)
 * Call with null to clear:              setAuthToken(null)
 */
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

/**
 * Upload a file attachment to a lesson.
 * @param {string}   lessonId  Target lesson ID
 * @param {File}     file      Browser File object
 * @param {Function} onProgress  Called with 0-100 progress values
 * @returns {Promise<Object>} Created attachment record
 */
export async function uploadAttachment(lessonId, file, onProgress) {
  const form = new FormData();
  form.append('file', file);

  const { data } = await api.post(`/lessons/${lessonId}/attachments`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (evt) => {
      if (onProgress && evt.total) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    },
  });
  return data;
}

/**
 * List all attachments for a lesson.
 * @param {string} lessonId
 * @returns {Promise<Object[]>}
 */
export async function listAttachments(lessonId) {
  const { data } = await api.get(`/lessons/${lessonId}/attachments`);
  return data;
}

/**
 * Get a short-lived presigned download URL for an attachment.
 * @param {string} attachmentId
 * @returns {Promise<{url: string, expiresIn: number}>}
 */
export async function getDownloadUrl(attachmentId) {
  const { data } = await api.get(`/attachments/${attachmentId}/download`);
  return data;
}

/**
 * Delete an attachment.
 * @param {string} attachmentId
 */
export async function deleteAttachment(attachmentId) {
  await api.delete(`/attachments/${attachmentId}`);
}
