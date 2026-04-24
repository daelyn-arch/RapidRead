import type { SpeedRule } from '@/types/rsvp';
import { useSettingsStore } from '@/store/settingsStore';

interface Props {
  rule: SpeedRule;
  onToggle: () => void;
  onWpmChange: (wpm: number) => void;
}

export default function SpeedRuleRow({ rule, onToggle, onWpmChange }: Props) {
  const dialogueColor = useSettingsStore(s => s.settings.dialogueColor);
  const unfamiliarColor = useSettingsStore(s => s.settings.unfamiliarColor);
  const longWordThreshold = useSettingsStore(s => s.settings.longWordThreshold);

  let labelColor: string = 'var(--text-primary)';
  if (rule.id === 'dialogue') labelColor = dialogueColor;
  else if (rule.id === 'unfamiliar') labelColor = unfamiliarColor;

  // Long-word rule name reflects the live threshold (e.g. "Long Word (9+)")
  const displayName = rule.id === 'long-word'
    ? `Long Word (${longWordThreshold}+)`
    : rule.name;

  return (
    <div
      className="flex items-center justify-between py-3 px-4 rounded-lg"
      style={{ backgroundColor: 'var(--bg-secondary)' }}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="w-10 h-6 rounded-full relative transition-colors"
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
        <div className="text-sm font-medium" style={{ color: labelColor }}>
          {displayName}
        </div>
      </div>

      <div className="flex items-center gap-2">
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
