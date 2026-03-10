import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { courseService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import StatusBadge from '../components/StatusBadge';

export default function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    courseService
      .get(id)
      .then((res) => setCourse(res.data))
      .catch(() => setError('Course not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAction(action, rejectionNote) {
    setActing(true);
    try {
      let res;
      if (action === 'submit') res = await courseService.submit(id);
      else if (action === 'publish') res = await courseService.publish(id);
      else if (action === 'reject') res = await courseService.reject(id, rejectionNote);
      else if (action === 'unpublish') res = await courseService.unpublish(id);
      setCourse(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Action failed');
    } finally {
      setActing(false);
    }
  }

  if (loading) return <p className="page-content">Loading…</p>;
  if (error) return <p className="page-content error-msg">{error}</p>;

  const isInstructor = user?.role === 'INSTRUCTOR';
  const isAdmin = user?.role === 'ADMIN';
  const isOwner = course.instructor?.id === user?.id;

  return (
    <div className="page">
      <header className="page-header">
        <h1>LearnSphere</h1>
        <div className="header-right">
          <Link to="/courses" className="btn-secondary">
            ← Back
          </Link>
        </div>
      </header>

      <main className="page-content course-detail">
        <div className="course-detail-header">
          <div>
            <h2>{course.title}</h2>
            <p className="course-meta">
              By {course.instructor?.name}
              {course.category && <span className="tag">{course.category}</span>}
            </p>
          </div>
          <StatusBadge status={course.status} />
        </div>

        {course.status === 'REJECTED' && course.rejectionNote && (
          <div className="rejection-note">
            <strong>Rejection note:</strong> {course.rejectionNote}
          </div>
        )}

        <p className="course-description-full">{course.description}</p>

        {course.thumbnailUrl && (
          <img src={course.thumbnailUrl} alt="Course thumbnail" className="course-thumbnail" />
        )}

        <div className="detail-meta">
          {course.submittedAt && (
            <p>Submitted: {new Date(course.submittedAt).toLocaleDateString()}</p>
          )}
          {course.publishedAt && (
            <p>Published: {new Date(course.publishedAt).toLocaleDateString()}</p>
          )}
          {course.reviewedBy && (
            <p>Reviewed by: {course.reviewedBy.name}</p>
          )}
        </div>

        {/* Instructor actions */}
        {isInstructor && isOwner && (
          <div className="action-bar">
            {(course.status === 'DRAFT' || course.status === 'REJECTED') && (
              <>
                <button
                  className="btn-primary"
                  onClick={() => navigate(`/courses/${id}/edit`)}
                >
                  Edit
                </button>
                <button
                  className="btn-accent"
                  disabled={acting}
                  onClick={() => handleAction('submit')}
                >
                  Submit for Review
                </button>
              </>
            )}
            {course.status === 'PENDING_REVIEW' && (
              <span className="status-hint">Awaiting admin review…</span>
            )}
          </div>
        )}

        {/* Admin actions */}
        {isAdmin && (
          <div className="action-bar">
            {course.status === 'PENDING_REVIEW' && (
              <>
                <button
                  className="btn-primary"
                  disabled={acting}
                  onClick={() => handleAction('publish')}
                >
                  ✓ Publish
                </button>
                <button
                  className="btn-danger"
                  disabled={acting}
                  onClick={() => {
                    const note = window.prompt('Reason for rejection (optional):');
                    if (note !== null) handleAction('reject', note);
                  }}
                >
                  ✕ Reject
                </button>
              </>
            )}
            {course.status === 'PUBLISHED' && (
              <button
                className="btn-secondary"
                disabled={acting}
                onClick={() => handleAction('unpublish')}
              >
                Unpublish
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
