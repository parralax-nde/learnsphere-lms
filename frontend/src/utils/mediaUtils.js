/**
 * Client-side media utilities for parsing video URLs and validating images.
 */

const YOUTUBE_PATTERN =
  /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/;

const VIMEO_PATTERN =
  /(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/;

/**
 * Extracts the YouTube video ID from a URL string.
 * @param {string} url
 * @returns {string|null}
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(YOUTUBE_PATTERN);
  return match ? match[1] : null;
}

/**
 * Extracts the Vimeo video ID from a URL string.
 * @param {string} url
 * @returns {string|null}
 */
export function extractVimeoId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(VIMEO_PATTERN);
  return match ? match[1] : null;
}

/**
 * Parses a YouTube or Vimeo URL and returns embed metadata.
 * @param {string} url
 * @returns {{ provider: 'youtube'|'vimeo', id: string, embedUrl: string }|null}
 */
export function parseVideoUrl(url) {
  const youtubeId = extractYouTubeId(url);
  if (youtubeId) {
    return {
      provider: 'youtube',
      id: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
    };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      id: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return null;
}

/**
 * Returns true when the URL path ends with a known image extension.
 * @param {string} url
 * @returns {boolean}
 */
export function isImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const { pathname } = new URL(url);
    return /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(pathname);
  } catch {
    return false;
  }
}

/**
 * Returns a human-readable label for the provider.
 * @param {'youtube'|'vimeo'} provider
 * @returns {string}
 */
export function providerLabel(provider) {
  return provider === 'youtube' ? 'YouTube' : 'Vimeo';
}
