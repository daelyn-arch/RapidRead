/**
 * Tiny Supabase admin helper for Playwright tests.
 *
 * Uses the service_role key to pre-confirm test users so we can exercise
 * the full authenticated flow without needing a real inbox. The key must
 * be in .env.local as SUPABASE_SERVICE_ROLE_KEY and SUPABASE_URL — same
 * vars the Vercel serverless functions use.
 *
 * These helpers talk to the GoTrue admin REST API directly so we don't
 * need to pull the supabase-js client into the test harness.
 */

const URL_ENV = process.env.SUPABASE_URL;
const KEY_ENV = process.env.SUPABASE_SERVICE_ROLE_KEY;

function requireEnv() {
  if (!URL_ENV || !KEY_ENV) {
    throw new Error(
      'Playwright audit: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set ' +
      '(loaded from .env.local via dotenv in playwright.audit.config.ts).'
    );
  }
  return { url: URL_ENV, key: KEY_ENV };
}

function adminHeaders(key: string) {
  return {
    'Content-Type': 'application/json',
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

/**
 * Create a fresh user that is already email-confirmed so they can sign in
 * immediately via the UI. Idempotent-ish: errors if the email already exists.
 */
export async function createConfirmedUser(email: string, password: string) {
  const { url, key } = requireEnv();
  const res = await fetch(`${url}/auth/v1/admin/users`, {
    method: 'POST',
    headers: adminHeaders(key),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`createConfirmedUser failed (${res.status}): ${body}`);
  }
  return res.json() as Promise<{ id: string; email: string }>;
}

/**
 * Flip a user's profile.plan to 'pro' so cloud-sync activates in tests.
 * Uses PostgREST with the service_role key (bypasses RLS).
 */
export async function setUserPlan(userId: string, plan: 'free' | 'pro') {
  const { url, key } = requireEnv();
  const res = await fetch(`${url}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { ...adminHeaders(key), Prefer: 'return=minimal' },
    body: JSON.stringify({ plan, plan_status: plan === 'pro' ? 'active' : null }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`setUserPlan failed (${res.status}): ${body}`);
  }
}

/**
 * Remove a user by id so tests don't leave detritus in auth.users and
 * cascade-drop their profiles / books / progress rows.
 */
export async function deleteUserById(userId: string) {
  const { url, key } = requireEnv();
  const res = await fetch(`${url}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: adminHeaders(key),
  });
  if (!res.ok && res.status !== 404) {
    const body = await res.text();
    // eslint-disable-next-line no-console
    console.warn(`deleteUserById(${userId}) returned ${res.status}: ${body}`);
  }
}
