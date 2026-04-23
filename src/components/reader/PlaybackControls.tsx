import { useSettingsStore } from '@/store/settingsStore';

interface Props {
  isPlaying: boolean;
  onToggle: () => void;
}

interface WpmStepperProps {
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  labelColor?: string;
}

function WpmStepper({ label, value, onDec, onInc, disabled, labelColor }: WpmStepperProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="text-[10px] font-medium uppercase tracking-wide"
        style={{ color: labelColor ?? 'var(--text-secondary)' }}
      >
        {label}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          onClick={onDec}
          disabled={disabled}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity text-lg font-bold disabled:opacity-30"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          -
        </button>
        <div
          className="text-sm font-mono text-center min-w-14"
          style={{ color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)' }}
        >
          {value}
        </div>
        <button
          onClick={onInc}
          disabled={disabled}
          className="w-9 h-9 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity text-lg font-bold disabled:opacity-30"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function PlaybackControls({ isPlaying, onToggle }: Props) {
  const profile = useSettingsStore(s => s.getActiveProfile)();
  const setBaseWpm = useSettingsStore(s => s.setBaseWpm);
  const setRuleWpm = useSettingsStore(s => s.setRuleWpm);
  const dialogueColor = useSettingsStore(s => s.settings.dialogueColor);
  const unfamiliarColor = useSettingsStore(s => s.settings.unfamiliarColor);

  const dialogueRule = profile.rules.find(r => r.id === 'dialogue');
  const unfamiliarRule = profile.rules.find(r => r.id === 'unfamiliar');

  return (
    <div
      className="flex flex-col items-center gap-3 py-3 px-2"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="flex items-center justify-center gap-6 flex-wrap">
        {dialogueRule && (
          <WpmStepper
            label="Dialogue"
            value={dialogueRule.wpm}
            onDec={() => setRuleWpm(profile.id, dialogueRule.id, dialogueRule.wpm - 25)}
            onInc={() => setRuleWpm(profile.id, dialogueRule.id, dialogueRule.wpm + 25)}
            disabled={!dialogueRule.enabled}
            labelColor={dialogueColor}
          />
        )}
        <WpmStepper
          label="Base"
          value={profile.baseWpm}
          onDec={() => setBaseWpm(profile.baseWpm - 25)}
          onInc={() => setBaseWpm(profile.baseWpm + 25)}
        />
        {unfamiliarRule && (
          <WpmStepper
            label="Unfamiliar"
            value={unfamiliarRule.wpm}
            onDec={() => setRuleWpm(profile.id, unfamiliarRule.id, unfamiliarRule.wpm - 25)}
            onInc={() => setRuleWpm(profile.id, unfamiliarRule.id, unfamiliarRule.wpm + 25)}
            disabled={!unfamiliarRule.enabled}
            labelColor={unfamiliarColor}
          />
        )}
      </div>

      <button
        onClick={onToggle}
        className="p-4 rounded-full transition-opacity hover:opacity-80"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
        title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
        aria-label={isPlaying ? 'Pause' : 'Play'}
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
    </div>
  );
}
