# SaaS integration notes

Everything needed to turn RapidRead into a $5/mo SaaS is in the repo. The
additive pieces (new folders `src/lib`, `src/auth`, `src/billing`, `src/sync`,
`api/`, `supabase/`) are safe to review without breaking the app.

This file lists the **four existing files** that still need small changes plus
the external setup steps (Supabase, Stripe, Vercel).

---

## 1. Install new dependencies

```bash
npm install @supabase/supabase-js stripe @vercel/node
```

`@vercel/node` provides the request/response types used by `api/*.ts`.

---

## 2. Existing file edits (do these when you've paused work on `src/`)

### `src/main.tsx`
Swap `HashRouter` for `BrowserRouter` and wrap `<App/>` with `<AuthProvider>`.

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import './index.css'
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
```

### `src/App.tsx`
Restructure the routes: marketing pages at the root, app pages under `/app/*`.

```tsx
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

function App() {
  return (
    <>
      <CloudSyncMount />
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
```

### `vite.config.ts`
Change `base: '/RapidRead/'` to `'/'`, update the PWA manifest's `start_url`
and `scope` to `'/'`, and keep the service worker from eating API calls.

```ts
base: '/',
// ...
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['favicon.ico'],
  manifest: {
    name: 'RapidRead',
    short_name: 'RapidRead',
    description: 'RSVP speed reader with context-aware speed control',
    theme_color: '#0f172a',
    background_color: '#0f172a',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  workbox: {
    navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
  },
}),
```

### `src/pages/SettingsPage.tsx` (optional but recommended)
Add the drop-in sync toggle:

```tsx
import SyncToggle from '@/sync/SyncToggle'
// ...inside your settings screen, wherever preferences live:
<SyncToggle />
```

---

## 3. External setup

### Supabase
1. Create a project at supabase.com.
2. SQL editor → paste `supabase/migrations/0001_init.sql` → run.
3. Storage → create a **private** bucket named `books`.
4. Re-run the last section of `0001_init.sql` (the storage.objects policies)
   in the SQL editor after the bucket exists.
5. Authentication → Providers → Email → **turn off "Confirm email"** for tonight.
6. Authentication → URL Configuration → add your Vercel URL to Site URL and
   Redirect URLs (do this once the Vercel deploy exists).

Copy these into your env vars:
- `VITE_SUPABASE_URL` (Settings → API → Project URL)
- `VITE_SUPABASE_ANON_KEY` (Settings → API → anon public)
- `SUPABASE_SERVICE_ROLE_KEY` (Settings → API → service_role — **server-only**)

### Stripe (test mode first)
1. Products → create "RapidRead Pro" with two recurring prices: $5/mo and $45/yr.
2. Settings → Billing → Customer portal → activate (allow cancel, update card, switch plans).
3. Developers → Webhooks → add endpoint `https://<your-vercel-url>/api/stripe-webhook`
   and subscribe to: `checkout.session.completed`, `customer.subscription.created`,
   `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
4. Copy the webhook signing secret.

Copy these into env vars:
- `STRIPE_SECRET_KEY` (`sk_test_...`)
- `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` (from each price's Stripe ID)
- `STRIPE_WEBHOOK_SECRET` (`whsec_...`)

### Vercel
1. Import the repo. Framework preset: **Vite**. Node 20.
2. Add env vars for all three environments (see `.env.example`).
3. Deploy.
4. Once deployed, loop back to Supabase and Stripe to put the Vercel URL where
   those setups asked for it.

---

## 4. Smoke test

In a fresh browser:

1. Sign up with a test email.
2. Import a book. Start reading.
3. Go to `/pricing` → Upgrade → use card `4242 4242 4242 4242`, any future
   date, any CVC.
4. You land back on `/app/account` and see **Pro** (within a couple seconds —
   realtime profiles subscription).
5. Open `/app/settings` on a second browser (or private window), sign in →
   book, progress, and bookmarks should appear.
6. From the Supabase SQL editor, sign in as a different user and try to query
   user A's books. Should return zero rows (RLS check).
7. Test 3DS: card `4000 0027 6000 3184`.
8. Open `/app/account` → Manage billing → cancel. Webhook should flip plan
   back to `free` at period end.

---

## 5. Live mode switch (last step before tweeting)

1. Stripe dashboard → toggle to live mode.
2. Recreate the same product/prices in live mode.
3. Create a **second** webhook endpoint (live mode) → new signing secret.
4. In Vercel Production env, swap `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_YEARLY` to live values.
5. Redeploy.
6. Test one real $5 purchase with your own card. Refund yourself immediately
   from the Stripe dashboard.
7. Ship it.

---

## 6. What's explicitly deferred

- Email verification (flip back on in Supabase Auth when ready)
- OAuth providers
- Settings / WPM profile sync (settings stay local for now)
- PDF, AI summaries, reading stats (roadmap on pricing page)
- Conflict resolution UI (last-writer-wins is acceptable for v1)
- Data export UI (mailto: link on Account page)
- Playwright test suite updates (routes moved to `/app/*` — fix tomorrow)

---

## 7. Known gotchas

- `VITE_*` prefix is required for client-visible env vars. The service role
  key must NEVER be `VITE_`-prefixed.
- `vercel.json` SPA rewrite uses a negative lookahead on `api/` so webhook
  calls hit the serverless functions, not `index.html`.
- The Stripe webhook requires the raw body; `export const config = { api: { bodyParser: false } }` is set in `api/stripe-webhook.ts`.
- PWA cache: existing users on the old `/RapidRead/` base path may be stuck on
  stale caches after the base-path change. If you have zero prod users, ignore.
- Storage bucket `books` must be **private**.
