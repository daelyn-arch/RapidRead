import type { SpeedRule } from '@/types/rsvp';

interface Props {
  rule: SpeedRule;
  onToggle: () => void;
  onWpmChange: (wpm: number) => void;
}

export default function SpeedRuleRow({ rule, onToggle, onWpmChange }: Props) {
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
        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {rule.name}
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
