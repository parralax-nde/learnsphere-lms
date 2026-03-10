import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import {
  getCourse,
  createSection,
  reorderSections,
  updateCourse,
} from '../api/courses.js';
import SortableSection from '../components/course/SortableSection.jsx';
import './CourseOutlineEditor.css';

export default function CourseOutlineEditor() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editingTitle, setEditingTitle] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [savingTitle, setSavingTitle] = useState(false);

  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [addingSectionError, setAddingSectionError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCourse(courseId);
      setCourse(data);
      setCourseTitle(data.title);
      setSections(data.sections || []);
    } catch {
      setError('Failed to load course. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveTitle() {
    if (!courseTitle.trim()) return;
    setSavingTitle(true);
    try {
      const updated = await updateCourse(courseId, { title: courseTitle.trim() });
      setCourse(updated);
      setCourseTitle(updated.title);
      setEditingTitle(false);
    } catch {
      setError('Failed to update course title');
    } finally {
      setSavingTitle(false);
    }
  }

  async function handleAddSection() {
    if (!newSectionTitle.trim()) {
      setAddingSectionError('Section title is required');
      return;
    }
    try {
      const section = await createSection(courseId, { title: newSectionTitle.trim() });
      setSections((prev) => [...prev, { ...section, items: [] }]);
      setNewSectionTitle('');
      setAddingSection(false);
      setAddingSectionError('');
    } catch {
      setAddingSectionError('Failed to add section');
    }
  }

  function handleSectionDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sections.findIndex((s) => s.id === active.id);
    const newIndex = sections.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sections, oldIndex, newIndex);
    setSections(reordered);
    reorderSections(courseId, reordered.map((s) => s.id));
  }

  if (loading) {
    return (
      <div className="editor-loading">
        <div className="spinner" />
        <p>Loading course…</p>
      </div>
    );
  }

  if (error && !course) {
    return (
      <div className="editor-error">
        <p>{error}</p>
        <button className="btn btn-primary" onClick={load}>
          Retry
        </button>
        <Link className="btn btn-ghost" to="/">
          Back to Courses
        </Link>
      </div>
    );
  }

  return (
    <div className="editor-container">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link to="/">All Courses</Link>
        <span className="breadcrumb-sep">›</span>
        <span>{course?.title}</span>
      </nav>

      {/* Course title */}
      <div className="course-header">
        {editingTitle ? (
          <div className="title-edit-row">
            <input
              className="course-title-input"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
              autoFocus
            />
            <button
              className="btn btn-primary"
              onClick={handleSaveTitle}
              disabled={savingTitle}
            >
              {savingTitle ? 'Saving…' : 'Save'}
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setCourseTitle(course.title);
                setEditingTitle(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="title-view-row">
            <h1 className="course-title">{course?.title}</h1>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setEditingTitle(true)}
              title="Edit course title"
            >
              ✏️ Edit
            </button>
          </div>
        )}
        {course?.description && (
          <p className="course-description">{course.description}</p>
        )}
      </div>

      {error && <p className="inline-error">{error}</p>}

      {/* Outline */}
      <div className="outline-panel">
        <div className="outline-header">
          <h2>Course Outline</h2>
          <span className="section-count">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </span>
        </div>

        {sections.length === 0 && !addingSection && (
          <div className="empty-outline">
            <p>No sections yet. Start by adding a section to structure your course.</p>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleSectionDragEnd}
        >
          <SortableContext
            items={sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                courseId={courseId}
                onDelete={(id) => setSections((prev) => prev.filter((s) => s.id !== id))}
                onUpdate={(updated) =>
                  setSections((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
                }
              />
            ))}
          </SortableContext>
        </DndContext>

        {/* Add section */}
        {addingSection ? (
          <div className="add-section-form">
            <input
              className="inline-input"
              placeholder="Section title…"
              value={newSectionTitle}
              onChange={(e) => {
                setNewSectionTitle(e.target.value);
                setAddingSectionError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
              autoFocus
            />
            {addingSectionError && (
              <span className="error-text">{addingSectionError}</span>
            )}
            <button className="btn btn-primary" onClick={handleAddSection}>
              Add Section
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                setAddingSection(false);
                setNewSectionTitle('');
                setAddingSectionError('');
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            className="btn btn-add-section"
            onClick={() => setAddingSection(true)}
          >
            + Add Section
          </button>
        )}
      </div>
    </div>
  );
}
