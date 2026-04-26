import { useSettingsStore } from '@/store/settingsStore';
import ProLock from '@/billing/ProLock';
import SpeedRuleRow from './SpeedRuleRow';

export default function SpeedProfileEditor() {
  const profile = useSettingsStore(s => s.getActiveProfile)();
  const { setBaseWpm, setTransitionStep, toggleRule, setRuleWpm, updateRule } = useSettingsStore();

  return (
    <div>
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: 'var(--text-primary)' }}
      >
        Speed Profile: {profile.name}
      </h3>

      {/* Transition Step — Pro feature. Listed first so users tune the
          ramp-out cadence alongside the per-rule ramp toggles below. */}
      <ProLock
        paywallTitle="Transition rate is a Pro feature"
        paywallDescription="Upgrade to tune how smoothly your speed ramps back to base after a slowdown. $0.99/month or $7.99/year."
      >
        <div
          className="flex items-center justify-between py-3 px-4 rounded-lg mb-2"
          style={{ backgroundColor: 'var(--bg-secondary)' }}
        >
          <div>
            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Transition Step
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              WPM added per word ramping back to base after a slowdown. 0 disables the ramp.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTransitionStep(profile.transitionStep - 5)}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              -
            </button>
            <span className="font-mono text-sm w-20 text-center" style={{ color: 'var(--text-primary)' }}>
              +{profile.transitionStep} wpm
            </span>
            <button
              onClick={() => setTransitionStep(profile.transitionStep + 5)}
              className="w-8 h-8 rounded-lg flex items-center justify-center font-bold"
              style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
            >
              +
            </button>
          </div>
        </div>
      </ProLock>

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

      {/* Speed Rules — Pro feature (entire block) */}
      <h4
        className="text-sm font-medium mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Context Speed Rules
      </h4>
      <ProLock
        paywallTitle="Context-aware speed is a Pro feature"
        paywallDescription="Upgrade to let RapidRead slow down for dialogue, unfamiliar words, sentence ends, and more. $0.99/month or $7.99/year."
      >
        <div className="space-y-2">
          {profile.rules.map(rule => (
            <SpeedRuleRow
              key={rule.id}
              rule={rule}
              onToggle={() => toggleRule(profile.id, rule.id)}
              onWpmChange={(wpm) => setRuleWpm(profile.id, rule.id, wpm)}
              onCausesRampToggle={() =>
                updateRule(profile.id, rule.id, { causesRamp: !rule.causesRamp })
              }
            />
          ))}
        </div>
      </ProLock>
    </div>
  );
}
