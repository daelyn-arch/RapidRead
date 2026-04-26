# Staging environment

A staging copy of RapidRead — its own Vercel project, its own Supabase
project, its own Stripe test mode keys — so changes can be smoke-tested
end-to-end against realistic data before promoting to production.

## One-time setup

### 1. New Supabase project — `rapidread-staging`
- Supabase dashboard → New project
- Apply migrations: paste each file in `supabase/migrations/` (numerical
  order) into the SQL editor and run, OR use the CLI:
  ```bash
  npm i -g supabase
  supabase login
  supabase link --project-ref <staging-ref>
  supabase db push
  ```
- Storage tab → New bucket → name `books`, **Private**
- Copy the staging URL + anon key + service-role key into `.env.local`
  under new vars:
  ```
  STAGING_SUPABASE_URL=https://<ref>.supabase.co
  STAGING_SUPABASE_ANON_KEY=...
  STAGING_SUPABASE_SERVICE_ROLE_KEY=...
  ```

### 2. New Vercel project — `rapidread-staging`
- Vercel → Import Git Repository → same repo
- Production Branch: `staging` (not master)
- Env vars (use the **staging** Supabase keys + Stripe **test mode** keys):
  ```
  VITE_SUPABASE_URL                = STAGING_SUPABASE_URL
  VITE_SUPABASE_ANON_KEY           = STAGING_SUPABASE_ANON_KEY
  SUPABASE_URL                     = STAGING_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY        = STAGING_SUPABASE_SERVICE_ROLE_KEY
  STRIPE_SECRET_KEY                = sk_test_...
  STRIPE_WEBHOOK_SECRET            = whsec_test_...
  STRIPE_PRICE_ID_MONTHLY          = price_test_...
  STRIPE_PRICE_ID_YEARLY           = price_test_...
  ```
- Settings → Domains → confirm `rapidread-staging.vercel.app`

### 3. Stripe test webhook
- Stripe dashboard → switch to **Test mode**
- Developers → Webhooks → Add endpoint
  - URL: `https://rapidread-staging.vercel.app/api/stripe-webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`,
    `customer.subscription.deleted`
- Copy the signing secret into Vercel staging's `STRIPE_WEBHOOK_SECRET`

### 4. Seed the permanent test account
With the staging env vars set in `.env.local`, run:
```bash
node scripts/seed-staging.mjs
```
Creates `daelyn+staging@thex1.com` (Pro), with 3 books + 6 bookmarks.

## Daily workflow

1. New work → branch off `staging`
2. PR into `staging` → Vercel auto-deploys preview
3. Smoke-test against the staging URL:
   ```bash
   AUDIT_URL=https://rapidread-staging.vercel.app npx playwright test --config=playwright.audit.config.ts
   ```
4. If green, merge `staging` → `master`; production deploys.
5. If red, fix on the feature branch; never promote a red staging.

## Rolling back production
- Vercel dashboard → Deployments → click the previous green deploy →
  "Promote to Production"
- For a schema migration that needs reverting, write a downgrade SQL
  file (`0006_revert_xyz.sql`) and apply it; never edit prior migrations.

## When to use this vs. when to skip
- **Use** for: schema migrations, sync code, billing flow changes,
  anything that touches persisted state, anything that's hard to undo.
- **Skip** for: pure copy/styling/tweaks that can roll back via Vercel
  one-click. Don't let process kill your iteration speed.
