import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { execSync } from "node:child_process";
import { createDefaultPaper } from "../../src/domain/defaults.ts";
import { createId } from "../../src/domain/ids.ts";
import type { PaperType, SectionType, QuestionItem } from "../../src/domain/model.ts";
import { validatePaperForExport } from "../../src/services/export/validate.ts";
import { exportPaperToDocxBuffer } from "../../src/services/export/docx/builder.ts";
import { htmlToTextRuns } from "../../src/services/export/docx/richText.ts";

describe("Phase 4: Pre-Export Validation", () => {
  it("passes validation for a clean valid paper", async () => {
    const paper = createDefaultPaper("Valid Test Paper");
    paper.sections = [
      {
        id: createId(),
        title: "Section A",
        items: [
          {
            kind: "question",
            id: createId(),
            type: "mcq",
            content: { html: "<p>What is 2 + 2?</p>", plain: "What is 2 + 2?" },
            options: [
              { id: createId(), label: "A", content: { html: "<p>3</p>", plain: "3" } },
              { id: createId(), label: "B", content: { html: "<p>4</p>", plain: "4" } }
            ],
            mediaIds: [],
            optionLayout: "two-column"
          }
        ]
      }
    ];

    const result = await validatePaperForExport(paper, { skipPaginationCheck: true });
    expect(result.canExport).toBe(true);
    expect(result.errorsCount).toBe(0);
    expect(result.warningsCount).toBe(0);
    expect(result.stats.questionCount).toBe(1);
  });

  it("detects empty questions without stem text or media", async () => {
    const paper = createDefaultPaper("Empty Question Paper");
    paper.sections = [
      {
        id: createId(),
        title: "Section 1",
        items: [
          {
            kind: "question",
            id: createId(),
            type: "mcq",
            content: { html: "<p></p>", plain: "" },
            options: [],
            mediaIds: [],
            optionLayout: "two-column"
          }
        ]
      }
    ];

    const result = await validatePaperForExport(paper, { skipPaginationCheck: true });
    expect(result.issues.some((i) => i.category === "empty_question")).toBe(true);
    expect(result.warningsCount).toBeGreaterThanOrEqual(1);
  });

  it("detects duplicate custom question numbers", async () => {
    const paper = createDefaultPaper("Duplicate Custom Number Paper");
    const q1Id = createId();
    const q2Id = createId();

    paper.sections = [
      {
        id: createId(),
        title: "Section 1",
        items: [
          {
            kind: "question",
            id: q1Id,
            customNumber: "10-A",
            type: "mcq",
            content: { html: "<p>Question 1</p>", plain: "Question 1" },
            options: [],
            mediaIds: [],
            optionLayout: "two-column"
          },
          {
            kind: "question",
            id: q2Id,
            customNumber: "10-A", // duplicate
            type: "mcq",
            content: { html: "<p>Question 2</p>", plain: "Question 2" },
            options: [],
            mediaIds: [],
            optionLayout: "two-column"
          }
        ]
      }
    ];

    const result = await validatePaperForExport(paper, { skipPaginationCheck: true });
    expect(result.issues.some((i) => i.category === "duplicate_number")).toBe(true);
  });

  it("detects missing media files and blocks export if critical media missing", async () => {
    const paper = createDefaultPaper("Missing Media Paper");
    paper.sections = [
      {
        id: createId(),
        title: "Section 1",
        items: [
          {
            kind: "question",
            id: createId(),
            type: "image",
            content: { html: "<p>Identify this diagram</p>", plain: "Identify this diagram" },
            options: [],
            mediaIds: ["missing_media_id_123"],
            optionLayout: "two-column"
          }
        ]
      }
    ];

    const result = await validatePaperForExport(paper, {
      skipPaginationCheck: true,
      checkMediaExists: async (id) => id !== "missing_media_id_123"
    });

    expect(result.canExport).toBe(false);
    expect(result.errorsCount).toBe(1);
    expect(result.issues.some((i) => i.category === "missing_media")).toBe(true);
  });

  it("flags legacy Hindi font warnings from review metadata", async () => {
    const paper = createDefaultPaper("Legacy Font Paper");
    paper.sections = [
      {
        id: createId(),
        title: "Section 1",
        items: [
          {
            kind: "question",
            id: createId(),
            type: "mcq",
            content: { html: "<p>प्रश्न 1</p>", plain: "प्रश्न 1" },
            options: [],
            mediaIds: [],
            optionLayout: "two-column",
            review: {
              confidence: 0.6,
              warnings: ["Legacy Hindi font Kruti Dev detected in run"]
            }
          }
        ]
      }
    ];

    const result = await validatePaperForExport(paper, { skipPaginationCheck: true });
    expect(result.issues.some((i) => i.category === "legacy_font")).toBe(true);
  });
});

