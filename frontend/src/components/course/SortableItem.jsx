import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { deleteItem, updateItem } from '../../api/courses.js';

const ITEM_ICONS = { lesson: '📄', quiz: '❓' };
const ITEM_COLORS = { lesson: '#3b82f6', quiz: '#8b5cf6' };

export default function SortableItem({ item, courseId, sectionId, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(item.title);
  const [type, setType] = useState(item.type);
  const [saving, setSaving] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await updateItem(courseId, sectionId, item.id, {
        title: title.trim(),
        type,
      });
      onUpdate(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await deleteItem(courseId, sectionId, item.id);
    onDelete(item.id);
  }

  return (
    <div ref={setNodeRef} style={style} className="sortable-item">
      <span
        className="drag-handle"
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        aria-label="Drag handle"
      >
        ⠿
      </span>

      <span
        className="item-type-badge"
        style={{ background: ITEM_COLORS[item.type] }}
        title={item.type}
      >
        {ITEM_ICONS[item.type]} {item.type}
      </span>

      {editing ? (
        <div className="item-edit-row">
          <input
            className="inline-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            autoFocus
          />
          <select
            className="type-select"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="lesson">Lesson</option>
            <option value="quiz">Quiz</option>
          </select>
          <button className="btn btn-sm btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? '…' : 'Save'}
          </button>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => {
              setTitle(item.title);
              setType(item.type);
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <span className="item-title">{item.title}</span>
      )}

      <div className="item-actions">
        {!editing && (
          <button className="btn btn-sm btn-ghost" onClick={() => setEditing(true)} title="Edit">
            ✏️
          </button>
        )}
        <button className="btn btn-sm btn-danger" onClick={handleDelete} title="Delete">
          🗑️
        </button>
      </div>
    </div>
  );
}
