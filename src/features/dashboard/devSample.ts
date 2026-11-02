import { createDefaultPaper } from "../../domain/defaults.ts";
import { createId } from "../../domain/ids.ts";
import { savePaper } from "../../services/storage/drafts.ts";
import { BILINGUAL_40_QUESTIONS } from "../../../spikes/paginator/paginator-data.ts";
import type { PaperType, SectionType, PaperItem } from "../../domain/model.ts";

/**
 * Loads a rich bilingual 40-question sample paper for development and testing.
 * Excluded from production view.
 */
export async function loadDevSamplePaper(): Promise<PaperType> {
  const paper = createDefaultPaper("Dev Sample: Model Test Paper (Class X Bilingual)");

  const sections: SectionType[] = [];
  let currentSection: SectionType = {
    id: createId(),
    title: "General Section",
    items: []
  };

  for (const item of BILINGUAL_40_QUESTIONS) {
    if (item.kind === "heading") {
      if (currentSection.items.length > 0) {
        sections.push(currentSection);
      }
      currentSection = {
        id: createId(),
        title: item.text,
        items: []
      };
    } else {
      const qItem: PaperItem = {
        kind: "question",
        id: createId(),
        type: "mcq",
        content: {
          html: `<p>${item.stem}</p>`,
          plain: item.stem
        },
        options: item.options.map((optText, idx) => ({
          id: createId(),
          label: String.fromCharCode(65 + idx),
          content: {
            html: `<p>${optText}</p>`,
            plain: optText
          }
        })),
        mediaIds: [],
        optionLayout: "two-column"
      };
      currentSection.items.push(qItem);
    }
  }

  if (currentSection.items.length > 0) {
    sections.push(currentSection);
  }

  paper.sections = sections;
  paper.meta = {
    examName: "साप्ताहिक अभ्यास परीक्षा / Weekly Model Test",
    date: new Date().toLocaleDateString("en-IN"),
    totalMarks: 40,
    durationMin: 60
  };
  paper.updatedAt = Date.now();

  await savePaper(paper);
  return paper;
}
