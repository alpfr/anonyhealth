import { chromium } from "playwright";
import path from "path";
import fs from "fs";

async function testSimulation() {
  console.log("Testing AnonyHealth Simulation locally with Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on("console", (msg) => console.log("SIM LOG:", msg.text()));
  page.on("pageerror", (err) => console.log("SIM ERROR:", err.message));

  const simPath = "file://" + path.resolve("dist/simulation.html");
  console.log(`Navigating to ${simPath}...`);
  await page.goto(simPath, { waitUntil: "networkidle" });

  const outDir = path.resolve("docs/images/simulation");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Initial State (Step 1: Anonymous Intake)
  console.log("Capturing 01_sim_step1_intake.png...");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "01_sim_step1_intake.png") });

  // 2. Click Next Step (Step 2: Emergency Reflex)
  console.log("Navigating to Step 2 (Cardiac Emergency)...");
  await page.click("#btnNext");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "02_sim_step2_cardiac_modal.png") });

  // 3. Switch to Spanish Scenario
  console.log("Switching to Spanish Scenario...");
  await page.click("#scenarioSpanish");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "03_sim_spanish_scenario.png") });

  // 4. Switch to Pediatric Scenario
  console.log("Switching to Pediatric Scenario...");
  await page.click("#scenarioPediatric");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "04_sim_pediatric_scenario.png") });

  // 5. Switch to Tension Headache (Routine AI Triage)
  console.log("Switching to Headache Scenario...");
  await page.click("#scenarioHeadache");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "05_sim_headache_triage.png") });

  // 6. Test Doctor Portal Tabs: FHIR R4 Bundle
  console.log("Testing FHIR R4 tab...");
  await page.click("#tabFhir");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "06_sim_fhir_tab.png") });

  // 7. Test Billing tab
  console.log("Testing Billing tab...");
  await page.click("#tabBilling");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "07_sim_billing_tab.png") });

  // 8. Test Patient Mobile View only
  console.log("Testing Patient Mobile View...");
  await page.click("#viewPatientBtn");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "08_sim_mobile_view.png") });

  // 9. Test Doctor Portal View only
  console.log("Testing Doctor Portal View...");
  await page.click("#viewDoctorBtn");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "09_sim_doctor_view.png") });

  // 10. Test Light Theme
  console.log("Testing Light Theme...");
  await page.click("#themeToggle");
  await page.click("#viewDualBtn");
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "10_sim_light_theme.png") });

  console.log("All simulation test captures succeeded!");
  await browser.close();
}

testSimulation().catch((err) => {
  console.error("Simulation test failed:", err);
  process.exit(1);
});
