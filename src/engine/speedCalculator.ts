import type { WordToken, SpeedProfile, SpeedRule } from '@/types/rsvp';

/**
 * Get the rule whose WPM applies to this word. When multiple rules match,
 * the slowest one wins (lowest WPM). Returns null if no rules match
 * (use base WPM).
 *
 * The full rule (not just the WPM) is returned so the playback controller
 * can read `causesRamp` to decide whether to engage the transition ramp.
 */
export function getMatchedRule(token: WordToken, profile: SpeedProfile): SpeedRule | null {
  let winner: SpeedRule | null = null;
  for (const rule of profile.rules) {
    if (rule.enabled && token.context[rule.condition]) {
      if (winner === null || rule.wpm < winner.wpm) {
        winner = rule;
      }
    }
  }
  return winner;
}

/**
 * Convenience wrapper for callers that only need the target WPM.
 */
export function getRuleWpm(token: WordToken, profile: SpeedProfile): number | null {
  return getMatchedRule(token, profile)?.wpm ?? null;
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
