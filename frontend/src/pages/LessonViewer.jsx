import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import { getLesson } from '../api/lessons.js';
import './LessonViewer.css';

/**
 * LessonViewer — renders a lesson's rich-text HTML content safely using DOMPurify.
 *
 * Even though content is sanitized server-side before storage, we apply
 * DOMPurify again client-side as a defense-in-depth measure.
 *
 * Route: /courses/:courseId/lessons/:lessonId/view
 */
export default function LessonViewer() {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('ls_token')) {
      navigate('/login');
      return;
    }
    loadLesson();
  }, [lessonId]);

  async function loadLesson() {
    setLoading(true);
    setError('');
    try {
      const { data } = await getLesson(courseId, lessonId);
      setLesson(data.lesson);
    } catch (err) {
      if (err.response?.status === 401) navigate('/login');
      else if (err.response?.status === 404) setError('Lesson not found.');
      else setError('Failed to load lesson.');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Sanitize HTML client-side before rendering (defense-in-depth).
   * The server already sanitizes on write, but we apply DOMPurify again
   * on the client to protect against any future data-path issues.
   */
  function getSafeHtml(html) {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'strong', 'em', 'u', 's', 'sub', 'sup',
        'ul', 'ol', 'li',
        'blockquote',
        'pre', 'code',
        'a',
        'img',
        'span', 'div',
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'style'],
      ALLOW_DATA_ATTR: false,
      FORCE_BODY: false,
    });
  }

  if (loading) {
    return <div className="lv-loading">Loading lesson…</div>;
  }

  if (error) {
    return (
      <div className="lv-error-page">
        <div className="alert alert-error">{error}</div>
        <Link to={`/courses/${courseId}/lessons`}>← Back to lessons</Link>
      </div>
    );
  }

  return (
    <div className="lv-page">
      <header className="lv-header">
        <Link to={`/courses/${courseId}/lessons/${lessonId}`} className="lv-edit-link">
          ✏️ Edit lesson
        </Link>
        <Link to={`/courses/${courseId}/lessons`} className="lv-back-link">
          ← All lessons
        </Link>
      </header>

      <article className="lv-article">
        <h1 className="lv-title">{lesson.title}</h1>

        {lesson.content ? (
          // eslint-disable-next-line react/no-danger
          <div
            className="lv-content ql-content"
            dangerouslySetInnerHTML={{ __html: getSafeHtml(lesson.content) }}
          />
        ) : (
          <p className="lv-no-content">This lesson has no content yet.</p>
        )}
      </article>
    </div>
  );
}
