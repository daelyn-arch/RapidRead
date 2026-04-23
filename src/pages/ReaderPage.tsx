import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReaderStore } from '@/store/readerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRsvpPlayback } from '@/hooks/useRsvpPlayback';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { loadBookContent } from '@/services/storageService';
import { loadDictionary, getDictionary } from '@/services/dictionaryService';
import { tokenize } from '@/engine/tokenizer';
import RsvpDisplay from '@/components/reader/RsvpDisplay';
import PlaybackControls from '@/components/reader/PlaybackControls';
import ProgressBar from '@/components/reader/ProgressBar';
import ChapterNav from '@/components/reader/ChapterNav';
import type { Chapter } from '@/types/book';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChapterNav, setShowChapterNav] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  const { currentToken, currentTokenIndex, isPlaying, currentChapterIndex, tokens } = useReaderStore();
  const setBook = useReaderStore(s => s.setBook);
  const setChapter = useReaderStore(s => s.setChapter);
  const setTokens = useReaderStore(s => s.setTokens);

  const books = useLibraryStore(s => s.books);
  const getProgress = useLibraryStore(s => s.getProgress);
  const customKnownWords = useSettingsStore(s => s.settings.customKnownWords);
  const setBaseWpm = useSettingsStore(s => s.setBaseWpm);
  const getActiveProfile = useSettingsStore(s => s.getActiveProfile);
  const theme = useSettingsStore(s => s.settings.theme);

  const playback = useRsvpPlayback();

  const bookMeta = books.find(b => b.id === bookId);

  // Load book and dictionary — only re-run when bookId changes
  useEffect(() => {
    if (!bookId) return;
    let cancelled = false;
    setBook(bookId);

    const init = async () => {
      setLoading(true);
      try {
        await loadDictionary();
        const content = await loadBookContent(bookId);
        if (cancelled) return;
        if (content) {
          setChapters(content);
          const progress = getProgress(bookId);
          const startChapter = progress?.chapterIndex ?? 0;
          setChapter(startChapter);

          const dictionary = getDictionary();
          const words = useSettingsStore.getState().settings.customKnownWords;
          const chapterTokens = tokenize(
            content[startChapter].rawText,
            content[startChapter].startWordIndex,
            dictionary,
            words,
          );
          setTokens(chapterTokens);
        }
      } catch (err) {
        console.error('Failed to load book:', err);
      }
      if (!cancelled) setLoading(false);
    };

    init();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  const loadChapter = useCallback((index: number) => {
    if (index < 0 || index >= chapters.length) return;
    setChapter(index);
    const dictionary = getDictionary();
    const chapterTokens = tokenize(
      chapters[index].rawText,
      chapters[index].startWordIndex,
      dictionary,
      customKnownWords,
    );
    setTokens(chapterTokens);
  }, [chapters, setChapter, setTokens, customKnownWords]);

  // Auto-hide controls during playback
  useEffect(() => {
    if (!isPlaying) {
      setControlsVisible(true);
      return;
    }
    const timer = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, currentTokenIndex]);

  const keyboardActions = useMemo(() => ({
    toggle: playback.toggle,
    skipForward: playback.skipForward,
    skipBack: playback.skipBack,
    speedUp: () => setBaseWpm(getActiveProfile().baseWpm + 25),
    speedDown: () => setBaseWpm(getActiveProfile().baseWpm - 25),
    prevChapter: () => loadChapter(currentChapterIndex - 1),
    nextChapter: () => loadChapter(currentChapterIndex + 1),
    goBack: () => navigate('/'),
  }), [playback, setBaseWpm, getActiveProfile, loadChapter, currentChapterIndex, navigate]);

  useKeyboardControls(keyboardActions);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-theme={theme}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading book...</p>
      </div>
    );
  }

  if (!bookMeta || chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" data-theme={theme}>
        <p style={{ color: 'var(--text-secondary)' }}>Book not found</p>
        <button onClick={() => navigate('/')} style={{ color: 'var(--accent)' }}>
          Back to Library
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      data-theme={theme}
      style={{ backgroundColor: 'var(--bg-primary)' }}
      onClick={() => setControlsVisible(true)}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 transition-opacity duration-300"
        style={{
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
          borderBottom: '1px solid var(--bg-tertiary)',
        }}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Library
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowChapterNav(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            title="Table of Contents"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="15" y2="18" />
            </svg>
            Contents
          </button>

          <button
            onClick={() => navigate('/settings')}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
            title="Settings"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </button>
        </div>
      </div>

      {/* RSVP Display */}
      <RsvpDisplay token={currentToken} />

      {/* Controls */}
      <div
        className="transition-opacity duration-300"
        style={{
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}
      >
        <PlaybackControls
          isPlaying={isPlaying}
          onToggle={playback.toggle}
          onSkipBack={playback.skipBack}
          onSkipForward={playback.skipForward}
        />
        <ProgressBar
          current={currentTokenIndex}
          total={tokens.length}
          onSeek={playback.seekTo}
          chapterTitle={chapters[currentChapterIndex]?.title}
        />
      </div>

      {/* Chapter navigation overlay */}
      {showChapterNav && bookId && (
        <ChapterNav
          bookId={bookId}
          chapters={chapters}
          currentIndex={currentChapterIndex}
          onSelect={loadChapter}
          onClose={() => setShowChapterNav(false)}
        />
      )}
    </div>
  );
}
