import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import PageView from '@/components/reader/PageView';
import WordActionsMenu from '@/components/reader/WordActionsMenu';
import BookmarksPanel from '@/components/reader/BookmarksPanel';
import type { Chapter } from '@/types/book';

type ViewMode = 'rsvp' | 'page';

export default function ReaderPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const navigate = useNavigate();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChapterNav, setShowChapterNav] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('rsvp');
  const [activeMenu, setActiveMenu] = useState<{ tokenIndex: number; rect: DOMRect } | null>(null);

  const { currentToken, currentTokenIndex, isPlaying, currentChapterIndex, tokens } = useReaderStore();
  const setBook = useReaderStore(s => s.setBook);
  const setChapter = useReaderStore(s => s.setChapter);
  const setTokens = useReaderStore(s => s.setTokens);

  const books = useLibraryStore(s => s.books);
  const getProgress = useLibraryStore(s => s.getProgress);
  const updateProgress = useLibraryStore(s => s.updateProgress);
  const addBookmark = useLibraryStore(s => s.addBookmark);
  const setBaseWpm = useSettingsStore(s => s.setBaseWpm);
  const getActiveProfile = useSettingsStore(s => s.getActiveProfile);
  const theme = useSettingsStore(s => s.settings.theme);

  const playback = useRsvpPlayback();
  const savedPositionRef = useRef(0);

  const bookMeta = books.find(b => b.id === bookId);

  // Save progress helper
  const saveProgress = useCallback(() => {
    if (!bookId || tokens.length === 0) return;
    const pos = savedPositionRef.current;
    const token = tokens[pos];
    if (token) {
      updateProgress(bookId, {
        chapterIndex: currentChapterIndex,
        wordIndex: pos,
        globalWordIndex: token.globalIndex,
      });
    }
  }, [bookId, currentChapterIndex, tokens, updateProgress]);

  // Track current position for saving
  useEffect(() => {
    savedPositionRef.current = currentTokenIndex;
  }, [currentTokenIndex]);

  // Save progress when leaving the page
  useEffect(() => {
    return () => { saveProgress(); };
  }, [saveProgress]);

  // Save progress on visibility change (tab switch, minimize)
  useEffect(() => {
    const handler = () => {
      if (document.hidden) saveProgress();
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [saveProgress]);

  // Load book and dictionary
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
          const startWord = progress?.wordIndex ?? 0;
          setChapter(startChapter);

          const dictionary = getDictionary();
          const settings = useSettingsStore.getState().settings;
          const chapterTokens = tokenize(
            content[startChapter].rawText,
            content[startChapter].startWordIndex,
            dictionary,
            settings.customKnownWords,
            settings.longWordThreshold,
          );
          setTokens(chapterTokens);

          // Resume from saved word position
          if (startWord > 0) {
            // Small delay to let playback controller load tokens first
            setTimeout(() => playback.seekTo(startWord), 50);
          }
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
    saveProgress();
    setChapter(index);
    const dictionary = getDictionary();
    const settings = useSettingsStore.getState().settings;
    const chapterTokens = tokenize(
      chapters[index].rawText,
      chapters[index].startWordIndex,
      dictionary,
      settings.customKnownWords,
      settings.longWordThreshold,
    );
    setTokens(chapterTokens);
  }, [chapters, setChapter, setTokens, saveProgress]);

  // Auto-hide controls during RSVP playback
  useEffect(() => {
    if (!isPlaying || viewMode === 'page') {
      setControlsVisible(true);
      return;
    }
    const timer = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [isPlaying, currentTokenIndex, viewMode]);

  // Pause RSVP when switching to page view
  const toggleView = useCallback(() => {
    if (viewMode === 'rsvp') {
      playback.pause();
      setViewMode('page');
    } else {
      setViewMode('rsvp');
    }
  }, [viewMode, playback]);

  const handleWordClick = useCallback((index: number) => {
    playback.seekTo(index);
  }, [playback]);

  const handleWordLongPress = useCallback((index: number, rect: DOMRect) => {
    playback.pause();
    setActiveMenu({ tokenIndex: index, rect });
  }, [playback]);

  const handleAddBookmarkFromMenu = useCallback((note?: string) => {
    if (!bookId || !activeMenu) return;
    addBookmark({
      bookId,
      chapterIndex: currentChapterIndex,
      wordIndex: activeMenu.tokenIndex,
      label: note,
    });
  }, [bookId, activeMenu, currentChapterIndex, addBookmark]);

  const handleJumpToBookmark = useCallback((chapterIndex: number, wordIndex: number) => {
    setShowBookmarks(false);
    if (chapterIndex !== currentChapterIndex) {
      // Let the chapter load first, then seek.
      savedPositionRef.current = wordIndex;
      loadChapter(chapterIndex);
    } else {
      playback.seekTo(wordIndex);
    }
  }, [currentChapterIndex, loadChapter, playback]);

  const keyboardActions = useMemo(() => ({
    toggle: playback.toggle,
    skipForward: playback.skipForward,
    skipBack: playback.skipBack,
    speedUp: () => setBaseWpm(getActiveProfile().baseWpm + 25),
    speedDown: () => setBaseWpm(getActiveProfile().baseWpm - 25),
    prevChapter: () => loadChapter(currentChapterIndex - 1),
    nextChapter: () => loadChapter(currentChapterIndex + 1),
    goBack: () => navigate('/app'),
  }), [playback, setBaseWpm, getActiveProfile, loadChapter, currentChapterIndex, navigate]);

  useKeyboardControls(keyboardActions);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-theme={theme}
        style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading book...</p>
      </div>
    );
  }

  if (!bookMeta || chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" data-theme={theme}
        style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Book not found</p>
        <button onClick={() => navigate('/app')} style={{ color: 'var(--accent)' }}>
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
      onClick={() => viewMode === 'rsvp' && setControlsVisible(true)}
    >
      {/* Header */}
      <div
        className="safe-top flex items-center justify-between px-4 py-3 shrink-0 transition-opacity duration-300 sticky top-0 z-40"
        style={{
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
          borderBottom: '1px solid var(--bg-tertiary)',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <button
          onClick={() => { saveProgress(); navigate('/app'); }}
          className="flex items-center gap-2 hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Library
        </button>

        <div className="flex items-center gap-2">
          {/* View toggle */}
          <button
            onClick={toggleView}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity text-sm"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            title={viewMode === 'rsvp' ? 'Switch to Page View' : 'Switch to RSVP View'}
          >
            {viewMode === 'rsvp' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="7" y1="8" x2="17" y2="8" />
                <line x1="7" y1="12" x2="17" y2="12" />
                <line x1="7" y1="16" x2="13" y2="16" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            )}
            {viewMode === 'rsvp' ? 'Page' : 'RSVP'}
          </button>

          {/* Bookmarks */}
          <button
            onClick={() => setShowBookmarks(true)}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
            title="Bookmarks"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>

          {/* Contents */}
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

          {/* Settings */}
          <button
            onClick={() => { saveProgress(); navigate('/app/settings'); }}
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

      {/* Main content area */}
      {viewMode === 'rsvp' ? (
        <RsvpDisplay token={currentToken} onTapToggle={playback.toggle} />
      ) : (
        <PageView
          tokens={tokens}
          currentIndex={currentTokenIndex}
          onWordClick={handleWordClick}
          onWordLongPress={handleWordLongPress}
        />
      )}

      {/* Controls — always visible in page view, auto-hide in RSVP */}
      <div
        className="safe-bottom shrink-0 transition-opacity duration-300"
        style={{
          opacity: controlsVisible ? 1 : 0,
          pointerEvents: controlsVisible ? 'auto' : 'none',
        }}
      >
        <PlaybackControls />
        <ProgressBar
          current={currentTokenIndex}
          total={tokens.length}
          onSeek={playback.seekTo}
          chapterTitle={chapters[currentChapterIndex]?.title}
          isPlaying={isPlaying}
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

      {/* Word actions menu (Page View long-press / right-click) */}
      {activeMenu && tokens[activeMenu.tokenIndex] && (
        <WordActionsMenu
          anchorRect={activeMenu.rect}
          word={tokens[activeMenu.tokenIndex].word}
          tokenIndex={activeMenu.tokenIndex}
          onClose={() => setActiveMenu(null)}
          onSeek={(i) => playback.seekTo(i)}
          onBookmark={handleAddBookmarkFromMenu}
        />
      )}

      {/* Bookmarks panel */}
      {showBookmarks && bookId && (
        <BookmarksPanel
          bookId={bookId}
          chapters={chapters}
          currentChapterIndex={currentChapterIndex}
          tokens={tokens}
          onJump={handleJumpToBookmark}
          onClose={() => setShowBookmarks(false)}
        />
      )}
    </div>
  );
}
