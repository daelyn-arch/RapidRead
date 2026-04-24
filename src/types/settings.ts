import type { SpeedProfile } from './rsvp';
import { DEFAULT_PROFILE } from './rsvp';

export type Theme = 'dark' | 'light' | 'sepia' | 'parchment';

/**
 * The curated reading fonts exposed in Settings. `system` uses the OS
 * default stack; the rest are self-hosted via @fontsource packages so
 * they work offline.
 */
export type ReadingFont =
  | 'system'
  | 'georgia'
  | 'merriweather'
  | 'literata'
  | 'inter'
  | 'atkinson';

export interface AppSettings {
  activeProfileId: string;
  profiles: SpeedProfile[];
  theme: Theme;
  fontSize: number;
  /** Legacy free-form font-family string, retained for back-compat. */
  fontFamily: string;
  /** Curated reading-font selector (Phase G). Drives --reading-font-family. */
  readingFont: ReadingFont;
  showORP: boolean;
  orpColor: string;
  dialogueColor: string;
  unfamiliarColor: string;
  autoBookmark: boolean;
  customKnownWords: string[];
  /**
   * When true, dialogue blocks are rendered as a karaoke-style highlight on
   * the full sentence instead of one-word-at-a-time RSVP. Opt-in — many
   * readers prefer the consistency of single-word display.
   */
  karaokeDialogue: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeProfileId: 'default',
  profiles: [DEFAULT_PROFILE],
  theme: 'dark',
  fontSize: 3,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  readingFont: 'system',
  showORP: true,
  orpColor: '#ef4444',
  dialogueColor: '#60a5fa',
  unfamiliarColor: '#fbbf24',
  autoBookmark: true,
  customKnownWords: [],
  karaokeDialogue: false,
};
