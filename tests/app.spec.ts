import { test, expect } from '@playwright/test';

test('library page loads with title and import area', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toHaveText('RapidRead');
  await expect(page.getByText('Import a book')).toBeVisible();
});

test('settings page loads and has speed controls', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByText('Settings')).toBeVisible();
  await expect(page.getByText('Base Speed', { exact: true })).toBeVisible();
  await expect(page.getByText('300 WPM')).toBeVisible();
});

test('can change WPM in settings', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByText('300 WPM')).toBeVisible();

  // Click the + button next to the WPM display
  const wpmSection = page.getByText('Base Speed', { exact: true }).locator('..');
  await wpmSection.getByRole('button', { name: '+' }).click();
  await expect(page.getByText('325 WPM')).toBeVisible();
});

test('can navigate to settings and back', async ({ page }) => {
  await page.goto('/');
  await page.getByTitle('Settings').click();
  await expect(page.getByText('Base Speed', { exact: true })).toBeVisible();

  // Go back
  await page.locator('a[href], button').filter({ hasText: /^$/ }).first().click();
  await expect(page.locator('h1')).toHaveText('RapidRead');
});

test('theme buttons are visible in settings', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Light' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sepia' })).toBeVisible();
});

test('known words section is visible', async ({ page }) => {
  await page.goto('/#/settings');
  await expect(page.getByText('Known Words')).toBeVisible();
  await expect(page.getByPlaceholder(/Add a word/)).toBeVisible();
});
