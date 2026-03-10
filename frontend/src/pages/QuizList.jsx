import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listQuizzes, deleteQuiz } from '../api/quiz';

export default function QuizList() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    listQuizzes().then(setQuizzes).finally(() => setLoading(false));
  }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this quiz?')) return;
    await deleteQuiz(id);
    setQuizzes(q => q.filter(x => x.id !== id));
  }

  if (loading) return <div className="container">Loading…</div>;

  return (
    <div className="container">
      <div className="quiz-header">
        <h1>Quizzes</h1>
        <Link to="/quizzes/new" className="btn btn-primary">+ New Quiz</Link>
      </div>

      {quizzes.length === 0 && (
        <div className="card" style={{ textAlign: 'center', color: '#6b7280' }}>
          No quizzes yet. Create your first quiz!
        </div>
      )}

      {quizzes.map(quiz => (
        <div key={quiz.id} className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '.5rem' }}>
            <div>
              <h3 style={{ marginBottom: '.3rem' }}>{quiz.title}</h3>
              {quiz.description && (
                <p style={{ color: '#6b7280', fontSize: '.9rem', marginBottom: '.5rem' }}>{quiz.description}</p>
              )}
              <div style={{ display: 'flex', gap: '1rem', fontSize: '.8rem', color: '#6b7280', flexWrap: 'wrap' }}>
                <span>📝 {quiz._count?.questions ?? 0} questions</span>
                <span>🏆 {quiz.totalPoints} pts</span>
                {quiz.timeLimitMinutes && <span>⏱ {quiz.timeLimitMinutes} min</span>}
                {quiz.maxAttempts && <span>🔁 Max {quiz.maxAttempts} attempts</span>}
                {quiz.passingScore > 0 && <span>✅ Pass: {quiz.passingScore}%</span>}
                {!quiz.showAnswersAfterSubmission && <span>🔒 Answers hidden</span>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/quizzes/${quiz.id}/edit`)}>Edit</button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/quizzes/${quiz.id}/take`)}>Take</button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/quizzes/${quiz.id}/grade`)}>Grade</button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(quiz.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
