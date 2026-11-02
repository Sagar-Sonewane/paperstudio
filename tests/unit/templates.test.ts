import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import JSZip from "jszip";
import {
  BUILTIN_TEMPLATES,
  getBuiltinTemplate
} from "../../src/domain/templates/registry.ts";
import { mergeTemplateSettings } from "../../src/domain/templates/merge.ts";
import { LayoutSettings } from "../../src/domain/model.ts";
import { createDefaultPaper } from "../../src/domain/defaults.ts";
import { createId } from "../../src/domain/ids.ts";
import type { PaperType, SavedTemplateType, QuestionItem } from "../../src/domain/model.ts";
import {
  saveCustomTemplate,
  listSavedTemplates,
  renameCustomTemplate,
  deleteCustomTemplate,
  saveLastUsedSettings,
  getLastUsedSettings
} from "../../src/services/storage/templates.ts";
import { exportPaperToDocxBuffer } from "../../src/services/export/docx/builder.ts";
import { db } from "../../src/services/storage/db.ts";

describe("Phase 5: Built-in Templates & Settings Merge", () => {
  it("defines all 4 required built-in templates with valid LayoutSettings schemas", () => {
    expect(BUILTIN_TEMPLATES).toHaveLength(4);
    const ids = BUILTIN_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("classic-coaching");
    expect(ids).toContain("clean-professional");
    expect(ids).toContain("compact-aptitude");
    expect(ids).toContain("modern-academy");

    for (const tpl of BUILTIN_TEMPLATES) {
      const parsed = LayoutSettings.safeParse(tpl.defaults);
      expect(parsed.success).toBe(true);
      expect(tpl.name.length).toBeGreaterThan(0);
      expect(tpl.description.length).toBeGreaterThan(0);
    }
  });

  it("merges template defaults with user overrides cleanly without mutating base", () => {
    const base = getBuiltinTemplate("clean-professional").defaults;
    const overrides = {
      columns: { count: 3, gapMm: 12 },
      typography: {
        ...base.typography,
        questionPt: 11
      },
      border: {
        style: "double" as const,
        thicknessPt: 2.5,
        insetMm: 7
      }
    };

    const merged = mergeTemplateSettings(base, overrides);

    // Overridden properties
    expect(merged.columns.count).toBe(3);
    expect(merged.columns.gapMm).toBe(12);
    expect(merged.typography.questionPt).toBe(11);
    expect(merged.border.style).toBe("double");

    // Non-overridden properties preserved from base
    expect(merged.page.size).toBe(base.page.size);
    expect(merged.page.marginMm.t).toBe(base.page.marginMm.t);
    expect(merged.typography.fontFamily).toBe(base.typography.fontFamily);
    expect(merged.header.instituteName).toBe(base.header.instituteName);

    // Base unchanged
    expect(base.columns.count).toBe(2);
  });
});

describe("Phase 5: Saved Custom Templates Storage Round Trip", () => {
  beforeEach(async () => {
    await db.templates.clear();
    await db.settings.clear();
  });

  it("saves, lists, renames, and deletes custom templates", async () => {
    const tplId = createId();
    const customTpl: SavedTemplateType = {
      id: tplId,
      name: "My Physics Coaching Layout",
      description: "Custom physics format with 3 columns",
      baseTemplateId: "classic-coaching",
      settings: JSON.parse(JSON.stringify(getBuiltinTemplate("classic-coaching").defaults)),
      createdAt: Date.now()
    };

    // 1. Save
    await saveCustomTemplate(customTpl);

    // 2. List
    const list = await listSavedTemplates();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(tplId);
    expect(list[0].name).toBe("My Physics Coaching Layout");

    // 3. Rename
    await renameCustomTemplate(tplId, "Senior Physics Layout");
    const updatedList = await listSavedTemplates();
    expect(updatedList[0].name).toBe("Senior Physics Layout");

    // 4. Delete
    await deleteCustomTemplate(tplId);
    const emptyList = await listSavedTemplates();
    expect(emptyList).toHaveLength(0);
  });

  it("remembers and retrieves last-used layout settings", async () => {
    const settings = getBuiltinTemplate("modern-academy").defaults;
    await saveLastUsedSettings(settings);

    const retrieved = await getLastUsedSettings();
    expect(retrieved).toBeDefined();
    expect(retrieved?.typography.questionPt).toBe(settings.typography.questionPt);
    expect(retrieved?.header.instituteName).toBe(settings.header.instituteName);
  });
});

