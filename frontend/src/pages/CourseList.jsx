import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCourses, createCourse, deleteCourse } from '../api/courses.js';
import './CourseList.css';

export default function CourseList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [createError, setCreateError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getCourses()
      .then(setCourses)
      .catch(() => setError('Failed to load courses'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate() {
    if (!newTitle.trim()) {
      setCreateError('Course title is required');
      return;
    }
    try {
      const course = await createCourse({ title: newTitle.trim(), description: newDesc.trim() });
      navigate(`/courses/${course.id}/outline`);
    } catch {
      setCreateError('Failed to create course');
    }
  }

  async function handleDelete(id, title) {
    if (!window.confirm(`Delete course "${title}"? This cannot be undone.`)) return;
    await deleteCourse(id);
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) {
    return (
      <div className="list-loading">
        <div className="spinner" />
        <p>Loading courses…</p>
      </div>
    );
  }

  return (
    <div className="list-container">
      <header className="list-header">
        <div>
          <h1 className="app-name">LearnSphere LMS</h1>
          <p className="app-subtitle">Instructor Course Management</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreating(true)}>
          + New Course
        </button>
      </header>

      {error && <p className="inline-error">{error}</p>}

      {creating && (
        <div className="create-form">
          <h2>Create New Course</h2>
          <input
            className="inline-input full-width"
            placeholder="Course title *"
            value={newTitle}
            onChange={(e) => { setNewTitle(e.target.value); setCreateError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <input
            className="inline-input full-width"
            placeholder="Short description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
          />
          {createError && <p className="error-text">{createError}</p>}
          <div className="create-actions">
            <button className="btn btn-primary" onClick={handleCreate}>
              Create &amp; Open Editor
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => { setCreating(false); setNewTitle(''); setNewDesc(''); setCreateError(''); }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {courses.length === 0 && !creating && (
        <div className="empty-courses">
          <p>No courses yet. Create your first course to get started.</p>
        </div>
      )}

      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course.id} className="course-card">
            <Link to={`/courses/${course.id}/outline`} className="course-card-link">
              <h3 className="course-card-title">{course.title}</h3>
              {course.description && (
                <p className="course-card-desc">{course.description}</p>
              )}
              <p className="course-card-meta">
                {course.sections?.length ?? 0} section
                {course.sections?.length !== 1 ? 's' : ''}
              </p>
            </Link>
            <button
              className="btn btn-sm btn-danger card-delete"
              onClick={() => handleDelete(course.id, course.title)}
              title="Delete course"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
