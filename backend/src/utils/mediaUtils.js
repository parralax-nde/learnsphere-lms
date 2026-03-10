/**
 * Utilities for parsing and validating media URLs (YouTube, Vimeo, images).
 * These utilities are shared between backend and frontend.
 */

/**
 * Extracts a YouTube video ID from a variety of URL formats.
 * Supports:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID
 *   https://www.youtube.com/shorts/VIDEO_ID
 * @param {string} url
 * @returns {string|null} video ID or null
 */
function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extracts a Vimeo video ID from a variety of URL formats.
 * Supports:
 *   https://vimeo.com/VIDEO_ID
 *   https://player.vimeo.com/video/VIDEO_ID
 * @param {string} url
 * @returns {string|null} video ID or null
 */
function extractVimeoId(url) {
  if (!url || typeof url !== 'string') return null;
  const match = url.match(/(?:vimeo\.com\/(?:video\/)?|player\.vimeo\.com\/video\/)(\d+)/);
  return match ? match[1] : null;
}

/**
 * Parses a video URL and returns metadata for embedding.
 * @param {string} url
 * @returns {{ provider: 'youtube'|'vimeo', id: string, embedUrl: string }|null}
 */
function parseVideoUrl(url) {
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
 * Checks whether a URL points to a supported image format.
 * @param {string} url
 * @returns {boolean}
 */
function isImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const { pathname } = new URL(url);
    return /\.(jpe?g|png|gif|webp|svg|avif)$/i.test(pathname);
  } catch {
    return false;
  }
}

module.exports = { extractYouTubeId, extractVimeoId, parseVideoUrl, isImageUrl };
