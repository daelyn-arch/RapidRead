import { useMemo, useState } from 'react';
import { useLibraryStore } from '@/store/libraryStore';
import type { Bookmark, Chapter } from '@/types/book';
import type { WordToken } from '@/types/rsvp';

interface Props {
  bookId: string;
  chapters: Chapter[];
  currentChapterIndex: number;
  tokens: WordToken[];
  onJump: (chapterIndex: number, wordIndex: number) => void;
  onClose: () => void;
}

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 30) return 'just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

/**
 * Pull a short preview around the bookmarked word.
 * For the current chapter we have tokenized words. For other chapters we
 * fall back to a raw-text slice — good enough for v1.
 */
function getPreview(
  b: Bookmark,
  chapter: Chapter | undefined,
  isCurrentChapter: boolean,
  currentTokens: WordToken[],
): { before: string; word: string; after: string } {
  if (isCurrentChapter && currentTokens.length > 0) {
    const i = Math.min(b.wordIndex, currentTokens.length - 1);
    const start = Math.max(0, i - 3);
    const end = Math.min(currentTokens.length, i + 6);
    const before = currentTokens.slice(start, i).map(t => t.word).join(' ');
    const word = currentTokens[i]?.word ?? '';
    const after = currentTokens.slice(i + 1, end).map(t => t.word).join(' ');
    return { before, word, after };
  }
  if (!chapter) return { before: '', word: '', after: '' };
  // Approximate: chapter.rawText split on whitespace, same window.
  const words = chapter.rawText.split(/\s+/).filter(Boolean);
  const i = Math.min(b.wordIndex, words.length - 1);
  const start = Math.max(0, i - 3);
  const end = Math.min(words.length, i + 6);
  return {
    before: words.slice(start, i).join(' '),
    word: words[i] ?? '',
    after: words.slice(i + 1, end).join(' '),
  };
}

export default function BookmarksPanel({
  bookId,
  chapters,
  currentChapterIndex,
  tokens,
  onJump,
  onClose,
}: Props) {
  const bookmarks = useLibraryStore(s => s.bookmarks);
  const removeBookmark = useLibraryStore(s => s.removeBookmark);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const forBook = useMemo(() => {
    return bookmarks
      .filter(b => b.bookId === bookId)
      .sort((a, b) => a.chapterIndex - b.chapterIndex || a.wordIndex - b.wordIndex);
  }, [bookmarks, bookId]);

  // Reset confirm state after 2s window
  function startConfirm(id: string) {
    setConfirmingId(id);
    window.setTimeout(() => {
      setConfirmingId(curr => (curr === id ? null : curr));
    }, 2000);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/60" />

      <div
        className="relative w-full max-w-md max-h-[70vh] rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 border-b flex items-center justify-between"
          style={{ borderColor: 'var(--bg-tertiary)' }}
        >
          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Bookmarks
          </div>
          <button
            onClick={onClose}
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
            aria-label="Close bookmarks"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {forBook.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                No bookmarks yet.
              </p>
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Long-press a word in Page View to bookmark it.
              </p>
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: 'var(--bg-tertiary)' }}>
              {forBook.map((b) => {
                const chapter = chapters[b.chapterIndex];
                const isCurrentChapter = b.chapterIndex === currentChapterIndex;
                const preview = getPreview(b, chapter, isCurrentChapter, tokens);
                const isConfirming = confirmingId === b.id;

                return (
                  <li
                    key={b.id}
                    className="p-3 flex items-start gap-3 hover:opacity-90 transition-opacity"
                    style={{ borderColor: 'var(--bg-tertiary)' }}
                  >
                    <button
                      type="button"
                      onClick={() => onJump(b.chapterIndex, b.wordIndex)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <div
                        className="text-xs mb-1"
                        style={{ color: 'var(--accent)' }}
                      >
                        {chapter?.title ?? `Chapter ${b.chapterIndex + 1}`}
                      </div>
                      <div
                        className="text-sm truncate"
                        style={{ color: 'var(--text-primary)', fontFamily: 'var(--reading-font-family, inherit)' }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>{preview.before}</span>{' '}
                        <strong>{preview.word}</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>{preview.after}</span>
                      </div>
                      {b.label && (
                        <p
                          className="text-xs mt-1 italic line-clamp-2"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {b.label}
                        </p>
                      )}
                      <div className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {formatRelativeTime(b.createdAt)}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        if (isConfirming) {
                          removeBookmark(b.id);
                          setConfirmingId(null);
                        } else {
                          startConfirm(b.id);
                        }
                      }}
                      className="rounded-md px-2 py-1 text-xs shrink-0"
                      style={{
                        background: isConfirming ? '#ef4444' : 'transparent',
                        color: isConfirming ? 'white' : 'var(--text-secondary)',
                        border: isConfirming ? 'none' : '1px solid var(--bg-tertiary)',
                      }}
                      aria-label={isConfirming ? 'Confirm delete bookmark' : 'Delete bookmark'}
                    >
                      {isConfirming ? 'Confirm' : 'Delete'}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
