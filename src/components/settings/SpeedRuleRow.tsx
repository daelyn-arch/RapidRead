import type { SpeedRule } from '@/types/rsvp';

interface Props {
  rule: SpeedRule;
  onToggle: () => void;
  onModifierChange: (modifier: number) => void;
}

export default function SpeedRuleRow({ rule, onToggle, onModifierChange }: Props) {
  const effectDescription = rule.modifier < 1
    ? `${Math.round((1 / rule.modifier - 1) * 100)}% slower`
    : `${Math.round((rule.modifier - 1) * 100)}% faster`;

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
        <div>
          <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {rule.name}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
            {effectDescription}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="range"
          min="0.1"
          max="1.5"
          step="0.05"
          value={rule.modifier}
          onChange={e => onModifierChange(parseFloat(e.target.value))}
          className="w-24 accent-blue-500"
          disabled={!rule.enabled}
        />
        <span
          className="text-xs font-mono w-10 text-right"
          style={{ color: 'var(--text-secondary)' }}
        >
          {rule.modifier.toFixed(2)}x
        </span>
      </div>
    </div>
  );
}
