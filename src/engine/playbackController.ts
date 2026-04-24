import type { WordToken, SpeedProfile } from '@/types/rsvp';
import { getRuleWpm, wpmToDelay } from './speedCalculator';

export type PlaybackListener = {
  onWord: (token: WordToken, index: number, effectiveWpm: number) => void;
  onComplete: () => void;
  onStateChange: (isPlaying: boolean) => void;
};

export class PlaybackController {
  private tokens: WordToken[] = [];
  private position = 0;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private playing = false;
  private profile: SpeedProfile;
  private listener: PlaybackListener;

  // Transition state — per-word step model.
  // rampedWpm is the current effective speed during a ramp back to base.
  // null means "not ramping, just use baseWpm for no-rule words".
  private rampedWpm: number | null = null;

  constructor(profile: SpeedProfile, listener: PlaybackListener) {
    this.profile = profile;
    this.listener = listener;
  }

  loadTokens(tokens: WordToken[], startPosition = 0) {
    this.pause();
    this.tokens = tokens;
    this.position = Math.min(startPosition, tokens.length - 1);
    this.resetTransition();
    if (tokens.length > 0) {
      const wpm = this.getEffectiveWpm(this.tokens[this.position]);
      this.listener.onWord(this.tokens[this.position], this.position, wpm);
    }
  }

  play() {
    if (this.playing || this.tokens.length === 0) return;
    this.playing = true;
    this.listener.onStateChange(true);
    this.scheduleNext();
  }

  pause() {
    this.playing = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    this.listener.onStateChange(false);
  }

  toggle() {
    if (this.playing) {
      this.pause();
    } else {
      this.play();
    }
  }

  seekTo(index: number) {
    const wasPlaying = this.playing;
    this.pause();
    this.position = Math.max(0, Math.min(index, this.tokens.length - 1));
    this.resetTransition();
    if (this.tokens.length > 0) {
      const wpm = this.getEffectiveWpm(this.tokens[this.position]);
      this.listener.onWord(this.tokens[this.position], this.position, wpm);
    }
    if (wasPlaying) {
      this.play();
    }
  }

  skipForward(count = 1) {
    this.seekTo(this.position + count);
  }

  skipBack(count = 1) {
    this.seekTo(this.position - count);
  }

  setProfile(profile: SpeedProfile) {
    this.profile = profile;
  }

  getPosition(): number {
    return this.position;
  }

  getTokenCount(): number {
    return this.tokens.length;
  }

  isPlaying(): boolean {
    return this.playing;
  }

  destroy() {
    this.pause();
    this.tokens = [];
  }

  private resetTransition() {
    this.rampedWpm = null;
  }

  private getEffectiveWpm(token: WordToken): number {
    const ruleWpm = getRuleWpm(token, this.profile);
    const { baseWpm, transitionStep } = this.profile;

    if (ruleWpm !== null) {
      // A rule matched. Use its WPM.
      // Seed the ramp with rule WPM *only* if the rule is slower than base
      // — if the rule is faster than base, there's nothing to ramp toward,
      // we'll just snap back to base on the next non-rule word.
      this.rampedWpm = ruleWpm < baseWpm ? ruleWpm : null;
      return ruleWpm;
    }

    // No rule. Decide between ramping and straight base-WPM.
    if (this.rampedWpm === null || transitionStep <= 0) {
      // Not ramping (or transition disabled) — just base speed.
      this.rampedWpm = null;
      return baseWpm;
    }

    // Ramping: bump current WPM by the per-word step, clamp to base.
    const next = Math.min(this.rampedWpm + transitionStep, baseWpm);
    this.rampedWpm = next >= baseWpm ? null : next;
    return next;
  }

  private scheduleNext() {
    if (!this.playing || this.position >= this.tokens.length) {
      if (this.position >= this.tokens.length) {
        this.playing = false;
        this.listener.onStateChange(false);
        this.listener.onComplete();
      }
      return;
    }

    const token = this.tokens[this.position];
    const effectiveWpm = this.getEffectiveWpm(token);
    const delay = wpmToDelay(effectiveWpm);

    this.listener.onWord(token, this.position, effectiveWpm);

    this.timerId = setTimeout(() => {
      this.position++;
      this.scheduleNext();
    }, delay);
  }
}
