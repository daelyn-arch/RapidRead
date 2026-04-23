import type { Chapter } from '@/types/book';
import { useSettingsStore } from '@/store/settingsStore';
import { useLibraryStore } from '@/store/libraryStore';

interface Props {
  bookId: string;
  chapters: Chapter[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}

function formatTime(minutes: number): string {
  if (minutes < 1) return '<1 min';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export default function ChapterNav({ bookId, chapters, currentIndex, onSelect, onClose }: Props) {
  const baseWpm = useSettingsStore(s => s.getActiveProfile)().baseWpm;
  const progress = useLibraryStore(s => s.progress[bookId]);

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const totalTime = totalWords / baseWpm;

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
        {/* Header with total stats */}
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: 'var(--bg-tertiary)' }}
        >
          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Contents
          </div>
          <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>{chapters.length} chapters</span>
            <span>{totalWords.toLocaleString()} words</span>
            <span>~{formatTime(totalTime)} at {baseWpm} WPM</span>
          </div>
        </div>

        {/* Chapter list */}
        <div className="overflow-y-auto flex-1">
          {chapters.map((ch) => {
            const readTime = ch.wordCount / baseWpm;
            const isRead = progress && progress.chapterIndex > ch.index;
            const isCurrent = ch.index === currentIndex;

            return (
              <button
                key={ch.index}
                onClick={() => { onSelect(ch.index); onClose(); }}
                className="w-full text-left px-4 py-3 hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: isCurrent ? 'var(--bg-tertiary)' : 'transparent',
                  color: isCurrent ? 'var(--accent)' : 'var(--text-primary)',
                  opacity: isRead ? 0.6 : 1,
                }}
              >
                <div className="flex justify-between items-center">
                  <span className="truncate flex-1">{ch.title}</span>
                  {isCurrent && (
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full ml-2 shrink-0 font-medium"
                      style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    >
                      READING
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <span>{ch.wordCount.toLocaleString()} words</span>
                  <span>{formatTime(readTime)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
