import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { courseService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function CourseFormPage() {
  const { id } = useParams(); // present when editing
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    thumbnailUrl: '',
  });
  const [status, setStatus] = useState('DRAFT');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEditing);

  useEffect(() => {
    if (!isEditing) return;
    courseService
      .get(id)
      .then((res) => {
        const c = res.data;
        setForm({
          title: c.title,
          description: c.description,
          category: c.category || '',
          thumbnailUrl: c.thumbnailUrl || '',
        });
        setStatus(c.status);
      })
      .catch(() => setError('Failed to load course'))
      .finally(() => setLoading(false));
  }, [id, isEditing]);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (isEditing) {
        await courseService.update(id, form);
      } else {
        await courseService.create(form);
      }
      navigate('/courses');
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitForReview() {
    if (!window.confirm('Submit this course for admin review?')) return;
    setSaving(true);
    try {
      await courseService.submit(id);
      navigate('/courses');
    } catch (err) {
      setError(err.response?.data?.error || 'Submit failed');
    } finally {
      setSaving(false);
    }
  }

  const canEdit = !isEditing || status === 'DRAFT' || status === 'REJECTED';

  if (loading) return <p className="page-content">Loading…</p>;

  return (
    <div className="page">
      <header className="page-header">
        <h1>LearnSphere</h1>
        <div className="header-right">
          <Link to="/courses" className="btn-secondary">
            ← Back to Courses
          </Link>
        </div>
      </header>

      <main className="page-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <h2>{isEditing ? 'Edit Course' : 'Create New Course'}</h2>
          {isEditing && <StatusBadge status={status} />}
        </div>

        {isEditing && status === 'REJECTED' && (
          <div className="rejection-note">
            <strong>This course was rejected.</strong> Please update your content and re-submit.
          </div>
        )}

        {error && <div className="error-msg">{error}</div>}

        {!canEdit ? (
          <div className="info-msg">
            This course is currently <strong>{status.replace('_', ' ')}</strong> and cannot be
            edited.
          </div>
        ) : (
          <form className="course-form" onSubmit={handleSave}>
            <label>
              Title *
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={200}
              />
            </label>

            <label>
              Description *
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                required
                rows={5}
              />
            </label>

            <label>
              Category
              <input
                type="text"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="e.g. Engineering, Design, Business"
              />
            </label>

            <label>
              Thumbnail URL
              <input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
                placeholder="https://…"
              />
            </label>

            <div className="form-actions">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>

              {isEditing && (status === 'DRAFT' || status === 'REJECTED') && (
                <button
                  type="button"
                  className="btn-accent"
                  onClick={handleSubmitForReview}
                  disabled={saving}
                >
                  Submit for Review
                </button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
