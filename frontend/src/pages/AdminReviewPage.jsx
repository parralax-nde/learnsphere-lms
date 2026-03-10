import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { courseService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function AdminReviewPage() {
  const { user, logout } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(null);

  useEffect(() => {
    courseService
      .list({ status: 'PENDING_REVIEW' })
      .then((res) => setCourses(res.data))
      .catch(() => setError('Failed to load pending courses'))
      .finally(() => setLoading(false));
  }, []);

  async function handlePublish(id) {
    setActing(id);
    try {
      await courseService.publish(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Publish failed');
    } finally {
      setActing(null);
    }
  }

  async function handleReject(id) {
    const note = window.prompt('Reason for rejection (optional):');
    if (note === null) return; // user cancelled
    setActing(id);
    try {
      await courseService.reject(id, note);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Reject failed');
    } finally {
      setActing(null);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <h1>LearnSphere — Admin Review</h1>
        <div className="header-right">
          <Link to="/courses" className="btn-secondary">
            All Courses
          </Link>
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="page-content">
        <h2>Pending Review Queue</h2>
        <p className="subtext">
          Review courses submitted by instructors and approve or reject them.
        </p>

        {loading && <p>Loading…</p>}
        {error && <p className="error-msg">{error}</p>}

        {!loading && courses.length === 0 && (
          <p className="empty-state">🎉 No courses pending review.</p>
        )}

        <div className="review-list">
          {courses.map((course) => (
            <div key={course.id} className="review-card">
              <div className="review-card-top">
                <div>
                  <h3>{course.title}</h3>
                  <p className="course-meta">
                    By <strong>{course.instructor?.name}</strong>
                    {course.category && <span className="tag">{course.category}</span>}
                  </p>
                  {course.submittedAt && (
                    <p className="subtext">
                      Submitted: {new Date(course.submittedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <StatusBadge status={course.status} />
              </div>

              <p className="course-description">{course.description}</p>

              <div className="review-actions">
                <Link to={`/courses/${course.id}`} className="btn-link">
                  View Details
                </Link>
                <button
                  className="btn-primary btn-sm"
                  disabled={acting === course.id}
                  onClick={() => handlePublish(course.id)}
                >
                  ✓ Publish
                </button>
                <button
                  className="btn-danger btn-sm"
                  disabled={acting === course.id}
                  onClick={() => handleReject(course.id)}
                >
                  ✕ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
