import { useSettingsStore } from '@/store/settingsStore';
import SpeedRuleRow from './SpeedRuleRow';

export default function SpeedProfileEditor() {
  const profile = useSettingsStore(s => s.getActiveProfile)();
  const { setBaseWpm, toggleRule, updateRule } = useSettingsStore();

  return (
    <div>
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Speed Profile: {profile.name}
      </h3>

      {/* Base WPM */}
      <div
        className="flex items-center justify-between py-3 px-4 rounded-lg mb-4"
        style={{ backgroundColor: 'var(--bg-secondary)' }}
      >
        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Base Speed
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setBaseWpm(profile.baseWpm - 25)}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            -
          </button>
          <span className="font-mono text-lg w-24 text-center" style={{ color: 'var(--text-primary)' }}>
            {profile.baseWpm} WPM
          </span>
          <button
            onClick={() => setBaseWpm(profile.baseWpm + 25)}
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
            style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
          >
            +
          </button>
        </div>
      </div>

      {/* Speed Rules */}
      <h4
        className="text-sm font-medium mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Context Speed Rules
      </h4>
      <div className="space-y-2">
        {profile.rules.map(rule => (
          <SpeedRuleRow
            key={rule.id}
            rule={rule}
            onToggle={() => toggleRule(profile.id, rule.id)}
            onModifierChange={(mod) => updateRule(profile.id, rule.id, { modifier: mod })}
          />
        ))}
      </div>
    </div>
  );
}
