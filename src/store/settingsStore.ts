import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings, Theme } from '@/types/settings';
import type { SpeedProfile, SpeedRule } from '@/types/rsvp';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { DEFAULT_PROFILE } from '@/types/rsvp';

interface SettingsState {
  settings: AppSettings;
  getActiveProfile: () => SpeedProfile;
  setBaseWpm: (wpm: number) => void;
  updateRule: (profileId: string, ruleId: string, updates: Partial<SpeedRule>) => void;
  toggleRule: (profileId: string, ruleId: string) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (size: number) => void;
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

      setTheme: (theme: Theme) => set(state => ({
        settings: { ...state.settings, theme },
      })),

      setFontSize: (size: number) => set(state => ({
        settings: { ...state.settings, fontSize: Math.max(1.5, Math.min(6, size)) },
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
    { name: 'rapidread-settings' },
  ),
);
