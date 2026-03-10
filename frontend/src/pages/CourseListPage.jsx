import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function CourseListPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    courseService
      .list()
      .then((res) => setCourses(res.data))
      .catch(() => setError('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!window.confirm('Delete this draft course?')) return;
    try {
      await courseService.delete(id);
      setCourses((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  }

  async function handleSubmit(id) {
    try {
      const res = await courseService.submit(id);
      setCourses((prev) => prev.map((c) => (c.id === id ? res.data : c)));
    } catch (err) {
      alert(err.response?.data?.error || 'Submit failed');
    }
  }

  const isInstructor = user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="page">
      <header className="page-header">
        <h1>LearnSphere</h1>
        <div className="header-right">
          <span className="user-info">
            {user?.name} ({user?.role})
          </span>
          {isInstructor && (
            <button className="btn-primary" onClick={() => navigate('/courses/new')}>
              + New Course
            </button>
          )}
          {isAdmin && (
            <Link to="/admin/review" className="btn-secondary">
              Review Queue
            </Link>
          )}
          <button className="btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <main className="page-content">
        <h2>{isAdmin ? 'All Courses' : isInstructor ? 'My Courses' : 'Browse Courses'}</h2>

        {loading && <p>Loading…</p>}
        {error && <p className="error-msg">{error}</p>}

        {!loading && courses.length === 0 && (
          <p className="empty-state">
            {isInstructor
              ? 'No courses yet. Create your first course!'
              : 'No published courses available yet.'}
          </p>
        )}

        <div className="course-grid">
          {courses.map((course) => (
            <div key={course.id} className="course-card">
              <div className="course-card-header">
                <StatusBadge status={course.status} />
              </div>
              <h3>{course.title}</h3>
              <p className="course-description">{course.description}</p>
              <p className="course-meta">
                {course.category && <span className="tag">{course.category}</span>}
                <span className="instructor-name">By {course.instructor?.name}</span>
              </p>

              {course.status === 'REJECTED' && course.rejectionNote && (
                <div className="rejection-note">
                  <strong>Rejection note:</strong> {course.rejectionNote}
                </div>
              )}

              <div className="course-actions">
                <Link to={`/courses/${course.id}`} className="btn-link">
                  View
                </Link>

                {(isInstructor && course.instructor?.id === user?.id) && (
                  <>
                    {(course.status === 'DRAFT' || course.status === 'REJECTED') && (
                      <>
                        <Link to={`/courses/${course.id}/edit`} className="btn-link">
                          Edit
                        </Link>
                        <button
                          className="btn-primary btn-sm"
                          onClick={() => handleSubmit(course.id)}
                        >
                          Submit for Review
                        </button>
                        {course.status === 'DRAFT' && (
                          <button
                            className="btn-danger btn-sm"
                            onClick={() => handleDelete(course.id)}
                          >
                            Delete
                          </button>
                        )}
                      </>
                    )}
                    {course.status === 'PENDING_REVIEW' && (
                      <span className="status-hint">Awaiting admin review…</span>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
