import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { CourseMetadataForm } from '../../components/CourseMetadataForm';
import './InstructorLayout.css';

export function CreateCoursePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [created, setCreated] = useState(null);

  const handleSuccess = (course) => {
    setCreated(course);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="instructor-layout">
      {/* Sidebar */}
      <aside className="instructor-sidebar">
        <div className="sidebar-brand">
          <BookOpen size={24} />
          <span>LearnSphere</span>
        </div>

        <nav className="sidebar-nav">
          <a href="/instructor" className="sidebar-link">
            <Home size={18} />
            Dashboard
          </a>
          <a href="/instructor/courses/new" className="sidebar-link sidebar-link--active">
            <BookOpen size={18} />
            New Course
          </a>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar" aria-hidden="true">
              {user?.fullName?.[0]?.toUpperCase() || '?'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{user?.fullName}</span>
              <span className="sidebar-user-role">Instructor</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout"
            onClick={handleLogout}
            aria-label="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="instructor-main">
        <header className="page-header">
          <div>
            <h1 className="page-title">
              {created ? 'Course Saved' : 'Create New Course'}
            </h1>
            <p className="page-subtitle">
              {created
                ? `"${created.title}" has been saved.`
                : 'Fill in your course metadata. You can save a draft at any step.'}
            </p>
          </div>
        </header>

        {created ? (
          <div className="success-panel">
            <div className="success-icon" aria-hidden="true">🎉</div>
            <h2>
              {created.status === 'published'
                ? 'Course Published!'
                : 'Draft Saved!'}
            </h2>
            <p>
              {created.status === 'published'
                ? `"${created.title}" is now live and available to learners.`
                : `"${created.title}" has been saved as a draft. You can continue editing it later.`}
            </p>
            <div className="success-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setCreated(null)}
              >
                Create Another Course
              </button>
              <a href="/instructor" className="btn btn--outline">
                Go to Dashboard
              </a>
            </div>
          </div>
        ) : (
          <CourseMetadataForm onSuccess={handleSuccess} />
        )}
      </main>
    </div>
  );
}
