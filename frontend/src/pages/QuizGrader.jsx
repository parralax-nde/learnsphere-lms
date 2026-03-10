import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuiz, listAttempts, getAttempt, gradeAnswer } from '../api/quiz';

function GradableAnswer({ quizId, attemptId, answer, question, onGraded }) {
  const [pts, setPts] = useState(answer.pointsEarned ?? '');
  const [fb, setFb] = useState(answer.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleGrade(e) {
    e.preventDefault();
    const p = parseFloat(pts);
    if (isNaN(p) || p < 0 || p > question.points) {
      setError(`Points must be between 0 and ${question.points}`);
      return;
    }
    setSaving(true); setError('');
    try {
      const updated = await gradeAnswer(quizId, attemptId, answer.id, { pointsEarned: p, feedback: fb });
      onGraded(updated);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to grade');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleGrade} style={{ marginTop: '.75rem', background: '#f9fafb', padding: '1rem', borderRadius: 8 }}>
      <p style={{ fontWeight: 500, marginBottom: '.4rem' }}>{question.text}</p>
      <p style={{ color: '#374151', marginBottom: '.75rem', fontStyle: 'italic' }}>
        &ldquo;{answer.answer ?? '(no answer)'}&rdquo;
      </p>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Points (0–{question.points})</label>
          <input
            type="number" min="0" max={question.points} step="0.5"
            value={pts} onChange={e => setPts(e.target.value)}
            style={{ width: 90 }}
          />
        </div>
        <div className="form-group" style={{ margin: 0, flex: 1 }}>
          <label>Feedback (optional)</label>
          <input type="text" value={fb} onChange={e => setFb(e.target.value)} placeholder="Add feedback…" />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
          {saving ? 'Saving…' : answer.pointsEarned != null ? 'Update' : 'Grade'}
        </button>
      </div>
      {error && <p className="error" style={{ marginTop: '.4rem' }}>{error}</p>}
    </form>
  );
}

function AttemptCard({ quizId, attemptSummary, quiz }) {
  const [expanded, setExpanded] = useState(false);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleExpand() {
    if (!expanded && !attempt) {
      setLoading(true);
      const a = await getAttempt(quizId, attemptSummary.id);
      setAttempt(a);
      setLoading(false);
    }
    setExpanded(e => !e);
  }

  const pending = !attemptSummary.isGraded;
  const pct = attemptSummary.maxScore > 0 && attemptSummary.score != null
    ? Math.round((attemptSummary.score / attemptSummary.maxScore) * 100)
    : null;

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '.5rem' }}>
        <div>
          <strong>Student:</strong> {attemptSummary.studentId}
          <span style={{ margin: '0 .75rem', color: '#9ca3af' }}>|</span>
          {pct != null ? `${pct}% (${attemptSummary.score}/${attemptSummary.maxScore})` : 'Pending grading'}
          {quiz.passingScore > 0 && attemptSummary.isPassed != null && (
            <span className={`badge ${attemptSummary.isPassed ? 'badge-pass' : 'badge-fail'}`} style={{ marginLeft: '.5rem' }}>
              {attemptSummary.isPassed ? 'Passed' : 'Failed'}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
          {pending && <span className="badge badge-pending">Needs grading</span>}
          <button className="btn btn-ghost btn-sm" onClick={handleExpand}>
            {expanded ? '▲ Collapse' : '▼ View Answers'}
          </button>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          {loading && <p style={{ color: '#6b7280' }}>Loading…</p>}
          {attempt && attempt.answers.map(a => {
            const question = quiz.questions.find(q => q.id === a.questionId);
            if (!question) return null;

            if (question.requiresManualGrading) {
              return (
                <GradableAnswer
                  key={a.id}
                  quizId={quizId}
                  attemptId={attempt.id}
                  answer={a}
                  question={question}
                  onGraded={updated => setAttempt(updated)}
                />
              );
            }

            return (
              <div key={a.id} style={{ marginBottom: '.75rem', padding: '.75rem', background: '#f9fafb', borderRadius: 6 }}>
                <p style={{ fontWeight: 500, marginBottom: '.25rem' }}>{question.text}</p>
                <p style={{ fontSize: '.9rem' }}>
                  Answer: <strong>{a.answer ?? '—'}</strong>
                  {' '}
                  {a.isCorrect != null && (
                    <span className={`badge ${a.isCorrect ? 'badge-pass' : 'badge-fail'}`}>
                      {a.isCorrect ? `✓ +${a.pointsEarned}pts` : `✗ 0pts`}
                    </span>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function QuizGrader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getQuiz(id), listAttempts(id)])
      .then(([q, a]) => { setQuiz(q); setAttempts(a); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="container">Loading…</div>;
  if (!quiz) return <div className="container">Quiz not found</div>;

  const pending = attempts.filter(a => !a.isGraded).length;

  return (
    <div className="container">
      <div className="quiz-header">
        <div>
          <h1>{quiz.title} – Grading</h1>
          <p style={{ color: '#6b7280', fontSize: '.9rem' }}>
            {attempts.length} submission{attempts.length !== 1 ? 's' : ''}
            {pending > 0 && ` · ${pending} need${pending === 1 ? 's' : ''} grading`}
          </p>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Back</button>
      </div>

      {attempts.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
          No submissions yet.
        </div>
      )}

      {attempts.map(a => (
        <AttemptCard key={a.id} quizId={id} attemptSummary={a} quiz={quiz} />
      ))}
    </div>
  );
}
