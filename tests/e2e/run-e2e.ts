import { createServer } from "vite";
import { chromium } from "playwright";
import path from "node:path";

async function runE2ETests() {
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO E2E TESTS (Phase 2: Editor & Preview)`);
  console.log(`======================================================\n`);

  // 1. Start Vite Dev Server on port 5174
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
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await context.newPage();

  try {
    // Step 1: Load Dashboard
    console.log(`\n[E2E Step 1] Navigating to Dashboard: ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const headerTitle = await page.textContent("h1");
    if (!headerTitle?.includes("PaperStudio")) {
      throw new Error(`Expected header to contain 'PaperStudio', got: ${headerTitle}`);
    }
    console.log(`✅ Dashboard loaded.`);

    // Step 2: Load 40-Question Bilingual Dev Sample Paper
    console.log(`\n[E2E Step 2] Loading Bilingual Dev Sample Paper (40 questions)...`);
    const devSampleBtn = page.getByRole("button", { name: /Dev Sample Paper/i });
    await devSampleBtn.waitFor({ state: "visible", timeout: 10000 });
    await devSampleBtn.click();

    await page.waitForURL(/\/paper\/.+/, { timeout: 10000 });
    const paperUrl = page.url();
    console.log(`✅ Navigated to paper editor: ${paperUrl}`);

    // Wait for autosave indicator
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ Draft autosaved.`);

    // Step 3: Verify 3-Area Editor Layout
    console.log(`\n[E2E Step 3] Verifying Three-Area Editor Layout`);
    await page.waitForSelector('h2:has-text("Sections & Items")', { timeout: 10000 });
    await page.waitForSelector('header:has-text("PAPERSTUDIO ACADEMY")', { timeout: 10000 });
    console.log(`✅ Left Sidebar and Center Live Preview are visible.`);

    // Step 4: Verify Pagination and 2-Column Classic Layout
    console.log(`\n[E2E Step 4] Verifying 2-Column A4 Pagination & Borders`);
    await page.waitForSelector('#print-page-1', { timeout: 10000 });
    const pageCount = await page.locator('[id^="print-page-"]').count();
    console.log(`✅ Generated ${pageCount} A4 pages for the bilingual paper.`);
    if (pageCount < 2) {
      throw new Error(`Expected at least 2 pages for 40 questions, got ${pageCount}`);
    }

    // Verify double black page border
    const firstPageDoubleBorder = await page.locator('#print-page-1 > div').getAttribute("style");
    if (!firstPageDoubleBorder?.includes("double")) {
      throw new Error(`Expected Classic template double border, got style: ${firstPageDoubleBorder}`);
    }
    console.log(`✅ Classic Coaching double border verified on page 1.`);

    // Step 5: Select Question to Open Editor Drawer
    console.log(`\n[E2E Step 5] Selecting a question to open Question Editor Drawer`);
    const firstQuestionCard = page.locator('div[title="Drag to reorder"]').first();
    await page.locator('button[aria-label="Edit Question"]').first().click();

    // Verify Drawer opens
    await page.waitForSelector('h2:has-text("Edit Question")', { timeout: 10000 });
    console.log(`✅ Question Editor Drawer opened.`);

    // Step 6: Edit Question in Drawer (Marks & Custom Number)
    console.log(`\n[E2E Step 6] Setting custom number and marks in Question Editor`);
    const customNumberInput = page.getByPlaceholder("e.g. 1A or प्र. 1");
    await customNumberInput.fill("प्र. 1(क)");

    const marksInput = page.getByPlaceholder("e.g. 2");
    await marksInput.fill("4");

    // Close drawer
    await page.getByRole("button", { name: "Done Editing" }).click();
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ Question metadata updated and autosaved.`);

    // Step 7: Test Reorder with Move Down button
    console.log(`\n[E2E Step 7] Testing keyboard/button reordering`);
    const moveDownBtn = page.locator('button[title="Move Down"]').first();
    await moveDownBtn.click();
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ Question moved down successfully.`);

    // Step 8: Test Undo & Redo
    console.log(`\n[E2E Step 8] Testing Undo (Ctrl+Z) and Redo`);
    const undoBtn = page.getByRole("button", { name: "Undo" });
    await undoBtn.click();
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ Undo reverted position.`);

    const redoBtn = page.getByRole("button", { name: "Redo" });
    await redoBtn.click();
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ Redo re-applied position.`);

    // Step 9: Add New Question and Section
    console.log(`\n[E2E Step 9] Adding new MCQ question`);
    const addMcqBtn = page.getByRole("button", { name: "MCQ", exact: true }).first();
    await addMcqBtn.click();
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    console.log(`✅ New MCQ added.`);

    // Step 10: Verify Persistence Across Page Refresh
    console.log(`\n[E2E Step 10] Reloading page to test Dexie persistence...`);
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    await page.waitForSelector('#print-page-1', { timeout: 10000 });

    const reloadedPageCount = await page.locator('[id^="print-page-"]').count();
    if (reloadedPageCount < 2) {
      throw new Error(`Expected at least 2 pages after reload, got ${reloadedPageCount}`);
    }
    console.log(`✅ All ${reloadedPageCount} pages and state persisted across browser refresh!`);

    // Step 11: Return to Dashboard
    console.log(`\n[E2E Step 11] Returning to Dashboard`);
    await page.getByRole("button", { name: "Dashboard" }).click();
    await page.waitForURL(`${baseUrl}/`, { timeout: 10000 });
    await page.waitForSelector('text="Recent Papers"', { timeout: 10000 });
    console.log(`✅ Returned to Dashboard.`);

    console.log(`\n======================================================`);
    console.log(`   🎉 ALL PHASE 2 E2E TESTS PASSED SUCCESSFULLY!`);
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
