// @ts-check
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for AnonyHealth smoke tests.
 *
 * - Tests run against the Vite preview server (built artifact, not dev).
 *   This catches build-time issues that `vite dev` would hide.
 * - In CI we run headlessly; locally `npm run test:headed` opens browsers.
 * - Each test is responsible for any sign-out / cleanup it needs.
 *   Anonymous sessions are ephemeral, so we don't bother tearing them down.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : 'html',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport — most of the app's UI is sized for mobile.
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 13'] },
    },
  ],
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
