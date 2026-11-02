import { describe, it, expect } from "vitest";
import { paginatePaper } from "../../src/services/layout/paginate.ts";
import { calcDimensions } from "../../src/services/layout/rules.ts";
import { createDefaultPaper } from "../../src/domain/defaults.ts";
import { createId } from "../../src/domain/ids.ts";
import type { PaperType, PaperItem } from "../../src/domain/model.ts";

describe("Layout Engine & Paginator Rules", () => {
  it("computes accurate column dimensions for A4 2-columns", () => {
    const paper = createDefaultPaper("Dimension Test");
    const dims = calcDimensions(paper.settings);

    expect(dims.pageWidthPx).toBe(794); // 210mm * 3.7795
    expect(dims.pageHeightPx).toBe(1123); // 297mm * 3.7795
    expect(dims.columnCount).toBe(2);
    expect(dims.columnWidthPx).toBeGreaterThan(300);
    expect(dims.maxColumnHeightPx).toBeGreaterThan(700);
  });

  it("paginates a 30-question paper into multiple pages without splitting question + options", async () => {
    const paper = createDefaultPaper("30 Question Test");

    const items: PaperItem[] = [];
    for (let i = 1; i <= 30; i++) {
      items.push({
        kind: "question",
        id: createId(),
        type: "mcq",
        content: {
          html: `<p>Question ${i}: भारत की राजधानी क्या है? / What is the capital of India?</p>`,
          plain: `Question ${i}: भारत की राजधानी क्या है? / What is the capital of India?`
        },
        options: [
          { id: createId(), label: "A", content: { html: "नई दिल्ली / New Delhi" } },
          { id: createId(), label: "B", content: { html: "मुंबई / Mumbai" } },
          { id: createId(), label: "C", content: { html: "कोलकाता / Kolkata" } },
          { id: createId(), label: "D", content: { html: "चेन्नई / Chennai" } }
        ],
        mediaIds: [],
        optionLayout: "two-column"
      });
    }

    paper.sections[0].items = items;

    const { pages, warnings } = await paginatePaper(paper);

    expect(pages.length).toBeGreaterThanOrEqual(2);
    expect(warnings.length).toBe(0);

    // Verify all 30 questions are present across columns
    let totalQuestionsFound = 0;
    for (const page of pages) {
      for (const col of page.columns) {
        expect(col.usedHeightPx).toBeLessThanOrEqual(col.maxHeightPx + 5);
        for (const blk of col.blocks) {
          if (blk.kind === "question") {
            totalQuestionsFound++;
            expect(blk.html).toContain("options-grid");
            expect(blk.html).toContain("New Delhi");
          }
        }
      }
    }

    expect(totalQuestionsFound).toBe(30);
  });

  it("enforces keep-with-next: headings are never placed alone at the bottom of a column", async () => {
    const paper = createDefaultPaper("Keep With Next Test");
    const dims = calcDimensions(paper.settings);

    // Fill column almost to capacity
    const fillerHeight = dims.maxColumnHeightPx - 45; // Leave 45px remaining
    const items: PaperItem[] = [
      {
        kind: "question",
        id: createId(),
        type: "short",
        content: {
          html: `<div style="height: ${fillerHeight}px;">Filler Question that fills most of col 1</div>`,
          plain: "Filler"
        },
        options: [],
        mediaIds: []
      },
      // Heading (needs ~36px) followed by question (needs ~80px).
      // Remaining 45px cannot fit Heading + Question!
      {
        kind: "heading",
        id: createId(),
        content: { html: "SECTION B: ADVANCED MATHEMATICS" }
      },
      {
        kind: "question",
        id: createId(),
        type: "mcq",
        content: { html: "<p>Real question following heading</p>" },
        options: [
          { id: createId(), label: "A", content: { html: "Opt 1" } },
          { id: createId(), label: "B", content: { html: "Opt 2" } },
          { id: createId(), label: "C", content: { html: "Opt 3" } },
          { id: createId(), label: "D", content: { html: "Opt 4" } }
        ],
        mediaIds: []
      }
    ];

    paper.sections[0].items = items;

    const { pages } = await paginatePaper(paper);
    const col0 = pages[0].columns[0];
    const col1 = pages[0].columns[1];

    // Heading B must have moved to col 1 together with the question!
    const headingBInCol0 = col0.blocks.some((b) => b.html.includes("SECTION B"));
    expect(headingBInCol0).toBe(false);

    const headingBInCol1 = col1.blocks.some((b) => b.html.includes("SECTION B"));
    expect(headingBInCol1).toBe(true);
  });

  it("detects and flags oversized blocks", async () => {
    const paper = createDefaultPaper("Oversized Block Test");
    const dims = calcDimensions(paper.settings);

    paper.sections[0].items = [
      {
        kind: "question",
        id: createId(),
        type: "long",
        content: {
          html: `<div style="height: ${dims.maxColumnHeightPx + 100}px;">Extremely long reading comprehension passage exceeding max column height</div>`,
          plain: "Oversized content"
        },
        options: [],
        mediaIds: []
      }
    ];

    const { warnings } = await paginatePaper(paper);
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0]).toContain("is oversized");
  });
});
