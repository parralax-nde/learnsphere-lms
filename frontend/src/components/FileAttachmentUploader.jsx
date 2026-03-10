import { useState, useRef, useCallback } from 'react';
import { uploadAttachment, listAttachments, getDownloadUrl, deleteAttachment } from '../api/attachments.js';

/** Maximum file size accepted by the server (10 MB). */
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

/** MIME types that the server accepts. */
const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/javascript',
  'text/javascript',
  'application/json',
  'text/csv',
  'text/html',
  'text/css',
  'text/markdown',
  'application/zip',
  'application/x-zip-compressed',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

/** Human-readable file size. */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Derive a simple icon character from a MIME type. */
function fileIcon(mimeType) {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType.startsWith('image/')) return '🖼️';
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('gzip')) return '🗜️';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType === 'text/csv') return '📊';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
  return '📎';
}

/**
 * FileAttachmentUploader
 *
 * Props:
 *   lessonId  {string}   – required; the lesson this component manages attachments for
 *   readOnly  {boolean}  – optional; hides the upload zone and delete buttons
 *   token     {string}   – optional; JWT to include in API calls (can also be set globally via setAuthToken)
 */
export default function FileAttachmentUploader({ lessonId, readOnly = false }) {
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState([]); // { id, name, progress, error }
  const [fetchError, setFetchError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef(null);

  // ── Load existing attachments ──────────────────────────────────────────────

  const loadAttachments = useCallback(async () => {
    try {
      const data = await listAttachments(lessonId);
      setAttachments(data);
      setLoaded(true);
      setFetchError(null);
    } catch (err) {
      setFetchError(err.response?.data?.error || err.message);
    }
  }, [lessonId]);

  // Trigger load on first render
  useState(() => {
    loadAttachments();
  });

  // ── File validation ────────────────────────────────────────────────────────

  function validateFile(file) {
    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      return `"${file.name}" has an unsupported file type (${file.type || 'unknown'}).`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return `"${file.name}" is too large (${formatBytes(file.size)}). Maximum is 10 MB.`;
    }
    return null;
  }

  // ── Upload a single file ───────────────────────────────────────────────────

  async function handleFile(file) {
    const validationError = validateFile(file);
    const tempId = `${Date.now()}-${Math.random()}`;

    if (validationError) {
      setUploads((prev) => [...prev, { id: tempId, name: file.name, progress: 0, error: validationError }]);
      return;
    }

    setUploads((prev) => [...prev, { id: tempId, name: file.name, progress: 0, error: null }]);

    try {
      const attachment = await uploadAttachment(lessonId, file, (pct) => {
        setUploads((prev) =>
          prev.map((u) => (u.id === tempId ? { ...u, progress: pct } : u)),
        );
      });

      setAttachments((prev) => [...prev, attachment]);
      // Remove the in-progress entry after a short delay
      setTimeout(() => {
        setUploads((prev) => prev.filter((u) => u.id !== tempId));
      }, 1200);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Upload failed';
      setUploads((prev) =>
        prev.map((u) => (u.id === tempId ? { ...u, error: msg } : u)),
      );
    }
  }

  // ── Event handlers ─────────────────────────────────────────────────────────

  function onInputChange(e) {
    Array.from(e.target.files).forEach(handleFile);
    e.target.value = '';
  }

  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    Array.from(e.dataTransfer.files).forEach(handleFile);
  }

  function onDragOver(e) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  async function handleDownload(attachment) {
    try {
      const { url } = await getDownloadUrl(attachment.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert(err.response?.data?.error || 'Could not generate download link');
    }
  }

  async function handleDelete(attachment) {
    if (!window.confirm(`Delete "${attachment.originalName}"?`)) return;
    try {
      await deleteAttachment(attachment.id);
      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete attachment');
    }
  }

  function dismissUpload(id) {
    setUploads((prev) => prev.filter((u) => u.id !== id));
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      <h3 style={styles.heading}>📎 Lesson Attachments</h3>

      {fetchError && (
        <div style={styles.errorBanner} role="alert">
          {fetchError}
        </div>
      )}

      {/* ── Upload zone (hidden in readOnly mode) ── */}
      {!readOnly && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Drop files here or click to upload"
          style={{ ...styles.dropZone, ...(isDragging ? styles.dropZoneDragging : {}) }}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <span style={styles.dropIcon}>☁️</span>
          <p style={styles.dropText}>
            Drag &amp; drop files here, or <span style={styles.browseLink}>browse</span>
          </p>
          <p style={styles.dropHint}>
            PDF, Word, Excel, PowerPoint, plain text, code files, images, ZIP · Max 10 MB
          </p>
          <input
            ref={inputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={onInputChange}
            accept={ACCEPTED_MIME_TYPES.join(',')}
            aria-hidden="true"
          />
        </div>
      )}

      {/* ── In-progress / errored uploads ── */}
      {uploads.length > 0 && (
        <ul style={styles.uploadList} aria-label="Upload progress">
          {uploads.map((u) => (
            <li key={u.id} style={styles.uploadItem}>
              <span style={styles.uploadName}>{u.name}</span>
              {u.error ? (
                <span style={styles.uploadError} role="alert">
                  {u.error}
                  <button
                    style={styles.dismissBtn}
                    onClick={() => dismissUpload(u.id)}
                    aria-label={`Dismiss error for ${u.name}`}
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <span style={styles.progressWrap} aria-label={`${u.progress}% uploaded`}>
                  <span style={{ ...styles.progressBar, width: `${u.progress}%` }} />
                  <span style={styles.progressText}>{u.progress}%</span>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* ── Attachment list ── */}
      {loaded && attachments.length === 0 && uploads.length === 0 && (
        <p style={styles.empty}>No attachments yet.</p>
      )}

      {attachments.length > 0 && (
        <ul style={styles.attachList} aria-label="Attachments">
          {attachments.map((a) => (
            <li key={a.id} style={styles.attachItem}>
              <span style={styles.attachIcon}>{fileIcon(a.mimeType)}</span>
              <span style={styles.attachName} title={a.originalName}>
                {a.originalName}
              </span>
              <span style={styles.attachSize}>{formatBytes(a.size)}</span>
              <button
                style={styles.actionBtn}
                onClick={() => handleDownload(a)}
                aria-label={`Download ${a.originalName}`}
              >
                ⬇ Download
              </button>
              {!readOnly && (
                <button
                  style={{ ...styles.actionBtn, ...styles.deleteBtn }}
                  onClick={() => handleDelete(a)}
                  aria-label={`Delete ${a.originalName}`}
                >
                  🗑 Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = {
  container: {
    fontFamily: 'inherit',
    maxWidth: 680,
    margin: '0 auto',
    padding: '1.5rem',
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  heading: {
    fontSize: '1.1rem',
    fontWeight: 600,
    marginBottom: '1rem',
    color: '#1a202c',
  },
  errorBanner: {
    padding: '0.75rem 1rem',
    background: '#fff5f5',
    border: '1px solid #fc8181',
    borderRadius: 8,
    color: '#c53030',
    marginBottom: '1rem',
    fontSize: '0.875rem',
  },
  dropZone: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '2rem',
    border: '2px dashed #cbd5e0',
    borderRadius: 12,
    cursor: 'pointer',
    transition: 'border-color 0.15s, background 0.15s',
    marginBottom: '1.25rem',
    textAlign: 'center',
  },
  dropZoneDragging: {
    borderColor: '#4f46e5',
    background: '#eef2ff',
  },
  dropIcon: { fontSize: '2.5rem' },
  dropText: { fontSize: '0.95rem', color: '#4a5568', margin: 0 },
  browseLink: { color: '#4f46e5', fontWeight: 500 },
  dropHint: { fontSize: '0.75rem', color: '#a0aec0', margin: 0 },
  uploadList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem',
  },
  uploadItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    background: '#f7fafc',
    borderRadius: 8,
    fontSize: '0.875rem',
  },
  uploadName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#2d3748',
  },
  progressWrap: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: 120,
    height: 6,
    background: '#e2e8f0',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    background: '#4f46e5',
    borderRadius: 9999,
    transition: 'width 0.2s',
  },
  progressText: {
    marginLeft: 8,
    fontSize: '0.75rem',
    color: '#718096',
    position: 'absolute',
    right: -30,
  },
  uploadError: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    color: '#c53030',
    fontSize: '0.8rem',
  },
  dismissBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#c53030',
    padding: 0,
    fontSize: '0.85rem',
    lineHeight: 1,
  },
  empty: {
    color: '#a0aec0',
    fontSize: '0.875rem',
    textAlign: 'center',
    padding: '1rem 0',
  },
  attachList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  attachItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.625rem 0.875rem',
    background: '#f7fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    fontSize: '0.875rem',
  },
  attachIcon: { fontSize: '1.25rem', flexShrink: 0 },
  attachName: {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: '#2d3748',
    fontWeight: 500,
  },
  attachSize: { color: '#718096', fontSize: '0.8rem', flexShrink: 0 },
  actionBtn: {
    padding: '0.3rem 0.65rem',
    background: '#eef2ff',
    color: '#4f46e5',
    border: '1px solid #c7d2fe',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 500,
    flexShrink: 0,
  },
  deleteBtn: {
    background: '#fff5f5',
    color: '#c53030',
    border: '1px solid #feb2b2',
  },
};
