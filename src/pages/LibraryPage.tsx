import { useNavigate } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBookImport } from '@/hooks/useBookImport';
import ImportButton from '@/components/library/ImportButton';
import BookList from '@/components/library/BookList';

export default function LibraryPage() {
  const navigate = useNavigate();
  const { books, progress } = useLibraryStore();
  const theme = useSettingsStore(s => s.settings.theme);
  const { importFile, importing, error, clearError } = useBookImport();

  const handleImport = async (file: File) => {
    const meta = await importFile(file);
    if (meta) {
      navigate(`/app/read/${meta.id}`);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--bg-tertiary)' }}
      >
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          RapidRead
        </h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate('/app/account')}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
            title="Account"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </button>
        <button
          onClick={() => navigate('/app/settings')}
          className="p-2 rounded-lg hover:opacity-80 transition-opacity"
          style={{ color: 'var(--text-secondary)' }}
          title="Settings"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
        </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        {error && (
          <div
            className="mb-4 p-3 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}
          >
            <span className="text-sm">{error}</span>
            <button onClick={clearError} className="ml-2 hover:opacity-80">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        <ImportButton onFileSelected={handleImport} importing={importing} />

        {books.length > 0 && (
          <div className="mt-8">
            <h2
              className="text-lg font-semibold mb-4"
              style={{ color: 'var(--text-primary)' }}
            >
              Your Library
            </h2>
            <BookList
              books={books}
              progress={progress}
              onBookClick={id => navigate(`/app/read/${id}`)}
            />
          </div>
        )}
      </main>

      {/* Version */}
      <footer className="py-3 text-center text-xs" style={{ color: 'var(--text-secondary)' }}>
        v{APP_VERSION}
      </footer>
    </div>
  );
}

const APP_VERSION = __APP_VERSION__;
