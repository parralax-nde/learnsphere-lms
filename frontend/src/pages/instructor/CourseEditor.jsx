import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '../../components/Layout.jsx';
import { getCourse, createCourse, updateCourse } from '../../api/courses.js';

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1.5px solid #E2E8F0',
  borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit',
};

const btn = (color, disabled) => ({
  padding: '10px 20px', border: 'none', borderRadius: 8,
  background: disabled ? '#CBD5E0' : color,
  color: '#fff', fontSize: 14, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export default function CourseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState([{ title: '', content: '' }]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    getCourse(id)
      .then((c) => {
        setTitle(c.title);
        setDescription(c.description);
        setSections(c.sections.length > 0 ? c.sections : [{ title: '', content: '' }]);
      })
      .catch(() => setError('Failed to load course'))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  function addSection() {
    setSections((s) => [...s, { title: '', content: '' }]);
  }

  function removeSection(i) {
    setSections((s) => s.filter((_, idx) => idx !== i));
  }

  function updateSection(i, field, val) {
    setSections((s) => s.map((sec, idx) => (idx === i ? { ...sec, [field]: val } : sec)));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = { title, description, sections };
      if (isEdit) {
        await updateCourse(id, data);
      } else {
        await createCourse(data);
      }
      navigate('/instructor');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save course');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Layout><p style={{ padding: '2rem' }}>Loading…</p></Layout>;

  return (
    <Layout title={isEdit ? 'Edit Course' : 'New Course'}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <button onClick={() => navigate('/instructor')} style={{
            background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 8,
            padding: '8px 16px', fontSize: 14, cursor: 'pointer', color: '#4A5568',
          }}>
            ← Back
          </button>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>{isEdit ? 'Edit Course' : 'Create New Course'}</h1>
        </div>

        {error && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FC8181', color: '#C53030', padding: '10px 14px', borderRadius: 8, marginBottom: '1.5rem', fontSize: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* Course info */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: '1rem', color: '#2D3748' }}>Course Details</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>
                Course Title *
              </label>
              <input
                style={inputStyle}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to JavaScript"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>
                Description *
              </label>
              <textarea
                style={{ ...inputStyle, minHeight: 100, resize: 'vertical' }}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what students will learn in this course…"
                required
              />
            </div>
          </div>

          {/* Sections */}
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: '#2D3748' }}>
                Course Sections ({sections.length})
              </h2>
              <button type="button" onClick={addSection} style={{
                background: '#EBF4FF', color: '#3182CE', border: 'none',
                borderRadius: 6, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
                + Add Section
              </button>
            </div>

            {sections.map((sec, i) => (
              <div key={i} style={{
                background: '#F7FAFC', border: '1px solid #E2E8F0',
                borderRadius: 10, padding: '1rem', marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#5a4fcf' }}>Section {i + 1}</span>
                  {sections.length > 1 && (
                    <button type="button" onClick={() => removeSection(i)} style={{
                      background: '#FFF5F5', color: '#C53030', border: 'none',
                      borderRadius: 6, padding: '4px 10px', fontSize: 12, cursor: 'pointer',
                    }}>
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#718096', marginBottom: 4 }}>
                    Section Title *
                  </label>
                  <input
                    style={inputStyle}
                    value={sec.title}
                    onChange={(e) => updateSection(i, 'title', e.target.value)}
                    placeholder="e.g. Variables and Data Types"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#718096', marginBottom: 4 }}>
                    Content *
                  </label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                    value={sec.content}
                    onChange={(e) => updateSection(i, 'content', e.target.value)}
                    placeholder="Lesson content, notes, links…"
                    required
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => navigate('/instructor')} style={{
              padding: '10px 20px', background: 'none', border: '1.5px solid #E2E8F0',
              borderRadius: 8, fontSize: 14, cursor: 'pointer', color: '#4A5568',
            }}>
              Cancel
            </button>
            <button type="submit" style={btn('#5a4fcf', saving)} disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
