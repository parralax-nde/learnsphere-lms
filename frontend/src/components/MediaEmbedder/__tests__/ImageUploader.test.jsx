import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ImageUploader from '../ImageUploader';

describe('ImageUploader', () => {
  beforeEach(() => {
    // Reset fetch mock
    vi.restoreAllMocks();
  });

  test('renders drop zone and URL input', () => {
    render(<ImageUploader />);
    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/image url/i)).toBeInTheDocument();
  });

  test('Add button is disabled when URL input is empty', () => {
    render(<ImageUploader />);
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  test('shows error for invalid URL input', async () => {
    render(<ImageUploader />);
    const urlInput = screen.getByLabelText(/image url/i);
    await userEvent.type(urlInput, 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('calls onUpload with url source for valid URL input', async () => {
    const onUpload = vi.fn();
    render(<ImageUploader onUpload={onUpload} />);
    const urlInput = screen.getByLabelText(/image url/i);
    await userEvent.type(urlInput, 'https://example.com/photo.jpg');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(onUpload).toHaveBeenCalledWith({ url: 'https://example.com/photo.jpg', source: 'url' });
  });

  test('shows image preview after URL is added', async () => {
    render(<ImageUploader onUpload={vi.fn()} />);
    const urlInput = screen.getByLabelText(/image url/i);
    await userEvent.type(urlInput, 'https://example.com/photo.png');
    await userEvent.click(screen.getByRole('button', { name: /add/i }));
    const img = screen.getByRole('img', { name: /uploaded/i });
    expect(img).toHaveAttribute('src', 'https://example.com/photo.png');
  });

  test('uploads file and calls onUpload on success', async () => {
    const mockUrl = 'http://localhost:3001/uploads/test.jpg';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ url: mockUrl }),
    }));

    const onUpload = vi.fn();
    render(<ImageUploader onUpload={onUpload} />);

    const fileInput = screen.getByLabelText(/choose image file/i);
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    expect(fetch).toHaveBeenCalledWith('/api/media/upload-image', expect.any(Object));
    expect(onUpload).toHaveBeenCalledWith({ url: mockUrl, source: 'upload' });
  });

  test('shows error when upload fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: 'Upload failed.' }),
    }));

    render(<ImageUploader />);
    const fileInput = screen.getByLabelText(/choose image file/i);
    const file = new File(['fake'], 'photo.jpg', { type: 'image/jpeg' });
    await userEvent.upload(fileInput, file);

    expect(screen.getByRole('alert')).toHaveTextContent('Upload failed.');
  });
});
