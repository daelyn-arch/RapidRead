import { useSettingsStore } from '@/store/settingsStore';

interface Props {
  isPlaying: boolean;
  onToggle: () => void;
  onSkipBack: (count?: number) => void;
  onSkipForward: (count?: number) => void;
}

export default function PlaybackControls({
  isPlaying,
  onToggle,
  onSkipBack,
  onSkipForward,
}: Props) {
  const profile = useSettingsStore(s => s.getActiveProfile)();
  const setBaseWpm = useSettingsStore(s => s.setBaseWpm);

  return (
    <div
      className="flex items-center justify-center gap-4 py-4"
      style={{ color: 'var(--text-primary)' }}
    >
      {/* Skip back */}
      <button
        onClick={() => onSkipBack(10)}
        className="p-2 rounded-lg hover:opacity-80 transition-opacity"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        title="Skip back 10 words"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="11 17 6 12 11 7" />
          <polyline points="18 17 13 12 18 7" />
        </svg>
      </button>

      {/* Skip back 1 */}
      <button
        onClick={() => onSkipBack(1)}
        className="p-2 rounded-lg hover:opacity-80 transition-opacity"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        title="Skip back 1 word"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={onToggle}
        className="p-4 rounded-full transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
      >
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16" />
            <rect x="14" y="4" width="4" height="16" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21" />
          </svg>
        )}
      </button>

      {/* Skip forward 1 */}
      <button
        onClick={() => onSkipForward(1)}
        className="p-2 rounded-lg hover:opacity-80 transition-opacity"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        title="Skip forward 1 word"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Skip forward 10 */}
      <button
        onClick={() => onSkipForward(10)}
        className="p-2 rounded-lg hover:opacity-80 transition-opacity"
        style={{ backgroundColor: 'var(--bg-tertiary)' }}
        title="Skip forward 10 words"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="13 17 18 12 13 7" />
          <polyline points="6 17 11 12 6 7" />
        </svg>
      </button>

      {/* Speed control */}
      <div className="flex items-center gap-2 ml-4">
        <button
          onClick={() => setBaseWpm(profile.baseWpm - 25)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity text-lg font-bold"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
          title="Decrease speed (Down arrow)"
        >
          -
        </button>
        <span className="text-sm font-mono w-20 text-center">
          {profile.baseWpm} WPM
        </span>
        <button
          onClick={() => setBaseWpm(profile.baseWpm + 25)}
          className="w-8 h-8 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity text-lg font-bold"
          style={{ backgroundColor: 'var(--bg-tertiary)' }}
          title="Increase speed (Up arrow)"
        >
          +
        </button>
      </div>
    </div>
  );
}
