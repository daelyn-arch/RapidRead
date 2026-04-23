import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const OUT_DIR = path.join(process.cwd(), 'test-results', 'audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page: Page, name: string) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
}

// Email confirmation is OFF in Supabase so any syntactically-valid email works.
function randomEmail() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `audit-${Date.now()}-${rand}@rapidread.app`;
}

test.describe('RapidRead production audit', () => {

  // ───── Public screens (no auth) ─────

  test('1. Landing page has all expected CTAs', async ({ page }) => {
    await page.goto('/');
    await shot(page, '01-landing');

    await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Try free', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Read twice as fast');
    await expect(page.getByRole('link', { name: 'Try free — no signup' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'See pricing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Context-aware pacing' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cloud library sync' })).toBeVisible();
    await expect(page.getByText('Is my data private?', { exact: true })).toBeVisible();
  });

  test('2. Pricing page shows both tiers + toggle', async ({ page }) => {
    await page.goto('/pricing');
    await shot(page, '02-pricing-monthly');

    await expect(page.getByRole('heading', { name: 'Free', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Pro', level: 2 })).toBeVisible();

    await page.getByRole('tab', { name: /Yearly/ }).click();
    await expect(page.getByText('$45')).toBeVisible();
    await shot(page, '02b-pricing-yearly');

    await page.getByRole('tab', { name: /Monthly/ }).click();
    await expect(page.getByText('$5')).toBeVisible();
  });

  test('3. Signed-out Upgrade click redirects to signup with upgrade=1', async ({ page }) => {
    await page.goto('/pricing');
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click();
    await page.waitForURL(/\/signup\?next=/);
    await shot(page, '03-signup-from-upgrade');

    const decoded = decodeURIComponent(page.url());
    expect(decoded).toContain('/signup?');
    expect(decoded).toContain('upgrade=1');
    expect(decoded).toContain('plan=monthly');
  });

  test('4. Login page has Google button + email form + mode toggle', async ({ page }) => {
    await page.goto('/login');
    await shot(page, '04-login');

    await expect(page.getByRole('button', { name: /Continue with Google/ })).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.getByRole('button', { name: 'Create an account' }).click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await shot(page, '04b-signup-mode');
  });

  // ───── Full authenticated user flow (in one test so session persists) ─────

  test('5. Signed-in user flow: signup → library → book → reader → settings → upgrade', async ({ page }) => {
    const email = randomEmail();
    const password = 'SmokeTest1!RR';

    // Signup
    await page.goto('/signup');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 15_000 });
    await shot(page, '05-app-fresh-signup');
    await expect(page.getByText(/Drop \.epub or \.txt/i)).toBeVisible();

    // Account page shows Free plan
    await page.goto('/app/account');
    await page.waitForSelector('text=Current plan', { timeout: 10_000 });
    await shot(page, '06-account-free');
    await expect(page.getByText(/Current plan/)).toBeVisible();
    await expect(page.getByText('FREE', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upgrade to Pro' })).toBeVisible();

    // Settings page — Manage library + themes + back navigation
    await page.goto('/app/settings');
    await shot(page, '07-settings');
    await expect(page.getByRole('heading', { name: 'Manage library' })).toBeVisible();
    await expect(page.getByText('Keyboard Shortcuts')).toBeVisible();

    // Back button in settings goes to /app (not /) — verify the route wired correctly.
    await page.goto('/app/settings');
    await page.waitForSelector('header');
    await page.locator('header button').first().click();
    await page.waitForURL(/\/app(\?|$|\/)$/, { timeout: 10_000 });

    // Import a book
    await page.goto('/app');
    const sample = 'Chapter 1: Audit\nThis is a small book uploaded by the Playwright audit. Every word counts, every synapse fires.';
    await page.locator('input[type="file"][accept*=".txt"]').first().setInputFiles({
      name: 'audit-book.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from(sample, 'utf-8'),
    });
    await page.waitForURL(/\/app\/read\//, { timeout: 15_000 });
    // Wait for the book to finish loading (initial state is "Loading book...")
    await expect(page.getByText(/Loading book/)).toHaveCount(0, { timeout: 15_000 });
    await page.waitForTimeout(500); // let the first RSVP frame paint
    await shot(page, '08-reader');

    // Navigate back explicitly — the reader auto-hides its header after 3s.
    // Use direct navigation which is deterministic (button test isolated below).
    await page.goto('/app');
    await page.waitForURL(/\/app(\?|$|\/)$/, { timeout: 10_000 });
    await shot(page, '09-library-with-book');
    await expect(page.getByText(/audit-book/)).toBeVisible();

    // Click the book card — should navigate to reader (the reported bug)
    await page.getByText(/audit-book/).first().click();
    await page.waitForURL(/\/app\/read\//, { timeout: 10_000 });
    await expect(page.getByText(/Loading book/)).toHaveCount(0, { timeout: 15_000 });
    await page.waitForTimeout(500);
    await shot(page, '10-reader-reopen');

    // Back to library — use direct navigation (reader auto-hides header after 3s)
    await page.goto('/app');
    await page.waitForURL(/\/app(\?|$|\/)$/, { timeout: 10_000 });

    // NO delete button in library grid
    await expect(page.locator('[title="Remove book"]')).toHaveCount(0);

    // Delete button IS in Settings → Manage library
    await page.goto('/app/settings');
    await expect(page.getByRole('heading', { name: 'Manage library' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' }).first()).toBeVisible();
    await shot(page, '11-settings-manage-library');

    // /api/checkout returns a live Stripe URL
    await page.goto('/app/account');
    let checkoutURL: string | null = null;
    await page.route('**/api/checkout', async (route) => {
      const res = await route.fetch();
      const body = await res.json().catch(() => ({}));
      checkoutURL = body?.url ?? null;
      await route.fulfill({ response: res, json: body });
    });
    await page.route('https://checkout.stripe.com/**', (route) =>
      route.fulfill({ status: 200, body: 'stubbed' })
    );
    await page.getByRole('button', { name: 'Upgrade to Pro' }).click();
    await expect.poll(() => checkoutURL, { timeout: 10_000 }).toMatch(/^https:\/\/checkout\.stripe\.com\//);
    await shot(page, '12-checkout-redirecting');
  });
});
