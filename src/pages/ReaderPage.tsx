import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useReaderStore } from '@/store/readerStore';
import { useLibraryStore } from '@/store/libraryStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useRsvpPlayback } from '@/hooks/useRsvpPlayback';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { loadBookContent } from '@/services/storageService';
import { downloadBookContentByClientId } from '@/sync/bookSync';
import { useAuth } from '@/auth/useAuth';
import { loadDictionary, getDictionary } from '@/services/dictionaryService';
import { tokenize } from '@/engine/tokenizer';
import RsvpDisplay from '@/components/reader/RsvpDisplay';
import PlaybackControls from '@/components/reader/PlaybackControls';
import ProgressBar from '@/components/reader/ProgressBar';
import ChapterNav from '@/components/reader/ChapterNav';
import PageView from '@/components/reader/PageView';
import WordActionsMenu from '@/components/reader/WordActionsMenu';
import BookmarksPanel from '@/components/reader/BookmarksPanel';
import PaywallModal from '@/billing/PaywallModal';
import { useIsPro } from '@/billing/useIsPro';
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
  const [paywallOpen, setPaywallOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  // Focus-mode quick adjuster — which speed knob the +/- buttons act on.
  // B = base WPM, D = dialogue rule, U = unfamiliar rule.
  const [focusContext, setFocusContext] = useState<'B' | 'D' | 'U'>('B');
  // Transient HUD shown when the user nudges a value, then fades.
  const [focusHud, setFocusHud] = useState<{ label: string; value: number } | null>(null);
  const focusHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPro = useIsPro();
  const { user } = useAuth();

  // Toggle focus mode: hides header, controls, and progress bar so only
  // the word (or page text) is visible. On browsers that support the
  // Fullscreen API, also request true browser fullscreen for max effect.
  const toggleFocusMode = useCallback(async () => {
    const nextVal = !focusMode;
    setFocusMode(nextVal);
    try {
      if (nextVal && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {});
      } else if (!nextVal && document.fullscreenElement) {
        await document.exitFullscreen().catch(() => {});
      }
    } catch { /* iOS Safari + some others don't support the API */ }
  }, [focusMode]);

  // Exit focus mode when the browser leaves fullscreen by any means
  // (Esc, swipe, etc.) so our state stays in sync.
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement) setFocusMode(false); };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

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
        let content = await loadBookContent(bookId);
        // Cloud fallback: if metadata synced but local content is missing
        // (typical when signing in on a new device), pull the parsed
        // chapters from Supabase Storage and hydrate IndexedDB.
        if (!content && user) {
          try {
            content = await downloadBookContentByClientId(user.id, bookId);
          } catch (e) {
            console.warn('Cloud content fallback failed:', e);
          }
        }
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
    if (!isPro) {
      playback.pause();
      setPaywallOpen(true);
      return;
    }
    playback.pause();
    setActiveMenu({ tokenIndex: index, rect });
  }, [isPro, playback]);

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

  // Focus-mode quick-adjust: nudge the active context (Base/Dialogue/
  // Unfamiliar) by ±25 WPM and flash the HUD with the new value.
  const setRuleWpm = useSettingsStore(s => s.setRuleWpm);
  const flashFocusHud = useCallback((label: string, value: number) => {
    setFocusHud({ label, value });
    if (focusHudTimerRef.current) clearTimeout(focusHudTimerRef.current);
    focusHudTimerRef.current = setTimeout(() => setFocusHud(null), 1400);
  }, []);
  const focusContextLabel = useCallback((c: 'B' | 'D' | 'U') => (
    c === 'B' ? 'Base' : c === 'D' ? 'Dialogue' : 'Unfamiliar'
  ), []);
  const cycleFocusContext = useCallback(() => {
    setFocusContext(prev => {
      const next = prev === 'B' ? 'D' : prev === 'D' ? 'U' : 'B';
      const profile = getActiveProfile();
      const value = next === 'B'
        ? profile.baseWpm
        : (profile.rules.find(r => r.id === (next === 'D' ? 'dialogue' : 'unfamiliar'))?.wpm ?? 0);
      flashFocusHud(focusContextLabel(next), value);
      return next;
    });
  }, [getActiveProfile, flashFocusHud, focusContextLabel]);
  const adjustFocusContext = useCallback((delta: number) => {
    const profile = getActiveProfile();
    if (focusContext === 'B') {
      const next = profile.baseWpm + delta;
      setBaseWpm(next);
      // Re-read after clamp so HUD reflects what was actually applied.
      flashFocusHud('Base', useSettingsStore.getState().getActiveProfile().baseWpm);
    } else {
      const ruleId = focusContext === 'D' ? 'dialogue' : 'unfamiliar';
      const rule = profile.rules.find(r => r.id === ruleId);
      if (!rule) return;
      const next = rule.wpm + delta;
      setRuleWpm(profile.id, ruleId, next);
      const after = useSettingsStore.getState().getActiveProfile().rules.find(r => r.id === ruleId);
      flashFocusHud(focusContextLabel(focusContext), after?.wpm ?? next);
    }
  }, [focusContext, getActiveProfile, setBaseWpm, setRuleWpm, flashFocusHud, focusContextLabel]);
  useEffect(() => () => {
    if (focusHudTimerRef.current) clearTimeout(focusHudTimerRef.current);
  }, []);

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
      <div className="flex items-center justify-center min-h-[100dvh]" data-theme={theme}
        style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading book...</p>
      </div>
    );
  }

  if (!bookMeta || chapters.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[100dvh] gap-4" data-theme={theme}
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
      className="flex flex-col min-h-[100dvh] h-[100dvh] overflow-hidden"
      data-theme={theme}
      style={{
        backgroundColor: 'var(--bg-primary)',
        paddingTop: 'env(safe-area-inset-top)',
      }}
      onClick={() => viewMode === 'rsvp' && setControlsVisible(true)}
    >
      {/* Header — hidden entirely in focus mode */}
      {!focusMode && <div
        className="flex items-center justify-between px-4 py-3 shrink-0 transition-opacity duration-300 sticky top-0 z-40"
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
      </div>}

      {/* Focus-mode control stack — vertically centered along the right
          edge. Top to bottom: Exit, +25, Context (B/D/U), −25. The
          context selector sits between the +/- so it's surrounded by
          the action buttons that operate on it. */}
      {focusMode && (
        <div
          className="fixed right-3 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2"
        >
          <button
            onClick={toggleFocusMode}
            className="w-[60px] h-[60px] rounded-full transition-opacity hover:opacity-90 flex items-center justify-center"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              opacity: 0.45,
            }}
            title="Exit focus mode"
            aria-label="Exit focus mode"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 14 10 14 10 20" />
              <polyline points="20 10 14 10 14 4" />
              <line x1="14" y1="10" x2="21" y2="3" />
              <line x1="3" y1="21" x2="10" y2="14" />
            </svg>
          </button>
          <button
            onClick={() => adjustFocusContext(25)}
            className="w-[60px] h-[60px] rounded-full font-bold text-2xl transition-opacity hover:opacity-90"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              opacity: 0.45,
            }}
            title={`+25 WPM on ${focusContextLabel(focusContext)}`}
            aria-label="Increase speed"
          >
            +
          </button>
          <button
            onClick={cycleFocusContext}
            className="w-[60px] h-[60px] rounded-full font-bold text-base transition-opacity hover:opacity-90"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              opacity: 0.45,
            }}
            title={`Context: ${focusContextLabel(focusContext)} (tap to cycle)`}
            aria-label={`Context: ${focusContextLabel(focusContext)}`}
          >
            {focusContext}
          </button>
          <button
            onClick={() => adjustFocusContext(-25)}
            className="w-[60px] h-[60px] rounded-full font-bold text-2xl transition-opacity hover:opacity-90"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              opacity: 0.45,
            }}
            title={`-25 WPM on ${focusContextLabel(focusContext)}`}
            aria-label="Decrease speed"
          >
            −
          </button>
        </div>
      )}

      {/* Focus-mode HUD — flashes the current context label + value
          briefly when it changes, then fades. Positioned bottom-center
          so it's clear of the right-edge button stack. */}
      {focusMode && focusHud && (
        <div
          className="fixed left-1/2 -translate-x-1/2 px-4 py-2 rounded-full z-50 transition-opacity"
          style={{
            bottom: 'calc(env(safe-area-inset-bottom) + 2rem)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            opacity: 0.85,
            pointerEvents: 'none',
            fontVariantNumeric: 'tabular-nums',
          }}
          aria-live="polite"
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{focusHud.label}</span>
          <span className="ml-3 text-lg font-mono">{focusHud.value} <span className="text-xs opacity-70">wpm</span></span>
        </div>
      )}

      {/* Main content area. Both views are kept mounted; we toggle
          visibility instead of conditionally rendering. Long chapters
          (10k-30k words) take 1-3s to render the page-view DOM tree —
          paying that cost once on chapter load (in parallel with
          starting RSVP) keeps the Page/RSVP toggle instant afterwards. */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div
          style={{
            display: viewMode === 'rsvp' ? 'flex' : 'none',
            flex: 1,
            flexDirection: 'column',
          }}
        >
          <RsvpDisplay token={currentToken} onTapToggle={playback.toggle} />
        </div>
        <PageView
          tokens={tokens}
          currentIndex={currentTokenIndex}
          onWordClick={handleWordClick}
          onWordLongPress={handleWordLongPress}
          visible={viewMode === 'page'}
        />

        {/* Top-left: Bookmarks — floats over the word area */}
        {!focusMode && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isPro) setShowBookmarks(true);
              else setPaywallOpen(true);
            }}
            className="absolute top-3 left-3 p-2 rounded-full hover:opacity-80 transition-opacity z-30"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', opacity: 0.7 }}
            title="Bookmarks"
            aria-label="Bookmarks"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
            </svg>
          </button>
        )}

        {/* Top-right: Focus mode toggle — floats over the word area */}
        {!focusMode && (
          <button
            onClick={(e) => { e.stopPropagation(); toggleFocusMode(); }}
            className="absolute top-3 right-3 p-2 rounded-full hover:opacity-80 transition-opacity z-30"
            style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', opacity: 0.7 }}
            title="Focus mode"
            aria-label="Enter focus mode"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 9 3 3 9 3" />
              <polyline points="21 9 21 3 15 3" />
              <polyline points="21 15 21 21 15 21" />
              <polyline points="3 15 3 21 9 21" />
            </svg>
          </button>
        )}
      </div>

      {/* Controls — hidden in focus mode; always visible in page view, auto-hide in RSVP */}
      {!focusMode && <div
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
      </div>}

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

      {/* Pro paywall (triggered when Free users long-press a word) */}
      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        title="Word actions are a Pro feature"
        description="Upgrade to RapidRead Pro to look up definitions, leave notes, and bookmark any word. $0.99/month or $7.99/year."
      />
    </div>
  );
}
