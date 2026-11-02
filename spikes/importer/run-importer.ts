import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

interface RunInfo {
  text: string;
  fontAscii?: string;
  fontCs?: string;
  fontHAnsi?: string;
  bold?: boolean;
  italic?: boolean;
}

interface BlockInfo {
  id: string;
  type: "heading" | "instruction" | "header_meta" | "question" | "option" | "table" | "empty" | "unclassified";
  rawText: string;
  runs: RunInfo[];
  fontsUsed: string[];
  hasDrawing: boolean;
  hasMath: boolean;
  hasShape: boolean;
  questionNumber?: string;
  optionLabel?: string;
  inlineOptions?: { label: string; text: string }[];
  warning?: string;
}

const LEGACY_HINDI_FONTS = new Set([
  "kruti dev", "krutidev", "devlys", "chanakya", "walkman-chanakya",
  "krishna", "agra", "shiva", "apsara", "priyanka", "almanac", "bharti"
]);

function isLegacyHindiFont(fontName: string): boolean {
  const normalized = fontName.trim().toLowerCase();
  for (const legacy of LEGACY_HINDI_FONTS) {
    if (normalized.includes(legacy)) return true;
  }
  return false;
}

function extractRunsAndFlags(nodeList: any[]): {
  text: string;
  runs: RunInfo[];
  fonts: Set<string>;
  hasDrawing: boolean;
  hasMath: boolean;
  hasShape: boolean;
} {
  let text = "";
  const runs: RunInfo[] = [];
  const fonts = new Set<string>();
  let hasDrawing = false;
  let hasMath = false;
  let hasShape = false;

  function traverse(nodes: any[]) {
    if (!Array.isArray(nodes)) return;
    for (const item of nodes) {
      for (const [key, val] of Object.entries(item)) {
        if (key === ":@" || key === "#text") continue;

        if (key === "m:oMath" || key === "m:oMathPara") {
          hasMath = true;
          // Extract text from m:t nodes inside math
          function extractMathText(mathNodes: any[]): string {
            let mText = "";
            if (!Array.isArray(mathNodes)) return mText;
            for (const mNode of mathNodes) {
              for (const [mKey, mVal] of Object.entries(mNode)) {
                if (mKey === "m:t") {
                  if (Array.isArray(mVal) && mVal[0] && mVal[0]["#text"]) {
                    mText += mVal[0]["#text"];
                  } else if (typeof mVal === "string") {
                    mText += mVal;
                  } else if (mNode[":@"] && mNode["#text"]) {
                    mText += mNode["#text"];
                  }
                } else if (Array.isArray(mVal)) {
                  mText += extractMathText(mVal);
                }
              }
            }
            return mText;
          }
          const mathStr = extractMathText(Array.isArray(val) ? val : []);
          if (mathStr) {
            text += mathStr;
            runs.push({ text: `[Math: ${mathStr}]`, fontAscii: "Cambria Math" });
          }
        } else if (key === "w:drawing") {
          hasDrawing = true;
        } else if (key === "w:pict" || key === "v:shape") {
          hasShape = true;
        } else if (key === "w:r") {
          // Process run
          let runText = "";
          let fontAscii: string | undefined;
          let fontCs: string | undefined;
          let fontHAnsi: string | undefined;
          let bold = false;
          let italic = false;

          if (Array.isArray(val)) {
            for (const child of val) {
              if (child["w:rPr"] && Array.isArray(child["w:rPr"])) {
                for (const rPrChild of child["w:rPr"]) {
                  if (rPrChild[":@"]) {
                    const attrs = rPrChild[":@"];
                    if (rPrChild["w:rFonts"]) {
                      fontAscii = attrs["@_w:ascii"];
                      fontCs = attrs["@_w:cs"];
                      fontHAnsi = attrs["@_w:hAnsi"];
                    }
                  }
                  if (rPrChild["w:b"] !== undefined) bold = true;
                  if (rPrChild["w:i"] !== undefined) italic = true;
                  if (rPrChild["w:rFonts"] && rPrChild[":@"]) {
                    const attrs = rPrChild[":@"];
                    fontAscii = fontAscii || attrs["@_w:ascii"];
                    fontCs = fontCs || attrs["@_w:cs"];
                    fontHAnsi = fontHAnsi || attrs["@_w:hAnsi"];
                  }
                }
              }
              if (child["w:t"]) {
                const tVal = child["w:t"];
                if (Array.isArray(tVal) && tVal[0] && tVal[0]["#text"]) {
                  runText += tVal[0]["#text"];
                } else if (typeof tVal === "string") {
                  runText += tVal;
                } else if (child[":@"] && child["#text"]) {
                  runText += child["#text"];
                }
              }
              if (child["w:tab"] !== undefined) runText += "\t";
              if (child["w:br"] !== undefined) runText += "\n";
              if (child["w:drawing"] !== undefined) hasDrawing = true;
              if (child["w:pict"] !== undefined) hasShape = true;
            }
          }

          if (fontAscii) fonts.add(fontAscii);
          if (fontCs) fonts.add(fontCs);
          if (fontHAnsi) fonts.add(fontHAnsi);

          if (runText) {
            text += runText;
            runs.push({ text: runText, fontAscii, fontCs, fontHAnsi, bold, italic });
          }
        } else if (Array.isArray(val)) {
          traverse(val);
        }
      }
    }
  }

  traverse(nodeList);
  return { text, runs, fonts, hasDrawing, hasMath, hasShape };
}

