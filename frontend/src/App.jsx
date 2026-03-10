import { Routes, Route, Navigate } from 'react-router-dom';
import Register from './pages/Register.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/register" element={<Register />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="*" element={<Navigate to="/register" replace />} />
    </Routes>
  );
}
