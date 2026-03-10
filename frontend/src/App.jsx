import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CourseList from './pages/CourseList.jsx';
import CourseOutlineEditor from './pages/CourseOutlineEditor.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CourseList />} />
        <Route path="/courses/:courseId/outline" element={<CourseOutlineEditor />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
