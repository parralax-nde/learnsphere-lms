import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listCourses, publishCourse, rejectCourse, unpublishCourse } from '../api/courses.js';
import StatusBadge from '../components/StatusBadge.jsx';

const s = {
  page: { maxWidth: '900px', margin: '0 auto', width: '100%' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' },
  logo: { fontSize: '22px', fontWeight: '700', color: '#3b82f6' },
  headerRight: { display: 'flex', gap: '10px', alignItems: 'center' },
  sectionTitle: { fontSize: '20px', fontWeight: '700', marginBottom: '8px', color: '#111827' },
  sectionSub: { fontSize: '14px', color: '#6b7280', marginBottom: '20px' },
  tabs: { display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' },
  tab: (active) => ({
    padding: '8px 16px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', border: 'none',
    borderBottom: active ? '2px solid #3b82f6' : '2px solid transparent', marginBottom: '-2px',
    backgroundColor: 'transparent', color: active ? '#3b82f6' : '#6b7280',
  }),
  card: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', padding: '20px', marginBottom: '14px' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' },
  cardTitle: { fontSize: '17px', fontWeight: '700', color: '#111827', marginBottom: '4px' },
  cardDesc: { fontSize: '14px', color: '#6b7280', marginBottom: '10px', lineHeight: '1.5' },
  cardMeta: { fontSize: '13px', color: '#9ca3af', marginBottom: '12px' },
  actions: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  btn: (variant) => ({
    padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600',
    ...(variant === 'publish' ? { backgroundColor: '#10b981', color: '#fff' } :
        variant === 'unpublish' ? { backgroundColor: '#f59e0b', color: '#fff' } :
        variant === 'reject'   ? { backgroundColor: '#ef4444', color: '#fff' } :
        { backgroundColor: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db' }),
  }),
  btnDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  empty: { textAlign: 'center', color: '#9ca3af', padding: '40px 0', fontSize: '15px' },
  error: { backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '12px', color: '#991b1b', marginBottom: '16px' },
  successBanner: { backgroundColor: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', color: '#166534', marginBottom: '16px' },
};

export default function AdminReview() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [tab, setTab] = useState('pending'); // 'pending' | 'published'

  const userJson = sessionStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') {
      navigate('/login');
      return;
    }
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

  async function handlePublish(courseId) {
    setActionLoading(courseId + '_publish');
    setError('');
    setSuccess('');
    try {
      const updated = await publishCourse(courseId);
      setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)));
      setSuccess(`Course "${updated.title}" has been published and is now visible to students.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish course.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(courseId, courseTitle) {
    const note = window.prompt(`Rejection reason for "${courseTitle}" (optional):`);
    if (note === null) return; // Cancelled

    setActionLoading(courseId + '_reject');
    setError('');
    setSuccess('');
    try {
      const updated = await rejectCourse(courseId, note);
      setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)));
      setSuccess(`Course "${updated.title}" has been rejected.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reject course.');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleUnpublish(courseId, courseTitle) {
    if (!window.confirm(`Unpublish "${courseTitle}"? The course will be removed from public view and returned to draft status. It can be re-published later.`)) return;

    setActionLoading(courseId + '_unpublish');
    setError('');
    setSuccess('');
    try {
      const updated = await unpublishCourse(courseId);
      setCourses((prev) => prev.map((c) => (c.id === courseId ? updated : c)));
      setSuccess(`Course "${updated.title}" has been unpublished. It is no longer visible to students.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unpublish course.');
    } finally {
      setActionLoading(null);
    }
  }

  const pendingCourses = courses.filter((c) => c.status === 'PENDING_REVIEW');
  const publishedCourses = courses.filter((c) => c.status === 'PUBLISHED');
  const displayedCourses = tab === 'pending' ? pendingCourses : publishedCourses;

  return (
    <div style={s.page}>
      <div style={s.header}>
        <span style={s.logo}>LearnSphere — Admin</span>
        <div style={s.headerRight}>
          <Link to="/courses" style={{ fontSize: '14px' }}>All Courses</Link>
          <button style={s.btn('default')} onClick={logout}>Logout</button>
        </div>
      </div>

      <h1 style={s.sectionTitle}>Course Publishing</h1>
      <p style={s.sectionSub}>Review submitted courses for approval and manage published courses.</p>

      {error && <div style={s.error}>{error}</div>}
      {success && <div style={s.successBanner}>✅ {success}</div>}

      <div style={s.tabs}>
        <button style={s.tab(tab === 'pending')} onClick={() => setTab('pending')}>
          Pending Review ({pendingCourses.length})
        </button>
        <button style={s.tab(tab === 'published')} onClick={() => setTab('published')}>
          Published ({publishedCourses.length})
        </button>
      </div>

      {loading ? (
        <div style={s.empty}>Loading courses…</div>
      ) : displayedCourses.length === 0 ? (
        <div style={s.empty}>
          {tab === 'pending'
            ? '🎉 No courses pending review.'
            : 'No published courses yet.'}
        </div>
      ) : (
        displayedCourses.map((course) => (
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
              {course.submittedAt && tab === 'pending' && (
                <span> · 📬 Submitted {new Date(course.submittedAt).toLocaleDateString()}</span>
              )}
              {course.publishedAt && tab === 'published' && (
                <span> · 📅 Published {new Date(course.publishedAt).toLocaleDateString()}</span>
              )}
            </div>
            <div style={s.actions}>
              <Link to={`/courses/${course.id}`} style={{ textDecoration: 'none' }}>
                <button style={s.btn('default')}>View Details</button>
              </Link>
              {tab === 'pending' && (
                <>
                  <button
                    style={{ ...s.btn('publish'), ...(actionLoading ? s.btnDisabled : {}) }}
                    disabled={Boolean(actionLoading)}
                    onClick={() => handlePublish(course.id)}
                  >
                    {actionLoading === course.id + '_publish' ? 'Publishing…' : '✓ Publish'}
                  </button>
                  <button
                    style={{ ...s.btn('reject'), ...(actionLoading ? s.btnDisabled : {}) }}
                    disabled={Boolean(actionLoading)}
                    onClick={() => handleReject(course.id, course.title)}
                  >
                    {actionLoading === course.id + '_reject' ? 'Rejecting…' : '✕ Reject'}
                  </button>
                </>
              )}
              {tab === 'published' && (
                <button
                  style={{ ...s.btn('unpublish'), ...(actionLoading ? s.btnDisabled : {}) }}
                  disabled={Boolean(actionLoading)}
                  onClick={() => handleUnpublish(course.id, course.title)}
                >
                  {actionLoading === course.id + '_unpublish' ? 'Unpublishing…' : '⏸ Unpublish'}
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
