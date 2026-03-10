import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listCourses, createCourse } from '../api/lessons.js';
import './CourseList.css';

/**
 * CourseList — displays all courses owned by the logged-in instructor
 * and allows creating new courses.
 */
export default function CourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const user = JSON.parse(localStorage.getItem('ls_user') || 'null');

  useEffect(() => {
    if (!localStorage.getItem('ls_token')) {
      navigate('/login');
      return;
    }
    fetchCourses();
  }, [navigate]);

  async function fetchCourses() {
    try {
      const { data } = await listCourses();
      setCourses(data.courses);
    } catch (err) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else {
        setError('Failed to load courses.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    setError('');
    try {
      const { data } = await createCourse(newTitle.trim(), newDesc.trim());
      setCourses((prev) => [data.course, ...prev]);
      setNewTitle('');
      setNewDesc('');
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create course.');
    } finally {
      setCreating(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem('ls_token');
    localStorage.removeItem('ls_user');
    navigate('/login');
  }

  return (
    <div className="course-list-page">
      <header className="cl-header">
        <div className="cl-header-left">
          <Link to="/courses" className="cl-logo">LearnSphere</Link>
          <span className="cl-subtitle">Course Dashboard</span>
        </div>
        <div className="cl-header-right">
          {user && <span className="cl-user">{user.email}</span>}
          <button className="btn-outline" onClick={handleLogout}>Sign out</button>
        </div>
      </header>

      <main className="cl-main">
        <div className="cl-top-bar">
          <h1>My Courses</h1>
          <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : '+ New Course'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {showForm && (
          <form onSubmit={handleCreate} className="new-course-form">
            <h2>Create a new course</h2>
            <div className="form-group">
              <label htmlFor="courseTitle">Course title *</label>
              <input
                id="courseTitle"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Introduction to Web Development"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="courseDesc">Description (optional)</label>
              <input
                id="courseDesc"
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="A brief overview of the course"
              />
            </div>
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? 'Creating…' : 'Create Course'}
            </button>
          </form>
        )}

        {loading ? (
          <p className="cl-loading">Loading courses…</p>
        ) : courses.length === 0 ? (
          <div className="cl-empty">
            <p>You haven&apos;t created any courses yet.</p>
            <button className="btn-primary" onClick={() => setShowForm(true)}>
              Create your first course
            </button>
          </div>
        ) : (
          <div className="cl-grid">
            {courses.map((course) => (
              <Link
                key={course.id}
                to={`/courses/${course.id}/lessons`}
                className="cl-card"
              >
                <h2 className="cl-card-title">{course.title}</h2>
                {course.description && (
                  <p className="cl-card-desc">{course.description}</p>
                )}
                <span className="cl-card-meta">
                  {course._count?.lessons ?? 0} lesson
                  {course._count?.lessons !== 1 ? 's' : ''}
                </span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
