import { useEffect, useMemo, useRef, useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import type { WordToken } from '@/types/rsvp';

interface Props {
  tokens: WordToken[];
  currentIndex: number;
  onWordClick: (index: number) => void;
  onWordLongPress?: (index: number, rect: DOMRect) => void;
  /** When false, the view is mounted but visually hidden. Lets us pay
   *  the render cost once on chapter load instead of on every toggle —
   *  important on long chapters (10k-30k words) where a fresh mount
   *  noticeably stutters the UI. */
  visible?: boolean;
}

const CONTEXT_COLORS = {
  dialogue: '#60a5fa',
  unfamiliar: '#fbbf24',
};

const LONG_PRESS_MS = 500;
const MOVE_THRESHOLD_PX = 10;
/** Words per chunk. Each chunk is one paragraph-shaped block; only the
 *  active chunk plus a window above/below is rendered as word spans.
 *  Inactive chunks render as a single placeholder paragraph at correct
 *  height, keeping scroll position stable while costing almost nothing
 *  to lay out. ~600 words ≈ 4-5 short paragraphs on screen. */
const CHUNK_SIZE = 600;
/** How many chunks above + below the active one to fully render.
 *  Window size 2 = ~3000 words live in the DOM at any time, regardless
 *  of chapter length. Keeps Page View instant on 30k-word chapters. */
const RENDER_WINDOW = 2;
/** Average word width in em — used to size placeholder chunks so the
 *  scroll bar isn't lying about chapter length. Empirically ~0.45em
 *  per char, average word ~5 chars, plus a space ≈ 2.7em per word. */
const PLACEHOLDER_HEIGHT_PX_PER_WORD = 0.55;

interface Chunk {
  start: number;  // inclusive token index
  end: number;    // exclusive token index
}

function buildChunks(totalTokens: number): Chunk[] {
  if (totalTokens === 0) return [];
  const out: Chunk[] = [];
  for (let i = 0; i < totalTokens; i += CHUNK_SIZE) {
    out.push({ start: i, end: Math.min(i + CHUNK_SIZE, totalTokens) });
  }
  return out;
}

interface ChunkBlockProps {
  tokens: WordToken[];
  chunk: Chunk;
  currentIndex: number;
  onWordClick: (index: number) => void;
  onWordLongPress?: (index: number, rect: DOMRect) => void;
  pressTimer: React.MutableRefObject<number | null>;
  pressStart: React.MutableRefObject<{ x: number; y: number } | null>;
  pressFired: React.MutableRefObject<boolean>;
  activeRef: React.RefObject<HTMLSpanElement>;
}

function ChunkBlock({
  tokens,
  chunk,
  currentIndex,
  onWordClick,
  onWordLongPress,
  pressTimer,
  pressStart,
  pressFired,
  activeRef,
}: ChunkBlockProps) {
  function clearPressTimer() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  const out: React.ReactNode[] = [];
  for (let i = chunk.start; i < chunk.end; i++) {
    const token = tokens[i];
    const isCurrent = i === currentIndex;
    const isPast = i < currentIndex;

    let color = 'inherit';
    if (token.context.isDialogue) color = CONTEXT_COLORS.dialogue;
    if (token.context.isUnfamiliar) color = CONTEXT_COLORS.unfamiliar;

    out.push(
      <span key={i}>
        {token.context.isParagraphStart && i > chunk.start && (
          <>
            <br />
            <br />
          </>
        )}
        <span
          ref={isCurrent ? activeRef : undefined}
          onClick={() => {
            if (pressFired.current) { pressFired.current = false; return; }
            onWordClick(i);
          }}
          onContextMenu={(e) => {
            if (!onWordLongPress) return;
            e.preventDefault();
            onWordLongPress(i, (e.currentTarget as HTMLElement).getBoundingClientRect());
          }}
          onTouchStart={(e) => {
            if (!onWordLongPress) return;
            const t = e.touches[0];
            pressStart.current = { x: t.clientX, y: t.clientY };
            pressFired.current = false;
            const target = e.currentTarget as HTMLElement;
            clearPressTimer();
            pressTimer.current = window.setTimeout(() => {
              pressFired.current = true;
              onWordLongPress(i, target.getBoundingClientRect());
            }, LONG_PRESS_MS);
          }}
          onTouchMove={(e) => {
            if (!pressStart.current) return;
            const t = e.touches[0];
            const dx = t.clientX - pressStart.current.x;
            const dy = t.clientY - pressStart.current.y;
            if (Math.hypot(dx, dy) > MOVE_THRESHOLD_PX) clearPressTimer();
          }}
          onTouchEnd={() => {
            clearPressTimer();
            pressStart.current = null;
          }}
          onTouchCancel={() => {
            clearPressTimer();
            pressStart.current = null;
          }}
          className="cursor-pointer rounded px-0.5 transition-colors"
          style={{
            backgroundColor: isCurrent ? 'var(--accent)' : 'transparent',
            color: isCurrent ? '#fff' : color,
            opacity: isPast ? 0.4 : 1,
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          {token.word}
        </span>{' '}
      </span>,
    );
  }
  return <span data-chunk-start={chunk.start}>{out}</span>;
}

/**
 * Virtualised page view. Words are grouped into ~600-word chunks; only
 * the active chunk plus N chunks above/below are rendered with real
 * word spans. The rest are sized-but-empty placeholders so the
 * scrollbar reflects the full chapter length without paying the
 * layout cost of 30k+ live spans.
 *
 * We render a chunk *fully* (all word spans) as soon as it enters the
 * window, so scrolling toward an off-window chunk reveals it before
 * the placeholder gets close to the viewport.
 */
export default function PageView({ tokens, currentIndex, onWordClick, onWordLongPress, visible = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const { fontFamily } = useSettingsStore(s => s.settings);

  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const pressFired = useRef(false);

  const chunks = useMemo(() => buildChunks(tokens.length), [tokens.length]);
  const activeChunkIdx = useMemo(() => {
    if (chunks.length === 0) return 0;
    return Math.min(chunks.length - 1, Math.floor(currentIndex / CHUNK_SIZE));
  }, [chunks.length, currentIndex]);

  // Track which chunks the user has scrolled to. Chunks added via
  // IntersectionObserver join `visibleChunks` and stay there for the
  // duration of the chapter — we don't unmount once a chunk has been
  // shown, since that's where most of the scroll-jitter comes from
  // when re-entering a previously-rendered area.
  const [scrolledChunks, setScrolledChunks] = useState<Set<number>>(new Set());
  const placeholderRefs = useRef<Map<number, HTMLSpanElement | null>>(new Map());

  useEffect(() => {
    // Reset on new chapter (token array changed).
    setScrolledChunks(new Set());
    placeholderRefs.current.clear();
  }, [tokens]);

  // Observe placeholders. When a placeholder gets within 1.5 viewports
  // of being on-screen, materialize that chunk.
  useEffect(() => {
    if (!visible) return;
    const obs = new IntersectionObserver(
      (entries) => {
        let added: number[] | null = null;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const idxStr = (e.target as HTMLElement).dataset.placeholderIdx;
          if (!idxStr) continue;
          const idx = parseInt(idxStr, 10);
          (added ||= []).push(idx);
        }
        if (added && added.length > 0) {
          setScrolledChunks(prev => {
            const next = new Set(prev);
            for (const i of added!) next.add(i);
            return next;
          });
        }
      },
      { rootMargin: '150% 0px' },
    );
    for (const [, el] of placeholderRefs.current) {
      if (el) obs.observe(el);
    }
    return () => obs.disconnect();
    // Re-run when the placeholders refs map changes (chunk count changes).
  }, [chunks.length, visible]);

  // Auto-scroll to keep the current word visible. Skipped when hidden —
  // scrollIntoView on a display:none element is a no-op anyway, but
  // skipping avoids the work entirely.
  useEffect(() => {
    if (!visible) return;
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex, visible]);

  // Whether to render a chunk fully (real word spans) vs. as a
  // placeholder.
  const renderFully = (idx: number) => (
    Math.abs(idx - activeChunkIdx) <= RENDER_WINDOW || scrolledChunks.has(idx)
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 pt-14 pb-8 max-w-3xl mx-auto w-full leading-relaxed cursor-default"
      style={{
        display: visible ? 'block' : 'none',
        fontFamily: 'var(--reading-font-family, inherit)',
        ...(fontFamily ? { fontFamily: `var(--reading-font-family, ${fontFamily})` } : {}),
        fontSize: '1.1rem',
        color: 'var(--text-primary)',
      }}
    >
      {chunks.map((chunk, idx) => {
        if (renderFully(idx)) {
          return (
            <ChunkBlock
              key={chunk.start}
              tokens={tokens}
              chunk={chunk}
              currentIndex={currentIndex}
              onWordClick={onWordClick}
              onWordLongPress={onWordLongPress}
              pressTimer={pressTimer}
              pressStart={pressStart}
              pressFired={pressFired}
              activeRef={activeRef}
            />
          );
        }
        // Placeholder — sized to roughly the height the chunk would
        // occupy when rendered. Doesn't have to be exact; once the
        // user scrolls near it, it gets materialized.
        const wordCount = chunk.end - chunk.start;
        const estimatedHeight = wordCount * PLACEHOLDER_HEIGHT_PX_PER_WORD;
        return (
          <span
            key={chunk.start}
            ref={(el) => { placeholderRefs.current.set(idx, el); }}
            data-placeholder-idx={idx}
            style={{
              display: 'block',
              height: `${estimatedHeight}px`,
              opacity: 0,
            }}
            aria-hidden="true"
          />
        );
      })}
    </div>
  );
}
