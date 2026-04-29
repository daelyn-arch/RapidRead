import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * Confirms the production signup flow no longer 500s on email send.
 *
 * Hardened cleanup:
 *  - Captures the EXACT user.id from the signup response body
 *  - Only deletes by that captured id (or skips cleanup if undefined)
 *  - Never falls back to a probe / email-filter / first-row trick — a
 *    similar approach previously deleted the production owner's account
 */

const ADMIN_URL = process.env.SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function logChannel(page: Page) {
  const lines: string[] = [];
  page.on('console', (m: ConsoleMessage) => {
    if (m.type() === 'error') lines.push(`[error] ${m.text()}`);
  });
  page.on('pageerror', (e) => lines.push(`[pageerror] ${e.message}`));
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('/auth/v1/signup') && res.status() >= 400) {
      let body = '';
      try { body = await res.text(); } catch {}
      lines.push(`[signup ${res.status()}] ${body.slice(0, 300)}`);
    }
  });
  return lines;
}

async function deleteUserByExactId(id: string | undefined) {
  if (!id || id.length < 32) return; // sanity guard
  await fetch(`${ADMIN_URL}/auth/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
}

test('production signup no longer 500s on email send', async ({ page }) => {
  test.setTimeout(60_000);
  const email = `smtp-check-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  const password = 'SmtpCheck1!RR';
  const lines = logChannel(page);
  let capturedUserId: string | undefined;

  // Capture the signup response body to extract the user id.
  page.on('response', async (res) => {
    if (!res.url().includes('/auth/v1/signup')) return;
    if (res.status() >= 400) return;
    try {
      const body = await res.json();
      // body.user.id when signup succeeds; may be missing for already-exists case
      if (body?.user?.id && typeof body.user.id === 'string' && body.user.id.length >= 32) {
        capturedUserId = body.user.id;
      }
    } catch { /* non-JSON, ignore */ }
  });

  try {
    await page.goto('/signup');
    await page.locator('input[type="email"]').fill(email);
    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.first().fill(password);
    if (await pwInputs.count() > 1) await pwInputs.nth(1).fill(password);

    await page.getByRole('button', { name: /sign up|create|register/i }).click();
    await page.waitForTimeout(5000);

    const visibleText = (await page.locator('main, body').first().innerText()).slice(0, 1000);
    console.log('\n=== visible text after submit ===');
    console.log(visibleText);
    console.log('\n=== captured signup events ===');
    if (lines.length === 0) console.log('(none)');
    for (const l of lines) console.log(l);
    console.log('\ncapturedUserId =', capturedUserId ?? '(not captured)');

    // Hard fail if any 500 came back from /auth/v1/signup
    const fiveHundreds = lines.filter((l) => l.startsWith('[signup 5'));
    expect(
      fiveHundreds,
      `signup endpoint returned 5xx:\n${fiveHundreds.join('\n')}`,
    ).toEqual([]);

    // Soft check: the page shouldn't show the SMTP error string anymore
    expect(visibleText).not.toContain('Error sending confirmation email');
  } finally {
    await deleteUserByExactId(capturedUserId);
  }
});