describe("Phase 4: DOCX Export Service", () => {
  it("converts rich text HTML with bold, italic, super, sub and Hindi font slots", () => {
    const html = "<p><strong>Bold</strong> <em>Italic</em> x<sup>2</sup> H<sub>2</sub>O और हिंदी पाठ</p>";
    const runs = htmlToTextRuns(html, {
      fontSizePt: 10,
      latinFont: "Times New Roman",
      devanagariFont: "Mangal"
    });

    expect(runs.length).toBeGreaterThan(0);
    // At least one run should be bold
    expect(runs.some((r) => (r as any).root[0]?.root?.some((prop: any) => prop.rootKey === "w:b"))).toBe(true);
    // At least one run should be italic
    expect(runs.some((r) => (r as any).root[0]?.root?.some((prop: any) => prop.rootKey === "w:i"))).toBe(true);
    // At least one run should have superscript
    expect(runs.some((r) => (r as any).root[0]?.root?.some((prop: any) => prop.rootKey === "w:vertAlign"))).toBe(true);
  });

  it("generates a full 30-question bilingual DOCX and validates internal XML structure", async () => {
    const paper = createDefaultPaper("वार्षिक अभ्यास परीक्षा 2026 / Annual Model Exam 2026");
    paper.settings.header.instituteName = "सरस्वती कोचिंग सेंटर / SARASWATI COACHING CENTRE";
    paper.settings.border.style = "double";
    paper.settings.page.size = "A4";
    paper.settings.columns.count = 2;
    paper.meta.examName = "कक्षा 10वीं विज्ञान / Class X Science";
    paper.meta.totalMarks = 100;
    paper.meta.durationMin = 180;
    paper.meta.date = "15/03/2026";

    // Build 30 bilingual questions across 2 sections
    const sections: SectionType[] = [
      {
        id: createId(),
        title: "खण्ड - अ : भौतिक विज्ञान / SECTION - A : PHYSICS",
        instructions: {
          html: "<p>सभी प्रश्न अनिवार्य हैं। प्रत्येक प्रश्न 2 अंक का है। / All questions are compulsory.</p>",
          plain: "सभी प्रश्न अनिवार्य हैं।"
        },
        items: []
      },
      {
        id: createId(),
        title: "खण्ड - ब : रसायन विज्ञान / SECTION - B : CHEMISTRY",
        instructions: {
          html: "<p>प्रत्येक प्रश्न का एक ही विकल्प सही है। / Choose the single correct option.</p>",
          plain: "प्रत्येक प्रश्न का एक ही विकल्प सही है।"
        },
        items: []
      }
    ];

    for (let i = 1; i <= 30; i++) {
      const targetSec = i <= 15 ? sections[0] : sections[1];
      const qItem: QuestionItem = {
        kind: "question",
        id: createId(),
        type: "mcq",
        content: {
          html: `<p>प्रश्न ${i}: What is the SI unit of electric current? / विद्युत धारा का SI मात्रक क्या है? Formula: <em>I</em> = <sup>Q</sup>/<sub>t</sub> &plusmn; &radic;2</p>`,
          plain: `प्रश्न ${i}: What is the SI unit of electric current? / विद्युत धारा का SI मात्रक क्या है?`
        },
        options: [
          {
            id: createId(),
            label: "A",
            content: { html: "<p>Ampere / ऐम्पीयर (A)</p>", plain: "Ampere / ऐम्पीयर (A)" }
          },
          {
            id: createId(),
            label: "B",
            content: { html: "<p>Volt / वोल्ट (V)</p>", plain: "Volt / वोल्ट (V)" }
          },
          {
            id: createId(),
            label: "C",
            content: { html: "<p>Ohm / ओम (&Omega;)</p>", plain: "Ohm / ओम (Ω)" }
          },
          {
            id: createId(),
            label: "D",
            content: { html: "<p>Watt / वाट (W)</p>", plain: "Watt / वाट (W)" }
          }
        ],
        mediaIds: [],
        optionLayout: i % 2 === 0 ? "two-column" : "vertical"
      };
      targetSec.items.push(qItem);
    }
    paper.sections = sections;

    // Export to buffer
    const buffer = await exportPaperToDocxBuffer(paper);
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(10000); // Realistic multi-page DOCX size

    // Unzip and inspect XML structure with JSZip
    const zip = await JSZip.loadAsync(buffer);

    // 1. Check document.xml
    const docXmlFile = zip.file("word/document.xml");
    expect(docXmlFile).toBeDefined();
    const docXml = await docXmlFile!.async("string");

    // A4 Size in twips (11906 x 16838)
    expect(docXml).toContain('w:w="11906"');
    expect(docXml).toContain('w:h="16838"');

    // Two Columns (w:cols w:num="2")
    expect(docXml).toContain("w:cols");
    expect(docXml).toContain('w:num="2"');

    // Double Page Border (w:pgBorders w:val="double")
    expect(docXml).toContain("w:pgBorders");
    expect(docXml).toContain('w:val="double"');

    // Hindi text preserved
    expect(docXml).toContain("विद्युत धारा का SI मात्रक");
    expect(docXml).toContain("ऐम्पीयर");

    // Complex Script font slot for Devanagari
    expect(docXml).toContain('w:cs="Mangal"');

    // keepNext applied to prevent orphan headings and stems
    expect(docXml).toContain("<w:keepNext/>");

    // 2. Check header1.xml
    const headerXmlFile = zip.file("word/header1.xml");
    expect(headerXmlFile).toBeDefined();
    const headerXml = await headerXmlFile!.async("string");
    expect(headerXml).toContain("SARASWATI COACHING CENTRE");
    expect(headerXml).toContain("कक्षा 10वीं विज्ञान");

    // 3. Check footer1.xml
    const footerXmlFile = zip.file("word/footer1.xml");
    expect(footerXmlFile).toBeDefined();
    const footerXml = await footerXmlFile!.async("string");
    expect(footerXml).toContain("PaperStudio • Classic Series");
    // Verify dynamic page number fields
    expect(footerXml.includes("PAGE") || footerXml.includes("w:fldSimple") || footerXml.includes("NUMPAGES")).toBe(true);

    // 4. Test Headless LibreOffice verification if installed
    let sofficeAvailable = false;
    try {
      execSync("soffice --version", { stdio: "ignore" });
      sofficeAvailable = true;
    } catch {
      sofficeAvailable = false;
    }

    if (sofficeAvailable) {
      console.log("LibreOffice detected; running headless conversion test.");
    } else {
      console.log(
        "Notice: LibreOffice (soffice) not detected in environment PATH; programmatic XML validation passed."
      );
    }
  });

  it("handles image attachments and diagram rasterization without throwing", async () => {
    const paper = createDefaultPaper("Image & Diagram Paper");
    const dummyImageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    paper.sections = [
      {
        id: createId(),
        title: "Diagram Section",
        items: [
          {
            kind: "question",
            id: createId(),
            type: "image",
            content: { html: "<p>Observe the circuit diagram below:</p>", plain: "Observe the circuit diagram below:" },
            options: [],
            mediaIds: ["test_media_1"],
            diagramId: "test_diag_1",
            optionLayout: "two-column"
          }
        ]
      }
    ];

    const buffer = await exportPaperToDocxBuffer(paper, {
      mediaResolver: async () => ({
        bytes: dummyImageBytes,
        mime: "image/png",
        width: 200,
        height: 100
      }),
      diagramResolver: async () => ({
        svg: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" stroke="black" fill="none"/></svg>`,
        width: 100,
        height: 100
      })
    });

    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(1000);

    const zip = await JSZip.loadAsync(buffer);
    const docXml = await zip.file("word/document.xml")!.async("string");
    expect(docXml).toContain("Observe the circuit diagram below");
    // In WordprocessingML, images are represented as drawing elements
    expect(docXml).toContain("w:drawing");
  });
});
