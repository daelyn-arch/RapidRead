import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LibraryPage from '@/pages/LibraryPage'
import ReaderPage from '@/pages/ReaderPage'
import SettingsPage from '@/pages/SettingsPage'
import LandingPage from '@/pages/LandingPage'
import PricingPage from '@/pages/PricingPage'
import AccountPage from '@/pages/AccountPage'
import LoginPage from '@/auth/LoginPage'
import AuthCallbackPage from '@/auth/AuthCallbackPage'
import { CloudSyncMount } from '@/sync/useCloudSync'
import { useSettingsStore } from '@/store/settingsStore'

/**
 * Mirror the user's reading-font selection to a data attribute on <body>
 * so the CSS var --reading-font-family resolves to the right stack.
 */
function ReadingFontSync() {
  const readingFont = useSettingsStore(s => s.settings.readingFont)
  useEffect(() => {
    document.body.dataset.readingFont = readingFont ?? 'system'
  }, [readingFont])
  return null
}

function App() {
  return (
    <>
      <CloudSyncMount />
      <ReadingFontSync />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default App
