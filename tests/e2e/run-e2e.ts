import { createServer } from "vite";
import { chromium } from "playwright";
import path from "node:path";

async function runE2ETests() {
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO E2E TESTS (Vite + Playwright Chrome)`);
  console.log(`======================================================\n`);

  // 1. Start Vite Dev Server on port 5173
  const server = await createServer({
    configFile: path.resolve("vite.config.ts"),
    server: { host: "127.0.0.1", port: 5174 }
  });
  await server.listen();
  const baseUrl = `http://127.0.0.1:5174`;
  console.log(`Vite test server listening on: ${baseUrl}`);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-web-security", "--allow-insecure-localhost"]
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();

  try {
    // Test 1: Load Dashboard
    console.log(`\n[E2E Step 1] Navigating to Dashboard: ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const headerTitle = await page.textContent("h1");
    if (!headerTitle?.includes("PaperStudio")) {
      throw new Error(`Expected header to contain 'PaperStudio', got: ${headerTitle}`);
    }
    console.log(`✅ Dashboard loaded successfully.`);

    // Test 2: Create New Paper
    console.log(`\n[E2E Step 2] Clicking 'Create New Paper'`);
    const createBtn = page.getByRole("button", { name: "Create New Paper" }).first();
    await createBtn.click();
    await page.waitForURL(/\/paper\/.+/, { timeout: 10000 });
    const paperUrl = page.url();
    console.log(`✅ Navigated to editor URL: ${paperUrl}`);

    // Wait for "Saved" indicator
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ Initial draft autosaved to Dexie.`);

    // Test 3: Edit Metadata and Verify Autosave
    console.log(`\n[E2E Step 3] Updating exam name to 'Mid-Term Board Exam 2026'`);
    const examInput = page.getByPlaceholder("e.g. Weekly Model Test");
    await examInput.fill("Mid-Term Board Exam 2026");
    // Wait for debounced autosave
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ Metadata updated and autosaved.`);

    // Test 4: Verify Persistence Across Refresh
    console.log(`\n[E2E Step 4] Refreshing page to verify persistence...`);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    const persistedExamName = await page.getByPlaceholder("e.g. Weekly Model Test").inputValue();
    if (persistedExamName !== "Mid-Term Board Exam 2026") {
      throw new Error(`Expected persisted exam name 'Mid-Term Board Exam 2026', got: '${persistedExamName}'`);
    }
    console.log(`✅ Draft state survived page refresh perfectly!`);

    // Test 5: Return to Dashboard and Verify Listing
    console.log(`\n[E2E Step 5] Returning to Dashboard`);
    await page.getByRole("button", { name: /Dashboard/i }).click();
    await page.waitForURL(`${baseUrl}/`, { timeout: 10000 });
    await page.waitForSelector('text="Untitled Question Paper"', { timeout: 10000 });
    console.log(`✅ Draft appears in Recent Papers on Dashboard.`);

    // Test 6: Rename Draft from Dashboard
    console.log(`\n[E2E Step 6] Renaming paper draft from Dashboard`);
    const renameBtn = page.getByLabel("Rename paper").first();
    await renameBtn.click();
    const renameInput = page.getByPlaceholder("Paper title");
    await renameInput.fill("Mathematics Class X Model Paper");
    await page.getByRole("button", { name: "Save Title" }).click();
    await page.waitForSelector('text="Mathematics Class X Model Paper"', { timeout: 10000 });
    console.log(`✅ Paper renamed successfully.`);

    // Test 7: Duplicate Draft
    console.log(`\n[E2E Step 7] Duplicating paper draft`);
    const duplicateBtn = page.getByLabel("Duplicate paper").first();
    await duplicateBtn.click();
    await page.waitForSelector('text="Mathematics Class X Model Paper (Copy)"', { timeout: 10000 });
    console.log(`✅ Paper duplicated with new ID and (Copy) title.`);

    // Test 8: Delete Draft
    console.log(`\n[E2E Step 8] Deleting copy draft`);
    const deleteBtn = page.getByLabel("Delete paper").first();
    await deleteBtn.click();
    await page.getByRole("button", { name: "Delete Paper", exact: true }).click();
    await page.waitForFunction(() => !document.body.innerText.includes("(Copy)"), { timeout: 10000 });
    console.log(`✅ Copy draft deleted with confirmation dialog.`);

    // Test 9: Navigate to Import Page and Verify Disabled-with-reason State
    console.log(`\n[E2E Step 9] Testing /import disabled-with-reason state`);
    await page.getByRole("button", { name: "Import Word Document" }).first().click();
    await page.waitForURL(/\/import/, { timeout: 10000 });
    await page.getByText("Scheduled for Phase 3").first().waitFor({ timeout: 10000 });
    const selectFileBtn = page.getByRole("button", { name: /Select \.docx File/i });
    const isDisabled = await selectFileBtn.isDisabled();
    if (!isDisabled) {
      throw new Error(`Expected 'Select .docx File' button to be disabled in Phase 1`);
    }
    console.log(`✅ Import page correctly displays disabled-with-reason state.`);

    console.log(`\n======================================================`);
    console.log(`   🎉 ALL PHASE 1 E2E TESTS PASSED SUCCESSFULLY!`);
    console.log(`======================================================\n`);
  } finally {
    await browser.close();
    await server.close();
  }
}

runE2ETests().catch((err) => {
  console.error("❌ E2E Tests Failed:", err);
  process.exit(1);
});
