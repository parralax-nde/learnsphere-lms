import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getQuiz, submitAttempt } from '../api/quiz.js';

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
    maxWidth: '680px',
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
    padding: '32px',
    marginBottom: '20px',
  },
  heading: {
    fontSize: '22px',
    fontWeight: '700',
    marginBottom: '6px',
    color: '#111827',
  },
  description: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '20px',
  },
  questionBlock: {
    marginBottom: '24px',
    paddingBottom: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  questionNumber: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px',
  },
  questionText: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#111827',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    marginBottom: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    transition: 'border-color 0.15s, background-color 0.15s',
    userSelect: 'none',
  },
  optionLabelSelected: {
    border: '1px solid #3b82f6',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    fontWeight: '600',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    minHeight: '100px',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  manualNote: {
    fontSize: '12px',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '4px 8px',
    borderRadius: '4px',
    marginTop: '6px',
    display: 'inline-block',
  },
  pointsBadge: {
    fontSize: '12px',
    color: '#1e40af',
    backgroundColor: '#dbeafe',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: '600',
    display: 'inline-block',
    marginBottom: '8px',
  },
  btn: {
    padding: '11px 24px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnPrimary: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  btnOutline: {
    backgroundColor: '#fff',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  errorBox: {
    backgroundColor: '#fee2e2',
    border: '1px solid #fca5a5',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#991b1b',
    marginBottom: '14px',
  },
  // Result styles
  resultHeader: {
    textAlign: 'center',
    marginBottom: '24px',
  },
  scoreCircle: {
    width: '120px',
    height: '120px',
    borderRadius: '50%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    border: '4px solid',
  },
  scoreNumber: {
    fontSize: '32px',
    fontWeight: '800',
  },
  scoreLabel: {
    fontSize: '12px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  answerResult: {
    padding: '14px',
    borderRadius: '8px',
    marginBottom: '12px',
    border: '1px solid',
  },
  answerCorrect: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  answerWrong: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  answerPending: {
    backgroundColor: '#fffbeb',
    borderColor: '#fcd34d',
  },
};

function ResultView({ attempt, quiz }) {
  const percentage = attempt.maxScore > 0
    ? Math.round((attempt.score / attempt.maxScore) * 100)
    : 0;

  const circleColor = attempt.isGraded
    ? (percentage >= 70 ? '#16a34a' : percentage >= 50 ? '#d97706' : '#dc2626')
    : '#d97706';

  // Build a map: optionId → optionText, so MC answers show human-readable text
  const optionMap = {};
  (quiz?.questions || []).forEach((q) => {
    (q.options || []).forEach((opt) => { optionMap[opt.id] = opt.text; });
  });

  function displayAnswer(ans) {
    if (ans.answer === null || ans.answer === undefined) return '(no answer)';
    // Resolve MC option IDs to readable text
    return optionMap[ans.answer] ?? ans.answer;
  }

  return (
    <div style={styles.card}>
      <div style={styles.resultHeader}>
        <div
          style={{
            ...styles.scoreCircle,
            borderColor: circleColor,
            color: circleColor,
          }}
        >
          {attempt.isGraded ? (
            <>
              <span style={styles.scoreNumber}>{percentage}%</span>
              <span style={styles.scoreLabel}>Score</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: '24px' }}>⏳</span>
              <span style={{ ...styles.scoreLabel, color: '#d97706', marginTop: '4px', textAlign: 'center' }}>
                Pending grading
              </span>
            </>
          )}
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#111827' }}>
          {attempt.isGraded ? 'Quiz Completed!' : 'Submitted for Grading'}
        </h2>
        {attempt.isGraded && (
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '6px' }}>
            You scored {attempt.score} out of {attempt.maxScore} points.
          </p>
        )}
        {!attempt.isGraded && (
          <p style={{ color: '#92400e', fontSize: '14px', marginTop: '6px' }}>
            Some answers require manual grading by an instructor. Check back later for your final score.
          </p>
        )}
      </div>

      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '12px', color: '#111827' }}>
        Answer Review
      </h3>

      {attempt.answers.map((ans, idx) => {
        const isPending = ans.isCorrect === null;
        const rowStyle = isPending
          ? styles.answerPending
          : ans.isCorrect
            ? styles.answerCorrect
            : styles.answerWrong;

        return (
          <div key={ans.id} style={{ ...styles.answerResult, ...rowStyle }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>
              Q{idx + 1}: {ans.question.text}
            </div>
            <div style={{ fontSize: '14px', color: '#374151' }}>
              Your answer: <strong>{displayAnswer(ans)}</strong>
            </div>
            <div style={{ fontSize: '13px', marginTop: '4px' }}>
              {isPending
                ? <span style={{ color: '#92400e' }}>⏳ Awaiting manual grading</span>
                : ans.isCorrect
                  ? <span style={{ color: '#166534' }}>✓ Correct — {ans.pointsEarned}/{ans.question.points} pts</span>
                  : <span style={{ color: '#991b1b' }}>✗ Incorrect — {ans.pointsEarned ?? 0}/{ans.question.points} pts</span>
              }
            </div>
            {ans.feedback && (
              <div style={{ fontSize: '13px', color: '#374151', marginTop: '6px', fontStyle: 'italic' }}>
                💬 Instructor feedback: {ans.feedback}
              </div>
            )}
          </div>
        );
      })}

      <div style={{ marginTop: '20px', display: 'flex', gap: '12px' }}>
        <Link to="/quizzes" style={{ ...styles.btn, ...styles.btnOutline }}>
          ← Back to Quizzes
        </Link>
      </div>
    </div>
  );
}

