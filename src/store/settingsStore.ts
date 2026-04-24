import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, ReadingFont, Theme } from '@/types/settings';
import type { SpeedProfile, SpeedRule } from '@/types/rsvp';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { DEFAULT_PROFILE } from '@/types/rsvp';

interface SettingsState {
  settings: AppSettings;
  getActiveProfile: () => SpeedProfile;
  setBaseWpm: (wpm: number) => void;
  setTransitionDuration: (seconds: number) => void;
  updateRule: (profileId: string, ruleId: string, updates: Partial<SpeedRule>) => void;
  toggleRule: (profileId: string, ruleId: string) => void;
  setRuleWpm: (profileId: string, ruleId: string, wpm: number) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
  setReadingFont: (font: ReadingFont) => void;
  setKaraokeDialogue: (enabled: boolean) => void;
  setLongWordThreshold: (n: number) => void;
  setOrpColor: (color: string) => void;
  setDialogueColor: (color: string) => void;
  setUnfamiliarColor: (color: string) => void;
  addKnownWord: (word: string) => void;
  removeKnownWord: (word: string) => void;
  addProfile: (profile: SpeedProfile) => void;
  deleteProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      getActiveProfile: () => {
        const { settings } = get();
        return settings.profiles.find(p => p.id === settings.activeProfileId) || DEFAULT_PROFILE;
      },

      setBaseWpm: (wpm: number) => set(state => ({
        settings: {
          ...state.settings,
          profiles: state.settings.profiles.map(p =>
            p.id === state.settings.activeProfileId
              ? { ...p, baseWpm: Math.max(25, Math.min(1500, wpm)) }
              : p
          ),
        },
      })),

      setTransitionDuration: (seconds: number) => set(state => ({
        settings: {
          ...state.settings,
          profiles: state.settings.profiles.map(p =>
            p.id === state.settings.activeProfileId
              ? { ...p, transitionDuration: Math.max(0, Math.min(10, seconds)) }
              : p
          ),
        },
      })),

      updateRule: (profileId: string, ruleId: string, updates: Partial<SpeedRule>) => set(state => ({
        settings: {
          ...state.settings,
          profiles: state.settings.profiles.map(p =>
            p.id === profileId
              ? { ...p, rules: p.rules.map(r => r.id === ruleId ? { ...r, ...updates } : r) }
              : p
          ),
        },
      })),

      toggleRule: (profileId: string, ruleId: string) => set(state => ({
        settings: {
          ...state.settings,
          profiles: state.settings.profiles.map(p =>
            p.id === profileId
              ? { ...p, rules: p.rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r) }
              : p
          ),
        },
      })),

      setRuleWpm: (profileId: string, ruleId: string, wpm: number) => set(state => ({
        settings: {
          ...state.settings,
          profiles: state.settings.profiles.map(p =>
            p.id === profileId
              ? { ...p, rules: p.rules.map(r => r.id === ruleId ? { ...r, wpm: Math.max(25, Math.min(1500, wpm)) } : r) }
              : p
          ),
        },
      })),

      setTheme: (theme: Theme) => set(state => ({
        settings: { ...state.settings, theme },
      })),

      setFontSize: (size: number) => set(state => ({
        settings: { ...state.settings, fontSize: Math.max(1.5, Math.min(6, size)) },
      })),

      setReadingFont: (font: ReadingFont) => set(state => ({
        settings: { ...state.settings, readingFont: font },
      })),

      setKaraokeDialogue: (enabled: boolean) => set(state => ({
        settings: { ...state.settings, karaokeDialogue: enabled },
      })),

      setLongWordThreshold: (n: number) => set(state => ({
        settings: { ...state.settings, longWordThreshold: Math.max(4, Math.min(20, Math.round(n))) },
      })),

      setOrpColor: (color: string) => set(state => ({
        settings: { ...state.settings, orpColor: color },
      })),

      setDialogueColor: (color: string) => set(state => ({
        settings: { ...state.settings, dialogueColor: color },
      })),

      setUnfamiliarColor: (color: string) => set(state => ({
        settings: { ...state.settings, unfamiliarColor: color },
      })),

      addKnownWord: (word: string) => set(state => {
        const lower = word.toLowerCase().trim();
        if (state.settings.customKnownWords.includes(lower)) return state;
        return {
          settings: {
            ...state.settings,
            customKnownWords: [...state.settings.customKnownWords, lower],
          },
        };
      }),

      removeKnownWord: (word: string) => set(state => ({
        settings: {
          ...state.settings,
          customKnownWords: state.settings.customKnownWords.filter(w => w !== word.toLowerCase()),
        },
      })),

      addProfile: (profile: SpeedProfile) => set(state => ({
        settings: {
          ...state.settings,
          profiles: [...state.settings.profiles, profile],
          activeProfileId: profile.id,
        },
      })),

      deleteProfile: (id: string) => set(state => {
        if (state.settings.profiles.length <= 1) return state;
        const remaining = state.settings.profiles.filter(p => p.id !== id);
        return {
          settings: {
            ...state.settings,
            profiles: remaining,
            activeProfileId: state.settings.activeProfileId === id
              ? remaining[0].id
              : state.settings.activeProfileId,
          },
        };
      }),

      setActiveProfile: (id: string) => set(state => ({
        settings: { ...state.settings, activeProfileId: id },
      })),
    }),
    {
      name: 'rapidread-settings',
      version: 2,
      migrate: (persisted: unknown) => {
        const state = persisted as { settings?: AppSettings };
        if (state?.settings) {
          if (state.settings.dialogueColor === undefined) state.settings.dialogueColor = '#60a5fa';
          if (state.settings.unfamiliarColor === undefined) state.settings.unfamiliarColor = '#fbbf24';
          if (state.settings.karaokeDialogue === undefined) state.settings.karaokeDialogue = false;
          if (state.settings.readingFont === undefined) state.settings.readingFont = 'system';
          if (state.settings.longWordThreshold === undefined) state.settings.longWordThreshold = 9;
        }
        if (state?.settings?.profiles) {
          for (const profile of state.settings.profiles) {
            // Migrate old modifier-based rules to wpm-based
            if (profile.transitionDuration === undefined) {
              profile.transitionDuration = 0;
            }
            for (const rule of profile.rules) {
              if ((rule as unknown as { modifier?: number }).modifier !== undefined && rule.wpm === undefined) {
                const mod = (rule as unknown as { modifier: number }).modifier;
                rule.wpm = Math.round(profile.baseWpm * mod);
                delete (rule as unknown as { modifier?: number }).modifier;
              }
            }
          }
        }
        return state;
      },
    },
  ),
);
