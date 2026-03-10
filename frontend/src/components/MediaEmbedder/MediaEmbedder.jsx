import { useState } from 'react';
import VideoEmbedder from './VideoEmbedder';
import ImageUploader from './ImageUploader';
import styles from './MediaEmbedder.module.css';

const TABS = [
  { id: 'video', label: '🎬 Video' },
  { id: 'image', label: '🖼️ Image' },
];

/**
 * MediaEmbedder – top-level component for the lesson editor's media tab.
 * Lets the author switch between video (YouTube/Vimeo) and image embedding.
 *
 * Props:
 *   onEmbed({ type, ...data })  – called when a media item is confirmed
 *   apiBase                     – API base URL (forwarded to ImageUploader)
 */
export default function MediaEmbedder({ onEmbed, apiBase = '' }) {
  const [activeTab, setActiveTab] = useState('video');

  function handleVideoEmbed(embedData) {
    onEmbed?.({ type: 'video', ...embedData });
  }

  function handleImageUpload(imageData) {
    onEmbed?.({ type: 'image', ...imageData });
  }

  return (
    <div className={styles.container}>
      <div className={styles.tabList} role="tablist" aria-label="Media type">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`tabpanel-${tab.id}`}
            id={`tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className={styles.panel}
      >
        {activeTab === 'video' && (
          <VideoEmbedder onEmbed={handleVideoEmbed} />
        )}
        {activeTab === 'image' && (
          <ImageUploader onUpload={handleImageUpload} apiBase={apiBase} />
        )}
      </div>
    </div>
  );
}
