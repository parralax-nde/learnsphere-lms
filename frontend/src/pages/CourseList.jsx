import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listCourses, deleteCourse, submitCourse } from '../api/courses.js';
import StatusBadge from '../components/StatusBadge.jsx';

const s = {
  page: { maxWidth: '900px', margin: '0 auto', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  logo: { fontSize: '22px', fontWeight: '700', color: '#3b82f6' },
  headerRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  userName: { fontSize: '14px', color: '#6b7280' },
  btn: (variant) => ({
    padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    ...(variant === 'primary' ? { backgroundColor: '#3b82f6', color: '#fff' } :
        variant === 'danger'  ? { backgroundColor: '#ef4444', color: '#fff' } :
        variant === 'ghost'   ? { backgroundColor: 'transparent', color: '#374151', border: '1px solid #d1d5db' } :
        { backgroundColor: '#f3f4f6', color: '#374151' }),
  }),
  card: {
    backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
    padding: '20px', marginBottom: '14px',
  },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' },
  cardTitle: { fontSize: '17px', fontWeight: '700', color: '#111827', marginBottom: '4px' },
  cardDesc: { fontSize: '14px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.5' },
  cardMeta: { fontSize: '13px', color: '#9ca3af', marginBottom: '10px' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' },
  rejectionNote: {
    backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px',
    padding: '8px 12px', fontSize: '13px', color: '#991b1b', marginBottom: '10px',
  },
  sectionTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '16px', color: '#111827' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '15px' },
  error: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', color: '#991b1b', marginBottom: '16px' },
};

export default function CourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const userJson = sessionStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const data = await listCourses();
      setCourses(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load courses.');
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    sessionStorage.clear();
    navigate('/login');
  }

  async function handleDelete(courseId) {
    if (!window.confirm('Delete this course? This action cannot be undone.')) return;
    setActionLoading(courseId + '_delete');
    try {
      await deleteCourse(courseId);
      setCourses((prev) => prev.filter((c) => c.id !== courseId));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete course.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSubmit(courseId) {
    setActionLoading(courseId + '_submit');
    try {
      const updated = await submitCourse(courseId);
      setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit course for review.');
    } finally {
      setActionLoading(null);
    }
  }

  const isInstructor = user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.logo}>LearnSphere</span>
        <div style={s.headerRight}>
          <span style={s.userName}>{user?.name || user?.email} ({user?.role})</span>
          {(isInstructor || isAdmin) && (
            <button style={s.btn('primary')} onClick={() => navigate('/courses/new')}>+ New Course</button>
          )}
          {isAdmin && (
            <button style={s.btn('ghost')} onClick={() => navigate('/admin/review')}>Review Queue</button>
          )}
          <button style={s.btn('ghost')} onClick={logout}>Logout</button>
        </div>
      </div>

      <h1 style={s.sectionTitle}>
        {isInstructor ? 'My Courses' : isAdmin ? 'All Courses' : 'Browse Courses'}
      </h1>

      {error && <div style={s.error}>{error}</div>}

      {loading ? (
        <div style={s.empty}>Loading courses…</div>
      ) : courses.length === 0 ? (
        <div style={s.empty}>
          {isInstructor ? 'No courses yet. Create your first course!' : 'No courses available.'}
        </div>
      ) : (
        courses.map((course) => {
          const canEdit = ['DRAFT', 'REJECTED'].includes(course.status);
          const canSubmit = ['DRAFT', 'REJECTED'].includes(course.status);
          const canDelete = course.status === 'DRAFT';
          const isOwner = course.instructor?.id === user?.id;

          return (
            <div key={course.id} style={s.card}>
              <div style={s.cardHeader}>
                <div>
                  <div style={s.cardTitle}>{course.title}</div>
                  <StatusBadge status={course.status} />
                </div>
              </div>
              <p style={s.cardDesc}>{course.description}</p>
              <div style={s.cardMeta}>
                {course.category && <span>📂 {course.category} · </span>}
                <span>👤 {course.instructor?.name || course.instructor?.email}</span>
                {course.publishedAt && (
                  <span> · 📅 Published {new Date(course.publishedAt).toLocaleDateString()}</span>
                )}
              </div>
              {course.rejectionNote && (
                <div style={s.rejectionNote}>
                  ⚠️ Rejection note: {course.rejectionNote}
                </div>
              )}
              {course.status === 'PENDING_REVIEW' && isOwner && (
                <div style={{ ...s.cardMeta, fontStyle: 'italic' }}>
                  Awaiting admin review…
                </div>
              )}
              <div style={s.actions}>
                <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
                  <button style={s.btn('ghost')}>View</button>
                </Link>
                {(isOwner || isAdmin) && canEdit && (
                  <Link to={`/courses/${course.id}/edit`} style={{ textDecoration: 'none' }}>
                    <button style={s.btn('ghost')}>Edit</button>
                  </Link>
                )}
                {isOwner && canSubmit && (
                  <button
                    style={s.btn('primary')}
                    disabled={actionLoading === course.id + '_submit'}
                    onClick={() => handleSubmit(course.id)}
                  >
                    {actionLoading === course.id + '_submit' ? 'Submitting…' : 'Submit for Review'}
                  </button>
                )}
                {(isOwner || isAdmin) && canDelete && (
                  <button
                    style={s.btn('danger')}
                    disabled={actionLoading === course.id + '_delete'}
                    onClick={() => handleDelete(course.id)}
                  >
                    {actionLoading === course.id + '_delete' ? 'Deleting…' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
