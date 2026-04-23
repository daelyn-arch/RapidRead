import type { SpeedProfile } from './rsvp';
import { DEFAULT_PROFILE } from './rsvp';

export type Theme = 'dark' | 'light' | 'sepia';

export interface AppSettings {
  activeProfileId: string;
  profiles: SpeedProfile[];
  theme: Theme;
  fontSize: number;
  fontFamily: string;
  showORP: boolean;
  orpColor: string;
  dialogueColor: string;
  unfamiliarColor: string;
  autoBookmark: boolean;
  customKnownWords: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  activeProfileId: 'default',
  profiles: [DEFAULT_PROFILE],
  theme: 'dark',
  fontSize: 3,
  fontFamily: 'system-ui, -apple-system, sans-serif',
  showORP: true,
  orpColor: '#ef4444',
  dialogueColor: '#60a5fa',
  unfamiliarColor: '#fbbf24',
  autoBookmark: true,
  customKnownWords: [],
};
