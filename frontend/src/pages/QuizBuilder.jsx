import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getQuiz,
  createQuiz,
  updateQuiz,
  addQuestion,
  updateQuestion,
  deleteQuestion,
} from '../api/quiz.js';

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'SHORT_ANSWER', label: 'Short Answer (manual grading)' },
];

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
    maxWidth: '720px',
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
    marginBottom: '20px',
    color: '#111827',
  },
  subheading: {
    fontSize: '17px',
    fontWeight: '700',
    marginBottom: '16px',
    color: '#111827',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginBottom: '14px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  textarea: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '80px',
    fontFamily: 'inherit',
  },
  select: {
    padding: '10px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '15px',
    outline: 'none',
    width: '100%',
    backgroundColor: '#fff',
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
  },
  flex1: { flex: 1 },
  btn: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  btnPrimary: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  btnDanger: {
    backgroundColor: '#ef4444',
    color: '#fff',
  },
  btnSecondary: {
    backgroundColor: '#e5e7eb',
    color: '#374151',
  },
  btnOutline: {
    backgroundColor: '#fff',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
  },
  optionRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    marginBottom: '8px',
  },
  optionInput: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  correctBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#dcfce7',
    color: '#166534',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '600',
  },
  manualBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '600',
  },
  questionCard: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '12px',
    backgroundColor: '#f9fafb',
  },
  questionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '8px',
  },
  questionMeta: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    marginTop: '6px',
  },
  typeBadge: {
    backgroundColor: '#ede9fe',
    color: '#5b21b6',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '600',
  },
  pointsBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '12px',
    fontWeight: '600',
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
  successBox: {
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#166534',
    marginBottom: '14px',
  },
  totalPoints: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #e5e7eb',
    margin: '20px 0',
  },
  hint: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '4px',
  },
};

