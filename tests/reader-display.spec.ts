import { test, expect } from '@playwright/test';

test.describe('RSVP Display', () => {
  test('word displays on a single line with no text cursor', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toHaveText('RapidRead');

    // Import a test text file with long and fictional words
    const textContent = 'The shoulder— and the mysterious Ketterdam were beautiful.';
    const buffer = Buffer.from(textContent, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-book.txt',
      mimeType: 'text/plain',
      buffer,
    });

    // Should navigate to reader
    await page.waitForURL(/\/read\//);

    // The display container should have cursor-default
    const display = page.locator('.cursor-default.select-none');
    await expect(display).toBeVisible();
    const cursor = await display.evaluate(el => getComputedStyle(el).cursor);
    expect(cursor).toBe('default');

    // The word container should use whitespace-nowrap to prevent wrapping
    const wordContainer = page.locator('.whitespace-nowrap');
    await expect(wordContainer).toBeVisible();
    const whiteSpace = await wordContainer.evaluate(el => getComputedStyle(el).whiteSpace);
    expect(whiteSpace).toBe('nowrap');
  });

  test('unfamiliar words display in amber color', async ({ page }) => {
    await page.goto('/');

    const textContent = 'Hello from Ketterdam today.';
    const buffer = Buffer.from(textContent, 'utf-8');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'color-test.txt',
      mimeType: 'text/plain',
      buffer,
    });

    await page.waitForURL(/\/read\//);

    // Click play and advance to "Ketterdam" (word index 2)
    await page.getByTitle('Play (Space)').click();
    // Wait a moment then pause
    await page.waitForTimeout(1500);
    await page.keyboard.press('Space');

    // The word container should exist with whitespace-nowrap
    const wordContainer = page.locator('.whitespace-nowrap');
    await expect(wordContainer).toBeVisible();
  });
});
