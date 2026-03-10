import { uploadAvatar, deleteAvatar } from '../src/services/avatarService';

jest.mock('axios', () => ({
  post: jest.fn(),
  delete: jest.fn(),
}));

import axios from 'axios';

describe('avatarService', () => {
  const token = 'test-token';

  beforeEach(() => jest.clearAllMocks());

  describe('uploadAvatar', () => {
    it('posts to /api/profile/avatar with multipart form data', async () => {
      axios.post.mockResolvedValue({
        data: { avatarUrl: 'https://bucket.s3.amazonaws.com/avatars/u1/img.webp', message: 'ok' },
      });

      const file = new File(['data'], 'avatar.png', { type: 'image/png' });
      const result = await uploadAvatar(file, token);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/profile/avatar'),
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
        })
      );
      expect(result.avatarUrl).toContain('s3.amazonaws.com');
    });

    it('calls onProgress callback during upload', async () => {
      let capturedConfig;
      axios.post.mockImplementation((url, data, config) => {
        capturedConfig = config;
        return Promise.resolve({ data: { avatarUrl: 'https://example.com/a.webp' } });
      });

      const onProgress = jest.fn();
      const file = new File(['data'], 'avatar.png', { type: 'image/png' });
      await uploadAvatar(file, token, onProgress);

      // Simulate a progress event
      const progressEvent = { loaded: 50, total: 100 };
      capturedConfig.onUploadProgress(progressEvent);
      expect(onProgress).toHaveBeenCalledWith(50);
    });

    it('propagates errors from the API', async () => {
      axios.post.mockRejectedValue({
        response: { data: { error: 'File too large' } },
      });

      const file = new File(['data'], 'big.png', { type: 'image/png' });
      await expect(uploadAvatar(file, token)).rejects.toMatchObject({
        response: { data: { error: 'File too large' } },
      });
    });
  });

  describe('deleteAvatar', () => {
    it('sends DELETE to /api/profile/avatar', async () => {
      axios.delete.mockResolvedValue({ data: { message: 'Avatar removed successfully' } });

      const result = await deleteAvatar(token);

      expect(axios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/profile/avatar'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: `Bearer ${token}` }),
        })
      );
      expect(result.message).toMatch(/removed/i);
    });
  });
});
