import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';
import { createConfirmedUser, deleteUserById, setUserPlan } from './helpers/supabaseAdmin';

interface CapturedError {
  kind: 'console' | 'pageerror' | 'requestfailed';
  text: string;
}

function attachLoggers(page: Page): CapturedError[] {
  const errors: CapturedError[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push({ kind: 'console', text: `[${msg.type()}] ${msg.text()}` });
    }
  });
  page.on('pageerror', (err) => {
    errors.push({ kind: 'pageerror', text: `${err.name}: ${err.message}\n${err.stack ?? ''}` });
  });
  page.on('requestfailed', (req) => {
    errors.push({
      kind: 'requestfailed',
      text: `${req.method()} ${req.url()} — ${req.failure()?.errorText ?? '?'}`,
    });
  });
  return errors;
}

function dump(label: string, errors: CapturedError[]) {
  if (errors.length === 0) {
    console.log(`\n=== ${label}: clean ===`);
    return;
  }
  console.log(`\n=== ${label}: ${errors.length} issue(s) ===`);
  for (const e of errors) {
    console.log(`[${e.kind}] ${e.text}`);
  }
}

function randomEmail() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `debug-${Date.now()}-${rand}@rapidread.app`;
}

test.describe('v0.5.6 debug', () => {

  test('landing page loads cleanly', async ({ page }) => {
    const errs = attachLoggers(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    dump('landing', errs);
    // Only fail the test on hard errors (pageerror), not warnings
    const hard = errs.filter((e) => e.kind === 'pageerror');
    expect(hard, hard.map((e) => e.text).join('\n\n')).toEqual([]);
  });

  test('Pro signed-in /app loads cleanly + sync calls succeed', async ({ page }) => {
    const errs = attachLoggers(page);
    const email = randomEmail();
    const password = 'DebugTest1!RR';
    const user = await createConfirmedUser(email, password);
    await setUserPlan(user.id, 'pro');

    try {
      // capture all responses to /rest/v1/* so we can spot 4xx/5xx from
      // sync calls (settings, books, progress, bookmarks).
      const restResponses: { status: number; url: string }[] = [];
      page.on('response', (res) => {
        const url = res.url();
        if (url.includes('/rest/v1/') || url.includes('/storage/v1/')) {
          restResponses.push({ status: res.status(), url });
        }
      });

      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 20_000 });
      // Settle: cloud sync fires fire-and-forget; give it 5s.
      await page.waitForTimeout(5000);

      // Visit settings to trigger a settings change → outbound push.
      await page.goto('/app/settings');
      await page.waitForLoadState('networkidle');
      // Toggle theme to force a settings change
      const lightBtn = page.getByRole('button', { name: 'Light' });
      if (await lightBtn.count()) await lightBtn.click();
      await page.waitForTimeout(4000); // wait for 2.5s debounce + push

      console.log('\n=== Supabase REST calls ===');
      const failing = restResponses.filter((r) => r.status >= 400);
      for (const r of restResponses) {
        const tag = r.status >= 400 ? '!!' : 'ok';
        console.log(`  ${tag} ${r.status} ${r.url}`);
      }
      dump('signed-in /app + settings change', errs);

      const hard = errs.filter((e) => e.kind === 'pageerror');
      expect(hard, hard.map((e) => e.text).join('\n\n')).toEqual([]);
      expect(
        failing,
        `Failing Supabase calls:\n${failing.map((r) => `${r.status} ${r.url}`).join('\n')}`,
      ).toEqual([]);
    } finally {
      await deleteUserById(user.id);
    }
  });
});
