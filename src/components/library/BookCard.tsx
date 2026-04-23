import type { BookMeta, ReadingProgress } from '@/types/book';

interface Props {
  book: BookMeta;
  progress?: ReadingProgress;
  onClick: () => void;
}

export default function BookCard({ book, progress, onClick }: Props) {
  const progressPercent = progress
    ? Math.round((progress.globalWordIndex / book.totalWords) * 100)
    : 0;

  return (
    <div
      className="rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
      onClick={onClick}
    >
      {/* Cover or placeholder */}
      <div
        className="h-48 flex items-center justify-center"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-16 h-16 opacity-30" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1zm1 2v12h14V6H5z" />
            <path d="M7 8h10v2H7zm0 4h7v2H7z" />
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="font-semibold text-sm truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {book.title}
        </h3>
        <p
          className="text-xs truncate mt-0.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          {book.author}
        </p>
        <div className="flex items-center justify-between mt-2">
          <span
            className="text-xs"
            style={{ color: 'var(--text-secondary)' }}
          >
            {book.totalWords.toLocaleString()} words
          </span>
          {progressPercent > 0 && (
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--accent)' }}
            >
              {progressPercent}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        {progressPercent > 0 && (
          <div
            className="h-1 rounded-full mt-2"
            style={{ backgroundColor: 'var(--bg-tertiary)' }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: 'var(--accent)',
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
