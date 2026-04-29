import { useMemo } from 'react';
import { useEffectiveProfile } from '@/billing/useEffectiveProfile';
import { useReaderStore } from '@/store/readerStore';
import { estimateRemainingSeconds } from '@/engine/speedCalculator';

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
  const tokens = useReaderStore(s => s.tokens);
  const percent = total > 0 ? (current / total) * 100 : 0;
  const wordsRemaining = total - current;

  // Walk the remaining tokens and sum up per-token effective time so the
  // estimate reflects dialogue/unfamiliar/sentence-end/etc. slowdowns and
  // the transition ramp — not just base WPM. Memoised so we only recompute
  // when position, tokens, or profile change.
  const secondsRemaining = useMemo(
    () => estimateRemainingSeconds(tokens, current, profile),
    [tokens, current, profile],
  );
  const timeLeft = formatTimeLeft(secondsRemaining);
  // Average effective WPM for the rest of the chapter given current
  // settings (rules + transition ramp). Reads as "what speed will I
  // actually average from here on?" — useful sanity check vs. baseWpm
  // when many slowdown rules are active.
  const avgWpm = wordsRemaining > 0 && secondsRemaining > 0
    ? Math.round((wordsRemaining * 60) / secondsRemaining)
    : profile.baseWpm;

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
            {wordsRemaining > 0 && ` · ~${timeLeft} left · ${avgWpm} wpm avg`}
          </span>
          <span className="sm:hidden">
            {percent.toFixed(0)}% · {current}/{total}
            {wordsRemaining > 0 && ` · ${timeLeft} · ${avgWpm}wpm`}
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
