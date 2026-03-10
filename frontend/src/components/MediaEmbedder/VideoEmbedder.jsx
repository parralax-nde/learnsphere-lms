import { useState } from 'react';
import { parseVideoUrl, providerLabel } from '../../utils/mediaUtils';
import styles from './VideoEmbedder.module.css';

/**
 * VideoEmbedder – lets the user paste a YouTube or Vimeo URL and renders
 * a responsive embed iframe.
 *
 * Props:
 *   onEmbed(embedData)  – called when a valid embed is confirmed
 */
export default function VideoEmbedder({ onEmbed }) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');

  function handleChange(e) {
    const value = e.target.value;
    setUrl(value);
    setError('');
    if (value.trim()) {
      const parsed = parseVideoUrl(value.trim());
      setPreview(parsed || null);
    } else {
      setPreview(null);
    }
  }

  function handleEmbed() {
    if (!preview) {
      setError('Please enter a valid YouTube or Vimeo URL.');
      return;
    }
    onEmbed?.(preview);
    setUrl('');
    setPreview(null);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleEmbed();
  }

  return (
    <div className={styles.container}>
      <label htmlFor="video-url-input" className={styles.label}>
        Paste a YouTube or Vimeo URL
      </label>
      <div className={styles.inputRow}>
        <input
          id="video-url-input"
          type="url"
          value={url}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="https://www.youtube.com/watch?v=..."
          className={styles.input}
          aria-describedby={error ? 'video-url-error' : undefined}
        />
        <button
          type="button"
          onClick={handleEmbed}
          disabled={!preview}
          className={styles.embedBtn}
        >
          Embed
        </button>
      </div>

      {error && (
        <p id="video-url-error" role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {preview && (
        <div className={styles.previewSection}>
          <p className={styles.previewLabel}>
            {providerLabel(preview.provider)} preview
          </p>
          <div className={styles.iframeWrapper}>
            <iframe
              src={preview.embedUrl}
              title={`${providerLabel(preview.provider)} video preview`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className={styles.iframe}
            />
          </div>
        </div>
      )}
    </div>
  );
}
