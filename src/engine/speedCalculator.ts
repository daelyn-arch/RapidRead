import type { WordToken, SpeedProfile } from '@/types/rsvp';

/**
 * Get the target WPM for a word based on matching rules.
 * When multiple rules match, the slowest one wins (lowest WPM).
 * Returns null if no rules match (use base WPM).
 */
export function getRuleWpm(token: WordToken, profile: SpeedProfile): number | null {
  let slowest: number | null = null;

  for (const rule of profile.rules) {
    if (rule.enabled && token.context[rule.condition]) {
      if (slowest === null || rule.wpm < slowest) {
        slowest = rule.wpm;
      }
    }
  }

  return slowest;
}

/**
 * Calculate the display delay in ms for a given effective WPM.
 */
export function wpmToDelay(wpm: number): number {
  return 60000 / Math.max(wpm, 1);
}

/**
 * Convert a delay in ms back to effective WPM for display purposes.
 */
export function delayToWpm(delayMs: number): number {
  return Math.round(60000 / delayMs);
}
