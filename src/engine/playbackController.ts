import type { WordToken, SpeedProfile } from '@/types/rsvp';
import { getMatchedRule, wpmToDelay } from './speedCalculator';

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
    const rule = getMatchedRule(token, this.profile);
    const { baseWpm, transitionStep } = this.profile;

    if (rule !== null) {
      // A rule matched. Use its WPM.
      // Seed the ramp only if (a) the rule is slower than base AND
      // (b) the rule opts into causing a ramp. Otherwise the next
      // non-rule word snaps straight back to base.
      this.rampedWpm = rule.wpm < baseWpm && rule.causesRamp ? rule.wpm : null;
      return rule.wpm;
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
