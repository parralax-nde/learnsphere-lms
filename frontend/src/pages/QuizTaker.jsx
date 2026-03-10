import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { getQuiz, submitAttempt, listAttempts } from '../api/quiz';

function Timer({ totalSeconds, onExpire }) {
  const [remaining, setRemaining] = useState(totalSeconds);
  const ref = useRef(null);

  useEffect(() => {
    ref.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(ref.current);
          onExpire();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [onExpire]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const warning = remaining < 60;

  return (
    <div className={`timer${warning ? ' warning' : ''}`}>
      ⏱ {mins}:{secs.toString().padStart(2, '0')}
    </div>
  );
}

Timer.propTypes = {
  totalSeconds: PropTypes.number.isRequired,
  onExpire: PropTypes.func.isRequired,
};

export default function QuizTaker() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [studentId, setStudentId] = useState('');
  const [answers, setAnswers] = useState({});
  const [attempt, setAttempt] = useState(null);
  const [started, setStarted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [checkingAttempts, setCheckingAttempts] = useState(false);

  useEffect(() => {
    getQuiz(id).then(setQuiz).finally(() => setLoading(false));
  }, [id]);

  async function checkAttempts(sid) {
    if (!quiz?.maxAttempts) return;
    setCheckingAttempts(true);
    const all = await listAttempts(id);
    const mine = all.filter(a => a.studentId === sid);
    setAttemptsUsed(mine.length);
    setCheckingAttempts(false);
  }

  function handleStart(e) {
    e.preventDefault();
    if (!studentId.trim()) { setError('Please enter your student ID'); return; }
    checkAttempts(studentId.trim()).then(() => setStarted(true));
    setError('');
  }

  function setAnswer(questionId, value) {
    setAnswers(a => ({ ...a, [questionId]: value }));
  }

  const handleSubmit = useCallback(async (expired = false) => {
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        studentId: studentId.trim(),
        answers: quiz.questions.map(q => ({
          questionId: q.id,
          answer: answers[q.id] ?? null,
        })),
      };
      const result = await submitAttempt(id, payload);
      setAttempt(result);
      if (expired) setError('Time expired – quiz submitted automatically.');
    } catch (err) {
      const msg = err.response?.data?.error ?? 'Submission failed';
      setError(msg);
      if (msg.includes('Maximum attempts')) setAttempt(null);
    } finally {
      setSubmitting(false);
    }
  }, [submitting, studentId, quiz, answers, id]);

  if (loading) return <div className="container">Loading…</div>;
  if (!quiz) return <div className="container">Quiz not found</div>;

  const attemptsLeft = quiz.maxAttempts != null ? quiz.maxAttempts - attemptsUsed : null;
  const blocked = attemptsLeft !== null && attemptsLeft <= 0;

  // Result view
  if (attempt) {
    const pct = attempt.maxScore > 0 && attempt.score != null
      ? Math.round((attempt.score / attempt.maxScore) * 100)
      : null;
    const circleClass = attempt.isPassed == null ? 'pending' : attempt.isPassed ? 'pass' : 'fail';

    return (
      <div className="container">
        <div className="quiz-header">
          <h1>{quiz.title} – Results</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>← Home</button>
        </div>

        <div className="card" style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div className={`score-circle ${circleClass}`}>
              {pct != null ? `${pct}%` : '⏳'}
            </div>
          </div>
          <p style={{ fontSize: '1.1rem', marginBottom: '.5rem' }}>
            {attempt.score != null ? `${attempt.score} / ${attempt.maxScore} points` : 'Pending grading'}
          </p>
          {quiz.passingScore > 0 && (
            <span className={`badge ${attempt.isPassed == null ? 'badge-pending' : attempt.isPassed ? 'badge-pass' : 'badge-fail'}`}>
              {attempt.isPassed == null ? '⏳ Awaiting grading' : attempt.isPassed ? '✅ Passed' : '❌ Failed'}
            </span>
          )}
          {quiz.passingScore > 0 && (
            <p style={{ color: '#6b7280', fontSize: '.85rem', marginTop: '.5rem' }}>
              Passing score: {quiz.passingScore}%
            </p>
          )}
        </div>

        {quiz.showAnswersAfterSubmission && attempt.answers?.length > 0 && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem' }}>Answer Review</h3>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Question</th>
                  <th>Your Answer</th>
                  <th>Result</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {attempt.answers.map((a, i) => {
                  const q = quiz.questions.find(x => x.id === a.questionId);
                  return (
                    <tr key={a.id}>
                      <td>{i + 1}</td>
                      <td>{q?.text ?? a.questionId}</td>
                      <td>{a.answer ?? '—'}</td>
                      <td>
                        {a.isCorrect == null
                          ? <span className="badge badge-pending">Pending</span>
                          : a.isCorrect
                            ? <span className="badge badge-pass">✓ Correct</span>
                            : <span className="badge badge-fail">✗ Wrong</span>
                        }
                      </td>
                      <td>{a.pointsEarned ?? '—'} / {q?.points ?? '?'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!quiz.showAnswersAfterSubmission && (
          <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
            🔒 Answer details are not shown for this quiz.
          </div>
        )}
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="container">
        <div className="quiz-header">
          <h1>{quiz.title}</h1>
          <button className="btn btn-ghost" onClick={() => navigate('/')}>← Back</button>
        </div>
        <div className="card">
          {quiz.description && <p style={{ marginBottom: '1rem', color: '#4b5563' }}>{quiz.description}</p>}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', fontSize: '.9rem', color: '#6b7280' }}>
            <span>📝 {quiz.questions?.length ?? 0} questions</span>
            <span>🏆 {quiz.totalPoints} points</span>
            {quiz.timeLimitMinutes && <span>⏱ {quiz.timeLimitMinutes} minute time limit</span>}
            {quiz.maxAttempts && <span>🔁 Max {quiz.maxAttempts} attempts</span>}
            {quiz.passingScore > 0 && <span>✅ Passing: {quiz.passingScore}%</span>}
          </div>
          <form onSubmit={handleStart}>
            <div className="form-group">
              <label>Your Student ID</label>
              <input
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                placeholder="e.g. student123"
                required
              />
            </div>
            {error && <p className="error">{error}</p>}
            {blocked && (
              <p className="error">
                You have used all {quiz.maxAttempts} allowed attempt{quiz.maxAttempts !== 1 ? 's' : ''} for this quiz.
              </p>
            )}
            {!blocked && attemptsLeft != null && (
              <p style={{ color: '#6b7280', fontSize: '.85rem', marginBottom: '.75rem' }}>
                Remaining attempts: {attemptsLeft} of {quiz.maxAttempts}
              </p>
            )}
            <button type="submit" className="btn btn-primary" disabled={blocked || checkingAttempts}>
              {checkingAttempts ? 'Checking…' : 'Start Quiz'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Quiz taking
  return (
    <div className="container">
      <div className="quiz-header">
        <h1>{quiz.title}</h1>
        {quiz.timeLimitMinutes && (
          <Timer
            totalSeconds={quiz.timeLimitMinutes * 60}
            onExpire={() => handleSubmit(true)}
          />
        )}
      </div>

      {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}

      {quiz.questions.map((q, i) => (
        <div key={q.id} className="question-card">
          <h4>
            {i + 1}. {q.text}
            <span style={{ fontSize: '.8rem', color: '#6b7280', marginLeft: '.5rem' }}>({q.points} pt{q.points !== 1 ? 's' : ''})</span>
          </h4>

          {q.type === 'MULTIPLE_CHOICE' && (
            <div>
              {q.options.map(opt => (
                <div key={opt.id} className="option-row">
                  <input
                    type="radio"
                    id={`${q.id}-${opt.id}`}
                    name={q.id}
                    checked={answers[q.id] === opt.text}
                    onChange={() => setAnswer(q.id, opt.text)}
                  />
                  <label htmlFor={`${q.id}-${opt.id}`}>{opt.text}</label>
                </div>
              ))}
            </div>
          )}

          {q.type === 'TRUE_FALSE' && (
            <div>
              {['true', 'false'].map(v => (
                <div key={v} className="option-row">
                  <input
                    type="radio"
                    id={`${q.id}-${v}`}
                    name={q.id}
                    checked={answers[q.id] === v}
                    onChange={() => setAnswer(q.id, v)}
                  />
                  <label htmlFor={`${q.id}-${v}`}>{v.charAt(0).toUpperCase() + v.slice(1)}</label>
                </div>
              ))}
            </div>
          )}

          {q.type === 'SHORT_ANSWER' && (
            <div>
              <textarea
                rows={3}
                value={answers[q.id] ?? ''}
                onChange={e => setAnswer(q.id, e.target.value)}
                placeholder="Type your answer here…"
                style={{ width: '100%', padding: '.5rem', border: '1px solid #d1d5db', borderRadius: 6 }}
              />
              <small style={{ color: '#6b7280' }}>This question will be manually graded.</small>
            </div>
          )}
        </div>
      ))}

      <button
        className="btn btn-primary"
        onClick={() => handleSubmit(false)}
        disabled={submitting}
        style={{ marginTop: '.5rem' }}
      >
        {submitting ? 'Submitting…' : 'Submit Quiz'}
      </button>
    </div>
  );
}
