import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import DefinitionsPanel from './DefinitionsPanel';
import NoteEditor from './NoteEditor';

interface Props {
  anchorRect: DOMRect;
  word: string;
  tokenIndex: number;
  onClose: () => void;
  onSeek: (index: number) => void;
  onBookmark: (note?: string) => void;
}

type Panel = null | 'define' | 'note';

const MENU_WIDTH = 260;
const ACTION_HEIGHT_ESTIMATE = 180;
const GAP = 6;

export default function WordActionsMenu({
  anchorRect,
  word,
  tokenIndex,
  onClose,
  onSeek,
  onBookmark,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Position the menu relative to the anchor word. Flip above if overflowing.
  useLayoutEffect(() => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const needed = panel === 'define' ? ACTION_HEIGHT_ESTIMATE + 280 : ACTION_HEIGHT_ESTIMATE;
    const spaceBelow = viewportH - anchorRect.bottom;
    const flipAbove = spaceBelow < needed && anchorRect.top > needed;

    const top = flipAbove
      ? Math.max(8, anchorRect.top - needed - GAP)
      : anchorRect.bottom + GAP;
    const left = Math.min(
      Math.max(8, anchorRect.left),
      viewportW - MENU_WIDTH - 8,
    );
    setPos({ top, left });
  }, [anchorRect.top, anchorRect.bottom, anchorRect.left, panel]);

  // Dismiss on outside click, Escape, scroll, resize.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onScrollOrResize = () => onClose();

    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScrollOrResize, true);
    window.addEventListener('resize', onScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScrollOrResize, true);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, [onClose]);

  if (!pos) return null;

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      data-testid="word-actions-menu"
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: MENU_WIDTH,
        zIndex: 60,
        background: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        border: '1px solid var(--bg-tertiary)',
        borderRadius: 12,
        boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
        overflow: 'hidden',
      }}
    >
      {panel === null && (
        <div className="py-1">
          <button
            type="button"
            onClick={() => { onSeek(tokenIndex); onClose(); }}
            className="w-full text-left px-3 py-2 hover:opacity-80 text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            ▶ Jump here
          </button>
          <button
            type="button"
            onClick={() => setPanel('note')}
            className="w-full text-left px-3 py-2 hover:opacity-80 text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            🔖 Bookmark — note optional
          </button>
          <button
            type="button"
            onClick={() => setPanel('define')}
            className="w-full text-left px-3 py-2 hover:opacity-80 text-sm"
            style={{ color: 'var(--text-primary)' }}
          >
            📖 Define &ldquo;{word}&rdquo;
          </button>
        </div>
      )}

      {panel === 'note' && (
        <div className="p-3">
          <NoteEditor
            onSave={(note) => { onBookmark(note || undefined); onClose(); }}
            onCancel={() => setPanel(null)}
          />
        </div>
      )}

      {panel === 'define' && (
        <div className="p-3">
          <DefinitionsPanel word={word} />
          <div className="mt-2 text-right">
            <button
              type="button"
              onClick={() => setPanel(null)}
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              ← Back
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
