import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import CourseList from './pages/CourseList.jsx';
import LessonEditor from './pages/LessonEditor.jsx';
import LessonViewer from './pages/LessonViewer.jsx';

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Course authoring */}
      <Route path="/courses" element={<CourseList />} />
      <Route path="/courses/:courseId/lessons" element={<LessonEditor />} />
      <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
      <Route path="/courses/:courseId/lessons/:lessonId/view" element={<LessonViewer />} />

      {/* Default redirect */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
