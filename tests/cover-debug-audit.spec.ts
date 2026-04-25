import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createConfirmedUser, deleteUserById, setUserPlan } from './helpers/supabaseAdmin';

const OUT_DIR = path.join(process.cwd(), 'test-results', 'cover-debug');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

function attachConsole(page: Page): string[] {
  const lines: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    lines.push(`[${m.type()}] ${m.text()}`);
  });
  page.on('pageerror', (e) => {
    lines.push(`[pageerror] ${e.message}\n${e.stack ?? ''}`);
  });
  return lines;
}

function randomEmail() {
  const r = Math.random().toString(36).slice(2, 8);
  return `cover-${Date.now()}-${r}@rapidread.app`;
}

test.describe('Six of Crows cover extraction debug', () => {

  test('import the user-supplied EPUB and verify cover survives', async ({ page }) => {
    test.setTimeout(180_000);
    const epubPath = path.resolve(process.cwd(), '..', 'Six of Crows.epub');
    test.skip(!fs.existsSync(epubPath), `Place "Six of Crows.epub" at ${epubPath} to run this debug spec`);

    const console_ = attachConsole(page);

    const email = randomEmail();
    const password = 'CoverTest1!RR';
    const user = await createConfirmedUser(email, password);
    await setUserPlan(user.id, 'pro');

    try {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 20_000 });
      await shot(page, '01-library-empty');

      // Find file input — ImportButton uses a hidden <input type="file">
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(epubPath);

      // Wait for the import to finish — either we navigate to /app/read/...
      // or an error banner appears.
      await page.waitForURL(/\/app\/read\//, { timeout: 60_000 });
      await page.waitForLoadState('networkidle');
      await shot(page, '02-after-import-reader');

      // Go back to library to inspect the card
      await page.goto('/app');
      await page.waitForLoadState('networkidle');
      await shot(page, '03-library-with-book');

      // Inspect the local Zustand state for the imported book
      const meta = await page.evaluate(() => {
        try {
          const raw = localStorage.getItem('rapidread-library');
          if (!raw) return { error: 'no rapidread-library in localStorage' };
          const parsed = JSON.parse(raw);
          const books = parsed?.state?.books ?? [];
          return books.map((b: any) => ({
            id: b.id,
            title: b.title,
            coverUrlPresent: !!b.coverUrl,
            coverUrlPrefix: b.coverUrl ? b.coverUrl.slice(0, 40) : null,
            coverUrlLength: b.coverUrl ? b.coverUrl.length : 0,
          }));
        } catch (e) {
          return { error: String(e) };
        }
      });
      console.log('\n=== LOCAL BOOK META ===');
      console.log(JSON.stringify(meta, null, 2));

      // Wait a bit for outbound sync to push the cover, then query cloud
      await page.waitForTimeout(5000);
      const cloudRows = await page.evaluate(async () => {
        const sb = (window as any).__rrSupabase;
        if (!sb) return { error: 'window.__rrSupabase not exposed' };
        const { data, error } = await sb.from('books').select('client_id,title,cover_url');
        if (error) return { error: error.message };
        return data?.map((b: any) => ({
          title: b.title,
          coverUrlLen: b.cover_url ? b.cover_url.length : 0,
        }));
      });
      console.log('\n=== CLOUD BOOK META (via window.__rrSupabase, may be missing) ===');
      console.log(JSON.stringify(cloudRows, null, 2));

      console.log('\n=== CONSOLE OUTPUT ===');
      for (const l of console_) console.log(l);
    } finally {
      await deleteUserById(user.id);
    }
  });
});
