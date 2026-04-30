import { defineConfig } from '@playwright/test';
import dotenv from 'dotenv';

// Load .env.local so the audit can use SUPABASE_SERVICE_ROLE_KEY to
// pre-confirm test users without needing a real inbox.
dotenv.config({ path: '.env.local' });

/**
 * Separate config for the production audit. Targets the live Vercel URL, no
 * local webserver, takes screenshots of every screen and verifies key flows.
 *
 * Run: npx playwright test --config=playwright.audit.config.ts
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /(audit|features)\.spec\.ts$/,
  timeout: 60000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.AUDIT_URL ?? 'https://rapidreading.app',
    headless: true,
    viewport: { width: 1280, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
