import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`PAGE LOG [${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.log(`PAGE UNCAUGHT ERROR: ${error.message}`);
  });

  try {
    console.log("Navigating...");
    await page.goto('http://localhost:5173');
    console.log("Waiting for network idle...");
    await page.waitForLoadState('networkidle');

    console.log("Filling in form...");
    await page.fill('input[type="email"]', 'test@anonyhealth.com');
    await page.fill('input[type="password"]', 'testpassword123');
    await page.click('button:has-text("Sign In")');

    console.log("Waiting 3s for rendering...");
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: 'post_login.png' });
    console.log("Saved post_login.png");
    
  } catch (error) {
    console.error("SCRIPT ERROR:", error);
  } finally {
    await browser.close();
  }
})();
