import { useSettingsStore } from '@/store/settingsStore';
import { useReaderStore } from '@/store/readerStore';

interface Props {
  isPlaying: boolean;
  onToggle: () => void;
}

export default function PlaybackControls({ isPlaying, onToggle }: Props) {
  const profile = useSettingsStore(s => s.getActiveProfile)();
  const setBaseWpm = useSettingsStore(s => s.setBaseWpm);
  const effectiveWpm = useReaderStore(s => s.effectiveWpm);

  const showEffective = isPlaying && effectiveWpm > 0 && Math.abs(effectiveWpm - profile.baseWpm) > 5;

  return (
    <div
      className="flex items-center justify-center gap-4 py-4"
      style={{ color: 'var(--text-primary)' }}
    >
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
        <div className="text-center w-24">
          <div className="text-sm font-mono">
            {profile.baseWpm} WPM
          </div>
          {showEffective && (
            <div
              className="text-[10px] font-mono"
              style={{ color: 'var(--text-secondary)' }}
            >
              {Math.round(effectiveWpm)} actual
            </div>
          )}
        </div>
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
