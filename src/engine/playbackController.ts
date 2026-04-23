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

  // Transition state
  private transitionFromWpm: number | null = null;
  private transitionStartTime: number | null = null;

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
    this.transitionFromWpm = null;
    this.transitionStartTime = null;
  }

  private getEffectiveWpm(token: WordToken): number {
    const ruleWpm = getRuleWpm(token, this.profile);

    if (ruleWpm !== null) {
      // A rule matches — use rule WPM, and track it for transition
      this.transitionFromWpm = ruleWpm;
      this.transitionStartTime = null; // reset transition clock
      return ruleWpm;
    }

    // No rule matches — check if we need to transition back to base
    const { baseWpm, transitionDuration } = this.profile;

    if (this.transitionFromWpm !== null && transitionDuration > 0) {
      // Start transition clock if not started
      if (this.transitionStartTime === null) {
        this.transitionStartTime = Date.now();
      }

      const elapsed = (Date.now() - this.transitionStartTime) / 1000;
      const progress = Math.min(elapsed / transitionDuration, 1);

      if (progress >= 1) {
        // Transition complete
        this.resetTransition();
        return baseWpm;
      }

      // Ease: linear interpolation from rule WPM to base WPM
      return this.transitionFromWpm + (baseWpm - this.transitionFromWpm) * progress;
    }

    // No transition needed
    this.resetTransition();
    return baseWpm;
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
