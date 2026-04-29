import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useBookImport } from '@/hooks/useBookImport';
import ImportButton from '@/components/library/ImportButton';
import BookList from '@/components/library/BookList';
import SampleBooks from '@/components/library/SampleBooks';
import UpgradeBanner from '@/billing/UpgradeBanner';

export default function LibraryPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { books, progress } = useLibraryStore();
  const theme = useSettingsStore(s => s.settings.theme);
  const { importFile, importing, error, clearError } = useBookImport();
  const [verifiedBannerOpen, setVerifiedBannerOpen] = useState(() => params.get('verified') === '1');
  const [samplesOpen, setSamplesOpen] = useState(false);

  function dismissVerifiedBanner() {
    setVerifiedBannerOpen(false);
    if (params.has('verified')) {
      const next = new URLSearchParams(params);
      next.delete('verified');
      setParams(next, { replace: true });
    }
  }

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
        className="safe-top flex items-center justify-between px-6 py-4 border-b"
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
            onClick={() => navigate('/app/analytics')}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
            title="Reading analytics"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="20" x2="21" y2="20" />
              <rect x="5" y="11" width="3" height="9" />
              <rect x="10.5" y="6" width="3" height="14" />
              <rect x="16" y="13" width="3" height="7" />
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
        {verifiedBannerOpen && (
          <div
            className="mb-4 p-3 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
          >
            <span className="text-sm">
              ✓ Email verified. Welcome to RapidRead.
            </span>
            <button
              onClick={dismissVerifiedBanner}
              className="ml-2 hover:opacity-80"
              aria-label="Dismiss"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
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

        <UpgradeBanner />

        <ImportButton onFileSelected={handleImport} importing={importing} />

        <button
          type="button"
          onClick={() => setSamplesOpen(true)}
          className="mt-3 w-full rounded-lg py-3 text-sm font-medium border transition-opacity hover:opacity-80"
          style={{
            borderColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            background: 'transparent',
          }}
        >
          Browse free sample books
        </button>

        <SampleBooks
          open={samplesOpen}
          onClose={() => setSamplesOpen(false)}
          onImportFile={handleImport}
          importing={importing}
        />

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
