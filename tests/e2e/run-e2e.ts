import { createServer } from "vite";
import { chromium } from "playwright";
import path from "node:path";
import JSZip from "jszip";

async function runE2ETests() {
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO E2E TESTS (Phase 6: Diagram Editor)`);
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

    // Capture initial question text in the preview/sidebar to verify content invariance
    const initialHindiSnippet = "वह कौन-सी संख्या";
    const initialTextFound = await page.getByText(initialHindiSnippet, { exact: false }).first().isVisible();
    if (!initialTextFound) {
      throw new Error(`Expected initial Hindi question to be visible in editor.`);
    }
    console.log(`✅ Initial question text confirmed present before template switching.`);

    // Step 9: Phase 5 - Template Gallery Switching & Content Invariance
    console.log(`\n[E2E Step 9] Testing Template Gallery switching across all 4 templates`);
    const templatesToTest = [
      { name: "Clean Professional", id: "clean-professional" },
      { name: "Compact Aptitude Test", id: "compact-aptitude" },
      { name: "Modern Academy", id: "modern-academy" },
      { name: "Classic Coaching Paper", id: "classic-coaching" }
    ];

    for (const tpl of templatesToTest) {
      console.log(`  -> Switching to template: ${tpl.name}...`);
      // Open Template Gallery
      const templatesBtn = page.getByRole("button", { name: /Templates/i });
      await templatesBtn.click();
      await page.waitForSelector('text="Template Gallery"', { timeout: 5000 });

      // Find the card for this template and click Apply if not already active
      const tplCard = page.locator(`div:has(> div h4:has-text("${tpl.name}"))`);
      const applyBtn = tplCard.getByRole("button", { name: "Apply" });
      const isApplyVisible = await applyBtn.isVisible().catch(() => false);

      if (isApplyVisible) {
        await applyBtn.click();
        // Wait for modal to close
        await page.waitForSelector('text="Template Gallery"', { state: "detached", timeout: 5000 });
      } else {
        // Already active, close dialog
        const closeBtn = page.getByRole("dialog").getByRole("button", { name: /Cancel|Close/i }).first();
        if (await closeBtn.isVisible()) await closeBtn.click();
      }

      // Verify question text remains strictly unchanged
      const snippetStillThere = await page.getByText(initialHindiSnippet, { exact: false }).first().isVisible();
      if (!snippetStillThere) {
        throw new Error(`Content mutated or lost after switching to template: ${tpl.name}!`);
      }
      console.log(`  ✅ Template '${tpl.name}' applied; question text strictly preserved.`);
    }

    // Step 10: Phase 5 - Settings Panel Drawer, Units, & Custom Reusable Template
    console.log(`\n[E2E Step 10] Testing Layout Settings Panel Drawer and custom templates`);
    const settingsBtn = page.getByRole("button", { name: /^Settings$/i });
    await settingsBtn.click();
    await page.waitForSelector('text="Layout & Design Settings"', { timeout: 5000 });
    console.log(`✅ Settings Panel Drawer opened.`);

    // 10a. Change Column count (from 2 to 1 and back)
    console.log(`  -> Adjusting column settings...`);
    const colSelect = page.locator('select').filter({ hasText: /Columns/i }).first();
    await colSelect.selectOption("1");
    await page.waitForTimeout(600);
    console.log(`  ✅ 1-column layout applied.`);
    await colSelect.selectOption("2");
    await page.waitForTimeout(600);
    console.log(`  ✅ 2-column layout restored.`);

    // 10b. Expand Page Borders section and change style
    console.log(`  -> Adjusting page border styling...`);
    const borderSectionBtn = page.getByRole("button", { name: /5\. Page Borders & Print Styling/i });
    await borderSectionBtn.click();
    const borderSelect = page.locator('select').filter({ hasText: /Border/i }).first();
    await borderSelect.selectOption("single");
    await page.waitForTimeout(400);
    console.log(`  ✅ Single border applied.`);

    // 10c. Expand Save Custom Template section and save
    console.log(`  -> Saving custom design as a named reusable template...`);
    const customTplSectionBtn = page.getByRole("button", { name: /6\. Save & Manage Custom Templates/i });
    await customTplSectionBtn.click();
    const newTplInput = page.locator('input[placeholder="New template name..."]');
    await newTplInput.fill("My Custom E2E Template");
    const saveTplBtn = page.getByRole("button", { name: "Save", exact: true });
    await saveTplBtn.click();

    // Verify it appears in the saved list
    await page.waitForSelector('text="My Custom E2E Template"', { timeout: 5000 });
    console.log(`  ✅ Custom template 'My Custom E2E Template' saved and displayed.`);

    // Close Settings Drawer
    const closeDrawerBtn = page.getByRole("button", { name: "Close Settings Panel" });
    await closeDrawerBtn.click();
    await page.waitForSelector('text="Layout & Design Settings"', { state: "detached", timeout: 5000 });
    console.log(`✅ Settings Panel Drawer closed.`);

    // Step 11: Phase 6 - SVG Diagram Editor (Draw Triangle with Labels & Insert)
    console.log(`\n[E2E Step 11] Phase 6: Testing Diagram Editor: Draw triangle with labels and insert into question`);
    // Open Question Editor for the first question
    const editQuestionBtn = page.locator('button[title="Edit Question"]').first();
    await editQuestionBtn.click();
    await page.waitForSelector('text="Diagrams & Visuals"', { timeout: 5000 });
    console.log(`  ✅ Question editor drawer opened.`);

    // Open Diagram Editor Modal
    const drawDiagramBtn = page.getByRole("button", { name: "Draw Diagram" });
    await drawDiagramBtn.click();
    await page.waitForSelector('text="Bilingual SVG Diagram Editor"', { timeout: 5000 });
    console.log(`  ✅ SVG Diagram Editor modal opened.`);

    // Click "Triangle Δ" preset to draw a labelled triangle
    const trianglePresetBtn = page.getByRole("button", { name: "Triangle Δ" });
    await trianglePresetBtn.click();
    await page.waitForSelector('svg polygon', { timeout: 5000 });
    console.log(`  ✅ Triangle preset with vertex labels drawn onto SVG canvas.`);

    // Click "Insert into Question"
    const insertDiagramBtn = page.getByRole("button", { name: /Insert into Question/i });
    await insertDiagramBtn.click();
    await page.waitForSelector('text="Bilingual SVG Diagram Editor"', { state: "detached", timeout: 5000 });
    console.log(`  ✅ Diagram saved and inserted into question.`);

    // Verify Question Editor drawer shows the Vector SVG badge
    await page.waitForSelector('text="Vector SVG"', { timeout: 5000 });
    console.log(`  ✅ Question editor displays Vector SVG confirmation badge.`);

    // Close Question Editor
    const doneEditingBtn = page.getByRole("button", { name: "Done Editing" });
    await doneEditingBtn.click();
    console.log(`  ✅ Question editor drawer closed.`);

    // Verify SVG diagram appears sharply in center Live Preview
    await page.waitForSelector('.question-diagram-container svg', { timeout: 10000 });
    const isSvgInPreview = await page.locator('.question-diagram-container svg').first().isVisible();
    if (!isSvgInPreview) {
      throw new Error("Expected vector SVG diagram to be visible in Live Preview");
    }
    console.log(`  ✅ Vector SVG diagram rendered sharply in Live Preview!`);

    // Verify Sidebar has Diagram badge
    await page.getByText("Diagram", { exact: false }).first().waitFor({ timeout: 5000 });
    console.log(`  ✅ Content sidebar displays 'Diagram' badge for question.`);

    // Step 12: Open Pre-Export Validation Modal via "Export DOCX"
    console.log(`\n[E2E Step 12] Opening Pre-Export Validation Dialog via 'Export DOCX' button`);
    const exportDocxBtn = page.getByRole("button", { name: /Export DOCX/i }).first();
    await exportDocxBtn.click();

    await page.waitForSelector('text="Pre-Export Checks"', { timeout: 5000 });
    await page.waitForSelector('text="Export & Print Paper"', { timeout: 5000 });
    console.log(`✅ Export modal displayed with pre-export checks.`);

    // Step 13: Trigger DOCX Export Download & Validate Embedded Diagram
    console.log(`\n[E2E Step 13] Triggering DOCX export download and validating embedded diagram`);
    const downloadPromise = page.waitForEvent("download", { timeout: 15000 });
    const modalExportBtn = page.getByRole("dialog").getByRole("button", { name: /Export DOCX/i });
    await modalExportBtn.click();

    const download = await downloadPromise;
    const downloadName = download.suggestedFilename();
    console.log(`✅ Download initiated: ${downloadName}`);
    if (!downloadName.endsWith(".docx")) {
      throw new Error(`Expected downloaded file to end with .docx, got: ${downloadName}`);
    }

    // Inspect the downloaded DOCX file stream to verify embedded drawing
    const downloadStream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of downloadStream) {
      chunks.push(chunk as Buffer);
    }
    const docxBuffer = Buffer.concat(chunks);
    const zip = await JSZip.loadAsync(docxBuffer);
    const documentXml = await zip.file("word/document.xml")?.async("string");

    if (!documentXml?.includes("w:drawing")) {
      throw new Error("Expected exported DOCX to contain embedded w:drawing for rasterized diagram");
    }
    console.log(`✅ Verified exported DOCX contains embedded rasterized diagram (w:drawing).`);

    await page.waitForSelector('text=Export successful!', { timeout: 5000 });
    console.log(`✅ Export success feedback reported.`);

    // Step 14: Switch to Print/PDF Tab in Modal
    console.log(`\n[E2E Step 14] Testing Print / PDF tab inside Export Modal`);
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

    // Step 15: Dedicated Print Route (/paper/:id/print) & Vector Sharpness
    console.log(`\n[E2E Step 15] Navigating to dedicated print route: /paper/${paperId}/print`);
    await page.goto(`${baseUrl}/paper/${paperId}/print`, { waitUntil: "networkidle" });
    await page.waitForSelector('.print-page', { timeout: 10000 });

    const printPageCount = await page.locator('.print-page').count();
    console.log(`✅ Dedicated print view rendered ${printPageCount} printable A4 pages.`);
    if (printPageCount < 1) {
      throw new Error(`Expected at least 1 print page, got ${printPageCount}`);
    }

    // Verify vector SVG diagram is embedded and visible in print route
    const printDiagramVisible = await page.locator('.print-page .question-diagram-container svg').first().isVisible();
    if (!printDiagramVisible) {
      throw new Error("Expected vector SVG diagram to be visible in dedicated print view");
    }
    console.log(`✅ Vector SVG diagram is present and vector-sharp in printable view.`);

    // Verify print dialog action button exists
    const printViewBtn = page.getByRole("button", { name: /Open Print Dialog/i });
    await printViewBtn.click();
    await page.waitForSelector('text=Print dialog opened.', { timeout: 5000 });
    console.log(`✅ Verified print route 'Open Print Dialog' action button.`);

    console.log(`\n======================================================`);
    console.log(`   🎉 ALL PHASE 6 E2E TESTS PASSED SUCCESSFULLY!`);
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
