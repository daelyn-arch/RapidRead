import type { SpeedRule } from '@/types/rsvp';
import { useSettingsStore } from '@/store/settingsStore';

interface Props {
  rule: SpeedRule;
  onToggle: () => void;
  onWpmChange: (wpm: number) => void;
  /** Toggle the per-rule transition ramp. Optional — when undefined the
   *  ramp chip is hidden (used by callers that don't want to expose it). */
  onCausesRampToggle?: () => void;
}

export default function SpeedRuleRow({ rule, onToggle, onWpmChange, onCausesRampToggle }: Props) {
  const dialogueColor = useSettingsStore(s => s.settings.dialogueColor);
  const unfamiliarColor = useSettingsStore(s => s.settings.unfamiliarColor);
  const longWordThreshold = useSettingsStore(s => s.settings.longWordThreshold);
  const transitionStep = useSettingsStore(s => s.getActiveProfile().transitionStep);

  let labelColor: string = 'var(--text-primary)';
  if (rule.id === 'dialogue') labelColor = dialogueColor;
  else if (rule.id === 'unfamiliar') labelColor = unfamiliarColor;

  // Long-word rule name reflects the live threshold (e.g. "Long Word (9+)")
  const displayName = rule.id === 'long-word'
    ? `Long Word (${longWordThreshold}+)`
    : rule.name;

  // Hide the ramp chip when the active profile has the ramp disabled
  // entirely (transitionStep == 0) — there's nothing to ramp anyway.
  const showRampChip = !!onCausesRampToggle && transitionStep > 0;

  return (
    <div
      className="flex items-center justify-between py-3 px-4 rounded-lg gap-3 flex-wrap"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggle}
          className="w-10 h-6 rounded-full relative transition-colors shrink-0"
          style={{
            backgroundColor: rule.enabled ? 'var(--accent)' : 'var(--bg-tertiary)',
          }}
        >
          <div
            className="w-4 h-4 rounded-full bg-white absolute top-1 transition-transform"
            style={{
              transform: rule.enabled ? 'translateX(20px)' : 'translateX(4px)',
            }}
          />
        </button>
        <div className="text-sm font-medium truncate" style={{ color: labelColor }}>
          {displayName}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap justify-end">
        {showRampChip && (
          <button
            onClick={onCausesRampToggle}
            disabled={!rule.enabled}
            title={
              rule.causesRamp
                ? 'Speed ramps back to base after this rule. Click to snap instead.'
                : 'Speed snaps back to base after this rule. Click to ramp instead.'
            }
            className="text-[11px] font-medium px-2 py-1 rounded-md border transition-opacity disabled:opacity-30"
            style={{
              borderColor: rule.causesRamp && rule.enabled ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: rule.causesRamp && rule.enabled ? 'var(--accent)' : 'var(--text-secondary)',
              background: 'transparent',
            }}
          >
            {rule.causesRamp ? '↗ Ramp' : 'Ramp off'}
          </button>
        )}
        <button
          onClick={() => onWpmChange(rule.wpm - 25)}
          disabled={!rule.enabled}
          className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm disabled:opacity-30"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          -
        </button>
        <span
          className="text-sm font-mono w-16 text-center"
          style={{ color: rule.enabled ? 'var(--text-primary)' : 'var(--text-secondary)' }}
        >
          {rule.wpm} WPM
        </span>
        <button
          onClick={() => onWpmChange(rule.wpm + 25)}
          disabled={!rule.enabled}
          className="w-7 h-7 rounded-md flex items-center justify-center font-bold text-sm disabled:opacity-30"
          style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
        >
          +
        </button>
      </div>
    </div>
  );
}
