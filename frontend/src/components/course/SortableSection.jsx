import React, { useState } from 'react';
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
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import SortableItem from './SortableItem.jsx';
import {
  createItem,
  deleteSection,
  updateSection,
  reorderItems,
} from '../../api/courses.js';

function SectionHeader({ section, courseId, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [saving, setSaving] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await updateSection(courseId, section.id, { title: title.trim() });
      onUpdate({ ...section, title: updated.title });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete section "${section.title}" and all its items?`)) return;
    await deleteSection(courseId, section.id);
    onDelete(section.id);
  }

  return (
    <div ref={setNodeRef} style={style} className="section-card">
      <div className="section-header">
        <span
          className="drag-handle section-drag-handle"
          {...attributes}
          {...listeners}
          title="Drag to reorder section"
          aria-label="Drag section"
        >
          ⠿
        </span>

        {editing ? (
          <div className="section-edit-row">
            <input
              className="inline-input section-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              autoFocus
            />
            <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? '…' : 'Save'}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                setTitle(section.title);
                setEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <h3 className="section-title">{section.title}</h3>
        )}

        <div className="section-actions">
          {!editing && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setEditing(true)}
              title="Rename section"
            >
              ✏️
            </button>
          )}
          <button
            className="btn btn-sm btn-danger"
            onClick={handleDelete}
            title="Delete section"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SortableSection({ section, courseId, onDelete, onUpdate }) {
  const [items, setItems] = useState(section.items || []);
  const [addingType, setAddingType] = useState(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [addingError, setAddingError] = useState('');

  const sensors = useSensors(useSensor(PointerSensor));

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    reorderItems(courseId, section.id, reordered.map((i) => i.id));
  }

  async function handleAddItem() {
    if (!newItemTitle.trim()) {
      setAddingError('Title is required');
      return;
    }
    try {
      const item = await createItem(courseId, section.id, {
        title: newItemTitle.trim(),
        type: addingType,
      });
      setItems((prev) => [...prev, item]);
      setNewItemTitle('');
      setAddingType(null);
      setAddingError('');
    } catch {
      setAddingError('Failed to add item');
    }
  }

  return (
    <div className="section-wrapper">
      <SectionHeader
        section={section}
        courseId={courseId}
        onDelete={onDelete}
        onUpdate={onUpdate}
      />

      <div className="items-list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {items.length === 0 && (
              <p className="empty-hint">No items yet. Add a lesson or quiz below.</p>
            )}
            {items.map((item) => (
              <SortableItem
                key={item.id}
                item={item}
                courseId={courseId}
                sectionId={section.id}
                onDelete={(id) => setItems((prev) => prev.filter((i) => i.id !== id))}
                onUpdate={(updated) =>
                  setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
                }
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {addingType ? (
        <div className="add-item-form">
          <input
            className="inline-input"
            placeholder={`${addingType === 'quiz' ? 'Quiz' : 'Lesson'} title…`}
            value={newItemTitle}
            onChange={(e) => {
              setNewItemTitle(e.target.value);
              setAddingError('');
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            autoFocus
          />
          {addingError && <span className="error-text">{addingError}</span>}
          <button className="btn btn-sm btn-primary" onClick={handleAddItem}>
            Add
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setAddingType(null);
              setNewItemTitle('');
              setAddingError('');
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="add-item-buttons">
          <button className="btn btn-sm btn-outline" onClick={() => setAddingType('lesson')}>
            + Add Lesson
          </button>
          <button className="btn btn-sm btn-outline" onClick={() => setAddingType('quiz')}>
            + Add Quiz
          </button>
        </div>
      )}
    </div>
  );
}
