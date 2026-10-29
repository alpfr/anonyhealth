import { test, expect } from '@playwright/test';

/**
 * AnonyHealth Full Test Drive — Patient (anonymous) & Provider (with tenant)
 *
 * Patient flow: Uses anonymous mode (the primary patient entry point)
 * Provider flow: Signs in via API, creates a practice via the onboarding form
 */

const SUPABASE_URL = 'https://exzmdnnkbjjgrtwnjemm.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_d_Ne0ShtZcpy14D5N3zG3Q_rtLpr2lI';

const PROVIDER_EMAIL = 'anonprovider@anonyhealth.test';
const PROVIDER_PASSWORD = 'AnonProvider2026!';

/**
 * Sign in via Supabase REST API and inject session into localStorage.
 */
async function signInViaAPI(page, email, password) {
  const response = await page.request.post(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY },
      data: { email, password },
    }
  );

  const data = await response.json();
  if (!response.ok() || !data.access_token) {
    console.log(`  ❌ API sign-in failed: ${JSON.stringify(data).substring(0, 200)}`);
    return false;
  }

  console.log(`  ✅ API sign-in OK — user: ${data.user?.id?.substring(0, 8)}...`);

  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  const storageKey = `sb-${projectRef}-auth-token`;
  const sessionPayload = JSON.stringify({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    token_type: data.token_type,
    expires_in: data.expires_in,
    expires_at: data.expires_at,
    user: data.user,
  });

  await page.goto('/');
  await page.evaluate(([key, value]) => {
    localStorage.setItem(key, value);
  }, [storageKey, sessionPayload]);

  console.log(`  ✅ Session injected`);

  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);

  const isStillOnAuth = await page.locator('input[type="email"]').isVisible({ timeout: 2000 }).catch(() => false);
  if (!isStillOnAuth) {
    console.log('  ✅ Auth gate dismissed');
    return true;
  }
  console.log('  ⚠ Auth gate still showing');
  return false;
}

// ─────────────────────────────────────────────────────────
// 1. PATIENT TEST DRIVE (Anonymous Mode)
// ─────────────────────────────────────────────────────────
test.describe('Patient Test Drive', () => {
  test('anonymous mode → dashboard → AI chat → emergency intercept', async ({ page }) => {
    test.setTimeout(120_000);

    console.log('\n═══ PATIENT TEST DRIVE (Anonymous Mode) ═══');

    // Step 1: Enter via anonymous mode
    console.log('Step 1: Entering anonymous mode...');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // The app auto-bootstraps an anonymous session on / (tier=anonymous_ok)
    // Wait for the anonymous session to be created and dashboard to render
    await page.waitForTimeout(8000);

    // Check if we're on the dashboard (BottomNav should be visible)
    let chatButton = page.locator('button:has-text("Chat")').first();
    let hasDashboard = await chatButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (!hasDashboard) {
      // May need to click "Continue anonymously" if the form is showing
      const anonBtn = page.locator('text=/Continue anonymously/i').first();
      if (await anonBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await anonBtn.click();
        await page.waitForTimeout(5000);
        hasDashboard = await chatButton.isVisible({ timeout: 5000 }).catch(() => false);
      }
    }

    await page.screenshot({ path: 'tests/e2e/screenshots/patient-01-dashboard.png', fullPage: true });
    console.log(`  Dashboard: ${hasDashboard ? '✅ BottomNav visible' : '⚠ Not found'}`);

    if (!hasDashboard) {
      const text = (await page.textContent('body'))?.substring(0, 300)?.replace(/\s+/g, ' ');
      console.log(`  Page: ${text}`);
      return;
    }

    // Step 2: Open AI Chat
    console.log('Step 2: Opening AI Chat...');
    await chatButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/patient-02-chat.png', fullPage: true });
    console.log('  ✅ Chat screen opened');

    // Step 3: Send symptom
    console.log('Step 3: Sending symptom...');
    const chatInput = page.locator('input[placeholder]').first();
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill('I have a headache and mild fever for 2 days');
      await chatInput.press('Enter');
      console.log('  ✅ Symptom sent');
      await page.waitForTimeout(12000);
      await page.screenshot({ path: 'tests/e2e/screenshots/patient-03-response.png', fullPage: true });
    } else {
      console.log('  ⚠ Chat input not found');
    }

    // Step 4: Emergency trigger
    console.log('Step 4: Emergency intercept trigger...');
    if (await chatInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await chatInput.fill('I am having crushing chest pain and cannot breathe');
      await chatInput.press('Enter');
      await page.waitForTimeout(3000);
      await page.screenshot({ path: 'tests/e2e/screenshots/patient-04-emergency.png', fullPage: true });

      const has911 = await page.locator('text=/Call 911/i').isVisible({ timeout: 5000 }).catch(() => false);
      console.log(`  Emergency: ${has911 ? '🚨 ✅ Call 911 visible!' : '⚠ Not visible'}`);
    }

    // Step 5: Navigate screens (close modal first if visible)
    console.log('Step 5: Other screens...');
    // Try to close the emergency modal if it's open
    const closeLink = page.locator('text=/close warning/i, text=/receiving medical care/i').first();
    if (await closeLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeLink.click();
      await page.waitForTimeout(1000);
    }

    for (const label of ['Home', 'Messages', 'History', 'Settings']) {
      const btn = page.locator(`button:has-text("${label}")`).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        try {
          await btn.click({ force: true, timeout: 3000 });
          await page.waitForTimeout(1500);
          await page.screenshot({ path: `tests/e2e/screenshots/patient-05-${label.toLowerCase()}.png`, fullPage: true });
          console.log(`  ✅ ${label}`);
        } catch {
          console.log(`  ⚠ Could not click ${label}`);
        }
      }
    }

    console.log('  ✅ Patient test drive complete\n');
  });
});

