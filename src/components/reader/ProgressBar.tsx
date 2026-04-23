interface Props {
  current: number;
  total: number;
  onSeek: (index: number) => void;
  chapterTitle?: string;
}

export default function ProgressBar({ current, total, onSeek, chapterTitle }: Props) {
  const percent = total > 0 ? (current / total) * 100 : 0;
  const wordsRemaining = total - current;
  // Rough estimate at 300 WPM
  const minutesRemaining = Math.ceil(wordsRemaining / 300);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    onSeek(Math.floor(pct * total));
  };

  return (
    <div className="px-4 pb-4">
      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full cursor-pointer"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        onClick={handleClick}
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${percent}%`,
            backgroundColor: 'var(--accent)',
          }}
        />
      </div>

      {/* Status line */}
      <div
        className="flex justify-between items-center mt-2 text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>{chapterTitle || ''}</span>
        <span>
          {percent.toFixed(1)}% &middot; {current}/{total} words
          {minutesRemaining > 0 && ` \u00B7 ~${minutesRemaining} min left`}
        </span>
      </div>
    </div>
  );
}
