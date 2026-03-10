import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import QuizList from './pages/QuizList.jsx';
import QuizBuilder from './pages/QuizBuilder.jsx';
import QuizTaker from './pages/QuizTaker.jsx';
import QuizGrader from './pages/QuizGrader.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/quizzes" element={<QuizList />} />
      <Route path="/quizzes/new" element={<QuizBuilder />} />
      <Route path="/quizzes/:id/edit" element={<QuizBuilder />} />
      <Route path="/quizzes/:id/take" element={<QuizTaker />} />
      <Route path="/quizzes/:id/grade" element={<QuizGrader />} />
      <Route path="*" element={<Navigate to="/quizzes" replace />} />
    </Routes>
  );
}
