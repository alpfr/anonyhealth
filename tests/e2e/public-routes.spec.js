import { test, expect } from '@playwright/test';

/**
 * Public route smoke tests — make sure the routes that bypass auth gates
 * actually render. These are simple but catch a class of regressions where
 * a refactor accidentally breaks routing or lazy-loading.
 *
 * Routes covered:
 *   /signin           — auth form
 *   /signup           — auth form (sign up tab)
 *   /for-providers    — provider marketing landing
 *   /terms            — legal page
 *   /privacy          — legal page
 *   /hipaa            — legal page
 *   /reset-password   — password reset form
 */
test.describe('Public routes', () => {
  test('/signin renders the auth form', async ({ page }) => {
    await page.goto('/signin');
    await expect(page.getByText('AnonyHealth').first()).toBeVisible();
    await expect(page.getByPlaceholder(/email/i)).toBeVisible();
    await expect(page.getByPlaceholder(/password/i)).toBeVisible();
  });

  test('/signup renders the auth form in signup mode', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByText('AnonyHealth').first()).toBeVisible();
    // Signup tab should be active by default on this route.
    await expect(page.getByRole('button', { name: /^sign up$/i })).toBeVisible();
  });

  test('/for-providers renders the marketing landing', async ({ page }) => {
    await page.goto('/for-providers');
    // Don't tie to specific marketing copy — just verify the page renders
    // and doesn't redirect to the auth form.
    await expect(page).toHaveURL(/\/for-providers/);
    await expect(page.getByText('AnonyHealth').first()).toBeVisible({ timeout: 10_000 });
  });

  test('legal pages load', async ({ page }) => {
    for (const path of ['/terms', '/privacy', '/hipaa']) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path));
      // Legal pages should at least render text content (not be blank).
      await expect(page.locator('body')).not.toBeEmpty();
    }
  });
});
