import { useState } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useIsPro } from '@/billing/useIsPro';
import PaywallModal from '@/billing/PaywallModal';

interface StepperProps {
  label: string;
  value: string;
  onDec: () => void;
  onInc: () => void;
  disabled?: boolean;
  labelColor?: string;
  valueWidth?: string;
  locked?: boolean;
  onLockedClick?: () => void;
}

function Stepper({ label, value, onDec, onInc, disabled, labelColor, valueWidth, locked, onLockedClick }: StepperProps) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 sm:gap-1"
      onClick={locked ? onLockedClick : undefined}
      style={{ cursor: locked ? 'pointer' : 'default' }}
    >
      <div
        className="text-[9px] sm:text-[10px] font-medium uppercase tracking-wide flex items-center gap-1"
        style={{ color: labelColor ?? 'var(--text-secondary)' }}
      >
        {label}
        {locked && (
          <span
            className="text-[8px] px-1 rounded-sm"
            style={{ background: 'var(--accent)', color: 'white' }}
          >
            PRO
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 sm:gap-1.5" style={{ pointerEvents: locked ? 'none' : 'auto', opacity: locked ? 0.4 : 1 }}>
        <button
          onClick={onDec}
          disabled={disabled || locked}
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity text-base sm:text-lg font-bold disabled:opacity-30"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          -
        </button>
        <div
          className="text-xs sm:text-sm font-mono text-center"
          style={{
            color: (disabled || locked) ? 'var(--text-secondary)' : 'var(--text-primary)',
            minWidth: valueWidth ?? '2.5rem',
          }}
        >
          {value}
        </div>
        <button
          onClick={onInc}
          disabled={disabled || locked}
          className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity text-base sm:text-lg font-bold disabled:opacity-30"
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
  const isPro = useIsPro();
  const [paywallOpen, setPaywallOpen] = useState(false);

  const dialogueRule = profile.rules.find(r => r.id === 'dialogue');
  const unfamiliarRule = profile.rules.find(r => r.id === 'unfamiliar');

  const transitionValue = profile.transitionDuration.toFixed(2) + 's';
  const stepTransition = (delta: number) =>
    setTransitionDuration(Math.max(0, Math.round((profile.transitionDuration + delta) * 100) / 100));

  const openPaywall = () => setPaywallOpen(true);

  return (
    <div
      className="flex flex-col items-center gap-2 py-2 px-2"
      style={{ color: 'var(--text-primary)' }}
    >
      <div className="flex items-center justify-center gap-x-3 gap-y-2 sm:gap-6 flex-wrap">
        {dialogueRule && (
          <Stepper
            label="Dialogue"
            value={String(dialogueRule.wpm)}
            onDec={() => setRuleWpm(profile.id, dialogueRule.id, dialogueRule.wpm - 25)}
            onInc={() => setRuleWpm(profile.id, dialogueRule.id, dialogueRule.wpm + 25)}
            disabled={!dialogueRule.enabled}
            labelColor={dialogueColor}
            locked={!isPro}
            onLockedClick={openPaywall}
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
            locked={!isPro}
            onLockedClick={openPaywall}
          />
        )}
        <Stepper
          label="Transition"
          value={transitionValue}
          onDec={() => stepTransition(-0.05)}
          onInc={() => stepTransition(0.05)}
          valueWidth="3rem"
          locked={!isPro}
          onLockedClick={openPaywall}
        />
      </div>

      <PaywallModal
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        title="Context-aware speed is a Pro feature"
        description="Upgrade to RapidRead Pro for smarter pacing — slow down for dialogue, unfamiliar words, and sentence breaks. $0.99/month or $7.99/year."
      />
    </div>
  );
}