export default function QuizTaker() {
  const { id } = useParams();
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(null);

  useEffect(() => {
    getQuiz(id)
      .then((q) => {
        setQuiz(q);
        // Initialise answers map
        const init = {};
        (q.questions || []).forEach((qs) => { init[qs.id] = ''; });
        setAnswers(init);
      })
      .catch(() => setError('Failed to load quiz.'))
      .finally(() => setLoading(false));
  }, [id]);

  function setAnswer(questionId, value) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer: answer || null,
      }));

      const result = await submitAttempt(id, {
        studentId: 'preview-student',
        answers: answersArray,
      });

      setAttempt(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit quiz. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ color: '#6b7280', marginTop: '60px' }}>Loading quiz…</div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={{ color: '#991b1b' }}>{error || 'Quiz not found.'}</div>
          <Link to="/quizzes" style={{ ...styles.backLink, marginTop: '12px', display: 'block' }}>← Back</Link>
        </div>
      </div>
    );
  }

  if (attempt) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <ResultView attempt={attempt} quiz={quiz} />
        </div>
      </div>
    );
  }

  const sortedQuestions = [...(quiz.questions || [])].sort((a, b) => a.order - b.order);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/quizzes" style={styles.backLink}>← Back to Quizzes</Link>

        <div style={styles.card}>
          <h1 style={styles.heading}>{quiz.title}</h1>
          {quiz.description && <p style={styles.description}>{quiz.description}</p>}
          <p style={{ fontSize: '13px', color: '#6b7280' }}>
            {sortedQuestions.length} question{sortedQuestions.length !== 1 ? 's' : ''} · {quiz.totalPoints} total point{quiz.totalPoints !== 1 ? 's' : ''}
          </p>
        </div>

        {error && <div style={styles.errorBox} role="alert">{error}</div>}

        {sortedQuestions.length === 0 ? (
          <div style={{ ...styles.card, textAlign: 'center', color: '#6b7280' }}>
            <p>This quiz has no questions yet.</p>
            <Link to={`/quizzes/${id}/edit`} style={{ color: '#3b82f6' }}>Add questions</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {sortedQuestions.map((q, idx) => (
              <div key={q.id} style={styles.card}>
                <div style={styles.questionNumber}>Question {idx + 1}</div>
                <div style={styles.pointsBadge}>{q.points} pt{q.points !== 1 ? 's' : ''}</div>
                <div style={styles.questionText}>{q.text}</div>

                {q.type === 'MULTIPLE_CHOICE' && (
                  <div>
                    {(q.options || []).sort((a, b) => a.order - b.order).map((opt) => (
                      <label
                        key={opt.id}
                        style={{
                          ...styles.optionLabel,
                          ...(answers[q.id] === opt.id ? styles.optionLabelSelected : {}),
                        }}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={opt.id}
                          checked={answers[q.id] === opt.id}
                          onChange={() => setAnswer(q.id, opt.id)}
                          style={{ accentColor: '#3b82f6' }}
                        />
                        {opt.text}
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'TRUE_FALSE' && (
                  <div>
                    {['true', 'false'].map((val) => (
                      <label
                        key={val}
                        style={{
                          ...styles.optionLabel,
                          ...(answers[q.id] === val ? styles.optionLabelSelected : {}),
                        }}
                      >
                        <input
                          type="radio"
                          name={`q-${q.id}`}
                          value={val}
                          checked={answers[q.id] === val}
                          onChange={() => setAnswer(q.id, val)}
                          style={{ accentColor: '#3b82f6' }}
                        />
                        {val.charAt(0).toUpperCase() + val.slice(1)}
                      </label>
                    ))}
                  </div>
                )}

                {q.type === 'SHORT_ANSWER' && (
                  <>
                    <textarea
                      style={styles.textarea}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswer(q.id, e.target.value)}
                      placeholder="Type your answer here…"
                    />
                    <div style={styles.manualNote}>✏️ This answer will be graded manually by an instructor.</div>
                  </>
                )}
              </div>
            ))}

            <div style={{ ...styles.card, display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="submit"
                style={{ ...styles.btn, ...styles.btnPrimary }}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit Quiz'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
