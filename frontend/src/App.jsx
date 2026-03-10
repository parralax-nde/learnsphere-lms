import { Routes, Route, NavLink } from 'react-router-dom';
import QuizList from './pages/QuizList';
import QuizBuilder from './pages/QuizBuilder';
import QuizTaker from './pages/QuizTaker';
import QuizGrader from './pages/QuizGrader';

export default function App() {
  return (
    <>
      <nav className="topnav">
        <NavLink to="/" className="brand">LearnSphere LMS</NavLink>
        <div>
          <NavLink to="/">Quizzes</NavLink>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<QuizList />} />
        <Route path="/quizzes/new" element={<QuizBuilder />} />
        <Route path="/quizzes/:id/edit" element={<QuizBuilder />} />
        <Route path="/quizzes/:id/take" element={<QuizTaker />} />
        <Route path="/quizzes/:id/grade" element={<QuizGrader />} />
      </Routes>
    </>
  );
}