function QuestionForm({ quizId, onQuestionAdded, onCancel }) {
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [text, setText] = useState('');
  const [points, setPoints] = useState(1);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState([{ text: '' }, { text: '' }]);
  const [correctOptionIdx, setCorrectOptionIdx] = useState(0);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function addOption() {
    setOptions((prev) => [...prev, { text: '' }]);
  }

  function removeOption(idx) {
    setOptions((prev) => prev.filter((_, i) => i !== idx));
    if (correctOptionIdx >= idx && correctOptionIdx > 0) {
      setCorrectOptionIdx((prev) => prev - 1);
    }
  }

  function setOptionText(idx, val) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { text: val } : o)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!text.trim()) return setError('Question text is required.');
    if (points < 1) return setError('Points must be at least 1.');

    if (type === 'MULTIPLE_CHOICE') {
      if (options.some((o) => !o.text.trim())) return setError('All options must have text.');
      if (options.length < 2) return setError('At least 2 options are required.');
    }

    if (type === 'TRUE_FALSE' && !['true', 'false'].includes(correctAnswer)) {
      return setError('Please select the correct answer.');
    }

    try {
      setSaving(true);
      const payload = {
        type,
        text: text.trim(),
        points: Number(points),
        ...(type === 'MULTIPLE_CHOICE' && {
          options,
          correctAnswer: correctOptionIdx,
        }),
        ...(type === 'TRUE_FALSE' && { correctAnswer }),
      };

      const question = await addQuestion(quizId, payload);
      onQuestionAdded(question);

      // Reset form
      setType('MULTIPLE_CHOICE');
      setText('');
      setPoints(1);
      setCorrectAnswer('');
      setOptions([{ text: '' }, { text: '' }]);
      setCorrectOptionIdx(0);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add question. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div style={styles.errorBox} role="alert">{error}</div>}

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Question Type</label>
        <select
          style={styles.select}
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setCorrectAnswer('');
            setCorrectOptionIdx(0);
          }}
        >
          {QUESTION_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      <div style={styles.fieldGroup}>
        <label style={styles.label}>Question Text</label>
        <textarea
          style={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter your question…"
          required
        />
      </div>

      <div style={{ ...styles.fieldGroup, maxWidth: '160px' }}>
        <label style={styles.label}>Points</label>
        <input
          style={styles.input}
          type="number"
          min="1"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
        />
      </div>

      {/* Answer Key section */}
      {type === 'MULTIPLE_CHOICE' && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Answer Options &amp; Correct Answer</label>
          <p style={styles.hint}>
            Add options below and select (●) the correct answer.
          </p>
          {options.map((opt, idx) => (
            <div key={idx} style={styles.optionRow}>
              <label style={styles.radioLabel}>
                <input
                  type="radio"
                  name="correctOption"
                  checked={correctOptionIdx === idx}
                  onChange={() => setCorrectOptionIdx(idx)}
                />
                <span>Correct</span>
              </label>
              <input
                style={styles.optionInput}
                type="text"
                placeholder={`Option ${idx + 1}`}
                value={opt.text}
                onChange={(e) => setOptionText(idx, e.target.value)}
                required
              />
              {options.length > 2 && (
                <button
                  type="button"
                  style={{ ...styles.btn, ...styles.btnDanger, padding: '8px 12px' }}
                  onClick={() => removeOption(idx)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            style={{ ...styles.btn, ...styles.btnOutline, marginTop: '4px' }}
            onClick={addOption}
          >
            + Add Option
          </button>
        </div>
      )}

      {type === 'TRUE_FALSE' && (
        <div style={styles.fieldGroup}>
          <label style={styles.label}>Correct Answer</label>
          <div style={{ display: 'flex', gap: '20px', marginTop: '4px' }}>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="tfAnswer"
                value="true"
                checked={correctAnswer === 'true'}
                onChange={() => setCorrectAnswer('true')}
              />
              True
            </label>
            <label style={styles.radioLabel}>
              <input
                type="radio"
                name="tfAnswer"
                value="false"
                checked={correctAnswer === 'false'}
                onChange={() => setCorrectAnswer('false')}
              />
              False
            </label>
          </div>
        </div>
      )}

      {type === 'SHORT_ANSWER' && (
        <div style={{ ...styles.manualBadge, marginBottom: '12px', display: 'inline-flex' }}>
          ✏️ This question will require manual grading by an instructor.
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        <button
          type="submit"
          style={{ ...styles.btn, ...styles.btnPrimary }}
          disabled={saving}
        >
          {saving ? 'Adding…' : 'Add Question'}
        </button>
        <button
          type="button"
          style={{ ...styles.btn, ...styles.btnSecondary }}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function QuestionItem({ question, quizId, onDeleted }) {
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm('Delete this question?')) return;
    try {
      setDeleting(true);
      await deleteQuestion(quizId, question.id);
      onDeleted(question.id);
    } catch {
      alert('Failed to delete question.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div style={styles.questionCard}>
      <div style={styles.questionHeader}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#111827' }}>
            {question.text}
          </div>
          <div style={styles.questionMeta}>
            <span style={styles.typeBadge}>{question.type.replace('_', ' ')}</span>
            <span style={styles.pointsBadge}>{question.points} pt{question.points !== 1 ? 's' : ''}</span>
            {question.requiresManualGrading
              ? <span style={styles.manualBadge}>✏️ Manual grading</span>
              : <span style={styles.correctBadge}>✓ Answer key set</span>
            }
          </div>
          {question.type === 'MULTIPLE_CHOICE' && question.options?.length > 0 && (
            <ul style={{ marginTop: '8px', paddingLeft: '0', listStyle: 'none' }}>
              {question.options.map((opt) => (
                <li
                  key={opt.id}
                  style={{
                    fontSize: '13px',
                    color: opt.id === question.correctAnswer ? '#166534' : '#374151',
                    fontWeight: opt.id === question.correctAnswer ? '700' : '400',
                    marginBottom: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {opt.id === question.correctAnswer ? '✓' : '○'} {opt.text}
                </li>
              ))}
            </ul>
          )}
          {question.type === 'TRUE_FALSE' && (
            <div style={{ fontSize: '13px', color: '#166534', marginTop: '6px', fontWeight: '600' }}>
              Correct answer: {question.correctAnswer === 'true' ? 'True' : 'False'}
            </div>
          )}
        </div>
        <button
          style={{ ...styles.btn, ...styles.btnDanger, marginLeft: '12px', whiteSpace: 'nowrap' }}
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? '…' : 'Delete'}
        </button>
      </div>
    </div>
  );
}

export default function QuizBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [quiz, setQuiz] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
      getQuiz(id)
        .then((q) => {
          setQuiz(q);
          setTitle(q.title);
          setDescription(q.description || '');
        })
        .catch(() => setError('Failed to load quiz.'))
        .finally(() => setLoading(false));
    }
  }, [id, isNew]);

  async function handleSaveDetails(e) {
    e.preventDefault();
    if (!title.trim()) return setError('Title is required.');
    setError('');
    setSaving(true);
    setSaved(false);

    try {
      if (isNew) {
        const created = await createQuiz({ title: title.trim(), description: description.trim() || undefined });
        navigate(`/quizzes/${created.id}/edit`, { replace: true });
      } else {
        const updated = await updateQuiz(id, { title: title.trim(), description: description.trim() || undefined });
        setQuiz((prev) => ({ ...prev, ...updated }));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save quiz.');
    } finally {
      setSaving(false);
    }
  }

  function handleQuestionAdded(question) {
    setQuiz((prev) => ({
      ...prev,
      questions: [...(prev.questions || []), question],
      totalPoints: (prev.totalPoints || 0) + question.points,
    }));
    setShowQuestionForm(false);
  }

  function handleQuestionDeleted(questionId) {
    setQuiz((prev) => {
      const removed = prev.questions.find((q) => q.id === questionId);
      return {
        ...prev,
        questions: prev.questions.filter((q) => q.id !== questionId),
        totalPoints: prev.totalPoints - (removed?.points || 0),
      };
    });
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={{ color: '#6b7280', marginTop: '60px' }}>Loading quiz…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <Link to="/quizzes" style={styles.backLink}>← Back to Quizzes</Link>

        {/* Quiz Details Card */}
        <div style={styles.card}>
          <h1 style={styles.heading}>{isNew ? 'Create New Quiz' : 'Edit Quiz'}</h1>

          {error && <div style={styles.errorBox} role="alert">{error}</div>}
          {saved && <div style={styles.successBox} role="status">Quiz details saved ✓</div>}

          <form onSubmit={handleSaveDetails}>
            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="title">Title</label>
              <input
                id="title"
                style={styles.input}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Chapter 5 Review"
                required
              />
            </div>

            <div style={styles.fieldGroup}>
              <label style={styles.label} htmlFor="description">Description (optional)</label>
              <textarea
                id="description"
                style={styles.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the quiz…"
              />
            </div>

            <button
              type="submit"
              style={{ ...styles.btn, ...styles.btnPrimary }}
              disabled={saving}
            >
              {saving ? 'Saving…' : isNew ? 'Create Quiz' : 'Save Details'}
            </button>
          </form>
        </div>

        {/* Questions section – only shown once quiz exists */}
        {!isNew && quiz && (
          <div style={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <h2 style={{ ...styles.subheading, marginBottom: 0 }}>Questions</h2>
              <span style={styles.totalPoints}>
                Total: {quiz.totalPoints} pt{quiz.totalPoints !== 1 ? 's' : ''}
              </span>
            </div>

            {quiz.questions?.length === 0 && !showQuestionForm && (
              <p style={{ color: '#6b7280', fontSize: '14px', margin: '16px 0' }}>
                No questions yet. Add your first question below.
              </p>
            )}

            {(quiz.questions || []).map((q) => (
              <QuestionItem
                key={q.id}
                question={q}
                quizId={quiz.id}
                onDeleted={handleQuestionDeleted}
              />
            ))}

            <hr style={styles.divider} />

            {showQuestionForm ? (
              <>
                <h3 style={{ ...styles.subheading, fontSize: '15px' }}>New Question</h3>
                <QuestionForm
                  quizId={quiz.id}
                  onQuestionAdded={handleQuestionAdded}
                  onCancel={() => setShowQuestionForm(false)}
                />
              </>
            ) : (
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{ ...styles.btn, ...styles.btnPrimary }}
                  onClick={() => setShowQuestionForm(true)}
                >
                  + Add Question
                </button>
                <Link
                  to={`/quizzes/${quiz.id}/take`}
                  style={{ ...styles.btn, ...styles.btnOutline, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                >
                  Preview / Take Quiz
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
