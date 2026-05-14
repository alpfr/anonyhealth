import { test, expect } from '@playwright/test';

/**
 * Anonymous bootstrap — the core privacy-first guarantee.
 *
 * These tests are currently SKIPPED in CI because the Supabase anonymous
 * sign-in flow can't be reliably mocked at the network layer (the JS client
 * uses localStorage keys derived from the project URL, multiple auth
 * endpoints, and internal session detection that's hard to stub
 * deterministically).
 *
 * Coverage for this flow is currently provided by:
 *   • Manual smoke test on every deploy (production URL)
 *   • The production verify-deployment.sh script
 *
 * TODO: Re-enable these by either
 *   (a) Building a Playwright fixture that boots a fresh anonymous session
 *       against a dedicated test Supabase project (cleanest, most work)
 *   (b) Adding a `?testMode=anonymous` query param the app honors in
 *       non-production builds that injects a fake session (medium work)
 *   (c) Switching to mocking the @supabase/supabase-js module at the
 *       build level for test builds (simplest, requires build config change)
 */
test.describe.skip('Anonymous bootstrap', () => {
  test('lands on patient dashboard with anonymous badge', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('AnonyHealth').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/you'?re anonymous/i)).toBeVisible({ timeout: 10_000 });
  });

  test('profile menu reveals anonymous-tier actions', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/you'?re anonymous/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: /anonymous/i }).first().click();
    await expect(page.getByText(/save my session/i)).toBeVisible();
    await expect(page.getByText(/start fresh/i)).toBeVisible();
  });

  test('save my session navigates to signup', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/you'?re anonymous/i)).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page).toHaveURL(/\/signup/);
  });
});
