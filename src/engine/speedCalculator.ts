import type { WordToken, SpeedProfile } from '@/types/rsvp';

/**
 * Calculate the display delay in ms for a given word token based on the speed profile.
 * Lower modifier = slower display = longer delay.
 * When multiple rules match, the slowest one wins (smallest modifier → largest delay).
 */
export function calculateDelay(token: WordToken, profile: SpeedProfile): number {
  const baseDelay = 60000 / profile.baseWpm;

  let slowestModifier = 1.0;

  for (const rule of profile.rules) {
    if (rule.enabled && token.context[rule.condition]) {
      slowestModifier = Math.min(slowestModifier, rule.modifier);
    }
  }

  return baseDelay / slowestModifier;
}

/**
 * Convert a delay in ms back to effective WPM for display purposes.
 */
export function delayToWpm(delayMs: number): number {
  return Math.round(60000 / delayMs);
}
