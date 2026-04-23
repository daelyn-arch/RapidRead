import type { WordToken, SpeedProfile } from '@/types/rsvp';
import { calculateDelay } from './speedCalculator';

export type PlaybackListener = {
  onWord: (token: WordToken, index: number) => void;
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

  constructor(profile: SpeedProfile, listener: PlaybackListener) {
    this.profile = profile;
    this.listener = listener;
  }

  loadTokens(tokens: WordToken[], startPosition = 0) {
    this.pause();
    this.tokens = tokens;
    this.position = Math.min(startPosition, tokens.length - 1);
    if (tokens.length > 0) {
      this.listener.onWord(this.tokens[this.position], this.position);
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
    if (this.tokens.length > 0) {
      this.listener.onWord(this.tokens[this.position], this.position);
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
    const delay = calculateDelay(token, this.profile);

    this.listener.onWord(token, this.position);

    this.timerId = setTimeout(() => {
      this.position++;
      this.scheduleNext();
    }, delay);
  }
}
