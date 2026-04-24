import { useSettingsStore } from '@/store/settingsStore';

interface StepperProps {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  labelColor?: string;
  valueWidth?: string;
}

function Stepper({ label, value, onDec, onInc, disabled, labelColor, valueWidth }: StepperProps) {
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
          className="text-sm font-mono text-center"
          style={{
            color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
            minWidth: valueWidth ?? '3.5rem',
          }}
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

export default function PlaybackControls() {
  const profile = useSettingsStore(s => s.getActiveProfile)();
  const setBaseWpm = useSettingsStore(s => s.setBaseWpm);
  const setRuleWpm = useSettingsStore(s => s.setRuleWpm);
  const setTransitionDuration = useSettingsStore(s => s.setTransitionDuration);
  const dialogueColor = useSettingsStore(s => s.settings.dialogueColor);
  const unfamiliarColor = useSettingsStore(s => s.settings.unfamiliarColor);

  const dialogueRule = profile.rules.find(r => r.id === 'dialogue');
  const unfamiliarRule = profile.rules.find(r => r.id === 'unfamiliar');

  const transitionValue = profile.transitionDuration.toFixed(2) + 's';
  const stepTransition = (delta: number) =>
    setTransitionDuration(Math.max(0, Math.round((profile.transitionDuration + delta) * 100) / 100));

  return (
    <div
      className="flex flex-col items-center gap-3 py-3 px-2"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="flex items-center justify-center gap-6 flex-wrap">
        {dialogueRule && (
          <Stepper
            label="Dialogue"
            value={String(dialogueRule.wpm)}
            onDec={() => setRuleWpm(profile.id, dialogueRule.id, dialogueRule.wpm - 25)}
            onInc={() => setRuleWpm(profile.id, dialogueRule.id, dialogueRule.wpm + 25)}
            disabled={!dialogueRule.enabled}
            labelColor={dialogueColor}
          />
        )}
        <Stepper
          label="Base"
          value={String(profile.baseWpm)}
          onDec={() => setBaseWpm(profile.baseWpm - 25)}
          onInc={() => setBaseWpm(profile.baseWpm + 25)}
        />
        {unfamiliarRule && (
          <Stepper
            label="Unfamiliar"
            value={String(unfamiliarRule.wpm)}
            onDec={() => setRuleWpm(profile.id, unfamiliarRule.id, unfamiliarRule.wpm - 25)}
            onInc={() => setRuleWpm(profile.id, unfamiliarRule.id, unfamiliarRule.wpm + 25)}
            disabled={!unfamiliarRule.enabled}
            labelColor={unfamiliarColor}
          />
        )}
        <Stepper
          label="Transition"
          value={transitionValue}
          onDec={() => stepTransition(-0.05)}
          onInc={() => stepTransition(0.05)}
          valueWidth="3rem"
        />
      </div>
    </div>
  );
}
