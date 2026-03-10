import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VideoEmbedder from '../VideoEmbedder';

describe('VideoEmbedder', () => {
  test('renders URL input', () => {
    render(<VideoEmbedder />);
    expect(screen.getByLabelText(/paste a youtube or vimeo url/i)).toBeInTheDocument();
  });

  test('Embed button is disabled when input is empty', () => {
    render(<VideoEmbedder />);
    expect(screen.getByRole('button', { name: /embed/i })).toBeDisabled();
  });

  test('shows preview iframe after valid YouTube URL is typed', async () => {
    render(<VideoEmbedder />);
    const input = screen.getByLabelText(/paste a youtube or vimeo url/i);
    await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(screen.getByTitle(/youtube video preview/i)).toBeInTheDocument();
  });

  test('shows preview iframe after valid Vimeo URL is typed', async () => {
    render(<VideoEmbedder />);
    const input = screen.getByLabelText(/paste a youtube or vimeo url/i);
    await userEvent.type(input, 'https://vimeo.com/123456789');
    expect(screen.getByTitle(/vimeo video preview/i)).toBeInTheDocument();
  });

  test('shows error when Embed is clicked with invalid URL', async () => {
    render(<VideoEmbedder />);
    const input = screen.getByLabelText(/paste a youtube or vimeo url/i);
    // type invalid URL to ensure preview is null and button is disabled,
    // then we force the click by bypassing disabled check
    fireEvent.change(input, { target: { value: 'not-a-video-url' } });
    // Button should still be disabled; simulate via form submit workaround:
    // The error path is triggered only when preview is falsy.
    // Since the button is disabled, test the onKeyDown path (Enter) with no preview
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  test('calls onEmbed with embed data on Embed button click', async () => {
    const onEmbed = vi.fn();
    render(<VideoEmbedder onEmbed={onEmbed} />);
    const input = screen.getByLabelText(/paste a youtube or vimeo url/i);
    await userEvent.type(input, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    await userEvent.click(screen.getByRole('button', { name: /embed/i }));
    expect(onEmbed).toHaveBeenCalledWith({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
  });

  test('resets input after embedding', async () => {
    render(<VideoEmbedder onEmbed={vi.fn()} />);
    const input = screen.getByLabelText(/paste a youtube or vimeo url/i);
    await userEvent.type(input, 'https://youtu.be/dQw4w9WgXcQ');
    await userEvent.click(screen.getByRole('button', { name: /embed/i }));
    expect(input.value).toBe('');
  });
});
