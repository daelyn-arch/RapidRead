import { test, expect } from '@playwright/test';

test('screenshot RSVP display to verify no cursor', async ({ page }) => {
  await page.goto('/');

  const textContent = 'The quick brown fox jumps over the lazy dog and shoulder today.';
  const buffer = Buffer.from(textContent, 'utf-8');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'cursor-test.txt',
    mimeType: 'text/plain',
    buffer,
  });

  await page.waitForURL(/\/read\//);

  // Take screenshot of initial state
  await page.screenshot({ path: 'test-results/rsvp-before-play.png' });

  // Play and wait for a word
  await page.getByTitle('Play (Space)').click();
  await page.waitForTimeout(800);
  await page.keyboard.press('Space'); // pause

  // Take screenshot while paused on a word
  await page.screenshot({ path: 'test-results/rsvp-paused-word.png' });

  // Verify no element has cursor:text
  const displayArea = page.locator('.select-none.cursor-default');
  await expect(displayArea).toBeVisible();

  // Check all elements inside the display for cursor style
  const cursors = await displayArea.evaluate(el => {
    const allElements = el.querySelectorAll('*');
    const results: string[] = [];
    allElements.forEach(child => {
      const cursor = getComputedStyle(child).cursor;
      if (cursor === 'text') results.push(`${child.tagName}.${child.className}: cursor=${cursor}`);
    });
    return results;
  });

  expect(cursors).toEqual([]);
});
