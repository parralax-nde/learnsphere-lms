import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  getQuiz, createQuiz, updateQuiz,
  addQuestion, deleteQuestion
} from '../api/quiz';

const QUESTION_TYPES = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'TRUE_FALSE', label: 'True / False' },
  { value: 'SHORT_ANSWER', label: 'Short Answer' },
];

function SettingsPanel({ settings, onChange }) {
  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>⚙️ Quiz Settings</h2>
      <div className="settings-grid">
        <div className="form-group">
          <label>Time Limit (minutes)</label>
          <input
            type="number"
            min="1"
            placeholder="No limit"
            value={settings.timeLimitMinutes ?? ''}
            onChange={e => onChange('timeLimitMinutes', e.target.value ? parseInt(e.target.value) : null)}
          />
          <small>Leave empty for unlimited time</small>
        </div>
        <div className="form-group">
          <label>Max Attempts</label>
          <input
            type="number"
            min="1"
            placeholder="Unlimited"
            value={settings.maxAttempts ?? ''}
            onChange={e => onChange('maxAttempts', e.target.value ? parseInt(e.target.value) : null)}
          />
          <small>Leave empty for unlimited attempts</small>
        </div>
        <div className="form-group">
          <label>Passing Score (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={settings.passingScore ?? 0}
            onChange={e => onChange('passingScore', parseFloat(e.target.value) || 0)}
          />
          <small>Minimum percentage to pass (0 = no requirement)</small>
        </div>
        <div className="form-group">
          <label>Show Answers After Submission</label>
          <select
            value={settings.showAnswersAfterSubmission ? 'true' : 'false'}
            onChange={e => onChange('showAnswersAfterSubmission', e.target.value === 'true')}
          >
            <option value="true">Yes – show correct answers</option>
            <option value="false">No – hide correct answers</option>
          </select>
          <small>Whether students see correct answers after submitting</small>
        </div>
      </div>
    </div>
  );
}

SettingsPanel.propTypes = {
  settings: PropTypes.shape({
    timeLimitMinutes: PropTypes.number,
    maxAttempts: PropTypes.number,
    passingScore: PropTypes.number,
    showAnswersAfterSubmission: PropTypes.bool,
  }).isRequired,
  onChange: PropTypes.func.isRequired,
};

