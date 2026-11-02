import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

export async function runPaginatorSpike(): Promise<{
  success: boolean;
  fontsLoaded: boolean;
  totalPages: number;
  totalQuestions: number;
  headingsKeptWithNext: boolean;
  optionsKeptWithQuestion: boolean;
  columnMetrics: any[];
  pdfGenerated: boolean;
  screenshotPaths: string[];
}> {
  const outDir = path.resolve("spikes/paginator");
  const htmlPath = path.join(outDir, "index.html");
  const fileUrl = `file://${htmlPath.replace(/\\/g, "/")}`;

  console.log(`Launching headless browser for Paginator Spike...`);
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--allow-file-access-from-files", "--disable-web-security"]
  });

  const page = await browser.newPage({
    viewport: { width: 1200, height: 1600 },
    deviceScaleFactor: 2
  });

  page.on("console", (msg) => console.log(`[Browser Console] ${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => console.error(`[Browser PageError] ${err.message}`));

  console.log(`Navigating to: ${fileUrl}`);
  await page.goto(fileUrl, { waitUntil: "load" });

  // Wait for paginator state to become ready
  await page.waitForFunction(() => (window as any).PAGINATOR_STATE?.ready === true, {
    timeout: 15000
  });

  const state = await page.evaluate(() => {
    return (window as any).PAGINATOR_STATE;
  });

  // Test Rule 1: Headings Keep-With-Next
  // Verify no heading is the sole/last element in any column
  const headingCheck = await page.evaluate(() => {
    const columns = Array.from(document.querySelectorAll(".column"));
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i];
      const children = Array.from(col.children);
      if (children.length > 0) {
        const lastChild = children[children.length - 1];
        if (lastChild.classList.contains("block-heading")) {
          return { valid: false, failedAtColumn: i, headingId: lastChild.getAttribute("data-id") };
        }
      }
    }
    return { valid: true };
  });

  // Test Rule 2: Question and Options stay together
  // Verify every question has 4 options present inside it
  const questionCheck = await page.evaluate(() => {
    const questions = Array.from(document.querySelectorAll(".block-question"));
    for (const q of questions) {
      const options = q.querySelectorAll(".option-item");
      if (options.length !== 4) {
        return { valid: false, qId: q.getAttribute("data-id"), count: options.length };
      }
    }
    return { valid: true, questionCount: questions.length };
  });

  // Generate PDF via Chrome Print with @page styles
  const pdfPath = path.join(outDir, "paginator-print.pdf");
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 }
  });
  const pdfGenerated = fs.existsSync(pdfPath);

  // Take screenshots of rendered A4 pages
  const pageElements = await page.$$(".a4-page");
  const screenshotPaths: string[] = [];
  for (let i = 0; i < pageElements.length; i++) {
    const shotPath = path.join(outDir, `page-${i + 1}.png`);
    await pageElements[i].screenshot({ path: shotPath });
    screenshotPaths.push(shotPath);
  }

  await browser.close();

  const result = {
    success: state.ready && headingCheck.valid && questionCheck.valid && pdfGenerated,
    fontsLoaded: state.fontsLoaded,
    totalPages: state.totalPages,
    totalQuestions: state.totalQuestions,
    headingsKeptWithNext: headingCheck.valid,
    optionsKeptWithQuestion: questionCheck.valid,
    columnMetrics: state.columnMetrics,
    pdfGenerated,
    screenshotPaths
  };

  const resultsJsonPath = path.join(outDir, "paginator-results.json");
  fs.writeFileSync(resultsJsonPath, JSON.stringify(result, null, 2), "utf-8");

  return result;
}

// CLI Execution
async function main() {
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO PAGINATOR SPIKE (Chrome Headless)`);
  console.log(`======================================================`);

  const result = await runPaginatorSpike();

  console.log(`Fonts Loaded (document.fonts.ready):  ${result.fontsLoaded ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Total Questions Paginated:            ${result.totalQuestions} (Expected: 40)`);
  console.log(`Total A4 Pages Generated:             ${result.totalPages}`);
  console.log(`Headings Keep-With-Next Enforced:      ${result.headingsKeptWithNext ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Question + Options Keep-Together:     ${result.optionsKeptWithQuestion ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`A4 Print PDF Generated:               ${result.pdfGenerated ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`Page Screenshots Taken:               ${result.screenshotPaths.length} pages captured`);

  console.log(`\n--- COLUMN HEIGHT METRICS PER PAGE ---`);
  result.columnMetrics.forEach((m: any) => {
    console.log(`Page ${m.page}: Col 1 = ${m.col0Height}px (${m.col0Count} items), Col 2 = ${m.col1Height}px (${m.col1Count} items) [Max: 890px]`);
  });

  console.log(`\nPaginator spike completed successfully.\n`);
}

main().catch((err) => {
  console.error("Paginator spike failed:", err);
  process.exit(1);
});
