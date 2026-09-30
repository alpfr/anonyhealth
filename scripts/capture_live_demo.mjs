import { chromium } from "playwright";
import fs from "fs";
import path from "path";

async function runDemo() {
  console.log("Launching headless browser for AnonyHealth live demo...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  const page = await context.newPage();

  const outDir = path.resolve("docs/images/demo");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const url = "https://anonyhealth-cg4uqokewq-uc.a.run.app";
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

  // 1. Landing / Auth Gate
  console.log("1. Capturing 00_auth_gate.png...");
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, "00_auth_gate.png") });

  // Click Continue Anonymously
  console.log("Clicking 'Continue anonymously'...");
  const anonBtn = page.locator("button:has-text('Continue anonymously')").first();
  if (await anonBtn.isVisible()) {
    await anonBtn.click();
    console.log("Clicked Continue Anonymously, waiting for navigation or session...");
    await page.waitForTimeout(3000);
  }

  // Now capture Dashboard
  console.log("2. Capturing 01_dashboard.png...");
  await page.screenshot({ path: path.join(outDir, "01_dashboard.png") });

  // 2. Open Chat
  console.log("3. Looking for Chat button or Symptom input...");
  const chatNav = page.locator("button:has-text('Chat'), button:has-text('OPEN'), button:has-text('Start Triage')").first();
  if (await chatNav.isVisible()) {
    await chatNav.click();
    await page.waitForTimeout(1200);
  }
  await page.screenshot({ path: path.join(outDir, "02_chat_initial.png") });

  // 3. Trigger Emergency Red Flag (Chest Pain)
  console.log("3. Triggering Jev System 1 Emergency Reflex (Chest Pain)...");
  const input = page.locator("input[placeholder*='symptoms' i]").first();
  await input.fill("I have severe crushing chest pain radiating to my left arm");
  await input.press("Enter");

  // Wait for Jev Reflex Modal
  console.log("4. Capturing Jev Emergency Intercept Modal...");
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, "03_emergency_modal.png") });

  // 4. Close Modal to see chat transcript bubble
  console.log("5. Closing modal to view emergency bubble...");
  const closeBtn = page.locator("button:has-text('close warning'), button:has-text('I am already')").first();
  if (await closeBtn.isVisible()) {
    await closeBtn.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: path.join(outDir, "04_emergency_chat_bubble.png") });

  // 5. Spanish Emergency Trigger in a new tab/session
  console.log("6. Testing Spanish emergency reflex in a fresh page...");
  const spanishPage = await context.newPage();
  await spanishPage.goto(url, { waitUntil: "networkidle" });
  const spanishChatBtn = spanishPage.locator("button:has-text('Chat'), button:has-text('OPEN')").first();
  if (await spanishChatBtn.isVisible()) {
    await spanishChatBtn.click();
    await spanishPage.waitForTimeout(1000);
  }
  const spanishInput = spanishPage.locator("input[placeholder*='symptoms' i]").first();
  if (await spanishInput.isVisible()) {
    await spanishInput.fill("Tengo un dolor muy fuerte en el pecho y me falta el aire");
    await spanishInput.press("Enter");
    await spanishPage.waitForTimeout(1000);
    await spanishPage.screenshot({ path: path.join(outDir, "05_spanish_emergency_modal.png") });
  }
  await spanishPage.close();

  // 6. Benign Routine Triage in a fresh page
  console.log("7. Testing benign symptom triage in a fresh page...");
  const routinePage = await context.newPage();
  await routinePage.goto(url, { waitUntil: "networkidle" });
  const routineChatBtn = routinePage.locator("button:has-text('Chat'), button:has-text('OPEN')").first();
  if (await routineChatBtn.isVisible()) {
    await routineChatBtn.click();
    await routinePage.waitForTimeout(1000);
  }
  const routineInput = routinePage.locator("input[placeholder*='symptoms' i]").first();
  if (await routineInput.isVisible()) {
    await routineInput.fill("Mild dry cough and slight runny nose for two days");
    await routineInput.press("Enter");
    await routinePage.waitForTimeout(4000);
    await routinePage.screenshot({ path: path.join(outDir, "06_routine_triage_chat.png") });
  }
  await routinePage.close();

  // 7. History Screen on original page
  console.log("8. Navigating to History tab...");
  const historyNav = page.locator("button:has-text('History')").first();
  if (await historyNav.isVisible()) {
    await historyNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, "07_history_tab.png") });
  }

  // 8. Settings Screen
  console.log("9. Navigating to Settings tab...");
  const settingsNav = page.locator("button:has-text('Settings')").first();
  if (await settingsNav.isVisible()) {
    await settingsNav.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, "08_settings_tab.png") });
  }

  // 9. Dark Mode Toggle
  console.log("10. Testing Dark Mode toggle...");
  const darkModeToggle = page.locator("button:has-text('🌙'), button[title*='dark' i], button[aria-label*='theme' i], button:has(svg)").last();
  if (await darkModeToggle.isVisible()) {
    await darkModeToggle.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, "09_dark_mode.png") });
  }

  // 10. Provider Portal Landing Page
  console.log("11. Capturing Provider Portal (/for-providers)...");
  const providerPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await providerPage.goto(`${url}/for-providers`, { waitUntil: "networkidle" });
  await providerPage.waitForTimeout(1500);
  await providerPage.screenshot({ path: path.join(outDir, "10_provider_portal.png") });
  await providerPage.close();

  console.log("All live demo screenshots successfully captured in docs/images/demo/!");
  await browser.close();
}

runDemo().catch((err) => {
  console.error("Error during live demo:", err);
  process.exit(1);
});
