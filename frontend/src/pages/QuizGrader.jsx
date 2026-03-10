import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQuiz, listAttempts, gradeAnswer } from '../api/quiz.js';

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f3f4f6',
    padding: '24px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  container: {
    width: '100%',
    maxWidth: '760px',
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#3b82f6',
    textDecoration: 'none',
    marginBottom: '16px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '28px',
    marginBottom: '16px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '4px',
    color: '#111827',
  },
  subheading: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '12px',
    color: '#111827',
  },
  metaText: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '16px',
  },
  attemptCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '16px',
    backgroundColor: '#f9fafb',
  },
  attemptHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  studentId: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#111827',
  },
  badge: {
    fontSize: '12px',
    fontWeight: '600',
    borderRadius: '4px',
    padding: '3px 10px',
  },
  badgeGraded: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  badgePending: {
    backgroundColor: '#fef3c7',
    color: '#92400e',
  },
  scoreLine: {
    fontSize: '13px',
    color: '#6b7280',
    marginBottom: '12px',
  },
  answerBlock: {
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    padding: '14px',
    marginBottom: '10px',
    backgroundColor: '#fff',
  },
  questionText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '8px',
  },
  studentAnswer: {
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#f3f4f6',
    borderRadius: '4px',
    padding: '8px 12px',
    marginBottom: '10px',
    whiteSpace: 'pre-wrap',
    lineHeight: '1.5',
  },
  gradeRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
  },
  inputSmall: {
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    width: '90px',
  },
  inputFeedback: {
    padding: '7px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    flex: 1,
    minWidth: '160px',
  },
  btn: {
    padding: '8px 18px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnSave: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  btnSaved: {
    backgroundColor: '#16a34a',
    color: '#fff',
  },
  gradedResult: {
    fontSize: '13px',
    color: '#166534',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#991b1b',
    marginBottom: '12px',
  },
  autoGradedBadge: {
    fontSize: '12px',
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    borderRadius: '4px',
    padding: '2px 8px',
    fontWeight: '600',
  },
};

