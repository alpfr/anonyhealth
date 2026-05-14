import { test, expect } from '@playwright/test';

/**
 * Sign-in role selector — patient vs provider audience split.
 *
 * The `/signin` and `/signup` routes show a segmented control at the top of
 * the form. Toggling it must:
 *   • Change the helper copy below the form
 *   • Show/hide the role-specific footer link
 *   • Persist the choice in sessionStorage so refreshes preserve it
 */
test.describe('Sign-in role selector', () => {
  // Force /signin directly so the auto-anonymize bootstrap doesn't redirect us.
  test.beforeEach(async ({ page }) => {
    await page.goto('/signin');
  });

  test('defaults to patient role with patient-specific copy', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /i'?m a patient/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /i'?m a provider/i })).toBeVisible();

    // Patient is selected by default.
    await expect(page.getByRole('tab', { name: /i'?m a patient/i }))
      .toHaveAttribute('aria-selected', 'true');

    // Patient-specific helper copy.
    await expect(page.getByText(/saved triage history/i)).toBeVisible();

    // Patient-specific footer link.
    await expect(page.getByText(/continue anonymously/i)).toBeVisible();
  });

  test('switching to provider changes copy and footer link', async ({ page }) => {
    await page.getByRole('tab', { name: /i'?m a provider/i }).click();

    await expect(page.getByRole('tab', { name: /i'?m a provider/i }))
      .toHaveAttribute('aria-selected', 'true');

    // Provider-specific helper copy.
    await expect(page.getByText(/provider dashboard/i)).toBeVisible();

    // Provider-specific footer link.
    await expect(page.getByText(/what is anonyhealth for providers/i)).toBeVisible();

    // The patient-only "Continue anonymously" footer should be gone.
    await expect(page.getByText(/continue anonymously/i)).toHaveCount(0);
  });

  test('role persists across page reload via sessionStorage', async ({ page }) => {
    // Select provider, reload, verify it sticks.
    await page.getByRole('tab', { name: /i'?m a provider/i }).click();
    await expect(page.getByText(/provider dashboard/i)).toBeVisible();

    await page.reload();

    await expect(page.getByRole('tab', { name: /i'?m a provider/i }))
      .toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText(/provider dashboard/i)).toBeVisible();
  });

  test('signup tab shows role-aware heading and copy', async ({ page }) => {
    // Default (patient) → sign up
    await page.getByRole('button', { name: /^sign up$/i }).click();
    // Patient signup helper copy contains "Patients normally join through
    // an invite link..." — match a stable substring.
    await expect(page.getByText(/patients normally join/i)).toBeVisible();

    // Switch to provider — heading and copy change to Healthcare providers.
    await page.getByRole('tab', { name: /i'?m a provider/i }).click();
    await expect(page.getByText(/healthcare providers/i)).toBeVisible();
  });
});
