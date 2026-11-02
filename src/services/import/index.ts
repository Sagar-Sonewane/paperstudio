import { loadDocxZip } from "./unzip.ts";
import { detectLegacyFontsFromZip } from "./legacyHindi.ts";
import { extractAndStoreMedia } from "./media.ts";
import { walkDocumentXml } from "./walkDocument.ts";
import { classifyBlock } from "./classify.ts";
import { groupClassifiedBlocks, type ReviewItem } from "./group.ts";
import { createInitialReport, type ImportReport } from "./report.ts";

export * from "./unzip.ts";
export * from "./legacyHindi.ts";
export * from "./media.ts";
export * from "./omml.ts";
export * from "./walkDocument.ts";
export * from "./classify.ts";
export * from "./group.ts";
export * from "./report.ts";

export interface ImportResult {
  items: ReviewItem[];
  meta: {
    instituteName?: string;
    examName?: string;
    date?: string;
    totalMarks?: number;
    durationMin?: number;
  };
  report: ImportReport;
}

/**
 * Main DOCX Ingestion Pipeline:
 * 1. Unzip & structural integrity validation
 * 2. Legacy font table check (Kruti Dev etc.)
 * 3. Media relationship resolution & binary persistence
 * 4. Ordered XML traversal with rich-text run normalization
 * 5. Pattern classification (questions, options, headings, math, shapes)
 * 6. Option grouping and position-based media attachment
 * 7. Comprehensive ImportReport generation
 */
export async function importDocx(
  fileData: Blob | ArrayBuffer | Uint8Array,
  filename: string
): Promise<ImportResult> {
  const startTime = Date.now();
  const fileSizeBytes =
    fileData instanceof Blob
      ? fileData.size
      : fileData.byteLength;

  const report = createInitialReport(filename, fileSizeBytes);

  // 1. Unzip
  const zip = await loadDocxZip(fileData);

  // 2. Legacy font detection
  const fontResult = await detectLegacyFontsFromZip(zip);
  report.legacyHindiFonts = fontResult.legacyFonts;
  if (fontResult.warning) {
    report.warnings.push(fontResult.warning);
  }

  // 3. Extract media
  const mediaMap = await extractAndStoreMedia(zip);
  report.imageCount = mediaMap.size;

  // 4. Read word/document.xml
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Invalid Word document: missing word/document.xml");
  }
  const docXml = await docFile.async("string");

  // 5. Walk document in order
  const parsedBlocks = walkDocumentXml(docXml, mediaMap);
  report.totalBlocks = parsedBlocks.length;

  let mathCount = 0;
  let shapeCount = 0;
  for (const b of parsedBlocks) {
    if (b.hasMath) mathCount++;
    if (b.hasShape) shapeCount++;
  }
  report.mathCount = mathCount;
  report.shapeCount = shapeCount;

  // 6. Classify blocks
  const classifiedBlocks = parsedBlocks.map(classifyBlock);

  // 7. Group into reviewable items
  const { items, meta } = groupClassifiedBlocks(classifiedBlocks);

  // 8. Tally report metrics
  let qCount = 0;
  let optCount = 0;
  let unclassifiedCount = 0;
  let sectionCount = 0;

  for (const it of items) {
    if (it.kind === "question") {
      qCount++;
      optCount += it.options.length;
    } else if (it.kind === "heading") {
      sectionCount++;
    } else if (it.kind === "other") {
      unclassifiedCount++;
    }
  }

  report.questionCount = qCount;
  report.optionCount = optCount;
  report.sectionCount = Math.max(1, sectionCount);
  report.unclassifiedCount = unclassifiedCount;

  // Collect item-level warnings
  for (const it of items) {
    if (it.warnings && it.warnings.length > 0) {
      for (const w of it.warnings) {
        if (!report.warnings.includes(w)) {
          report.warnings.push(w);
        }
      }
    }
  }

  report.durationMs = Date.now() - startTime;

  return {
    items,
    meta,
    report
  };
}

