import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediaEmbedder from '../MediaEmbedder';

describe('MediaEmbedder', () => {
  test('renders Video tab active by default', () => {
    render(<MediaEmbedder />);
    const videoTab = screen.getByRole('tab', { name: /video/i });
    expect(videoTab).toHaveAttribute('aria-selected', 'true');
  });

  test('renders Image tab', () => {
    render(<MediaEmbedder />);
    expect(screen.getByRole('tab', { name: /image/i })).toBeInTheDocument();
  });

  test('switches to Image panel on tab click', async () => {
    render(<MediaEmbedder />);
    await userEvent.click(screen.getByRole('tab', { name: /image/i }));
    expect(screen.getByRole('tab', { name: /image/i })).toHaveAttribute('aria-selected', 'true');
    // The image uploader drop zone should now be visible
    expect(screen.getByRole('button', { name: /upload image/i })).toBeInTheDocument();
  });

  test('calls onEmbed with type="video" on video embed', async () => {
    const onEmbed = vi.fn();
    render(<MediaEmbedder onEmbed={onEmbed} />);
    const input = screen.getByLabelText(/paste a youtube or vimeo url/i);
    await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await userEvent.click(screen.getByRole('button', { name: /embed/i }));
    expect(onEmbed).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'video', provider: 'youtube' }),
    );
  });
});
