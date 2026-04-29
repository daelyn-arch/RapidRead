import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LibraryPage from '@/pages/LibraryPage'
import ReaderPage from '@/pages/ReaderPage'
import SettingsPage from '@/pages/SettingsPage'
import LandingPage from '@/pages/LandingPage'
import PricingPage from '@/pages/PricingPage'
import AccountPage from '@/pages/AccountPage'
import AnalyticsPage from '@/pages/AnalyticsPage'
import LoginPage from '@/auth/LoginPage'
import AuthCallbackPage from '@/auth/AuthCallbackPage'
import { CloudSyncMount } from '@/sync/useCloudSync'
import { useSettingsStore } from '@/store/settingsStore'
import { useIsPro } from '@/billing/useIsPro'

const PRO_THEMES = new Set(['sepia', 'parchment'])
const FREE_FONT = 'system'

/**
 * Mirror the user's reading-font selection to a data attribute on <body>
 * so the CSS var --reading-font-family resolves to the right stack.
 * Free users are forced to the system font regardless of their selection.
 */
function ReadingFontSync() {
  const readingFont = useSettingsStore(s => s.settings.readingFont)
  const isPro = useIsPro()
  useEffect(() => {
    document.body.dataset.readingFont = isPro ? (readingFont ?? 'system') : FREE_FONT
  }, [readingFont, isPro])
  return null
}

/**
 * Make sure Free users can't keep a Pro-only theme (sepia, parchment).
 * The theme is still stored in settings so upgrading restores it.
 */
function ThemeGate() {
  const theme = useSettingsStore(s => s.settings.theme)
  const setTheme = useSettingsStore(s => s.setTheme)
  const isPro = useIsPro()
  useEffect(() => {
    if (!isPro && PRO_THEMES.has(theme)) setTheme('dark')
  }, [isPro, theme, setTheme])
  return null
}

function App() {
  return (
    <>
      <CloudSyncMount />
      <ReadingFontSync />
      <ThemeGate />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<LoginPage initialMode="signup" />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route path="/app" element={<LibraryPage />} />
        <Route path="/app/read/:bookId" element={<ReaderPage />} />
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/account" element={<AccountPage />} />
        <Route path="/app/analytics" element={<AnalyticsPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