describe("Phase 5: Switching Templates Content Invariance & DOCX Export", () => {
  function createSampleBilingualPaper(): PaperType {
    const paper = createDefaultPaper("Bilingual Model Exam");
    const q1: QuestionItem = {
      kind: "question",
      id: "q_sample_1",
      type: "mcq",
      content: {
        html: "<p>What is the chemical formula for water? / जल का रासायनिक सूत्र क्या है?</p>",
        plain: "What is the chemical formula for water? / जल का रासायनिक सूत्र क्या है?"
      },
      options: [
        { id: "opt_1", label: "A", content: { html: "<p>H₂O</p>", plain: "H2O" } },
        { id: "opt_2", label: "B", content: { html: "<p>CO₂</p>", plain: "CO2" } }
      ],
      mediaIds: [],
      optionLayout: "two-column"
    };

    paper.sections = [
      {
        id: "sec_1",
        title: "खण्ड - अ : रसायन / SECTION - A : CHEMISTRY",
        items: [q1]
      }
    ];

    return paper;
  }

  it("switching between all four templates never mutates question or option content", () => {
    const paper = createSampleBilingualPaper();
    const originalQuestionText = paper.sections[0].items[0].kind === "question"
      ? (paper.sections[0].items[0] as QuestionItem).content.html
      : "";
    const originalOptionText = paper.sections[0].items[0].kind === "question"
      ? (paper.sections[0].items[0] as QuestionItem).options[0].content.html
      : "";

    const templateIds = [
      "classic-coaching",
      "clean-professional",
      "compact-aptitude",
      "modern-academy"
    ];

    for (const tplId of templateIds) {
      const tpl = getBuiltinTemplate(tplId);
      // Apply template
      paper.templateId = tpl.id;
      paper.settings = mergeTemplateSettings(tpl.defaults, {
        header: {
          ...tpl.defaults.header,
          instituteName: paper.settings.header.instituteName
        }
      });

      // Verify question and option text strictly identical
      const currentQ = paper.sections[0].items[0] as QuestionItem;
      expect(currentQ.content.html).toBe(originalQuestionText);
      expect(currentQ.options[0].content.html).toBe(originalOptionText);
    }
  });

  it("exports all four templates to DOCX with distinctive headers and border styling", async () => {
    const templateIds = [
      "classic-coaching",
      "clean-professional",
      "compact-aptitude",
      "modern-academy"
    ];

    for (const tplId of templateIds) {
      const paper = createSampleBilingualPaper();
      const tpl = getBuiltinTemplate(tplId);
      paper.templateId = tpl.id;
      paper.settings = JSON.parse(JSON.stringify(tpl.defaults));

      const docxBuffer = await exportPaperToDocxBuffer(paper);
      expect(docxBuffer).toBeDefined();
      expect(docxBuffer.length).toBeGreaterThan(5000);

      const zip = await JSZip.loadAsync(docxBuffer);
      const docXml = await zip.file("word/document.xml")!.async("string");

      // Verify Hindi content preserved across all 4 templates
      expect(docXml).toContain("जल का रासायनिक सूत्र क्या है");

      // Verify borders match template specifications
      if (tpl.defaults.border.style === "double") {
        expect(docXml).toContain('w:val="double"');
      } else if (tpl.defaults.border.style === "single") {
        expect(docXml).toContain('w:val="single"');
      } else {
        // none
        expect(docXml).not.toContain('w:val="double"');
      }
    }
  });
});

