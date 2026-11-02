import { describe, it, expect } from "vitest";
import { Paper, Question, Heading, LayoutSettings } from "../../src/domain/model.ts";
import { createDefaultPaper, DEFAULT_LAYOUT_SETTINGS } from "../../src/domain/defaults.ts";
import { validatePaper } from "../../src/domain/validation.ts";
import { deriveQuestionNumbers, formatQuestionNumber, getOptionLabel } from "../../src/domain/numbering.ts";
import { migratePaper } from "../../src/domain/migrations.ts";
import { createId } from "../../src/domain/ids.ts";

describe("Domain Models & Schemas", () => {
  it("creates a valid default paper adhering to Paper schema", () => {
    const paper = createDefaultPaper("Test Paper");
    const result = validatePaper(paper);

    expect(result.valid).toBe(true);
    expect(result.paper?.title).toBe("Test Paper");
    expect(result.paper?.schemaVersion).toBe(1);
    expect(result.paper?.sections.length).toBe(1);
  });

  it("rejects paper with missing required fields", () => {
    const invalid = { id: "123", title: "Bad Paper" };
    const result = validatePaper(invalid);

    expect(result.valid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("detects duplicate item IDs across sections", () => {
    const paper = createDefaultPaper("Duplicate ID Test");
    const dupId = createId();

    paper.sections[0].items = [
      {
        kind: "question",
        id: dupId,
        type: "mcq",
        content: { html: "<p>Question 1</p>" },
        options: [],
        mediaIds: []
      },
      {
        kind: "question",
        id: dupId, // duplicate!
        type: "mcq",
        content: { html: "<p>Question 2</p>" },
        options: [],
        mediaIds: []
      }
    ];

    const result = validatePaper(paper);
    expect(result.valid).toBe(false);
    expect(result.issues.some((i) => i.message.includes("Duplicate item ID"))).toBe(true);
  });

  it("flags empty questions as warnings without failing schema validity", () => {
    const paper = createDefaultPaper("Empty Question Test");
    paper.sections[0].items = [
      {
        kind: "question",
        id: createId(),
        type: "mcq",
        content: { html: "" }, // empty
        options: [],
        mediaIds: []
      }
    ];

    const result = validatePaper(paper);
    expect(result.valid).toBe(true);
    expect(result.issues.some((i) => i.severity === "warning" && i.message.includes("empty content"))).toBe(true);
  });
});

describe("Derived Numbering", () => {
  it("derives sequential numbers ignoring headings and instructions", () => {
    const q1Id = createId();
    const q2Id = createId();
    const q3Id = createId();
    const h1Id = createId();

    const sections = [
      {
        id: createId(),
        title: "Section 1",
        items: [
          { kind: "heading" as const, id: h1Id, content: { html: "Section Heading" } },
          { kind: "question" as const, id: q1Id, type: "mcq" as const, content: { html: "Q1" }, options: [], mediaIds: [] },
          { kind: "question" as const, id: q2Id, type: "mcq" as const, content: { html: "Q2" }, options: [], mediaIds: [] }
        ]
      },
      {
        id: createId(),
        title: "Section 2",
        items: [
          { kind: "question" as const, id: q3Id, type: "short" as const, content: { html: "Q3" }, options: [], mediaIds: [] }
        ]
      }
    ];

    const numbers = deriveQuestionNumbers(sections);
    expect(numbers.get(q1Id)).toBe("1");
    expect(numbers.get(q2Id)).toBe("2");
    expect(numbers.get(q3Id)).toBe("3");
    expect(numbers.has(h1Id)).toBe(false);
  });

  it("respects custom numbers without resetting subsequent counter", () => {
    const q1Id = createId();
    const q2Id = createId();
    const q3Id = createId();

    const sections = [
      {
        id: createId(),
        title: "Section 1",
        items: [
          { kind: "question" as const, id: q1Id, type: "mcq" as const, content: { html: "Q1" }, options: [], mediaIds: [] },
          { kind: "question" as const, id: q2Id, customNumber: "9B", type: "mcq" as const, content: { html: "Q2" }, options: [], mediaIds: [] },
          { kind: "question" as const, id: q3Id, type: "mcq" as const, content: { html: "Q3" }, options: [], mediaIds: [] }
        ]
      }
    ];

    const numbers = deriveQuestionNumbers(sections);
    expect(numbers.get(q1Id)).toBe("1");
    expect(numbers.get(q2Id)).toBe("9B");
    expect(numbers.get(q3Id)).toBe("2");
  });

  it("formats question numbers and option labels correctly", () => {
    expect(formatQuestionNumber("5", "Q. {n}.")).toBe("Q. 5.");
    expect(formatQuestionNumber("12", "प्र. {n}.")).toBe("प्र. 12.");

    expect(getOptionLabel(0, "({L})")).toBe("(A)");
    expect(getOptionLabel(1, "({L})")).toBe("(B)");
    expect(getOptionLabel(0, "({DEV})")).toBe("(अ)");
    expect(getOptionLabel(1, "({DEV})")).toBe("(ब)");
    expect(getOptionLabel(2, "({l})")).toBe("(c)");
  });
});

describe("Migrations", () => {
  it("migrates unversioned draft to current schema version", () => {
    const legacyDraft = {
      id: "legacy_1",
      title: "Old Draft Without Version",
      sections: []
    };

    const migrated = migratePaper(legacyDraft);
    expect(migrated.schemaVersion).toBe(1);
    expect(migrated.settings.page.size).toBe("A4");
    expect(migrated.templateId).toBe("classic");
  });
});

