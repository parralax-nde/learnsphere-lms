import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getCourse } from '../api/courses.js';
import StatusBadge from '../components/StatusBadge.jsx';

const s = {
  page: { maxWidth: '720px', margin: '0 auto', width: '100%' },
  back: { display: 'inline-block', marginBottom: '16px', fontSize: '14px', color: '#3b82f6' },
  card: { backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 1px 6px rgba(0,0,0,0.07)', padding: '32px 28px' },
  titleRow: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' },
  title: { fontSize: '24px', fontWeight: '700', color: '#111827' },
  meta: { fontSize: '14px', color: '#6b7280', marginBottom: '20px' },
  desc: { fontSize: '15px', color: '#374151', lineHeight: '1.7', marginBottom: '20px' },
  thumbnail: { width: '100%', borderRadius: '8px', marginBottom: '20px', maxHeight: '300px', objectFit: 'cover' },
  error: { textAlign: 'center', color: '#ef4444', padding: '40px 0' },
};

export default function CourseDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const userJson = sessionStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  useEffect(() => {
    getCourse(id)
      .then(setCourse)
      .catch(() => setError('Course not found or you do not have permission to view it.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>Loading…</div>;
  if (error) return <div style={s.error}>{error} <br /><Link to="/courses">← Back to Courses</Link></div>;

  const isAdmin = user?.role === 'ADMIN';
  const isOwner = course.instructor?.id === user?.id;

  return (
    <div style={s.page}>
      <Link to={isAdmin ? '/admin/review' : '/courses'} style={s.back}>
        ← {isAdmin ? 'Back to Admin Review' : 'Back to Courses'}
      </Link>
      <div style={s.card}>
        {course.thumbnailUrl && (
          <img src={course.thumbnailUrl} alt={course.title} style={s.thumbnail} />
        )}
        <div style={s.titleRow}>
          <h1 style={s.title}>{course.title}</h1>
          <StatusBadge status={course.status} />
        </div>
        <div style={s.meta}>
          {course.category && <span>📂 {course.category} · </span>}
          <span>👤 {course.instructor?.name || course.instructor?.email}</span>
          {course.publishedAt && (
            <span> · 📅 Published {new Date(course.publishedAt).toLocaleDateString()}</span>
          )}
        </div>
        <p style={s.desc}>{course.description}</p>
        {(isOwner || isAdmin) && ['DRAFT', 'REJECTED'].includes(course.status) && (
          <Link to={`/courses/${id}/edit`} style={{ textDecoration: 'none' }}>
            <button style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' }}>
              Edit Course
            </button>
          </Link>
        )}
      </div>
    </div>
  );
}
