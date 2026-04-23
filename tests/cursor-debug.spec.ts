import { test, expect } from '@playwright/test';

test('no cursor or caret visible on RSVP display after clicking', async ({ page }) => {
  await page.goto('/');

  // Use dialogue text so we get blue colored words (like the user's screenshot)
  const textContent = '"She would ravish the entire kingdom," he said quietly.';
  const buffer = Buffer.from(textContent, 'utf-8');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'caret-test.txt',
    mimeType: 'text/plain',
    buffer,
  });

  await page.waitForURL(/\/read\//);

  // Play, advance a few words, then pause
  await page.getByTitle('Play (Space)').click();
  await page.waitForTimeout(1500);
  await page.keyboard.press('Space');

  // Click directly on the word display area to trigger any caret
  const display = page.locator('.select-none.cursor-default').first();
  await display.click();
  await page.waitForTimeout(200);

  // Screenshot after clicking
  await page.screenshot({ path: 'test-results/rsvp-after-click.png' });

  // Verify caret-color is transparent on the display
  const caretColor = await display.evaluate(el => getComputedStyle(el).caretColor);
  expect(caretColor).toBe('rgba(0, 0, 0, 0)');
});
