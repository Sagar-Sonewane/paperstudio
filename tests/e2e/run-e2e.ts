import { createServer } from "vite";
import { chromium } from "playwright";
import path from "node:path";

async function runE2ETests() {
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO E2E TESTS (Phase 4: Export & Print)`);
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

    // Step 8: Continue to Editor
    console.log(`\n[E2E Step 8] Committing review items to Paper Editor`);
    const continueBtn = page.getByRole("button", { name: "Continue to Editor" }).first();
    await continueBtn.click();

    // Verify Navigation to Editor
    await page.waitForURL(/\/paper\/.+/, { timeout: 15000 });
    const editorUrl = page.url();
    const paperIdMatch = editorUrl.match(/\/paper\/([^/?#]+)/);
    const paperId = paperIdMatch ? paperIdMatch[1] : "";
    console.log(`✅ Navigated to Paper Editor URL: ${editorUrl} (ID: ${paperId})`);

    // Wait for autosave and pagination
    await page.waitForSelector('text="Saved"', { timeout: 10000 });
    await page.waitForSelector('#print-page-1', { timeout: 10000 });

    const totalPages = await page.locator('[id^="print-page-"]').count();
    console.log(`✅ Imported paper paginated into ${totalPages} A4 pages.`);

    // Step 9: Open Pre-Export Validation Modal via "Export DOCX"
    console.log(`\n[E2E Step 9] Opening Pre-Export Validation Dialog via 'Export DOCX' button`);
    const exportDocxBtn = page.getByRole("button", { name: /Export DOCX/i }).first();
    await exportDocxBtn.click();

    await page.waitForSelector('text="Pre-Export Checks"', { timeout: 5000 });
    await page.waitForSelector('text="Export & Print Paper"', { timeout: 5000 });
    console.log(`✅ Export modal displayed with pre-export checks.`);

    // Step 10: Trigger DOCX Export Download
    console.log(`\n[E2E Step 10] Triggering DOCX export download`);
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    const modalExportBtn = page.getByRole("dialog").getByRole("button", { name: /Export DOCX/i });
    await modalExportBtn.click();

    const download = await downloadPromise;
    const downloadName = download.suggestedFilename();
    console.log(`✅ Download initiated: ${downloadName}`);
    if (!downloadName.endsWith(".docx")) {
      throw new Error(`Expected downloaded file to end with .docx, got: ${downloadName}`);
    }

    await page.waitForSelector('text=Export successful!', { timeout: 5000 });
    console.log(`✅ Export success feedback reported.`);

    // Step 11: Switch to Print/PDF Tab in Modal
    console.log(`\n[E2E Step 11] Testing Print / PDF tab inside Export Modal`);
    const printTabBtn = page.getByRole("dialog").getByRole("button", { name: /Print \/ PDF/i });
    await printTabBtn.click();

    const openPrintBtn = page.getByRole("dialog").getByRole("button", { name: /Open Print Dialog/i });
    await openPrintBtn.click();

    await page.waitForSelector('text=Print dialog opened.', { timeout: 5000 });
    console.log(`✅ Print feedback says 'Print dialog opened' (Honesty rule verified).`);

    // Close Modal
    const closeBtn = page.getByRole("dialog").getByRole("button", { name: /Cancel/i });
    await closeBtn.click();
    console.log(`✅ Export modal closed.`);

    // Step 12: Dedicated Print Route (/paper/:id/print)
    console.log(`\n[E2E Step 12] Navigating to dedicated print route: /paper/${paperId}/print`);
    await page.goto(`${baseUrl}/paper/${paperId}/print`, { waitUntil: "networkidle" });
    await page.waitForSelector('.print-page', { timeout: 10000 });

    const printPageCount = await page.locator('.print-page').count();
    console.log(`✅ Dedicated print view rendered ${printPageCount} printable A4 pages.`);
    if (printPageCount < 1) {
      throw new Error(`Expected at least 1 print page, got ${printPageCount}`);
    }

    // Verify print dialog action button exists
    const printViewBtn = page.getByRole("button", { name: /Open Print Dialog/i });
    await printViewBtn.click();
    await page.waitForSelector('text=Print dialog opened.', { timeout: 5000 });
    console.log(`✅ Verified print route 'Open Print Dialog' action button.`);

    console.log(`\n======================================================`);
    console.log(`   🎉 ALL PHASE 4 E2E TESTS PASSED SUCCESSFULLY!`);
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