export async function runImporter(docxPath: string): Promise<{
  blocks: BlockInfo[];
  summary: {
    totalBlocks: number;
    questionCount: number;
    optionCount: number;
    headerMetaCount: number;
    headingCount: number;
    instructionCount: number;
    emptyCount: number;
    unclassifiedCount: number;
    fontsDetected: string[];
    legacyHindiFontsFound: string[];
  };
}> {
  if (!fs.existsSync(docxPath)) {
    throw new Error(`File not found: ${docxPath}`);
  }

  const fileBuffer = fs.readFileSync(docxPath);
  const zip = await JSZip.loadAsync(fileBuffer);

  // 1. Font Table Check
  const fontFile = zip.file("word/fontTable.xml");
  const allDocFonts = new Set<string>();
  const legacyFontsDetected = new Set<string>();

  if (fontFile) {
    const fontXml = await fontFile.async("string");
    const fontMatches = fontXml.match(/w:name="([^"]+)"/g) || [];
    for (const match of fontMatches) {
      const fontName = match.replace(/w:name="([^"]+)"/, "$1");
      allDocFonts.add(fontName);
      if (isLegacyHindiFont(fontName)) {
        legacyFontsDetected.add(fontName);
      }
    }
  }

  // 2. Document XML Parsing
  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("Invalid DOCX: word/document.xml not found");
  }

  const docXml = await docFile.async("string");
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });

  const parsedDoc = parser.parse(docXml);

  // Find w:body
  let bodyNodes: any[] = [];
  for (const root of parsedDoc) {
    if (root["w:document"] && Array.isArray(root["w:document"])) {
      for (const docChild of root["w:document"]) {
        if (docChild["w:body"] && Array.isArray(docChild["w:body"])) {
          bodyNodes = docChild["w:body"];
          break;
        }
      }
    }
  }

  const blocks: BlockInfo[] = [];
  let blockCounter = 1;

  for (const node of bodyNodes) {
    for (const [key, val] of Object.entries(node)) {
      if (key === ":@") continue;

      if (key === "w:p") {
        const paragraphNodes = Array.isArray(val) ? val : [];
        const { text, runs, fonts, hasDrawing, hasMath, hasShape } = extractRunsAndFlags(paragraphNodes);
        fonts.forEach((f) => {
          allDocFonts.add(f);
          if (isLegacyHindiFont(f)) legacyFontsDetected.add(f);
        });

        const trimmed = text.trim();
        const blockId = `b_${blockCounter++}`;

        if (!trimmed && !hasDrawing && !hasMath && !hasShape) {
          blocks.push({
            id: blockId,
            type: "empty",
            rawText: "",
            runs: [],
            fontsUsed: Array.from(fonts),
            hasDrawing: false,
            hasMath: false,
            hasShape: false
          });
          continue;
        }

        // Header metadata check
        if (
          trimmed.includes("Full Name:") ||
          trimmed.includes("Total Marks:") ||
          trimmed.includes("Parents Signature:") ||
          trimmed.includes("Marks Obtained:") ||
          trimmed.includes("Date:")
        ) {
          blocks.push({
            id: blockId,
            type: "header_meta",
            rawText: trimmed,
            runs,
            fontsUsed: Array.from(fonts),
            hasDrawing,
            hasMath,
            hasShape
          });
          continue;
        }

        // Heading check
        if (
          /^(?:Section|भाग|खंड)\s+[A-Za-z0-9]+/i.test(trimmed) ||
          /^(?:GENERAL INSTRUCTIONS|सामान्य निर्देश)/i.test(trimmed)
        ) {
          blocks.push({
            id: blockId,
            type: "heading",
            rawText: trimmed,
            runs,
            fontsUsed: Array.from(fonts),
            hasDrawing,
            hasMath,
            hasShape
          });
          continue;
        }

        // Question pattern check:
        // Examples: "प्र. 1.", "प्रश्न 1.", "Q. 1", "Q1)", "1.", "1)"
        const qMatch = trimmed.match(/^(?:(?:प्र\.|प्रश्न|Q\.?|Question)\s*)?(\d+)[\.\)]\s*(.*)/i);
        // Option pattern check:
        // Standalone option: "(A) xyz", "(a) xyz", "A) xyz", "(अ) xyz", "अ) xyz"
        const optMatch = trimmed.match(/^\(([A-Da-d\d]|अ|ब|क|ख|ग|घ)\)\s*(.*)/);
        // Inline options check: "(A) ... (B) ... (C) ... (D) ..."
        const inlineOptMatches = Array.from(trimmed.matchAll(/\(([A-Da-d]|अ|ब|क|ख|ग|घ)\)\s*([^(\n\r]+)/g));

        if (qMatch && !optMatch) {
          // It's a question! Check if it also has inline options
          const inlineOptions = inlineOptMatches.map((m) => ({
            label: m[1].toUpperCase(),
            text: m[2].trim()
          }));

          blocks.push({
            id: blockId,
            type: "question",
            rawText: trimmed,
            questionNumber: qMatch[1],
            runs,
            fontsUsed: Array.from(fonts),
            hasDrawing,
            hasMath,
            hasShape,
            inlineOptions: inlineOptions.length > 0 ? inlineOptions : undefined
          });
          continue;
        }

        if (optMatch || inlineOptMatches.length >= 2) {
          const inlineOptions = inlineOptMatches.map((m) => ({
            label: m[1].toUpperCase(),
            text: m[2].trim()
          }));

          blocks.push({
            id: blockId,
            type: "option",
            rawText: trimmed,
            optionLabel: optMatch ? optMatch[1].toUpperCase() : undefined,
            runs,
            fontsUsed: Array.from(fonts),
            hasDrawing,
            hasMath,
            hasShape,
            inlineOptions: inlineOptions.length > 0 ? inlineOptions : undefined
          });
          continue;
        }

        // Instruction check
        if (
          trimmed.startsWith("Note:") ||
          trimmed.startsWith("सूचना:") ||
          trimmed.startsWith("निर्देश:") ||
          /^(?:Identify|Choose|Select|Read|Fill in|Solve|Find)\b/i.test(trimmed)
        ) {
          blocks.push({
            id: blockId,
            type: "instruction",
            rawText: trimmed,
            runs,
            fontsUsed: Array.from(fonts),
            hasDrawing,
            hasMath,
            hasShape
          });
          continue;
        }

        // Fallback: unclassified block
        blocks.push({
          id: blockId,
          type: "unclassified",
          rawText: trimmed,
          runs,
          fontsUsed: Array.from(fonts),
          hasDrawing,
          hasMath,
          hasShape,
          warning: "Does not match standard question, option, heading, or metadata pattern"
        });
      } else if (key === "w:tbl") {
        // Table block
        blocks.push({
          id: `b_${blockCounter++}`,
          type: "table",
          rawText: "[TABLE BLOCK]",
          runs: [],
          fontsUsed: [],
          hasDrawing: false,
          hasMath: false,
          hasShape: false
        });
      }
    }
  }

  const summary = {
    totalBlocks: blocks.length,
    questionCount: blocks.filter((b) => b.type === "question").length,
    optionCount: blocks.filter((b) => b.type === "option").length,
    headerMetaCount: blocks.filter((b) => b.type === "header_meta").length,
    headingCount: blocks.filter((b) => b.type === "heading").length,
    instructionCount: blocks.filter((b) => b.type === "instruction").length,
    emptyCount: blocks.filter((b) => b.type === "empty").length,
    unclassifiedCount: blocks.filter((b) => b.type === "unclassified").length,
    fontsDetected: Array.from(allDocFonts),
    legacyHindiFontsFound: Array.from(legacyFontsDetected)
  };

  return { blocks, summary };
}

