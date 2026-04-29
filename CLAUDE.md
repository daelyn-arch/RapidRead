# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Vite dev server. Frontend only — does NOT run api/ functions.
npm run build       # tsc -b && vite build
npm run lint        # ESLint
npm run preview     # Serve dist/ as if it were prod

npx vercel dev      # Run frontend + api/ serverless functions together (needed when iterating on Stripe webhooks etc.)

# Audit suite — runs against a deployed URL, not local dev.
# AUDIT_URL defaults to production; override for staging.
npx playwright test --config=playwright.audit.config.ts                    # all audit specs against prod
npx playwright test --config=playwright.audit.config.ts tests/<name>.spec.ts  # single audit spec

AUDIT_URL=https://rapidread-staging.vercel.app \
SUPABASE_URL=$STAGING_SUPABASE_URL \
SUPABASE_SERVICE_ROLE_KEY=$STAGING_SUPABASE_SERVICE_ROLE_KEY \
  npx playwright test --config=playwright.audit.config.ts                  # full audit on staging

# Local dev tests (default playwright.config.ts) target localhost:5173/RapidRead/
npx playwright test
```

The audit config matches `(audit|features)\.spec\.ts$` — name new audit specs ending in `*-audit.spec.ts` so they get picked up. Helper for creating + cleaning up test users lives in `tests/helpers/supabaseAdmin.ts`.

## Deploy workflow

Two Vercel projects, two Supabase projects, two branches:

- `staging` branch → `rapidread-staging.vercel.app` ↔ Supabase project `caizdwawwxhlbympslpv`
- `master` branch → `rapidread-six.vercel.app` ↔ Supabase project `blqqcvrbkijewssqrkdh`

**Always**: branch off `staging` → push → Vercel auto-deploys → run the audit against staging → merge `staging` into `master` (fast-forward only) → production deploys. Never push directly to master. See `STAGING.md` for the full setup procedure including how the Stripe test webhook is wired.

## High-level architecture

RapidRead is a React SPA + Supabase backend + Stripe billing. Three concentric layers:

### 1. The reading engine (`src/engine/`)

Pure functions that turn raw chapter text into a stream of timed word tokens.

- `tokenizer.ts` produces `WordToken[]` with `context` flags computed by `contextDetector.ts` (isDialogue, isUnfamiliar, isParagraphStart, isSentenceEnd, isLongWord, hasTrailingPunctuation).
- `speedCalculator.ts` resolves the effective WPM for a token via `getMatchedRule(token, profile)` — returns the slowest *enabled* rule whose context flag matches. `estimateRemainingSeconds` mirrors the same logic for the progress-bar's time-left + avg-WPM display.
- `playbackController.ts` is a non-React class that drives token-by-token timing via `setTimeout`. Its `getEffectiveWpm()` honors the per-rule `causesRamp` flag — only opt-in rules engage the transition ramp back to base.
- `dialogueBlocks.ts` precomputes contiguous-dialogue ranges (and via `computeAllKaraokeBlocks`, every-token ranges for full-karaoke mode), split at sentence/clause boundaries with a max ~30-word block size.
- `orpCalculator.ts` finds the optimal recognition point character per word.

### 2. State + sync (`src/store/`, `src/sync/`)

Three Zustand stores, all persisted via `zustand/middleware/persist`:

- **`libraryStore`** — `books`, `progress`, `bookmarks`. Local IndexedDB is the cache; `useCloudSync` is the bridge to Supabase.
- **`settingsStore`** — `AppSettings` (theme, font, profiles, rules, colors, custom known words, toggles). Has a top-level hash watcher that auto-bumps `_lastModifiedAt` on any change without per-setter wiring; `suppressNextSettingsBump()` lets the cloud-pull path apply a downloaded payload without spurious bumps.
- **`readerStore`** — current book/chapter/tokens/position. Recomputes `dialogueBlockIndex` + `allKaraokeBlockIndex` on `setTokens`.

`useCloudSync` is the only place sync logic lives. It:

- Fires once per signed-in Pro user (with sync enabled) via `<CloudSyncMount />` in `App.tsx`.
- On mount: `initialLibrarySync` (additive merge for books, with cover backfill in both directions), `fetchAllProgress` (last-writer-wins), `fetchAllBookmarks` (replace local — see below), settings (LWW with `_syncedForUser` guard for account switches).
- Outbound: subscribes to each store, debounces pushes via `syncQueue` (lib/syncQueue).
- Bookmarks specifically use **replace-on-sign-in** (cloud truth wins). This was a deliberate fix after a sync loop where addBookmark minted fresh UUIDs for cloud rows on every sign-in, doubling the cloud count each session. The DB also enforces a unique constraint on `(user_id, book_id, chapter_index, word_index)` as a last-line-of-defense.

`useReadingTracker` (in `src/hooks/`) is a separate thin tracker that increments `reading_stats_daily` rollups while playing — only counts forward steps ≤5 words while `isPlaying === true`, so seeks/resumes don't pollute analytics.

### 3. Pages, billing, and gating (`src/pages/`, `src/billing/`, `src/auth/`)

Routes are wired in `App.tsx`. Auth wraps everything via `AuthProvider`.

Pro gating has two layers:

- **`useEffectiveProfile()`** — runtime gate. For Free users, returns the active profile with `transitionDuration: 0` and all rules disabled, so context-aware speed is invisible regardless of what's stored in settings.
- **`<ProLock>`** — UI gate. Wraps Pro-only Settings controls in a visually-locked overlay that opens the paywall on click.

Both must be respected for new Pro features. Freely changeable values stored in settingsStore won't actually do anything for Free users without the runtime gate.

The Stripe flow lives in `api/checkout.ts` (creates a Checkout session) + `api/stripe-webhook.ts` (verifies signature + updates `profiles.plan`). Note that `api/*.ts` files use ESM with `.js` import extensions because they target Vercel's Node runtime.

## Database

Schema lives in `supabase/migrations/`, applied in order. Each file is idempotent (`if not exists` / `drop policy if exists`). See `supabase/migrations/README.md` for the apply procedure.

Key tables:

- `profiles` — one row per auth user, mirrors `auth.users` via `handle_new_user` trigger. `plan` only writable by service-role (Stripe webhook).
- `books` — metadata + storage paths. Original EPUBs are NOT persisted; only parsed.json + cover_url (data URL, capped to 600px JPEG ~30-100KB by `epubParser`).
- `reading_progress`, `bookmarks`, `user_settings`, `reading_stats_daily` — all owner-only RLS.
- `bookmarks` has unique `(user_id, book_id, chapter_index, word_index)` as a hard sync invariant.

All cloud Storage objects live in a private `books` bucket under `{user_id}/{client_id}/parsed.json`.

## Conventions worth knowing

- Settings persist version is bumped any time the schema in `AppSettings` or `SpeedRule` changes; migration code lives in `settingsStore.ts`'s `migrate()`. Default new fields with sensible values for existing users.
- Pre-launch all source-of-truth secrets are in `.env.local` (gitignored). Production env vars live in Vercel's dashboard. `STAGING_*` versions of the Supabase keys exist alongside the prod ones for the seed script + audit overrides.
- Workbox PWA caches all bundled assets; runtime caching for samples is configured in `vite.config.ts`. Cross-origin endpoints (api.dictionaryapi.dev, Supabase, Stripe) intentionally bypass the SW.
- Per-rule `causesRamp` controls whether the transition ramp engages after that specific rule fires — avoid the assumption that all rules ramp.
- Dialogue karaoke + full karaoke share the same `<DialogueKaraoke>` component; `RsvpDisplay` picks the block index based on which mode is active.
