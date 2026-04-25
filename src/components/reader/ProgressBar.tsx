import { useEffectiveProfile } from '@/billing/useEffectiveProfile';

interface Props {
  current: number;
  total: number;
  onSeek: (index: number) => void;
  chapterTitle?: string;
  isPlaying?: boolean;
}

function formatTimeLeft(seconds: number): string {
  if (seconds < 60) return `${Math.max(1, Math.round(seconds))}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const m = Math.round(minutes - hours * 60);
  return m > 0 ? `${hours}h ${m}m` : `${hours}h`;
}

export default function ProgressBar({ current, total, onSeek, chapterTitle, isPlaying }: Props) {
  const profile = useEffectiveProfile();
  const percent = total > 0 ? (current / total) * 100 : 0;
  const wordsRemaining = total - current;
  // Estimate based on the user's current base WPM. Free users read at base,
  // Pro users have rule slowdowns that average out near base for most books,
  // so this is a close-enough number that updates live as the speed changes.
  const wpm = Math.max(1, profile.baseWpm);
  const secondsRemaining = (wordsRemaining * 60) / wpm;
  const timeLeft = formatTimeLeft(secondsRemaining);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    onSeek(Math.floor(pct * total));
  };

  return (
    <div className="px-4 pb-2">
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

      {/* Status line — compact on mobile so both halves fit */}
      <div
        className="flex justify-between items-center gap-2 mt-1.5 text-[10px] sm:text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="truncate min-w-0">{chapterTitle || ''}</span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="hidden sm:inline">
            {percent.toFixed(1)}% &middot; {current}/{total} words
            {wordsRemaining > 0 && ` · ~${timeLeft} left`}
          </span>
          <span className="sm:hidden">
            {percent.toFixed(0)}% · {current}/{total}
            {wordsRemaining > 0 && ` · ${timeLeft}`}
          </span>
          {isPlaying !== undefined && (
            <span
              className="font-semibold uppercase tracking-wide"
              style={{ color: 'var(--accent)' }}
            >
              {isPlaying ? 'Reading' : 'Paused'}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
