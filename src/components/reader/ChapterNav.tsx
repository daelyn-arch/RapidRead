import type { Chapter } from '@/types/book';

interface Props {
  chapters: Chapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

export default function ChapterNav({ chapters, currentIndex, onSelect, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Panel */}
      <div
        className="relative w-full max-w-md max-h-[70vh] rounded-xl overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="px-4 py-3 font-semibold border-b"
          style={{
            color: 'var(--text-primary)',
            borderColor: 'var(--bg-tertiary)',
          }}
        >
          Chapters
        </div>
        <div className="overflow-y-auto flex-1">
          {chapters.map((ch) => (
            <button
              key={ch.index}
              onClick={() => { onSelect(ch.index); onClose(); }}
              className="w-full text-left px-4 py-3 hover:opacity-80 transition-opacity flex justify-between items-center"
              style={{
                backgroundColor: ch.index === currentIndex ? 'var(--bg-tertiary)' : 'transparent',
                color: ch.index === currentIndex ? 'var(--accent)' : 'var(--text-primary)',
              }}
            >
              <span className="truncate">{ch.title}</span>
              <span
                className="text-xs ml-2 shrink-0"
                style={{ color: 'var(--text-secondary)' }}
              >
                {ch.wordCount.toLocaleString()} words
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