function QuestionForm({ quizId, onAdded }) {
  const [type, setType] = useState('MULTIPLE_CHOICE');
  const [text, setText] = useState('');
  const [points, setPoints] = useState(1);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function addOption() { setOptions(o => [...o, '']); }
  function removeOption(i) { setOptions(o => o.filter((_, idx) => idx !== i)); }
  function setOption(i, val) { setOptions(o => { const n = [...o]; n[i] = val; return n; }); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = { type, text, points };
      if (type === 'MULTIPLE_CHOICE') {
        payload.options = options.filter(o => o.trim());
        payload.correctAnswer = correctAnswer;
      } else if (type === 'TRUE_FALSE') {
        payload.correctAnswer = correctAnswer || 'true';
      }
      const q = await addQuestion(quizId, payload);
      setText(''); setPoints(1); setCorrectAnswer(''); setOptions(['', '']);
      onAdded(q);
    } catch (err) {
      setError(err.response?.data?.error ?? 'Failed to add question');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card" style={{ marginBottom: '1rem' }}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Add Question</h3>
      <div className="settings-grid">
        <div className="form-group">
          <label>Type</label>
          <select value={type} onChange={e => { setType(e.target.value); setCorrectAnswer(''); }}>
            {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Points</label>
          <input type="number" min="1" value={points} onChange={e => setPoints(parseInt(e.target.value) || 1)} />
        </div>
      </div>
      <div className="form-group">
        <label>Question Text</label>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2} required />
      </div>

      {type === 'MULTIPLE_CHOICE' && (
        <div>
          <label style={{ fontWeight: 500, fontSize: '.9rem', marginBottom: '.5rem', display: 'block' }}>
            Options (select correct answer)
          </label>
          {options.map((opt, i) => (
            <div key={i} className="option-row">
              <input
                type="radio"
                name="mc-correct"
                checked={correctAnswer === opt && opt !== ''}
                onChange={() => setCorrectAnswer(opt)}
              />
              <input
                type="text"
                value={opt}
                onChange={e => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                style={{ flex: 1 }}
              />
              {options.length > 2 && (
                <button type="button" className="btn btn-danger btn-sm" onClick={() => removeOption(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={addOption} style={{ marginTop: '.5rem' }}>
            + Add Option
          </button>
        </div>
      )}

      {type === 'TRUE_FALSE' && (
        <div className="form-group">
          <label>Correct Answer</label>
          <select value={correctAnswer || 'true'} onChange={e => setCorrectAnswer(e.target.value)}>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        </div>
      )}

      {type === 'SHORT_ANSWER' && (
        <p style={{ color: '#6b7280', fontSize: '.85rem', marginBottom: '.75rem' }}>
          ℹ️ Short answer questions require manual grading.
        </p>
      )}

      {error && <p className="error">{error}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? 'Adding…' : 'Add Question'}
      </button>
    </form>
  );
}

QuestionForm.propTypes = {
  quizId: PropTypes.string.isRequired,
  onAdded: PropTypes.func.isRequired,
};

export default function QuizBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = !id;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [settings, setSettings] = useState({
    timeLimitMinutes: null,
    maxAttempts: null,
    showAnswersAfterSubmission: true,
    passingScore: 0,
  });
  const [questions, setQuestions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (!isNew) {
      getQuiz(id).then(q => {
        setTitle(q.title);
        setDescription(q.description ?? '');
        setSettings({
          timeLimitMinutes: q.timeLimitMinutes,
          maxAttempts: q.maxAttempts,
          showAnswersAfterSubmission: q.showAnswersAfterSubmission,
          passingScore: q.passingScore,
        });
        setQuestions(q.questions ?? []);
      }).finally(() => setLoading(false));
    }
  }, [id, isNew]);

  function handleSettingChange(key, value) {
    setSettings(s => ({ ...s, [key]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    setSaving(true);
    try {
      const payload = { title, description, ...settings };
      if (isNew) {
        const q = await createQuiz(payload);
        navigate(`/quizzes/${q.id}/edit`, { replace: true });
      } else {
        await updateQuiz(id, payload);
        setSuccess('Quiz saved!');
        setTimeout(() => setSuccess(''), 2000);
      }
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg ?? err.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteQuestion(qId) {
    if (!confirm('Delete this question?')) return;
    await deleteQuestion(id, qId);
    setQuestions(qs => qs.filter(q => q.id !== qId));
  }

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <div className="quiz-header">
        <h1>{isNew ? 'New Quiz' : 'Edit Quiz'}</h1>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>← Back</button>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>📋 Basic Info</h2>
          <div className="form-group">
            <label>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} />
          </div>
        </div>

        <SettingsPanel settings={settings} onChange={handleSettingChange} />

        {error && <p className="error" style={{ marginBottom: '1rem' }}>{error}</p>}
        {success && <p className="success" style={{ marginBottom: '1rem' }}>✓ {success}</p>}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : isNew ? 'Create Quiz' : 'Save Changes'}
        </button>
      </form>

      {!isNew && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem' }}>
              Questions <span style={{ color: '#6b7280' }}>({questions.length}, {questions.reduce((s, q) => s + q.points, 0)} pts total)</span>
            </h2>
          </div>

          {questions.length === 0 && (
            <p style={{ color: '#6b7280', marginBottom: '1rem' }}>No questions yet. Add your first question below.</p>
          )}

          {questions.map((q, i) => (
            <div key={q.id} className="question-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                    {i + 1}. {q.type.replace('_', ' ')} • {q.points} pt{q.points !== 1 ? 's' : ''}
                  </span>
                  <p style={{ marginTop: '.3rem', fontWeight: 500 }}>{q.text}</p>
                  {q.options?.length > 0 && (
                    <ul style={{ marginTop: '.5rem', paddingLeft: '1.2rem', fontSize: '.85rem' }}>
                      {q.options.map(opt => (
                        <li key={opt.id} style={{ color: opt.id === q.correctAnswer || opt.text === q.correctAnswer ? '#166534' : '#374151' }}>
                          {opt.text} {(opt.id === q.correctAnswer || opt.text === q.correctAnswer) ? '✓' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                  {q.type === 'TRUE_FALSE' && q.correctAnswer && (
                    <p style={{ fontSize: '.85rem', color: '#166534', marginTop: '.3rem' }}>
                      ✓ {q.correctAnswer.charAt(0).toUpperCase() + q.correctAnswer.slice(1)}
                    </p>
                  )}
                  {q.requiresManualGrading && (
                    <p style={{ fontSize: '.8rem', color: '#92400e', marginTop: '.3rem' }}>📝 Manual grading required</p>
                  )}
                </div>
                <button className="btn btn-danger btn-sm" onClick={() => handleDeleteQuestion(q.id)}>Delete</button>
              </div>
            </div>
          ))}

          <QuestionForm quizId={id} onAdded={q => setQuestions(qs => [...qs, q])} />
        </div>
      )}
    </div>
  );
}