// CLI Execution
async function main() {
  const samplePath = path.resolve("samples/paper.docx");
  console.log(`\n======================================================`);
  console.log(`   PAPERSTUDIO IMPORTER SPIKE (JSZip + fast-xml-parser)`);
  console.log(`======================================================`);
  console.log(`Reading: ${samplePath}`);

  const { blocks, summary } = await runImporter(samplePath);

  const outDir = path.resolve("spikes/importer");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "import-output.json");
  fs.writeFileSync(outPath, JSON.stringify({ summary, blocks }, null, 2), "utf-8");

  console.log(`\n--- SUMMARY OF PARSED CONTENT ---`);
  console.log(`Total blocks:        ${summary.totalBlocks}`);
  console.log(`Questions detected:  ${summary.questionCount}`);
  console.log(`Options detected:    ${summary.optionCount}`);
  console.log(`Header metadata:     ${summary.headerMetaCount}`);
  console.log(`Headings detected:   ${summary.headingCount}`);
  console.log(`Instructions:        ${summary.instructionCount}`);
  console.log(`Empty/spacing:       ${summary.emptyCount}`);
  console.log(`Unclassified blocks: ${summary.unclassifiedCount}`);

  console.log(`\n--- FONT ANALYSIS ---`);
  console.log(`Fonts detected in document: ${summary.fontsDetected.join(", ")}`);
  if (summary.legacyHindiFontsFound.length > 0) {
    console.log(`⚠️  LEGACY HINDI FONTS DETECTED: ${summary.legacyHindiFontsFound.join(", ")}`);
    console.log(`   Warning: Text uses legacy non-Unicode font mapping.`);
  } else {
    console.log(`✅  NO legacy Hindi fonts found. Document uses clean Unicode fonts (e.g. ${summary.fontsDetected.filter(f => f.includes("Mangal") || f.includes("Times")).join(", ")}).`);
  }

  // Print sample detected questions
  const detectedQuestions = blocks.filter((b) => b.type === "question");
  console.log(`\n--- SAMPLE DETECTED QUESTIONS (First 5) ---`);
  detectedQuestions.slice(0, 5).forEach((q, idx) => {
    console.log(`Q${q.questionNumber || idx + 1}: ${q.rawText.substring(0, 80)}...`);
    if (q.inlineOptions) {
      console.log(`   Inline options: ${q.inlineOptions.map((o) => `(${o.label}) ${o.text}`).join("  ")}`);
    }
  });

  if (summary.unclassifiedCount > 0) {
    console.log(`\n--- UNCLASSIFIED BLOCKS ---`);
    blocks
      .filter((b) => b.type === "unclassified")
      .forEach((b) => {
        console.log(`[${b.id}] "${b.rawText}" (fonts: ${b.fontsUsed.join(", ")})`);
      });
  }

  console.log(`\nDetailed JSON output written to: ${outPath}`);
  console.log(`Importer spike completed successfully.\n`);
}

main().catch((err) => {
  console.error("Importer spike failed:", err);
  process.exit(1);
});
