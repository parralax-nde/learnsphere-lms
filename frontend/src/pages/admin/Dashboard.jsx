import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, StatusBadge } from '../../components/Layout.jsx';
import { listPending, listCourses } from '../../api/courses.js';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [pending, setPending] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('pending');

  useEffect(() => {
    Promise.all([listPending(), listCourses()])
      .then(([p, all]) => { setPending(p); setAllCourses(all); })
      .catch(() => setError('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  const tabStyle = (active) => ({
    padding: '8px 20px', border: 'none', borderRadius: 8,
    background: active ? '#5a4fcf' : '#EDF2F7',
    color: active ? '#fff' : '#4A5568',
    fontWeight: 600, fontSize: 14, cursor: 'pointer',
  });

  const displayed = tab === 'pending' ? pending : allCourses;

  return (
    <Layout title="Admin — Course Review">
      {/* Stats bar */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Pending Review', count: pending.length, color: '#F6AD55', bg: '#FFFAF0' },
          { label: 'Total Courses', count: allCourses.length, color: '#68D391', bg: '#F0FFF4' },
          { label: 'Published', count: allCourses.filter((c) => c.status === 'PUBLISHED').length, color: '#63B3ED', bg: '#EBF8FF' },
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1, background: stat.bg, border: `1px solid ${stat.color}33`,
            borderRadius: 12, padding: '1.25rem',
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: stat.color }}>{stat.count}</div>
            <div style={{ fontSize: 13, color: '#718096', fontWeight: 600 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button style={tabStyle(tab === 'pending')} onClick={() => setTab('pending')}>
          Pending Review {pending.length > 0 && `(${pending.length})`}
        </button>
        <button style={tabStyle(tab === 'all')} onClick={() => setTab('all')}>
          All Courses
        </button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <p>Loading…</p>
      ) : displayed.length === 0 ? (
        <div style={{
          background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center',
          border: '2px dashed #E2E8F0',
        }}>
          <div style={{ fontSize: 48, marginBottom: '1rem' }}>
            {tab === 'pending' ? '✅' : '📚'}
          </div>
          <h3 style={{ color: '#4A5568' }}>
            {tab === 'pending' ? 'No courses awaiting review' : 'No courses found'}
          </h3>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {displayed.map((course) => (
            <div key={course.id} style={{
              background: '#fff', borderRadius: 12, padding: '1.5rem',
              boxShadow: '0 1px 4px rgba(0,0,0,.08)',
              border: course.status === 'PENDING_REVIEW' ? '1.5px solid #F6AD55' : '1px solid #E2E8F0',
              cursor: course.status === 'PENDING_REVIEW' ? 'pointer' : 'default',
            }}
              onClick={() => course.status === 'PENDING_REVIEW' && navigate(`/admin/review/${course.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: 17, fontWeight: 700 }}>{course.title}</h3>
                    <StatusBadge status={course.status} />
                  </div>
                  <p style={{ fontSize: 14, color: '#718096', marginBottom: '0.5rem' }}>{course.description}</p>
                  <p style={{ fontSize: 13, color: '#A0AEC0' }}>
                    Instructor: <strong>{course.instructor?.name}</strong>
                    {' · '}
                    {course.sections?.length || 0} section{(course.sections?.length || 0) !== 1 ? 's' : ''}
                    {course.submittedAt && ` · Submitted ${new Date(course.submittedAt).toLocaleDateString()}`}
                  </p>
                </div>
                {course.status === 'PENDING_REVIEW' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/admin/review/${course.id}`); }}
                    style={{
                      background: '#5a4fcf', color: '#fff', border: 'none',
                      borderRadius: 8, padding: '8px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Review →
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
