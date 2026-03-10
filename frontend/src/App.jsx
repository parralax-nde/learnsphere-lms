import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import Login from './pages/Login.jsx';
import CourseList from './pages/CourseList.jsx';
import CourseForm from './pages/CourseForm.jsx';
import CourseDetail from './pages/CourseDetail.jsx';
import AdminReview from './pages/AdminReview.jsx';

function PrivateRoute({ children, requiredRole }) {
  const userJson = sessionStorage.getItem('user');
  const user = userJson ? JSON.parse(userJson) : null;

  if (!user) return <Navigate to="/login" replace />;
  if (requiredRole && user.role !== requiredRole) return <Navigate to="/courses" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/login" element={<Login />} />

      {/* Courses */}
      <Route
        path="/courses"
        element={<PrivateRoute><CourseList /></PrivateRoute>}
      />
      <Route
        path="/courses/new"
        element={<PrivateRoute requiredRole={undefined}><CourseForm /></PrivateRoute>}
      />
      <Route
        path="/courses/:id"
        element={<PrivateRoute><CourseDetail /></PrivateRoute>}
      />
      <Route
        path="/courses/:id/edit"
        element={<PrivateRoute><CourseForm /></PrivateRoute>}
      />

      {/* Admin */}
      <Route
        path="/admin/review"
        element={<PrivateRoute requiredRole="ADMIN"><AdminReview /></PrivateRoute>}
      />

      {/* Default */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
