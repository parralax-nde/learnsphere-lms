import { useState, useRef } from 'react';
import { Upload, Link, ImageOff } from 'lucide-react';
import { Tooltip } from '../Tooltip';

export function CoverImageStep({ values, errors, onChange }) {
  const [tab, setTab] = useState('url'); // 'url' | 'upload'
  const [preview, setPreview] = useState(values.coverImageUrl || null);
  const [imageError, setImageError] = useState(false);
  const fileRef = useRef(null);

  const handleUrlChange = (e) => {
    const url = e.target.value;
    onChange('coverImageUrl', url);
    setPreview(url);
    setImageError(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      onChange('coverImageUrl', '');
      setPreview(null);
      setImageError(false);
      // Communicate the error through the parent validation mechanism
      onChange('_coverImageFileError', 'Image must be smaller than 5 MB');
      return;
    }

    onChange('_coverImageFileError', '');

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target.result;
      onChange('coverImageUrl', dataUrl);
      setPreview(dataUrl);
      setImageError(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="step-content">
      <h2 className="step-heading">Cover Image</h2>
      <p className="step-subheading">
        A great cover image makes your course stand out. Use a 16:9 ratio image for the best results.
      </p>

      {/* Tab switcher */}
      <div className="cover-tabs" role="tablist">
        <button
          role="tab"
          type="button"
          className={`cover-tab ${tab === 'url' ? 'cover-tab--active' : ''}`}
          aria-selected={tab === 'url'}
          onClick={() => setTab('url')}
        >
          <Link size={16} />
          Image URL
        </button>
        <button
          role="tab"
          type="button"
          className={`cover-tab ${tab === 'upload' ? 'cover-tab--active' : ''}`}
          aria-selected={tab === 'upload'}
          onClick={() => setTab('upload')}
        >
          <Upload size={16} />
          Upload File
        </button>
      </div>

      {tab === 'url' ? (
        <div className="form-field">
          <label className="form-label" htmlFor="coverImageUrl">
            Image URL
            <Tooltip text="Paste the direct URL of your cover image. Use high-resolution images (at least 1280×720px). HTTPS URLs are recommended." />
          </label>
          <input
            id="coverImageUrl"
            type="url"
            className={`form-input ${errors.coverImageUrl ? 'input-error' : ''}`}
            value={tab === 'url' ? values.coverImageUrl : ''}
            onChange={handleUrlChange}
            placeholder="https://example.com/my-course-cover.jpg"
          />
          {errors.coverImageUrl && (
            <span className="field-error" role="alert">{errors.coverImageUrl}</span>
          )}
        </div>
      ) : (
        <div className="form-field">
          <label className="form-label">
            Upload Image
            <Tooltip text="Upload a JPG, PNG, or WebP image. Max file size: 5 MB. Recommended dimensions: 1280×720px (16:9)." />
          </label>
          <div
            className="file-drop-zone"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            tabIndex={0}
            role="button"
            aria-label="Upload cover image"
          >
            <Upload size={32} className="drop-icon" />
            <p>Click to browse or drag & drop</p>
            <p className="drop-hint">JPG, PNG, WebP · Max 5 MB</p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>
          {errors.coverImageUrl && (
            <span className="field-error" role="alert">{errors.coverImageUrl}</span>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="cover-preview-wrapper">
        {preview && !imageError ? (
          <img
            src={preview}
            alt="Course cover preview"
            className="cover-preview"
            onError={() => setImageError(true)}
          />
        ) : preview && imageError ? (
          <div className="cover-preview-placeholder">
            <ImageOff size={40} />
            <p>Could not load image preview</p>
          </div>
        ) : (
          <div className="cover-preview-placeholder">
            <ImageOff size={40} />
            <p>No image selected</p>
          </div>
        )}
      </div>
    </div>
  );
}


