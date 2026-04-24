import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import './index.css'

// Curated reading fonts — self-hosted so they work offline inside the PWA.
// Loaded CSS registers @font-face; only the glyphs for selected fonts are
// actually fetched by the browser when used.
import '@fontsource-variable/merriweather'
import '@fontsource-variable/literata'
import '@fontsource-variable/inter'
import '@fontsource/atkinson-hyperlegible/400.css'
import '@fontsource/atkinson-hyperlegible/700.css'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
