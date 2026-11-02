import { createId } from "./ids.ts";
import {
  CURRENT_SCHEMA_VERSION,
  type LayoutSettingsType,
  type PaperType,
  type SectionType
} from "./model.ts";

export const DEFAULT_LAYOUT_SETTINGS: LayoutSettingsType = {
  page: {
    size: "A4",
    orientation: "portrait",
    marginMm: { t: 12, r: 12, b: 12, l: 12 }
  },
  columns: {
    count: 2,
    gapMm: 6
  },
  typography: {
    fontFamily: "Noto Sans Devanagari, Times New Roman, sans-serif",
    questionPt: 9.5,
    optionPt: 8.5,
    headingPt: 10,
    lineHeight: 1.35,
    paragraphGapPt: 4,
    weight: 400
  },
  questions: {
    autoNumber: true,
    numberFormat: "Q. {n}.",
    optionLabelStyle: "({L})",
    optionLayout: "two-column",
    optionGapPt: 2,
    questionGapPt: 6,
    showMarks: false
  },
  header: {
    instituteName: "PAPERSTUDIO ACADEMY",
    subtitle: "Weekly Practice Paper / साप्ताहिक अभ्यास प्रश्नपत्रिका",
    fields: ["studentName", "date", "totalMarks", "marksObtained"]
  },
  footer: {
    pageNumber: true,
    pageCount: true
  },
  border: {
    style: "double",
    thicknessPt: 3,
    insetMm: 6
  },
  bwMode: true
};

export function createDefaultSection(title = "खण्ड - अ / Section - A"): SectionType {
  return {
    id: createId(),
    title,
    items: []
  };
}

export function createDefaultPaper(title = "New Paper Draft"): PaperType {
  const now = Date.now();
  return {
    id: createId(),
    title,
    meta: {
      examName: "Model Examination",
      date: new Date().toLocaleDateString("en-IN"),
      totalMarks: 50,
      durationMin: 60
    },
    sections: [createDefaultSection()],
    templateId: "classic",
    settings: { ...DEFAULT_LAYOUT_SETTINGS },
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now
  };
}

