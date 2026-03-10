import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listQuizzes, deleteQuiz } from '../api/quiz.js';

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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  heading: {
    fontSize: '26px',
    fontWeight: '700',
    color: '#111827',
  },
  logo: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: '4px',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#3b82f6',
    color: '#fff',
  },
  btnDanger: {
    backgroundColor: '#ef4444',
    color: '#fff',
    padding: '7px 14px',
    fontSize: '13px',
  },
  btnOutline: {
    backgroundColor: '#fff',
    color: '#3b82f6',
    border: '1px solid #3b82f6',
    padding: '7px 14px',
    fontSize: '13px',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    padding: '32px',
    marginBottom: '16px',
  },
  quizRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    marginBottom: '10px',
    backgroundColor: '#f9fafb',
  },
  quizTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#111827',
    marginBottom: '4px',
  },
  quizMeta: {
    fontSize: '13px',
    color: '#6b7280',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    flexShrink: 0,
    marginLeft: '12px',
  },
  empty: {
    textAlign: 'center',
    color: '#6b7280',
    fontSize: '15px',
    padding: '24px 0',
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
};

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listQuizzes()
      .then(setQuizzes)
      .catch(() => setError('Failed to load quizzes.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to delete this quiz? This cannot be undone.')) return;
    try {
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } catch {
      alert('Failed to delete quiz.');
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <div style={styles.logo}>LearnSphere</div>
            <h1 style={styles.heading}>Quiz Builder</h1>
          </div>
          <Link to="/quizzes/new" style={{ ...styles.btn, ...styles.btnPrimary }}>
            + New Quiz
          </Link>
        </div>

        <div style={styles.card}>
          {error && <div style={styles.errorBox} role="alert">{error}</div>}

          {loading && (
            <div style={styles.empty}>Loading quizzes…</div>
          )}

          {!loading && quizzes.length === 0 && (
            <div style={styles.empty}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📝</div>
              <p>No quizzes yet.</p>
              <p style={{ marginTop: '8px' }}>
                <Link to="/quizzes/new" style={{ color: '#3b82f6' }}>Create your first quiz</Link>
              </p>
            </div>
          )}

          {quizzes.map((quiz) => (
            <div key={quiz.id} style={styles.quizRow}>
              <div>
                <div style={styles.quizTitle}>{quiz.title}</div>
                <div style={styles.quizMeta}>
                  {quiz.description
                    ? `${quiz.description.slice(0, 80)}${quiz.description.length > 80 ? '…' : ''}`
                    : 'No description'
                  }
                  {' · '}{quiz.totalPoints} pt{quiz.totalPoints !== 1 ? 's' : ''}
                </div>
              </div>
              <div style={styles.actions}>
                <Link
                  to={`/quizzes/${quiz.id}/edit`}
                  style={{ ...styles.btn, ...styles.btnOutline }}
                >
                  Edit
                </Link>
                <Link
                  to={`/quizzes/${quiz.id}/take`}
                  style={{ ...styles.btn, ...styles.btnOutline }}
                >
                  Take
                </Link>
                <Link
                  to={`/quizzes/${quiz.id}/grade`}
                  style={{ ...styles.btn, ...styles.btnOutline }}
                >
                  Grade
                </Link>
                <button
                  style={{ ...styles.btn, ...styles.btnDanger }}
                  onClick={() => handleDelete(quiz.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
