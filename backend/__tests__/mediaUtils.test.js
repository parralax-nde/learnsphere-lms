const { extractYouTubeId, extractVimeoId, parseVideoUrl, isImageUrl } = require('../src/utils/mediaUtils');

describe('extractYouTubeId', () => {
  test('parses standard watch URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('parses short youtu.be URL', () => {
    expect(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('parses embed URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('parses Shorts URL', () => {
    expect(extractYouTubeId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('parses watch URL with additional query params', () => {
    expect(extractYouTubeId('https://www.youtube.com/watch?t=30&v=dQw4w9WgXcQ&list=PL123')).toBe('dQw4w9WgXcQ');
  });

  test('returns null for non-YouTube URL', () => {
    expect(extractYouTubeId('https://vimeo.com/123456789')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(extractYouTubeId('')).toBeNull();
  });

  test('returns null for null', () => {
    expect(extractYouTubeId(null)).toBeNull();
  });
});

describe('extractVimeoId', () => {
  test('parses standard vimeo URL', () => {
    expect(extractVimeoId('https://vimeo.com/123456789')).toBe('123456789');
  });

  test('parses player URL', () => {
    expect(extractVimeoId('https://player.vimeo.com/video/123456789')).toBe('123456789');
  });

  test('parses vimeo.com/video/ URL', () => {
    expect(extractVimeoId('https://vimeo.com/video/123456789')).toBe('123456789');
  });

  test('returns null for non-Vimeo URL', () => {
    expect(extractVimeoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });

  test('returns null for null', () => {
    expect(extractVimeoId(null)).toBeNull();
  });
});

describe('parseVideoUrl', () => {
  test('returns YouTube embed metadata', () => {
    const result = parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(result).toEqual({
      provider: 'youtube',
      id: 'dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
    });
  });

  test('returns Vimeo embed metadata', () => {
    const result = parseVideoUrl('https://vimeo.com/123456789');
    expect(result).toEqual({
      provider: 'vimeo',
      id: '123456789',
      embedUrl: 'https://player.vimeo.com/video/123456789',
    });
  });

  test('returns null for unrecognised URL', () => {
    expect(parseVideoUrl('https://example.com/video')).toBeNull();
  });

  test('returns null for empty string', () => {
    expect(parseVideoUrl('')).toBeNull();
  });
});

describe('isImageUrl', () => {
  test('returns true for JPEG URL', () => {
    expect(isImageUrl('https://example.com/photo.jpg')).toBe(true);
  });

  test('returns true for PNG URL', () => {
    expect(isImageUrl('https://example.com/image.png')).toBe(true);
  });

  test('returns true for WEBP URL', () => {
    expect(isImageUrl('https://example.com/image.webp')).toBe(true);
  });

  test('returns true for SVG URL', () => {
    expect(isImageUrl('https://example.com/icon.svg')).toBe(true);
  });

  test('returns false for a video URL', () => {
    expect(isImageUrl('https://example.com/video.mp4')).toBe(false);
  });

  test('returns false for a YouTube URL', () => {
    expect(isImageUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
  });

  test('returns false for null', () => {
    expect(isImageUrl(null)).toBe(false);
  });
});
