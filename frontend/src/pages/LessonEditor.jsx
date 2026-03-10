import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import RichTextEditor from '../components/editor/RichTextEditor.jsx';
import {
  listLessons,
  getLesson,
  createLesson,
  updateLesson,
  deleteLesson,
} from '../api/lessons.js';
import './LessonEditor.css';

/**
 * LessonEditor — the main page for instructors to create and edit lesson content
 * using the Quill rich-text editor.
 *
 * Route: /courses/:courseId/lessons
 *        /courses/:courseId/lessons/:lessonId
 */
export default function LessonEditor() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  // Sidebar lesson list
  const [lessons, setLessons] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  // Editor state
  const [activeLesson, setActiveLesson] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saved' | 'error'

  // New lesson form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const [error, setError] = useState('');

  // Redirect if not authenticated
  useEffect(() => {
    if (!localStorage.getItem('ls_token')) {
      navigate('/login');
    }
  }, [navigate]);

  // Load lesson list
  useEffect(() => {
    if (!courseId) return;
    fetchLessons();
  }, [courseId]);

  // Load a specific lesson when the URL changes
  useEffect(() => {
    if (lessonId) {
      loadLesson(lessonId);
    } else {
      setActiveLesson(null);
      setTitle('');
      setContent('');
    }
  }, [lessonId]);

  async function fetchLessons() {
    setLoadingList(true);
    try {
      const { data } = await listLessons(courseId);
      setLessons(data.lessons);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else setError('Failed to load lessons.');
    } finally {
      setLoadingList(false);
    }
  }

  async function loadLesson(id) {
    setError('');
    try {
      const { data } = await getLesson(courseId, id);
      setActiveLesson(data.lesson);
      setTitle(data.lesson.title);
      setContent(data.lesson.content ?? '');
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else setError('Failed to load lesson.');
    }
  }

  // Auto-save content when the editor value changes (debounced)
  const handleContentChange = useCallback((html) => {
    setContent(html);
    setSaveStatus('');
  }, []);

  async function handleSave(e) {
    e?.preventDefault();
    if (!title.trim()) {
      setError('Lesson title is required.');
      return;
    }
    setSaving(true);
    setSaveStatus('');
    setError('');

    try {
      if (activeLesson) {
        // Update existing lesson
        const { data } = await updateLesson(courseId, activeLesson.id, { title, content });
        setActiveLesson(data.lesson);
        setLessons((prev) =>
          prev.map((l) => (l.id === data.lesson.id ? { ...l, title: data.lesson.title } : l)),
        );
      } else {
        // Create new lesson and navigate to it
        const order = lessons.length;
        const { data } = await createLesson(courseId, title, content, order);
        setLessons((prev) => [...prev, data.lesson]);
        navigate(`/courses/${courseId}/lessons/${data.lesson.id}`, { replace: true });
      }
      setSaveStatus('saved');
    } catch (err) {
      setSaveStatus('error');
      setError(err.response?.data?.message || 'Failed to save lesson.');
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateLesson(e) {
    e.preventDefault();
    if (!newLessonTitle.trim()) return;
    setCreating(true);
    try {
      const { data } = await createLesson(courseId, newLessonTitle.trim(), '', lessons.length);
      setLessons((prev) => [...prev, data.lesson]);
      setNewLessonTitle('');
      setShowNewForm(false);
      navigate(`/courses/${courseId}/lessons/${data.lesson.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create lesson.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteLesson(id) {
    if (!window.confirm('Delete this lesson? This cannot be undone.')) return;
    try {
      await deleteLesson(courseId, id);
      setLessons((prev) => prev.filter((l) => l.id !== id));
      if (lessonId === id) {
        navigate(`/courses/${courseId}/lessons`, { replace: true });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete lesson.');
    }
  }

  const isEditing = !!activeLesson;

  return (
    <div className="le-layout">
      {/* Sidebar */}
      <aside className="le-sidebar">
        <div className="le-sidebar-header">
          <Link to="/courses" className="le-back-link">← Courses</Link>
          <button
            className="le-new-btn"
            onClick={() => setShowNewForm((v) => !v)}
            title="Add a new lesson"
          >
            +
          </button>
        </div>

        <h2 className="le-sidebar-title">Lessons</h2>

        {showNewForm && (
          <form onSubmit={handleCreateLesson} className="le-new-form">
            <input
              type="text"
              value={newLessonTitle}
              onChange={(e) => setNewLessonTitle(e.target.value)}
              placeholder="New lesson title"
              autoFocus
              required
            />
            <button type="submit" disabled={creating}>
              {creating ? '…' : 'Add'}
            </button>
          </form>
        )}

        {loadingList ? (
          <p className="le-list-loading">Loading…</p>
        ) : lessons.length === 0 ? (
          <p className="le-list-empty">No lessons yet.</p>
        ) : (
          <ul className="le-lesson-list">
            {lessons.map((lesson) => (
              <li
                key={lesson.id}
                className={`le-lesson-item ${lessonId === lesson.id ? 'active' : ''}`}
              >
                <Link
                  to={`/courses/${courseId}/lessons/${lesson.id}`}
                  className="le-lesson-link"
                >
                  {lesson.title}
                </Link>
                <button
                  className="le-delete-btn"
                  onClick={() => handleDeleteLesson(lesson.id)}
                  title="Delete lesson"
                  aria-label={`Delete ${lesson.title}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      {/* Editor area */}
      <main className="le-editor-area">
        <div className="le-editor-topbar">
          <div className="le-editor-topbar-left">
            <h1 className="le-editor-heading">
              {isEditing ? 'Edit Lesson' : 'New Lesson'}
            </h1>
          </div>
          <div className="le-editor-topbar-right">
            {saveStatus === 'saved' && (
              <span className="le-save-status saved">✓ Saved</span>
            )}
            {saveStatus === 'error' && (
              <span className="le-save-status error">Save failed</span>
            )}
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : isEditing ? 'Save changes' : 'Create lesson'}
            </button>
          </div>
        </div>

        {error && <div className="alert alert-error le-error">{error}</div>}

        <form onSubmit={handleSave} className="le-form">
          <div className="form-group le-title-group">
            <label htmlFor="lessonTitle">Lesson title</label>
            <input
              id="lessonTitle"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter lesson title"
              className="le-title-input"
              required
            />
          </div>

          <div className="le-content-group">
            <label className="le-content-label">Content</label>
            <RichTextEditor
              value={content}
              onChange={handleContentChange}
              placeholder="Write your lesson content here… Use the toolbar for formatting, code blocks, and media."
            />
            <p className="le-content-hint">
              Content is automatically sanitized before saving to prevent XSS.
            </p>
          </div>
        </form>
      </main>
    </div>
  );
}
