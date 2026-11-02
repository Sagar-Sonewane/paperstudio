import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { classifyBlock } from "../../src/services/import/classify.ts";
import { parseOmmlNode } from "../../src/services/import/omml.ts";
import { isLegacyHindiFont } from "../../src/services/import/legacyHindi.ts";
import { loadDocxZip } from "../../src/services/import/unzip.ts";
import { importDocx } from "../../src/services/import/index.ts";

describe("Classifier Patterns", () => {
  it("classifies English question numbering patterns (1., 1), Q. 1, Q1.)", () => {
    const patterns = [
      { text: "1. What is gravity?", num: "1" },
      { text: "2) State Newton's first law of motion.", num: "2" },
      { text: "Q. 3 What is acceleration due to gravity?", num: "3" },
      { text: "Q. 4. Define momentum.", num: "4" },
      { text: "Q5. Calculate kinetic energy.", num: "5" },
      { text: "Q6) State Archimedes principle.", num: "6" },
      { text: "Question 7. What is force?", num: "7" }
    ];

    for (const p of patterns) {
      const res = classifyBlock({
        id: "test",
        rawText: p.text,
        html: `<p>${p.text}</p>`,
        runs: [{ text: p.text }],
        fontsUsed: [],
        mediaIds: [],
        hasMath: false,
        hasDrawing: false,
        hasShape: false
      });

      expect(res.kind).toBe("question");
      expect(res.questionNumber).toBe(p.num);
    }
  });

  it("classifies Hindi question numbering patterns (प्र. 1, प्रश्न 1., १.)", () => {
    const patterns = [
      { text: "प्र. 1. वह कौन-सी संख्या है, जो पूर्ण है परन्तु प्राकृत नहीं?", num: "1" },
      { text: "प्र. 2 अंक 231402 में 4 के स्थानीय और जातीय मान में अंतर क्या है?", num: "2" },
      { text: "प्रश्न 3. प्रकाश संश्लेषण की क्रिया समझाइए।", num: "3" },
      { text: "प्र 4) कार्य का SI मात्रक क्या है?", num: "4" },
      { text: "१. गुरुत्वाकर्षण का सार्वत्रिक नियम लिखिए।", num: "१" }
    ];

    for (const p of patterns) {
      const res = classifyBlock({
        id: "test",
        rawText: p.text,
        html: `<p>${p.text}</p>`,
        runs: [{ text: p.text }],
        fontsUsed: ["Mangal Pro"],
        mediaIds: [],
        hasMath: false,
        hasDrawing: false,
        hasShape: false
      });

      expect(res.kind).toBe("question");
      expect(res.questionNumber).toBe(p.num);
    }
  });

  it("classifies standalone option patterns ((A), A), (a), (अ), अ))", () => {
    const patterns = [
      { text: "(A) 24 meters/second", label: "A" },
      { text: "B) 36 meters/second", label: "B" },
      { text: "(a) Mitochondria", label: "A" },
      { text: "b) Chloroplast", label: "B" },
      { text: "(अ) शून्य (0)", label: "अ" },
      { text: "ब) एक (1)", label: "ब" },
      { text: "(क) प्रोटॉन", label: "क" },
      { text: "ख) न्यूट्रॉन", label: "ख" }
    ];

    for (const p of patterns) {
      const res = classifyBlock({
        id: "test",
        rawText: p.text,
        html: `<p>${p.text}</p>`,
        runs: [{ text: p.text }],
        fontsUsed: [],
        mediaIds: [],
        hasMath: false,
        hasDrawing: false,
        hasShape: false
      });

      expect(res.kind).toBe("option");
      expect(res.optionLabel).toBe(p.label);
    }
  });

  it("extracts inline option patterns on single lines", () => {
    const inlineLine = "(A) 12    (B) 24    (C) 36    (D) 48";
    const res = classifyBlock({
      id: "test",
      rawText: inlineLine,
      html: `<p>${inlineLine}</p>`,
      runs: [{ text: inlineLine }],
      fontsUsed: [],
      mediaIds: [],
      hasMath: false,
      hasDrawing: false,
      hasShape: false
    });

    expect(res.kind).toBe("option");
    expect(res.inlineOptions).toBeDefined();
    expect(res.inlineOptions?.length).toBe(4);
    expect(res.inlineOptions?.[0].label).toBe("A");
    expect(res.inlineOptions?.[0].text).toBe("12");
    expect(res.inlineOptions?.[3].label).toBe("D");
    expect(res.inlineOptions?.[3].text).toBe("48");
  });

  it("extracts inline Hindi options inside a question line", () => {
    const line = "1. सबसे छोटी अभाज्य संख्या कौन सी है? (A) 0 (B) 1 (C) 2 (D) 3";
    const res = classifyBlock({
      id: "test",
      rawText: line,
      html: `<p>${line}</p>`,
      runs: [{ text: line }],
      fontsUsed: ["Mangal Pro"],
      mediaIds: [],
      hasMath: false,
      hasDrawing: false,
      hasShape: false
    });

    expect(res.kind).toBe("question");
    expect(res.questionNumber).toBe("1");
    expect(res.stemText).toContain("सबसे छोटी अभाज्य संख्या");
    expect(res.inlineOptions?.length).toBe(4);
    expect(res.inlineOptions?.[2].label).toBe("C");
    expect(res.inlineOptions?.[2].text).toBe("2");
  });

  it("classifies headings and instructions accurately", () => {
    const headingBlock = classifyBlock({
      id: "h1",
      rawText: "SECTION A: PHYSICS & CHEMISTRY",
      html: "<p>SECTION A</p>",
      runs: [{ text: "SECTION A" }],
      fontsUsed: [],
      mediaIds: [],
      hasMath: false,
      hasDrawing: false,
      hasShape: false
    });
    expect(headingBlock.kind).toBe("heading");

    const instBlock = classifyBlock({
      id: "i1",
      rawText: "Note: All questions carry 2 marks each.",
      html: "<p>Note</p>",
      runs: [{ text: "Note" }],
      fontsUsed: [],
      mediaIds: [],
      hasMath: false,
      hasDrawing: false,
      hasShape: false
    });
    expect(instBlock.kind).toBe("instruction");
  });
});

