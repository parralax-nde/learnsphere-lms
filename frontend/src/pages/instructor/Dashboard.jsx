import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, StatusBadge } from '../../components/Layout.jsx';
import { listCourses, deleteCourse, submitCourse } from '../../api/courses.js';

const btn = (color, disabled) => ({
  padding: '6px 14px', border: 'none', borderRadius: 6,
  background: disabled ? '#CBD5E0' : color,
  color: '#fff', fontSize: 13, fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? .7 : 1,
});

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null); // courseId currently processing

  async function load() {
    try {
      setCourses(await listCourses());
    } catch {
      setError('Failed to load courses');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(id) {
    setBusy(id);
    try {
      const updated = await submitCourse(id);
      setCourses((cs) => cs.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit course');
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this course? This action cannot be undone.')) return;
    setBusy(id);
    try {
      await deleteCourse(id);
      setCourses((cs) => cs.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete course');
    } finally {
      setBusy(null);
    }
  }

  const canEdit = (s) => ['DRAFT', 'REJECTED'].includes(s);
  const canSubmit = (s) => ['DRAFT', 'REJECTED'].includes(s);
  const canDelete = (s) => ['DRAFT', 'REJECTED'].includes(s);

  return (
    <Layout title="My Courses">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>My Courses</h1>
        <button
          style={{ ...btn('#5a4fcf'), padding: '10px 20px', fontSize: 14 }}
          onClick={() => navigate('/instructor/courses/new')}
        >
          + New Course
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : courses.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center',
          border: '2px dashed #e2e8f0',
        }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>📝</div>
          <h3 style={{ color: '#4a5568', marginBottom: '0.5rem' }}>No courses yet</h3>
          <p style={{ color: '#718096', marginBottom: '1.5rem' }}>Create your first course to get started.</p>
          <button style={{ ...btn('#5a4fcf'), padding: '10px 20px' }}
            onClick={() => navigate('/instructor/courses/new')}>
            Create Course
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {courses.map((course) => (
            <div key={course.id} style={{
              background: '#fff', borderRadius: 12, padding: '1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,.08)',
              border: course.status === 'REJECTED' ? '1.5px solid #FC8181' : '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: 18, fontWeight: 700 }}>{course.title}</h3>
                    <StatusBadge status={course.status} />
                  </div>
                  <p style={{ color: '#718096', fontSize: 14, marginBottom: '0.5rem' }}>
                    {course.description}
                  </p>
                  <p style={{ fontSize: 13, color: '#A0AEC0' }}>
                    {course.sections?.length || 0} section{(course.sections?.length || 0) !== 1 ? 's' : ''}
                    {' · '}Created {new Date(course.createdAt).toLocaleDateString()}
                  </p>
                  {course.status === 'REJECTED' && course.rejectionNote && (
                    <div style={{
                      marginTop: '0.75rem', background: '#FFF5F5', borderLeft: '4px solid #FC8181',
                      padding: '0.75rem 1rem', borderRadius: '0 8px 8px 0',
                    }}>
                      <strong style={{ color: '#C53030', fontSize: 13 }}>Reviewer feedback:</strong>
                      <p style={{ color: '#742A2A', fontSize: 13, marginTop: 4 }}>{course.rejectionNote}</p>
                    </div>
                  )}
                  {course.status === 'PENDING_REVIEW' && (
                    <p style={{ marginTop: '0.5rem', color: '#744210', fontSize: 13 }}>
                      ⏳ Submitted {course.submittedAt ? new Date(course.submittedAt).toLocaleDateString() : ''}. Awaiting admin review.
                    </p>
                  )}
                  {course.status === 'PUBLISHED' && (
                    <p style={{ marginTop: '0.5rem', color: '#22543D', fontSize: 13 }}>
                      ✅ Published {course.reviewedAt ? new Date(course.reviewedAt).toLocaleDateString() : ''}
                    </p>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                  {canEdit(course.status) && (
                    <button
                      style={btn('#3182CE', busy === course.id)}
                      disabled={busy === course.id}
                      onClick={() => navigate(`/instructor/courses/${course.id}/edit`)}
                    >
                      Edit
                    </button>
                  )}
                  {canSubmit(course.status) && (
                    <button
                      style={btn('#38A169', busy === course.id)}
                      disabled={busy === course.id}
                      onClick={() => handleSubmit(course.id)}
                    >
                      {busy === course.id ? 'Submitting…' : 'Submit for Review'}
                    </button>
                  )}
                  {canDelete(course.status) && (
                    <button
                      style={btn('#E53E3E', busy === course.id)}
                      disabled={busy === course.id}
                      onClick={() => handleDelete(course.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
