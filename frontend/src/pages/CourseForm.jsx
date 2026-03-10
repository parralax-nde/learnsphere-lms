import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCourse, createCourse, updateCourse } from '../api/courses.js';
import StatusBadge from '../components/StatusBadge.jsx';

const s = {
  page: { maxWidth: '640px', margin: '0 auto', width: '100%' },
  back: { display: 'inline-block', marginBottom: '16px', fontSize: '14px', color: '#3b82f6' },
  card: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', padding: '32px 28px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' },
  title: { fontSize: '20px', fontWeight: '700', color: '#111827' },
  form: { display: 'flex', flexDirection: 'column', gap: '18px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '4px' },
  label: { fontSize: '14px', fontWeight: '600', color: '#374151' },
  input: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', outline: 'none' },
  textarea: { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '15px', outline: 'none', minHeight: '120px', resize: 'vertical', fontFamily: 'inherit' },
  inputError: { border: '1px solid #ef4444' },
  fieldError: { fontSize: '13px', color: '#ef4444' },
  actions: { display: 'flex', gap: '10px', marginTop: '8px' },
  btn: (variant) => ({
    padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600',
    ...(variant === 'primary' ? { backgroundColor: '#3b82f6', color: '#fff' } :
        variant === 'accent'  ? { backgroundColor: '#10b981', color: '#fff' } :
        { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }),
  }),
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  error: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '10px 12px', fontSize: '14px', color: '#991b1b', marginBottom: '16px' },
  rejectionNote: { backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', padding: '10px 12px', fontSize: '14px', color: '#991b1b', marginBottom: '16px' },
  readonlyNote: { backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '6px', padding: '10px 12px', fontSize: '14px', color: '#1e40af', marginBottom: '16px' },
};

export default function CourseForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  const [form, setForm] = useState({ title: '', description: '', category: '', thumbnailUrl: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [course, setCourse] = useState(null);

  const userJson = sessionStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (isEditing) {
      getCourse(id)
        .then((c) => {
          setCourse(c);
          setForm({ title: c.title, description: c.description, category: c.category || '', thumbnailUrl: c.thumbnailUrl || '' });
        })
        .catch(() => setServerError('Failed to load course.'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const isEditable = !course || ['DRAFT', 'REJECTED'].includes(course.status);

  function validate() {
    const errs = {};
    if (!form.title.trim()) errs.title = 'Title is required.';
    if (form.title.length > 200) errs.title = 'Title must be at most 200 characters.';
    if (!form.description.trim()) errs.description = 'Description is required.';
    if (form.thumbnailUrl && !/^https?:\/\/.+/.test(form.thumbnailUrl)) errs.thumbnailUrl = 'Thumbnail URL must be a valid URL.';
    return errs;
  }

  async function handleSave() {
    setServerError('');
    const errs = validate();
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    try {
      if (isEditing) {
        await updateCourse(id, form);
      } else {
        const created = await createCourse(form);
        navigate(`/courses/${created.id}/edit`);
        return;
      }
      navigate('/courses');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save course.');
    } finally {
      setSaving(false);
    }
  }

  function setField(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  }

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading…</div>;

  return (
    <div style={s.page}>
      <Link to="/courses" style={s.back}>← Back to Courses</Link>
      <div style={s.card}>
        <div style={s.titleRow}>
          <h1 style={s.title}>{isEditing ? 'Edit Course' : 'Create New Course'}</h1>
          {course && <StatusBadge status={course.status} />}
        </div>

        {course?.rejectionNote && (
          <div style={s.rejectionNote}>
            ⚠️ This course was rejected: <strong>{course.rejectionNote}</strong>. Please update your content and re-submit.
          </div>
        )}

        {!isEditable && (
          <div style={s.readonlyNote}>
            ℹ️ This course is currently <strong>{course.status.replace('_', ' ')}</strong> and cannot be edited.
          </div>
        )}

        {serverError && <div style={s.error}>{serverError}</div>}

        <div style={s.form}>
          <div style={s.fieldGroup}>
            <label htmlFor="title" style={s.label}>Title *</label>
            <input
              id="title" value={form.title} disabled={!isEditable || saving}
              onChange={(e) => setField('title', e.target.value)}
              style={{ ...s.input, ...(fieldErrors.title ? s.inputError : {}) }}
              placeholder="Course title"
            />
            {fieldErrors.title && <span style={s.fieldError}>{fieldErrors.title}</span>}
          </div>

          <div style={s.fieldGroup}>
            <label htmlFor="description" style={s.label}>Description *</label>
            <textarea
              id="description" value={form.description} disabled={!isEditable || saving}
              onChange={(e) => setField('description', e.target.value)}
              style={{ ...s.textarea, ...(fieldErrors.description ? s.inputError : {}) }}
              placeholder="What will students learn in this course?"
            />
            {fieldErrors.description && <span style={s.fieldError}>{fieldErrors.description}</span>}
          </div>

          <div style={s.fieldGroup}>
            <label htmlFor="category" style={s.label}>Category</label>
            <input
              id="category" value={form.category} disabled={!isEditable || saving}
              onChange={(e) => setField('category', e.target.value)}
              style={s.input} placeholder="e.g. Technology, Business, Design"
            />
          </div>

          <div style={s.fieldGroup}>
            <label htmlFor="thumbnailUrl" style={s.label}>Thumbnail URL</label>
            <input
              id="thumbnailUrl" value={form.thumbnailUrl} disabled={!isEditable || saving}
              onChange={(e) => setField('thumbnailUrl', e.target.value)}
              style={{ ...s.input, ...(fieldErrors.thumbnailUrl ? s.inputError : {}) }}
              placeholder="https://example.com/image.jpg"
            />
            {fieldErrors.thumbnailUrl && <span style={s.fieldError}>{fieldErrors.thumbnailUrl}</span>}
          </div>

          {isEditable && (
            <div style={s.actions}>
              <button style={{ ...s.btn('primary'), ...(saving ? s.btnDisabled : {}) }} disabled={saving} onClick={handleSave}>
                {saving ? 'Saving…' : 'Save as Draft'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
