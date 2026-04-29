import { useEffect, useRef } from 'react';
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

export default function PageView({ tokens, currentIndex, onWordClick, onWordLongPress, visible = true }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLSpanElement>(null);
  const { fontFamily } = useSettingsStore(s => s.settings);

  // Long-press state (shared across all word spans via refs)
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  const pressFired = useRef(false);

  function clearPressTimer() {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  // Auto-scroll to keep the current word visible. Skipped when hidden —
  // scrollIntoView on a display:none element is a no-op anyway, but
  // skipping avoids the work entirely.
  useEffect(() => {
    if (!visible) return;
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentIndex, visible]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-6 pt-14 pb-8 max-w-3xl mx-auto w-full leading-relaxed cursor-default"
      style={{
        display: visible ? 'block' : 'none',
        fontFamily: 'var(--reading-font-family, inherit)',
        // Back-compat: fall back to the legacy fontFamily if the CSS var isn't set.
        ...(fontFamily ? { fontFamily: `var(--reading-font-family, ${fontFamily})` } : {}),
        fontSize: '1.1rem',
        color: 'var(--text-primary)',
      }}
    >
      {tokens.map((token, i) => {
        const isCurrent = i === currentIndex;
        const isPast = i < currentIndex;

        let color = 'inherit';
        if (token.context.isDialogue) color = CONTEXT_COLORS.dialogue;
        if (token.context.isUnfamiliar) color = CONTEXT_COLORS.unfamiliar;

        return (
          <span key={i}>
            {token.context.isParagraphStart && i > 0 && (
              <>
                <br />
                <br />
              </>
            )}
            <span
              ref={isCurrent ? activeRef : undefined}
              onClick={() => {
                // Don't fire click if a long-press already ran on this touch.
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
          </span>
        );
      })}
    </div>
  );
}
