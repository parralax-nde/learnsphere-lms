import { useState } from 'react';
import MediaEmbedder from '../MediaEmbedder/MediaEmbedder';
import styles from './LessonEditor.module.css';

/**
 * Renders a single embedded media block inside the lesson body.
 */
function MediaBlock({ item }) {
  if (item.type === 'video') {
    return (
      <div className={styles.mediaBlock}>
        <div className={styles.iframeWrapper}>
          <iframe
            src={item.embedUrl}
            title={`Embedded ${item.provider} video`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className={styles.iframe}
          />
        </div>
        <p className={styles.mediaCaption}>
          {item.provider === 'youtube' ? 'YouTube' : 'Vimeo'} video
        </p>
      </div>
    );
  }

  if (item.type === 'image') {
    return (
      <div className={styles.mediaBlock}>
        <img
          src={item.url}
          alt="Lesson media"
          className={styles.embeddedImage}
        />
      </div>
    );
  }

  return null;
}

/**
 * LessonEditor – a minimal lesson editing page that integrates the
 * MediaEmbedder component for adding videos and images to lesson content.
 *
 * Props:
 *   apiBase – base URL for API calls (optional, defaults to '')
 */
export default function LessonEditor({ apiBase = '' }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mediaItems, setMediaItems] = useState([]);
  const [showMediaEmbedder, setShowMediaEmbedder] = useState(false);

  function handleEmbed(mediaData) {
    setMediaItems((prev) => [...prev, { id: Date.now(), ...mediaData }]);
    setShowMediaEmbedder(false);
  }

  function removeMedia(id) {
    setMediaItems((prev) => prev.filter((item) => item.id !== id));
  }

  return (
    <div className={styles.editor}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Lesson Editor</h1>
      </header>

      <div className={styles.field}>
        <label htmlFor="lesson-title" className={styles.label}>
          Lesson Title
        </label>
        <input
          id="lesson-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter lesson title…"
          className={styles.titleInput}
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="lesson-body" className={styles.label}>
          Content
        </label>
        <textarea
          id="lesson-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write your lesson content here…"
          rows={8}
          className={styles.textarea}
        />
      </div>

      {/* Embedded media */}
      {mediaItems.length > 0 && (
        <section className={styles.mediaSection} aria-label="Embedded media">
          <h2 className={styles.mediaSectionHeading}>Media</h2>
          {mediaItems.map((item) => (
            <div key={item.id} className={styles.mediaItemWrapper}>
              <MediaBlock item={item} />
              <button
                type="button"
                onClick={() => removeMedia(item.id)}
                className={styles.removeBtn}
                aria-label="Remove media"
              >
                ✕ Remove
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Media embedder toggle */}
      <div className={styles.toolbarRow}>
        <button
          type="button"
          onClick={() => setShowMediaEmbedder((v) => !v)}
          className={styles.addMediaBtn}
          aria-expanded={showMediaEmbedder}
        >
          {showMediaEmbedder ? '✕ Cancel' : '+ Add Media'}
        </button>
      </div>

      {showMediaEmbedder && (
        <div className={styles.embedderSection}>
          <MediaEmbedder onEmbed={handleEmbed} apiBase={apiBase} />
        </div>
      )}

      <div className={styles.actions}>
        <button type="button" className={styles.saveBtn}>
          Save Lesson
        </button>
      </div>
    </div>
  );
}
