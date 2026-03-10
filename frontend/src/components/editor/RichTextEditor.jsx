import { useEffect, useRef } from 'react';
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
 * The component is designed to be mounted with a `key` prop tied to the lesson
 * being edited so that switching lessons triggers a clean remount (and Quill
 * re-initialises with the correct content). Within a single lesson session the
 * component is fully uncontrolled after mount: it calls `onChange` whenever the
 * user edits the content, but does not accept further external `value` updates.
 *
 * @param {object}   props
 * @param {string}   props.value          - Initial HTML content (used only on mount)
 * @param {Function} props.onChange       - Called with new HTML string on every change
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

  // Stable reference to onChange so the effect closure doesn't become stale
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Initialise Quill once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    // Guard against double-init in React StrictMode:
    // Quill adds .ql-container to the target element on init, so if that
    // class is present the editor has already been initialised in this render.
    if (containerRef.current.classList.contains('ql-container')) return;

    const quill = new Quill(containerRef.current, {
      theme: 'snow',
      placeholder,
      readOnly,
      modules: {
        toolbar: readOnly ? false : TOOLBAR_OPTIONS,
      },
    });

    quillRef.current = quill;

    // Populate with initial content (captured from props at mount time)
    if (value) {
      quill.clipboard.dangerouslyPasteHTML(value);
    }

    // Emit HTML on every user edit
    quill.on('text-change', () => {
      // Use root.innerHTML directly to avoid reliance on the getSemanticHTML export feature
      const html = quill.root.innerHTML;
      // Treat an editor with only an empty paragraph as empty
      const isEmpty = quill.getText().trim() === '';
      onChangeRef.current(isEmpty ? '' : html);
    });

    return () => {
      quill.off('text-change');
      quillRef.current = null;
      // Quill inserts the toolbar as a preceding sibling of the container —
      // remove it so a StrictMode remount doesn't produce a second toolbar.
      const toolbar = containerRef.current?.previousElementSibling;
      if (toolbar?.classList.contains('ql-toolbar')) {
        toolbar.remove();
      }
      // Clear Quill's classes and content from the container element itself
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.className = 'rte-container';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Toggle readOnly dynamically (safe to do without remounting)
  useEffect(() => {
    quillRef.current?.enable(!readOnly);
  }, [readOnly]);

  return (
    <div className={`rte-wrapper${className ? ` ${className}` : ''}`}>
      <div ref={containerRef} className="rte-container" />
    </div>
  );
}
