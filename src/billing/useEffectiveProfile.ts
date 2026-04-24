import { useMemo } from 'react';
import { useSettingsStore } from '@/store/settingsStore';
import { useIsPro } from './useIsPro';
import type { SpeedProfile } from '@/types/rsvp';

/**
 * The active speed profile, with Pro-gated features clamped for Free users.
 *
 * Free users only get base-WPM reading — no context rules, no transition
 * ramp. This returns a modified copy of the selected profile so playback
 * honors the gate without Free users seeing their actual saved rules
 * disappear in the Settings UI.
 */
export function useEffectiveProfile(): SpeedProfile {
  const activeProfile = useSettingsStore(s => {
    return s.settings.profiles.find(p => p.id === s.settings.activeProfileId)
      ?? s.settings.profiles[0];
  });
  const isPro = useIsPro();

  return useMemo(() => {
    if (isPro) return activeProfile;
    return {
      ...activeProfile,
      transitionDuration: 0,
      rules: activeProfile.rules.map(r => ({ ...r, enabled: false })),
    };
  }, [activeProfile, isPro]);
}