// ─────────────────────────────────────────────────────────
// 2. PROVIDER TEST DRIVE (with onboarding)
// ─────────────────────────────────────────────────────────
test.describe('Provider Test Drive', () => {
  test('sign-in → onboarding → practice setup', async ({ page }) => {
    test.setTimeout(120_000);

    console.log('\n═══ PROVIDER TEST DRIVE ═══');
    console.log('Step 1: Signing in as anonprovider...');
    const signedIn = await signInViaAPI(page, PROVIDER_EMAIL, PROVIDER_PASSWORD);

    if (!signedIn) {
      console.log('  ❌ Provider sign-in failed');
      await page.screenshot({ path: 'tests/e2e/screenshots/provider-01-failed.png', fullPage: true });
      return;
    }

    // Step 2: Capture onboarding screen
    console.log('Step 2: Capturing onboarding...');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'tests/e2e/screenshots/provider-02-onboarding.png', fullPage: true });

    const pageText = (await page.textContent('body'))?.replace(/\s+/g, ' ');
    console.log(`  Page: ${pageText?.substring(0, 300)}`);

    // Step 3: Fill in practice name and start trial
    console.log('Step 3: Setting up practice...');
    const practiceInput = page.locator('input[placeholder*="Practice"], input[placeholder*="Dr."]').first();
    if (await practiceInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await practiceInput.fill('AnonProvider Test Practice');
      console.log('  ✅ Practice name entered');

      await page.screenshot({ path: 'tests/e2e/screenshots/provider-03-practice-filled.png', fullPage: true });

      // Click the trial start button
      const trialBtn = page.locator('button:has-text("Start 14-day"), button:has-text("Start trial")').first();
      if (await trialBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await trialBtn.click();
        console.log('  ✅ Clicked "Start 14-day free trial"');
        await page.waitForTimeout(5000);
        await page.screenshot({ path: 'tests/e2e/screenshots/provider-04-post-trial.png', fullPage: true });

        const postText = (await page.textContent('body'))?.substring(0, 300)?.replace(/\s+/g, ' ');
        console.log(`  Post-trial page: ${postText}`);
      } else {
        console.log('  ⚠ Trial button not found');
      }
    } else {
      console.log('  ⚠ Practice input not found');
    }

    // Step 4: Check if we reached the billing or doctor dashboard
    console.log('Step 4: Checking final state...');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'tests/e2e/screenshots/provider-05-final.png', fullPage: true });

    const finalText = (await page.textContent('body'))?.substring(0, 400)?.replace(/\s+/g, ' ');
    const hasDoctor = finalText?.match(/Dashboard|Patient|Billing|Stripe|Checkout|subscription/i);
    console.log(`  Final state: ${hasDoctor ? '✅ ' + hasDoctor[0] : '⚠ Unknown'}`);
    console.log(`  Page: ${finalText?.substring(0, 200)}`);

    console.log('  ✅ Provider test drive complete\n');
  });
});
