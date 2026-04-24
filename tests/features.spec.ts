import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';
import { createConfirmedUser, deleteUserById } from './helpers/supabaseAdmin';

const OUT_DIR = path.join(process.cwd(), 'test-results', 'audit');
fs.mkdirSync(OUT_DIR, { recursive: true });

async function shot(page: Page, name: string) {
  await page.screenshot({ path: path.join(OUT_DIR, `${name}.png`), fullPage: true });
}

function randomEmail() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `features-${Date.now()}-${rand}@rapidread.app`;
}

// A book with real dialogue so karaoke mode has something to render.
const SAMPLE_WITH_DIALOGUE = `Chapter 1: The Test

The auditor walked into the room. He had read these books many times before.

"Is everything in order?" he asked, eyeing the stack of files on the desk.

"Mostly," she replied. "We still have to verify the karaoke mode."

He nodded. The words mattered.`;

test.describe('RapidRead new features (karaoke + word actions + aesthetics)', () => {

  test('Theme + font picker in Settings', async ({ page }) => {
    const email = randomEmail();
    const password = 'SmokeTest1!RR';
    const user = await createConfirmedUser(email, password);

    try {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 15_000 });

      await page.goto('/app/settings');

      // Parchment theme option exists
      const parchmentBtn = page.getByRole('button', { name: 'Parchment' });
      await expect(parchmentBtn).toBeVisible();
      await parchmentBtn.click();
      // The SettingsPage root has a data-theme attribute that reflects the current theme
      await expect(page.locator('[data-theme="parchment"]').first()).toBeVisible();
      await shot(page, 'features-01-parchment-theme');

      // Reading font picker exists with all 6 options
      for (const name of ['System default', 'Georgia', 'Merriweather', 'Literata', 'Inter', 'Atkinson Hyperlegible']) {
        await expect(page.getByText(name, { exact: true })).toBeVisible();
      }

      // Clicking Literata sets body[data-reading-font]
      await page.getByText('Literata', { exact: true }).click();
      const bodyFont = await page.evaluate(() => document.body.dataset.readingFont);
      expect(bodyFont).toBe('literata');
      await shot(page, 'features-02-font-literata');

      // Karaoke dialogue toggle exists and is on by default
      await expect(page.getByText('Karaoke dialogue mode')).toBeVisible();
      const karaokeToggle = page.locator('button[aria-pressed]').first();
      await expect(karaokeToggle).toHaveAttribute('aria-pressed', 'true');
    } finally {
      await deleteUserById(user.id);
    }
  });

  test('Word actions menu opens via right-click in Page View', async ({ page }) => {
    const email = randomEmail();
    const password = 'SmokeTest1!RR';
    const user = await createConfirmedUser(email, password);

    try {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 15_000 });

      // Import a book with dialogue
      await page.locator('input[type="file"][accept*=".txt"]').first().setInputFiles({
        name: 'dialogue-book.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(SAMPLE_WITH_DIALOGUE, 'utf-8'),
      });
      await page.waitForURL(/\/app\/read\//, { timeout: 15_000 });
      await expect(page.getByText(/Loading book/)).toHaveCount(0, { timeout: 15_000 });

      // Switch to Page view
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: /^(Page|RSVP)$/ }).click();

      // Right-click a visible word — use "auditor" which is early in the text
      const word = page.getByText(/^auditor$/).first();
      await word.click({ button: 'right' });

      // Menu appears with all four actions
      const menu = page.locator('[data-testid="word-actions-menu"]');
      await expect(menu).toBeVisible();
      await expect(menu.getByText(/Jump here/)).toBeVisible();
      await expect(menu.getByText(/Bookmark this spot/)).toBeVisible();
      await expect(menu.getByText(/Add note/)).toBeVisible();
      await expect(menu.getByText(/Define/)).toBeVisible();
      await shot(page, 'features-03-word-actions-menu');

      // Escape closes the menu
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
    } finally {
      await deleteUserById(user.id);
    }
  });

  test('Bookmark via menu → appears in Bookmarks panel', async ({ page }) => {
    const email = randomEmail();
    const password = 'SmokeTest1!RR';
    const user = await createConfirmedUser(email, password);

    try {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 15_000 });

      await page.locator('input[type="file"][accept*=".txt"]').first().setInputFiles({
        name: 'bookmark-book.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(SAMPLE_WITH_DIALOGUE, 'utf-8'),
      });
      await page.waitForURL(/\/app\/read\//, { timeout: 15_000 });
      await expect(page.getByText(/Loading book/)).toHaveCount(0, { timeout: 15_000 });
      await page.waitForTimeout(500);

      // Switch to Page view
      await page.getByRole('button', { name: /^(Page|RSVP)$/ }).click();

      // Right-click a word, then click Bookmark
      await page.getByText(/^verify$/).first().click({ button: 'right' });
      await page.getByText(/Bookmark this spot/).click();
      await expect(page.locator('[data-testid="word-actions-menu"]')).toHaveCount(0);

      // Wake reader header controls (they auto-hide after 3s)
      await page.mouse.move(640, 450);
      await page.waitForTimeout(200);
      // Open the Bookmarks panel from header
      await page.getByTitle('Bookmarks').click();
      // Panel header uses a div, not a heading role
      await expect(page.getByText('Bookmarks', { exact: true }).last()).toBeVisible();
      await expect(page.getByText(/verify/).first()).toBeVisible();
      await shot(page, 'features-04-bookmarks-panel');

      // Delete via two-click confirm flow
      await page.getByRole('button', { name: 'Delete bookmark' }).click();
      await page.getByRole('button', { name: 'Confirm delete bookmark' }).click();
      await expect(page.getByText(/No bookmarks yet/)).toBeVisible();
    } finally {
      await deleteUserById(user.id);
    }
  });

  test('Karaoke dialogue renders when current token is inside a dialogue block', async ({ page }) => {
    const email = randomEmail();
    const password = 'SmokeTest1!RR';
    const user = await createConfirmedUser(email, password);

    try {
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.waitForURL(/\/app(\?|$|\/)/, { timeout: 15_000 });

      await page.locator('input[type="file"][accept*=".txt"]').first().setInputFiles({
        name: 'karaoke-book.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from(SAMPLE_WITH_DIALOGUE, 'utf-8'),
      });
      await page.waitForURL(/\/app\/read\//, { timeout: 15_000 });
      await expect(page.getByText(/Loading book/)).toHaveCount(0, { timeout: 15_000 });
      await page.waitForTimeout(500);

      // Read the first dialogue block's start index from the exposed reader store
      // and seek the playback controller to it via a small script bridge.
      const dialogueStart = await page.evaluate(() => {
        const store = (window as unknown as { __rapidread?: { readerStore: { getState: () => { dialogueBlocks: { startIndex: number }[] } } } }).__rapidread?.readerStore;
        if (!store) return null;
        const blocks = store.getState().dialogueBlocks;
        return blocks.length > 0 ? blocks[0].startIndex : null;
      });
      expect(dialogueStart).not.toBeNull();

      // Progress bar is the seek affordance exposed to the UI — click into it
      // at the percentage corresponding to the dialogue start.
      const dialogueIndex = dialogueStart as number;
      const totalTokens = await page.evaluate(() => {
        const store = (window as unknown as { __rapidread?: { readerStore: { getState: () => { tokens: unknown[] } } } }).__rapidread?.readerStore;
        return store?.getState().tokens.length ?? 0;
      });

      // Wake reader header controls (auto-hide after 3s)
      await page.mouse.move(640, 450);
      await page.waitForTimeout(200);

      const progressBar = page.locator('.w-full.h-2.rounded-full').first();
      await progressBar.waitFor({ state: 'visible' });
      const box = await progressBar.boundingBox();
      if (!box) throw new Error('progress bar not visible');
      const targetPct = (dialogueIndex + 1) / totalTokens;
      await page.mouse.click(box.x + box.width * targetPct, box.y + box.height / 2);

      await expect(page.locator('[data-testid="dialogue-karaoke"]')).toBeVisible({ timeout: 5000 });
      await shot(page, 'features-05-karaoke-dialogue');
    } finally {
      await deleteUserById(user.id);
    }
  });
});
