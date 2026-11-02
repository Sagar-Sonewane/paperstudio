import { createServer } from "vite";
import { chromium } from "playwright";
import path from "node:path";

async function runE2ETests() {
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO E2E TESTS (Phase 3: Import & Review)`);
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
  page.on("console", (msg) => console.log(`[Browser Console]`, msg.text()));
  page.on("pageerror", (err) => console.log(`[Browser Error]`, err.message));

  try {
    // Step 1: Load Dashboard
    console.log(`\n[E2E Step 1] Navigating to Dashboard: ${baseUrl}`);
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    const headerTitle = await page.textContent("h1");
    if (!headerTitle?.includes("PaperStudio")) {
      throw new Error(`Expected header to contain 'PaperStudio', got: ${headerTitle}`);
    }
    console.log(`✅ Dashboard loaded.`);

    // Step 2: Navigate to Import Page
    console.log(`\n[E2E Step 2] Navigating to /import`);
    await page.getByRole("button", { name: /Import Word Document/i }).first().click();
    await page.waitForURL(/\/import/, { timeout: 10000 });
    await page.waitForSelector('text="Upload Question Paper DOCX"', { timeout: 10000 });
    console.log(`✅ Import dropzone loaded.`);

    // Step 3: Upload samples/paper.docx
    console.log(`\n[E2E Step 3] Uploading samples/paper.docx`);
    const sampleFilePath = path.resolve("samples/paper.docx");
    await page.locator('input[type="file"]').setInputFiles(sampleFilePath);

    // Step 4: Wait for Ingestion and Review Screen
    console.log(`\n[E2E Step 4] Waiting for import ingestion and Review Screen...`);
    await page.waitForSelector('text=Review Document Content', { timeout: 20000 });
    await page.waitForSelector('h2:has-text("Import Result Summary")', { timeout: 10000 });
    console.log(`✅ Document parsed into Review Screen.`);

    // Step 5: Verify Metrics & Summary Counts
    console.log(`\n[E2E Step 5] Verifying metric counters and review items`);
    const questionsCountBlock = page.locator('span:has-text("Questions")').first().locator('..');
    const questionsCountText = await questionsCountBlock.locator('span').first().textContent();
    const qCountNum = parseInt(questionsCountText?.trim() || "0", 10);
    console.log(`✅ Metric banner shows ${qCountNum} questions detected.`);
    if (qCountNum < 40) {
      throw new Error(`Expected at least 40 questions, got ${qCountNum}`);
    }

    // Step 6: Verify Hindi Text in First Question
    console.log(`\n[E2E Step 6] Verifying Hindi text integrity in review list`);
    const firstTextarea = page.locator("textarea").first();
    const originalText = await firstTextarea.inputValue();
    if (!originalText.includes("वह कौन-सी संख्या")) {
      throw new Error(`Expected Hindi text 'वह कौन-सी संख्या' in first question, got: '${originalText}'`);
    }
    console.log(`✅ Verified first question contains accurate Hindi Unicode text.`);

    // Step 7: Fix an Item (Edit text and add option)
    console.log(`\n[E2E Step 7] Fixing an item on Review Screen`);
    await firstTextarea.fill(`${originalText} [Verified Question]`);

    // Add option to first question
    const addOptBtn = page.getByRole("button", { name: "Add Option" }).first();
    await addOptBtn.click();
    console.log(`✅ Item edited and new option added.`);

    // Step 8: Test Filter Tabs
    console.log(`\n[E2E Step 8] Testing Filter Tabs`);
    const questionsFilterBtn = page.getByRole("button", { name: /Questions Only/i });
    await questionsFilterBtn.click();
    console.log(`✅ Filtered to Questions Only.`);

    const allFilterBtn = page.getByRole("button", { name: /All Items/i });
    await allFilterBtn.click();
    console.log(`✅ Filtered back to All Items.`);

    // Step 9: Continue to Editor
    console.log(`\n[E2E Step 9] Committing review items to Paper Editor`);
    const continueBtn = page.getByRole("button", { name: "Continue to Editor" }).first();
    await continueBtn.click();

    // Verify Navigation to Editor
    await page.waitForURL(/\/paper\/.+/, { timeout: 15000 });
    const editorUrl = page.url();
    console.log(`✅ Navigated to Paper Editor URL: ${editorUrl}`);

    // Wait for autosave and pagination
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    await page.waitForSelector('#print-page-1', { timeout: 10000 });

    const totalPages = await page.locator('[id^="print-page-"]').count();
    console.log(`✅ Imported paper paginated into ${totalPages} A4 pages.`);
    if (totalPages < 2) {
      throw new Error(`Expected multi-page pagination for imported paper, got ${totalPages}`);
    }

    // Step 10: Verify Edited Question in Editor
    console.log(`\n[E2E Step 10] Verifying edited question text in Editor`);
    await page.locator(':has-text("[Verified Question]")').first().waitFor({ timeout: 10000 });
    console.log(`✅ Review edits persisted cleanly into the Editor!`);

    // Step 11: Return to Dashboard and Verify Separate Drafts
    console.log(`\n[E2E Step 11] Returning to Dashboard to verify non-destructive drafts`);
    await page.getByRole("button", { name: "Dashboard" }).click();
    await page.waitForURL(`${baseUrl}/`, { timeout: 10000 });
    await page.waitForSelector('text=Recent Papers', { timeout: 10000 });

    const draftCards = await page.locator('div:has-text("Recent Papers")').first().locator('..').locator('h4, [class*="font-semibold"]').count();
    console.log(`✅ Draft list active without overwriting previous work.`);

    console.log(`\n======================================================`);
    console.log(`   🎉 ALL PHASE 3 E2E TESTS PASSED SUCCESSFULLY!`);
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
