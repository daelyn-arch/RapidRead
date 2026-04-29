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
 * Estimate how many seconds it'll take to read `tokens[fromIndex..end]`
 * under the given profile. Faithfully mirrors PlaybackController's
 * effective-WPM logic so the UI estimate matches the user's actual
 * pacing — counting per-token rule WPMs (dialogue, unfamiliar,
 * sentence-end, etc.) and the transition ramp back to base.
 */
export function estimateRemainingSeconds(
  tokens: WordToken[],
  fromIndex: number,
  profile: SpeedProfile,
): number {
  const { baseWpm, transitionStep } = profile;
  let totalSeconds = 0;
  let rampedWpm: number | null = null;

  const start = Math.max(0, fromIndex);
  for (let i = start; i < tokens.length; i++) {
    const rule = getMatchedRule(tokens[i], profile);
    let wpm: number;
    if (rule !== null) {
      wpm = rule.wpm;
      rampedWpm = rule.wpm < baseWpm && rule.causesRamp ? rule.wpm : null;
    } else if (rampedWpm === null || transitionStep <= 0) {
      wpm = baseWpm;
      rampedWpm = null;
    } else {
      const next = Math.min(rampedWpm + transitionStep, baseWpm);
      rampedWpm = next >= baseWpm ? null : next;
      wpm = next;
    }
    totalSeconds += 60 / Math.max(1, wpm);
  }

  return totalSeconds;
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
