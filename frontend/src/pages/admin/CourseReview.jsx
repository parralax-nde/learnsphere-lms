import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout, StatusBadge } from '../../components/Layout.jsx';
import { getCourse, approveCourse, rejectCourse } from '../../api/courses.js';

const btn = (color, disabled) => ({
  padding: '12px 24px', border: 'none', borderRadius: 8,
  background: disabled ? '#CBD5E0' : color,
  color: '#fff', fontSize: 15, fontWeight: 700,
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? .7 : 1,
});

export default function CourseReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [decision, setDecision] = useState(null); // 'approved' | 'rejected'

  useEffect(() => {
    getCourse(id)
      .then(setCourse)
      .catch(() => setError('Failed to load course'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleApprove() {
    if (!confirm(`Approve "${course.title}"? This will publish the course.`)) return;
    setBusy(true);
    try {
      const updated = await approveCourse(id);
      setCourse(updated);
      setDecision('approved');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to approve course');
    } finally {
      setBusy(false);
    }
  }

  async function handleReject(e) {
    e.preventDefault();
    if (!rejectionNote.trim()) {
      setError('Please provide a rejection note');
      return;
    }
    setBusy(true);
    try {
      const updated = await rejectCourse(id, rejectionNote);
      setCourse(updated);
      setDecision('rejected');
      setShowRejectForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject course');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Layout><p style={{ padding: '2rem' }}>Loading…</p></Layout>;
  if (!course) return <Layout><p style={{ padding: '2rem', color: 'red' }}>{error || 'Course not found'}</p></Layout>;

  const isPending = course.status === 'PENDING_REVIEW';

  return (
    <Layout title="Course Review">
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Back + header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          <button onClick={() => navigate('/admin')} style={{
            background: 'none', border: '1.5px solid #E2E8F0', borderRadius: 8,
            padding: '8px 16px', fontSize: 14, cursor: 'pointer', color: '#4A5568',
          }}>
            ← Back to Queue
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{course.title}</h1>
            <p style={{ fontSize: 13, color: '#718096' }}>
              by <strong>{course.instructor?.name}</strong> ({course.instructor?.email})
              {course.submittedAt && ` · Submitted ${new Date(course.submittedAt).toLocaleString()}`}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <StatusBadge status={course.status} />
          </div>
        </div>

        {error && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FC8181', color: '#C53030', padding: '10px 14px', borderRadius: 8, marginBottom: '1.5rem', fontSize: 14 }}>
            {error}
          </div>
        )}

        {/* Decision banner */}
        {decision === 'approved' && (
          <div style={{ background: '#C6F6D5', border: '1px solid #68D391', color: '#22543D', padding: '1rem 1.5rem', borderRadius: 10, marginBottom: '1.5rem', fontWeight: 700 }}>
            ✅ Course approved and published successfully! The instructor has been notified.
          </div>
        )}
        {decision === 'rejected' && (
          <div style={{ background: '#FED7D7', border: '1px solid #FC8181', color: '#742A2A', padding: '1rem 1.5rem', borderRadius: 10, marginBottom: '1.5rem', fontWeight: 700 }}>
            ❌ Course rejected. The instructor has been notified with your feedback.
          </div>
        )}

        {/* Course info */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: '0.75rem', color: '#2D3748' }}>Course Overview</h2>
          <p style={{ color: '#4A5568', fontSize: 14, lineHeight: 1.7 }}>{course.description}</p>
        </div>

        {/* Sections */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', marginBottom: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1rem', color: '#2D3748' }}>
            Course Sections ({course.sections?.length || 0})
          </h2>
          {(course.sections || []).map((sec, i) => (
            <div key={sec.id || i} style={{
              background: '#F7FAFC', border: '1px solid #E2E8F0', borderRadius: 10,
              padding: '1rem', marginBottom: '0.75rem',
            }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: '0.5rem', color: '#5a4fcf' }}>
                {i + 1}. {sec.title}
              </div>
              <p style={{ fontSize: 13, color: '#4A5568', lineHeight: 1.6 }}>{sec.content}</p>
            </div>
          ))}
          {(!course.sections || course.sections.length === 0) && (
            <p style={{ color: '#A0AEC0', fontSize: 14 }}>No sections added yet.</p>
          )}
        </div>

        {/* Review guidelines */}
        {isPending && (
          <div style={{ background: '#EBF8FF', border: '1px solid #90CDF4', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#2B6CB0', marginBottom: '0.5rem' }}>📋 Review Guidelines</h3>
            <ul style={{ fontSize: 13, color: '#2C5282', paddingLeft: '1.25rem', lineHeight: 2 }}>
              <li>Course title and description are clear and accurate</li>
              <li>All sections have meaningful content</li>
              <li>Content is accurate, professional, and free of errors</li>
              <li>Course structure is logical and coherent</li>
              <li>Content complies with LearnSphere's content policy</li>
            </ul>
          </div>
        )}

        {/* Approve / Reject actions */}
        {isPending && !decision && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,.08)' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: '1rem', color: '#2D3748' }}>Your Decision</h2>

            {!showRejectForm ? (
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button style={btn('#38A169', busy)} disabled={busy} onClick={handleApprove}>
                  ✅ Approve & Publish
                </button>
                <button
                  style={{ ...btn('#E53E3E', busy), background: busy ? '#CBD5E0' : 'transparent', color: busy ? '#fff' : '#E53E3E', border: '2px solid #E53E3E' }}
                  disabled={busy}
                  onClick={() => setShowRejectForm(true)}
                >
                  ❌ Reject with Feedback
                </button>
              </div>
            ) : (
              <form onSubmit={handleReject}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>
                    Rejection Feedback * <span style={{ color: '#718096', fontWeight: 400 }}>(will be sent to the instructor)</span>
                  </label>
                  <textarea
                    style={{
                      width: '100%', padding: '10px 14px', border: '1.5px solid #FC8181',
                      borderRadius: 8, fontSize: 14, minHeight: 120, resize: 'vertical',
                      fontFamily: 'inherit', outline: 'none',
                    }}
                    value={rejectionNote}
                    onChange={(e) => setRejectionNote(e.target.value)}
                    placeholder="Please describe what needs to be improved before this course can be approved…"
                    autoFocus
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button type="submit" style={btn('#E53E3E', busy || !rejectionNote.trim())} disabled={busy || !rejectionNote.trim()}>
                    {busy ? 'Rejecting…' : 'Send Rejection'}
                  </button>
                  <button type="button" onClick={() => { setShowRejectForm(false); setRejectionNote(''); }} style={{
                    padding: '12px 24px', background: 'none', border: '1.5px solid #E2E8F0',
                    borderRadius: 8, fontSize: 15, cursor: 'pointer', color: '#4A5568',
                  }}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Already reviewed */}
        {!isPending && course.reviewedAt && (
          <div style={{
            background: course.status === 'PUBLISHED' ? '#F0FFF4' : '#FFF5F5',
            border: `1px solid ${course.status === 'PUBLISHED' ? '#68D391' : '#FC8181'}`,
            borderRadius: 12, padding: '1.25rem',
          }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: course.status === 'PUBLISHED' ? '#22543D' : '#742A2A' }}>
              {course.status === 'PUBLISHED' ? '✅ Approved' : '❌ Rejected'} on {new Date(course.reviewedAt).toLocaleString()}
            </p>
            {course.rejectionNote && (
              <p style={{ marginTop: '0.5rem', fontSize: 13, color: '#742A2A' }}>
                <strong>Reason:</strong> {course.rejectionNote}
              </p>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
