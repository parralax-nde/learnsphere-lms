import { useRef, useState } from 'react';
import styles from './ImageUploader.module.css';

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/gif,image/webp,image/svg+xml,image/avif';
const MAX_SIZE_MB = 10;

/**
 * ImageUploader – lets the user pick an image file (drag-and-drop or click)
 * and uploads it to the backend (/api/media/upload-image).
 * Alternatively the user can paste an image URL directly.
 *
 * Props:
 *   onUpload({ url, source })  – called after a successful upload or URL entry
 *   apiBase                    – base URL for the API (default: '')
 */
export default function ImageUploader({ onUpload, apiBase = '' }) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  /* ── File handling ─────────────────────────────────────────────────── */

  async function uploadFile(file) {
    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File must be smaller than ${MAX_SIZE_MB} MB.`);
      return;
    }

    const formData = new FormData();
    formData.append('image', file);

    setUploading(true);
    try {
      const res = await fetch(`${apiBase}/api/media/upload-image`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Upload failed.');
      }
      setPreviewUrl(data.url);
      onUpload?.({ url: data.url, source: 'upload' });
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }

  function handleFileInputChange(e) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }

  /* ── Drag-and-drop ─────────────────────────────────────────────────── */

  function handleDragOver(e) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave() {
    setDragging(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
  }

  /* ── URL input ─────────────────────────────────────────────────────── */

  function handleUrlChange(e) {
    setImageUrl(e.target.value);
    setError('');
  }

  function handleUrlEmbed() {
    const trimmed = imageUrl.trim();
    if (!trimmed) {
      setError('Please enter an image URL.');
      return;
    }
    // Basic validation – must be a URL
    try {
      new URL(trimmed);
    } catch {
      setError('Please enter a valid URL.');
      return;
    }
    setPreviewUrl(trimmed);
    onUpload?.({ url: trimmed, source: 'url' });
    setImageUrl('');
  }

  function handleUrlKeyDown(e) {
    if (e.key === 'Enter') handleUrlEmbed();
  }

  return (
    <div className={styles.container}>
      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image"
        className={`${styles.dropZone} ${dragging ? styles.dragging : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileInputChange}
          className={styles.hiddenInput}
          aria-label="Choose image file"
        />
        {uploading ? (
          <p className={styles.uploading}>Uploading…</p>
        ) : (
          <>
            <span className={styles.uploadIcon} aria-hidden="true">🖼️</span>
            <p className={styles.dropText}>
              Drag &amp; drop an image here, or <span className={styles.browse}>browse</span>
            </p>
            <p className={styles.hint}>JPG, PNG, GIF, WEBP, SVG, AVIF · max {MAX_SIZE_MB} MB</p>
          </>
        )}
      </div>

      {/* URL input */}
      <div className={styles.urlRow}>
        <span className={styles.orDivider}>or paste an image URL</span>
        <div className={styles.urlInputRow}>
          <input
            type="url"
            value={imageUrl}
            onChange={handleUrlChange}
            onKeyDown={handleUrlKeyDown}
            placeholder="https://example.com/photo.jpg"
            className={styles.urlInput}
            aria-label="Image URL"
          />
          <button
            type="button"
            onClick={handleUrlEmbed}
            disabled={!imageUrl.trim()}
            className={styles.urlBtn}
          >
            Add
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      {/* Preview */}
      {previewUrl && (
        <div className={styles.preview}>
          <img
            src={previewUrl}
            alt="Uploaded"
            className={styles.previewImg}
          />
        </div>
      )}
    </div>
  );
}
