import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { runImporter } from "../../spikes/importer/run-importer.ts";
import { runDocxSpike } from "../../spikes/docx/run-docx.ts";
import { BILINGUAL_40_QUESTIONS } from "../../spikes/paginator/paginator-data.ts";

describe("Phase 0: Risk Spikes Verification", () => {
  it("Importer Spike: parses real coaching docx and classifies questions and fonts", async () => {
    const samplePath = path.resolve("samples/paper.docx");
    expect(fs.existsSync(samplePath)).toBe(true);

    const { blocks, summary } = await runImporter(samplePath);

    expect(blocks.length).toBeGreaterThan(50);
    expect(summary.questionCount).toBeGreaterThanOrEqual(40);
    expect(summary.fontsDetected).toContain("Mangal Pro");
    expect(summary.legacyHindiFontsFound.length).toBe(0);
  });

  it("DOCX Export Spike: generates valid DOCX with A4, 2-columns, double border, and Hindi", async () => {
    const result = await runDocxSpike();

    expect(fs.existsSync(result.docxPath)).toBe(true);
    expect(result.fileSizeBytes).toBeGreaterThan(5000);
    expect(result.xmlValidation.hasA4Size).toBe(true);
    expect(result.xmlValidation.has2Columns).toBe(true);
    expect(result.xmlValidation.hasDoublePageBorder).toBe(true);
    expect(result.xmlValidation.hasHeader).toBe(true);
    expect(result.xmlValidation.hasFooter).toBe(true);
    expect(result.xmlValidation.hasHindiFontSlot).toBe(true);
    expect(result.xmlValidation.hasHindiText).toBe(true);
  });

  it("Paginator Spike: has 40 bilingual questions with 4 options each", () => {
    const questions = BILINGUAL_40_QUESTIONS.filter((q) => q.kind === "question");
    expect(questions.length).toBe(40);

    for (const q of questions) {
      if (q.kind === "question") {
        expect(q.options.length).toBe(4);
        expect(q.stem.length).toBeGreaterThan(5);
      }
    }

    const headings = BILINGUAL_40_QUESTIONS.filter((q) => q.kind === "heading");
    expect(headings.length).toBeGreaterThanOrEqual(3);
  });
});

