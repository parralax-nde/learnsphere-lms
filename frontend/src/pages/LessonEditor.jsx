import { useParams } from 'react-router-dom';
import FileAttachmentUploader from '../components/FileAttachmentUploader.jsx';

/**
 * LessonEditor page
 *
 * A minimal page that wraps the FileAttachmentUploader for demonstration.
 * In production this would contain the full lesson content editor alongside
 * the attachment panel.
 */
export default function LessonEditor() {
  const { lessonId } = useParams();

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.logo}>LearnSphere</h1>
        <nav style={styles.nav}>
          <span style={styles.navItem}>Lesson Editor</span>
        </nav>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Lesson Materials</h2>
          <p style={styles.cardSubtitle}>
            Upload supplementary files (PDFs, docs, code samples, images) that students can
            download directly from this lesson.
          </p>

          <FileAttachmentUploader lessonId={lessonId} />
        </div>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#f5f7fa',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 2rem',
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  logo: {
    fontSize: '1.4rem',
    fontWeight: 700,
    color: '#4f46e5',
    margin: 0,
  },
  nav: {
    display: 'flex',
    gap: '1.5rem',
  },
  navItem: {
    fontSize: '0.9rem',
    color: '#4a5568',
    fontWeight: 500,
  },
  main: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    padding: '2.5rem 1rem',
  },
  card: {
    width: '100%',
    maxWidth: 720,
  },
  cardTitle: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: '#1a202c',
    marginBottom: '0.5rem',
  },
  cardSubtitle: {
    fontSize: '0.9rem',
    color: '#718096',
    marginBottom: '1.5rem',
    lineHeight: 1.6,
  },
};
