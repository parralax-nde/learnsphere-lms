import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LessonEditor from './pages/LessonEditor.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Demo route – replace :lessonId with an actual lesson ID in production */}
        <Route path="/lessons/:lessonId/edit" element={<LessonEditor />} />
        <Route path="*" element={<Navigate to="/lessons/demo-lesson/edit" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
