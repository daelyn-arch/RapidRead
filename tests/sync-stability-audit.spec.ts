import { test, expect, type Page } from '@playwright/test';
import { createConfirmedUser, deleteUserById, setUserPlan } from './helpers/supabaseAdmin';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function randomEmail() {
  const r = Math.random().toString(36).slice(2, 8);
  return `stability-${Date.now()}-${r}@rapidread.app`;
}

async function signIn(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 20_000 });
}

async function adminFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  return res;
}

async function countBookmarks(userId: string): Promise<number> {
  const r = await adminFetch(
    `/rest/v1/bookmarks?user_id=eq.${userId}&select=count`,
    { headers: { Prefer: 'count=exact' } },
  );
  const range = r.headers.get('content-range') ?? '';
  // "0-9/42" → 42
  const total = range.split('/')[1];
  return parseInt(total ?? '0', 10);
}

async function countBooks(userId: string): Promise<number> {
  const r = await adminFetch(
    `/rest/v1/books?user_id=eq.${userId}&select=count`,
    { headers: { Prefer: 'count=exact' } },
  );
  const total = (r.headers.get('content-range') ?? '').split('/')[1];
  return parseInt(total ?? '0', 10);
}

async function seedCloudBookmark(userId: string) {
  // Need a books row first so we have a book_id to attach the bookmark to.
  const bookRes = await adminFetch(`/rest/v1/books?select=id`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      user_id: userId,
      client_id: 'stability-book-' + crypto.randomUUID(),
      title: 'Stability Test Book',
      author: 'Test',
      format: 'txt',
      total_words: 100,
      chapter_count: 1,
    }),
  });
  if (!bookRes.ok) {
    throw new Error(`seedBook failed: ${bookRes.status} ${await bookRes.text()}`);
  }
  const [book] = (await bookRes.json()) as { id: string }[];

  const bmRes = await adminFetch(`/rest/v1/bookmarks`, {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: userId,
      book_id: book.id,
      client_id: crypto.randomUUID(),
      chapter_index: 0,
      word_index: 5,
      label: 'seed',
    }),
  });
  if (!bmRes.ok) {
    throw new Error(`seedBookmark failed: ${bmRes.status} ${await bmRes.text()}`);
  }
}

test.describe('Sync stability — counts must not drift across sessions', () => {

  test('book deletion syncs to cloud', async ({ page }) => {
    test.setTimeout(120_000);
    const email = randomEmail();
    const password = 'StabilityT1!';
    const user = await createConfirmedUser(email, password);
    await setUserPlan(user.id, 'pro');

    try {
      // Seed a book directly in cloud + sign in. After sync, it lives in
      // the local store. Then delete from UI and verify cloud deletes.
      await seedCloudBookmark(user.id); // also creates a books row
      expect(await countBooks(user.id)).toBe(1);

      await signIn(page, email, password);
      await page.waitForTimeout(5000);

      // Delete via the Settings → Manage library UI.
      await page.goto('/app/settings');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Delete', exact: true }).first().click();
      await page.getByRole('button', { name: 'Confirm delete', exact: true }).click();
      // Allow syncQueue to flush.
      await page.waitForTimeout(4000);

      const remaining = await countBooks(user.id);
      expect(remaining, 'cloud books after UI delete').toBe(0);
    } finally {
      await deleteUserById(user.id);
    }
  });

  test('bookmark count stays constant across 3 sign-in cycles', async ({ page, context }) => {
    test.setTimeout(120_000);
    const email = randomEmail();
    const password = 'StabilityT1!';
    const user = await createConfirmedUser(email, password);
    await setUserPlan(user.id, 'pro');

    try {
      // Pre-populate cloud with 1 book + 1 bookmark — this is what the
      // v0.5.5 doubling bug needed to start its loop.
      await seedCloudBookmark(user.id);
      const baselineBookmarks = await countBookmarks(user.id);
      const baselineBooks = await countBooks(user.id);
      expect(baselineBookmarks).toBe(1);

      // Cycle 3 times: sign in → wait for sync → sign out (clear context).
      for (let cycle = 1; cycle <= 3; cycle++) {
        await signIn(page, email, password);
        // Wait for cloud-sync's fire-and-forget initial merge + outbound debounce.
        await page.waitForTimeout(6000);
        // Clear all browser state to simulate signing in on another device.
        await context.clearCookies();
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
          return new Promise((resolve) => {
            // Best-effort IndexedDB wipe (RapidRead uses idb-keyval-style stores)
            indexedDB.databases?.().then((dbs) => {
              for (const db of dbs ?? []) if (db.name) indexedDB.deleteDatabase(db.name);
              resolve(null);
            }).catch(() => resolve(null));
          });
        });

        const bmCount = await countBookmarks(user.id);
        const bookCount = await countBooks(user.id);
        // The doubling bug would have produced 2, 4, 8 here.
        expect(bmCount, `bookmark count after cycle ${cycle}`).toBe(baselineBookmarks);
        expect(bookCount, `book count after cycle ${cycle}`).toBe(baselineBooks);
      }
    } finally {
      await deleteUserById(user.id);
    }
  });
});
