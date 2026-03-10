import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AvatarUpload from '../src/components/AvatarUpload/AvatarUpload';

// Mock the avatar service
jest.mock('../src/services/avatarService', () => ({
  uploadAvatar: jest.fn(),
  deleteAvatar: jest.fn(),
}));

import { uploadAvatar, deleteAvatar } from '../src/services/avatarService';

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:http://localhost/fake-preview');

const DEFAULT_PROPS = {
  authToken: 'fake-jwt-token',
  currentAvatarUrl: null,
  onAvatarChange: jest.fn(),
};

function renderComponent(props = {}) {
  return render(<AvatarUpload {...DEFAULT_PROPS} {...props} />);
}

function createImageFile(name = 'avatar.png', type = 'image/png', sizeMb = 0.5) {
  const content = new Uint8Array(sizeMb * 1024 * 1024);
  return new File([content], name, { type });
}

describe('AvatarUpload component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial render', () => {
    it('shows placeholder when no avatar URL is provided', () => {
      renderComponent();
      expect(screen.getByLabelText('No avatar')).toBeInTheDocument();
    });

    it('shows existing avatar image when currentAvatarUrl is provided', () => {
      renderComponent({ currentAvatarUrl: 'https://example.com/avatar.webp' });
      const img = screen.getByAltText('Profile avatar');
      expect(img).toHaveAttribute('src', 'https://example.com/avatar.webp');
    });

    it('shows delete button when avatar is present', () => {
      renderComponent({ currentAvatarUrl: 'https://example.com/avatar.webp' });
      expect(screen.getByLabelText('Remove avatar')).toBeInTheDocument();
    });

    it('does not show delete button when no avatar', () => {
      renderComponent();
      expect(screen.queryByLabelText('Remove avatar')).not.toBeInTheDocument();
    });

    it('renders the dropzone with upload instructions', () => {
      renderComponent();
      expect(screen.getByText(/click or drag an image/i)).toBeInTheDocument();
      expect(screen.getByText(/JPEG, PNG, GIF or WebP/i)).toBeInTheDocument();
    });
  });

  describe('Successful upload', () => {
    it('calls uploadAvatar and shows success message', async () => {
      uploadAvatar.mockResolvedValue({
        avatarUrl: 'https://bucket.s3.amazonaws.com/avatars/user1/new.webp',
        message: 'Avatar updated successfully',
      });

      renderComponent();

      const input = screen.getByTestId('file-input');
      const file = createImageFile('photo.png', 'image/png', 0.5);
      await userEvent.upload(input, file);

      await waitFor(() => {
        expect(screen.getByText(/avatar updated successfully/i)).toBeInTheDocument();
      });

      expect(uploadAvatar).toHaveBeenCalledWith(file, 'fake-jwt-token', expect.any(Function));
      expect(DEFAULT_PROPS.onAvatarChange).toHaveBeenCalledWith(
        'https://bucket.s3.amazonaws.com/avatars/user1/new.webp'
      );
    });

    it('shows preview image immediately after file selection', async () => {
      uploadAvatar.mockResolvedValue({
        avatarUrl: 'https://bucket.s3.amazonaws.com/avatars/user1/new.webp',
        message: 'Avatar updated',
      });

      renderComponent();

      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, createImageFile());

      await waitFor(() => {
        const img = screen.getByAltText('Profile avatar');
        expect(img).toHaveAttribute('src', 'blob:http://localhost/fake-preview');
      });
    });
  });

  describe('Upload errors', () => {
    it('shows error message when upload fails', async () => {
      uploadAvatar.mockRejectedValue({
        response: { data: { error: 'File too large. Maximum size is 5MB.' } },
      });

      renderComponent();

      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, createImageFile('big.png', 'image/png', 4));

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/file too large/i);
      });

      expect(DEFAULT_PROPS.onAvatarChange).not.toHaveBeenCalled();
    });

    it('shows generic error when response has no message', async () => {
      uploadAvatar.mockRejectedValue(new Error('Network Error'));

      renderComponent();

      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, createImageFile());

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/upload failed/i);
      });
    });
  });

  describe('Delete avatar', () => {
    it('calls deleteAvatar and notifies parent on success', async () => {
      deleteAvatar.mockResolvedValue({ message: 'Avatar removed successfully' });

      renderComponent({ currentAvatarUrl: 'https://example.com/avatar.webp' });

      const deleteBtn = screen.getByLabelText('Remove avatar');
      await userEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent(/avatar removed/i);
      });

      expect(deleteAvatar).toHaveBeenCalledWith('fake-jwt-token');
      expect(DEFAULT_PROPS.onAvatarChange).toHaveBeenCalledWith(null);
    });

    it('shows error when delete fails', async () => {
      deleteAvatar.mockRejectedValue({
        response: { data: { error: 'Failed to remove avatar' } },
      });

      renderComponent({ currentAvatarUrl: 'https://example.com/avatar.webp' });

      const deleteBtn = screen.getByLabelText('Remove avatar');
      await userEvent.click(deleteBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toHaveTextContent(/failed to remove avatar/i);
      });
    });
  });
});