describe("OMML Math Converter", () => {
  it("converts fraction into readable HTML", () => {
    const ommlFraction = [
      {
        "m:f": [
          { "m:num": [{ "m:r": [{ "m:t": "1" }] }] },
          { "m:den": [{ "m:r": [{ "m:t": "2" }] }] }
        ]
      }
    ];

    const res = parseOmmlNode(ommlFraction);
    expect(res.html).toContain("<sup>1</sup>/<sub>2</sub>");
    expect(res.plain).toBe("(1/2)");
    expect(res.isSimple).toBe(true);
  });

  it("converts power and roots to readable HTML", () => {
    const ommlPower = [
      {
        "m:sSup": [
          { "m:e": [{ "m:r": [{ "m:t": "x" }] }] },
          { "m:sup": [{ "m:r": [{ "m:t": "2" }] }] }
        ]
      }
    ];

    const res = parseOmmlNode(ommlPower);
    expect(res.html).toBe("x<sup>2</sup>");
    expect(res.plain).toBe("x^(2)");
  });
});

describe("Legacy Hindi Font Detection", () => {
  it("identifies Kruti Dev and DevLys as legacy fonts", () => {
    expect(isLegacyHindiFont("Kruti Dev 010")).toBe(true);
    expect(isLegacyHindiFont("DevLys 010")).toBe(true);
    expect(isLegacyHindiFont("Walkman-Chanakya")).toBe(true);
    expect(isLegacyHindiFont("Mangal Pro")).toBe(false);
    expect(isLegacyHindiFont("Noto Sans Devanagari")).toBe(false);
    expect(isLegacyHindiFont("Times New Roman")).toBe(false);
  });
});

describe("Importer Error Handling", () => {
  it("rejects empty files with clear error", async () => {
    const emptyBuf = new Uint8Array(0);
    await expect(loadDocxZip(emptyBuf)).rejects.toThrow("Empty file uploaded");
  });

  it("rejects non-zip / invalid files with clear error", async () => {
    const fakePdf = new TextEncoder().encode("%PDF-1.4 header fake content");
    await expect(loadDocxZip(fakePdf)).rejects.toThrow("Invalid file format");
  });
});

describe("Real Coaching Paper Import Pipeline", () => {
  const samplePath = path.resolve("samples/paper.docx");

  it("imports samples/paper.docx preserving Hindi text, questions, and options", async () => {
    expect(fs.existsSync(samplePath)).toBe(true);

    const fileBuf = fs.readFileSync(samplePath);
    const result = await importDocx(fileBuf, "paper.docx");

    expect(result).toBeDefined();
    expect(result.report).toBeDefined();
    expect(result.items.length).toBeGreaterThan(0);

    // Verify questions and options
    const questions = result.items.filter((it) => it.kind === "question");
    expect(questions.length).toBeGreaterThanOrEqual(45); // Spike detected 50 questions
    expect(result.report.questionCount).toBe(questions.length);

    // Verify first question is intact in Hindi
    const q1 = questions[0];
    expect(q1.content.plain).toContain("वह कौन-सी संख्या है");
    expect(q1.options.length).toBeGreaterThanOrEqual(3);

    // Verify Unicode font: no legacy fonts
    expect(result.report.legacyHindiFonts.length).toBe(0);

    // Verify counts in report match items in the review list
    let tallyQuestions = 0;
    let tallyOptions = 0;
    let tallyUnclassified = 0;

    for (const it of result.items) {
      if (it.kind === "question") {
        tallyQuestions++;
        tallyOptions += it.options.length;
      } else if (it.kind === "other") {
        tallyUnclassified++;
      }
    }

    expect(result.report.questionCount).toBe(tallyQuestions);
    expect(result.report.optionCount).toBe(tallyOptions);
    expect(result.report.unclassifiedCount).toBe(tallyUnclassified);

    // Verify nothing was dropped
    expect(result.report.totalBlocks).toBeGreaterThanOrEqual(result.items.length);
  });
});

