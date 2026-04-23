-- Adds rate-limit tracking columns to profiles.
-- Only the service role (serverless functions) writes these. Clients can read
-- their own via the existing "profile self read" policy.

alter table public.profiles
  add column if not exists last_checkout_at timestamptz,
  add column if not exists last_portal_at timestamptz;