function GradableAnswer({ quizId, attemptId, answer, onGraded }) {
  const maxPoints = answer.question.points;
  const [pts, setPts] = useState(answer.pointsEarned ?? '');
  const [feedback, setFeedback] = useState(answer.feedback || '');
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState('');

  const alreadyGraded = answer.pointsEarned !== null;

  async function handleGrade() {
    const numPts = Number(pts);
    if (pts === '' || isNaN(numPts) || numPts < 0 || numPts > maxPoints) {
      setError(`Points must be between 0 and ${maxPoints}.`);
      return;
    }
    setError('');
    setSaving(true);
    setSavedOk(false);

    try {
      const updated = await gradeAnswer(quizId, attemptId, answer.id, {
        pointsEarned: numPts,
        feedback: feedback.trim() || undefined,
      });
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
      onGraded(updated);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save grade.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={styles.answerBlock}>
      <div style={styles.questionText}>{answer.question.text}</div>

      <div style={styles.studentAnswer}>
        {answer.answer || <em style={{ color: '#9ca3af' }}>(No answer provided)</em>}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <div style={styles.gradeRow}>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Points (max {maxPoints})</label>
          <input
            type="number"
            style={styles.inputSmall}
            min="0"
            max={maxPoints}
            value={pts}
            onChange={(e) => setPts(e.target.value)}
            placeholder={`0–${maxPoints}`}
          />
        </div>
        <div style={{ ...styles.fieldGroup, flex: 1 }}>
          <label style={styles.label}>Feedback (optional)</label>
          <input
            type="text"
            style={styles.inputFeedback}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Write feedback for the student…"
          />
        </div>
        <button
          style={{ ...styles.btn, ...(savedOk ? styles.btnSaved : styles.btnSave), alignSelf: 'flex-end' }}
          onClick={handleGrade}
          disabled={saving}
        >
          {saving ? 'Saving…' : savedOk ? '✓ Saved' : alreadyGraded ? 'Update Grade' : 'Save Grade'}
        </button>
      </div>
    </div>
  );
}

function AttemptCard({ attempt, quizId, onAttemptUpdated }) {
  // Only show short-answer questions
  const shortAnswers = attempt.answers.filter((a) => a.question.type === 'SHORT_ANSWER');
  const autoGraded = attempt.answers.filter((a) => a.question.type !== 'SHORT_ANSWER');
  const pendingCount = shortAnswers.filter((a) => a.pointsEarned === null).length;

  function handleGraded(updatedAttempt) {
    onAttemptUpdated(updatedAttempt);
  }

  if (shortAnswers.length === 0) {
    return (
      <div style={styles.attemptCard}>
        <div style={styles.attemptHeader}>
          <span style={styles.studentId}>Student: {attempt.studentId}</span>
          <span style={{ ...styles.badge, ...styles.badgeGraded }}>Auto-graded ✓</span>
        </div>
        <div style={styles.scoreLine}>
          Score: {attempt.score ?? '–'} / {attempt.maxScore} pts
          {' · No short-answer questions require manual grading.'}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.attemptCard}>
      <div style={styles.attemptHeader}>
        <span style={styles.studentId}>Student: {attempt.studentId}</span>
        {attempt.isGraded
          ? <span style={{ ...styles.badge, ...styles.badgeGraded }}>Fully graded ✓</span>
          : <span style={{ ...styles.badge, ...styles.badgePending }}>
              {pendingCount} pending
            </span>
        }
      </div>

      <div style={styles.scoreLine}>
        Score: {attempt.score ?? 'Pending'} / {attempt.maxScore} pts
        {attempt.gradedAt && ` · Graded: ${new Date(attempt.gradedAt).toLocaleString()}`}
      </div>

      {/* Auto-graded answers summary */}
      {autoGraded.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', marginBottom: '6px' }}>
            AUTO-GRADED ANSWERS
          </div>
          {autoGraded.map((ans) => (
            <div key={ans.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
              <span style={{ color: '#374151' }}>{ans.question.text}</span>
              <span style={ans.isCorrect ? { color: '#166534', fontWeight: '600' } : { color: '#991b1b', fontWeight: '600' }}>
                {ans.isCorrect ? '✓' : '✗'} {ans.pointsEarned}/{ans.question.points} pts
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Short-answer grading */}
      {shortAnswers.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#6b7280', marginBottom: '8px' }}>
            SHORT ANSWER — MANUAL GRADING REQUIRED
          </div>
          {shortAnswers.map((ans) => (
            <GradableAnswer
              key={ans.id}
              quizId={quizId}
              attemptId={attempt.id}
              answer={ans}
              onGraded={handleGraded}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuizGrader() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getQuiz(id), listAttempts(id)])
      .then(([q, a]) => {
        setQuiz(q);
        setAttempts(a);
      })
      .catch(() => setError('Failed to load grading data.'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleAttemptUpdated(updatedAttempt) {
    setAttempts((prev) =>
      prev.map((a) => (a.id === updatedAttempt.id ? updatedAttempt : a)),
    );
  }

  const pendingCount = attempts.filter((a) => !a.isGraded).length;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ color: '#6b7280', marginTop: '60px' }}>Loading grading view…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/quizzes" style={styles.backLink}>← Back to Quizzes</Link>

        <div style={styles.card}>
          <h1 style={styles.heading}>{quiz?.title} — Grading</h1>
          <p style={styles.metaText}>
            {attempts.length} submission{attempts.length !== 1 ? 's' : ''}
            {pendingCount > 0 && ` · ${pendingCount} pending manual grading`}
          </p>

          {error && <div style={styles.errorBox} role="alert">{error}</div>}

          {attempts.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>📭</div>
              No submissions yet.
            </div>
          ) : (
            attempts.map((attempt) => (
              <AttemptCard
                key={attempt.id}
                attempt={attempt}
                quizId={id}
                onAttemptUpdated={handleAttemptUpdated}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
