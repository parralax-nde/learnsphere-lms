import { useEffect, useRef, useCallback } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import './RichTextEditor.css';

/**
 * Toolbar configuration for the Quill editor.
 * Supports: headings, text formatting, lists, code blocks,
 *           blockquotes, links, images, and alignment.
 */
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  [{ color: [] }, { background: [] }],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ indent: '-1' }, { indent: '+1' }],
  ['blockquote', 'code-block'],
  ['link', 'image'],
  [{ align: [] }],
  ['clean'],
];

/**
 * RichTextEditor — a Quill-powered rich text editor component.
 *
 * @param {object}   props
 * @param {string}   props.value          - Current HTML content (controlled)
 * @param {Function} props.onChange       - Called with new HTML string on change
 * @param {string}   [props.placeholder] - Placeholder text shown in empty editor
 * @param {boolean}  [props.readOnly]    - When true, renders the editor as read-only
 * @param {string}   [props.className]   - Additional CSS class for the wrapper
 */
export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing your lesson content…',
  readOnly = false,
  className = '',
}) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  // Track whether the current value change was triggered internally to avoid loops
  const isInternalChange = useRef(false);

  // Stable reference to onChange so the effect closure doesn't become stale
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialise Quill once on mount
  useEffect(() => {
    if (!containerRef.current || quillRef.current) return;

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder,
      readOnly,
      modules: {
        toolbar: readOnly ? false : TOOLBAR_OPTIONS,
      },
    });

    quillRef.current = quill;

    // Set initial content
    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    // Emit HTML on every change
    quill.on('text-change', () => {
      isInternalChange.current = true;
      // Use root.innerHTML directly to avoid reliance on the getSemanticHTML export feature
      const html = quill.root.innerHTML;
      // Treat an editor with only an empty paragraph as empty
      const isEmpty = quill.getText().trim() === '';
      onChangeRef.current(isEmpty ? '' : html);
    });

    return () => {
      quill.off('text-change');
      quillRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes (e.g. loading saved content) without re-initialising
  useEffect(() => {
    const quill = quillRef.current;
    if (!quill) return;

    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }

    // Only update DOM when the external value differs from what's rendered
    const currentHtml = quill.root.innerHTML;
    if (value !== currentHtml) {
      const selection = quill.getSelection();
      quill.clipboard.dangerouslyPasteHTML(value ?? '');
      if (selection) {
        quill.setSelection(selection);
      }
    }
  }, [value]);

  // Toggle readOnly dynamically
  useEffect(() => {
    quillRef.current?.enable(!readOnly);
  }, [readOnly]);

  return (
    <div className={`rte-wrapper${className ? ` ${className}` : ''}`}>
      <div ref={containerRef} className="rte-container" />
    </div>
  );
}
