import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadAvatar, deleteAvatar } from '../../services/avatarService';
import './AvatarUpload.css';

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * AvatarUpload component
 *
 * Props:
 *   authToken   {string}            - JWT token for authenticated requests
 *   currentAvatarUrl {string|null}  - Current avatar URL (from user profile)
 *   onAvatarChange {function}       - Callback invoked with new URL (or null on delete)
 */
export default function AvatarUpload({ authToken, currentAvatarUrl, onAvatarChange }) {
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function clearMessages() {
    setError('');
    setSuccess('');
  }

  const onDrop = useCallback(
    async (acceptedFiles, rejectedFiles) => {
      clearMessages();
      setPreview(null);

      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0];
        if (rejection.errors.some((e) => e.code === 'file-too-large')) {
          setError('File is too large. Maximum size is 5 MB.');
        } else if (rejection.errors.some((e) => e.code === 'file-invalid-type')) {
          setError('Unsupported file type. Please upload a JPEG, PNG, GIF, or WebP image.');
        } else {
          setError('File could not be accepted. Please try again.');
        }
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];

      // Show local preview
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);

      // Upload
      setUploading(true);
      setProgress(0);
      try {
        const result = await uploadAvatar(file, authToken, setProgress);
        setSuccess('Avatar updated successfully!');
        onAvatarChange && onAvatarChange(result.avatarUrl);
      } catch (err) {
        const message =
          err?.response?.data?.error || 'Upload failed. Please try again.';
        setError(message);
        setPreview(null);
      } finally {
        setUploading(false);
        setProgress(0);
      }
    },
    [authToken, onAvatarChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE_BYTES,
    multiple: false,
    disabled: uploading,
  });

  async function handleDelete() {
    clearMessages();
    setUploading(true);
    try {
      await deleteAvatar(authToken);
      setPreview(null);
      setSuccess('Avatar removed.');
      onAvatarChange && onAvatarChange(null);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to remove avatar. Please try again.');
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview || currentAvatarUrl;

  return (
    <div className="avatar-upload">
      {/* Current / preview image */}
      <div className="avatar-upload__preview">
        {displayUrl ? (
          <img
            src={displayUrl}
            alt="Profile avatar"
            className="avatar-upload__image"
          />
        ) : (
          <div className="avatar-upload__placeholder" aria-label="No avatar">
            👤
          </div>
        )}
        {(displayUrl) && !uploading && (
          <button
            className="avatar-upload__delete-btn"
            onClick={handleDelete}
            aria-label="Remove avatar"
            type="button"
          >
            ✕
          </button>
        )}
      </div>

      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`avatar-upload__dropzone${isDragActive ? ' avatar-upload__dropzone--active' : ''}`}
        data-testid="dropzone"
      >
        <input {...getInputProps()} data-testid="file-input" />
        {isDragActive ? (
          <p className="avatar-upload__dropzone-text">Drop the image here…</p>
        ) : (
          <>
            <p className="avatar-upload__dropzone-text">
              {uploading ? 'Uploading…' : 'Click or drag an image here to upload'}
            </p>
            <p className="avatar-upload__dropzone-hint">
              JPEG, PNG, GIF or WebP · Max 5 MB
            </p>
          </>
        )}
      </div>

      {/* Upload progress */}
      {uploading && progress > 0 && (
        <div className="avatar-upload__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="avatar-upload__progress-bar">
            <div
              className="avatar-upload__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="avatar-upload__progress-label">{progress}%</p>
        </div>
      )}

      {/* Messages */}
      {error && <p className="avatar-upload__error" role="alert">{error}</p>}
      {success && <p className="avatar-upload__success" role="status">{success}</p>}
    </div>
  );
}
