import { useAuth } from '@/auth/useAuth';
import { useIsPro } from '@/billing/useIsPro';
import { useSettingsStore } from '@/store/settingsStore';

const PRO_THEMES = new Set(['sepia', 'parchment']);

/**
 * The theme to render. Free users see 'dark' in place of a Pro-only theme,
 * but the stored setting is never touched, so it survives slow or failed
 * profile loads and comes back on upgrade. While auth is still resolving we
 * render the stored theme to avoid a flash.
 */
export function useEffectiveTheme() {
  const theme = useSettingsStore(s => s.settings.theme);
  const isPro = useIsPro();
  const { loading } = useAuth();
  if (!loading && !isPro && PRO_THEMES.has(theme)) return 'dark';
  return theme;
}
