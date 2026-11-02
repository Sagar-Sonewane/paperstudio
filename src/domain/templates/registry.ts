import type { TemplateDefinition } from "./types.ts";

export type { TemplateDefinition };

export const TEMPLATE_CLASSIC_COACHING: TemplateDefinition = {
  id: "classic-coaching",
  name: "Classic Coaching Paper",
  description: "Double border, centered institute name, student/signature/date/marks fields, compact 2 columns, B/W.",
  category: "coaching",
  defaults: {
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
      fontFamily: "Times New Roman",
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
      instituteName: "PAPERSTUDIO COACHING ACADEMY",
      subtitle: "Weekly Practice Paper / साप्ताहिक अभ्यास प्रश्नपत्रिका",
      fields: ["studentName", "date", "guardianSignature", "totalMarks", "marksObtained"]
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
  }
};

export const TEMPLATE_CLEAN_PROFESSIONAL: TemplateDefinition = {
  id: "clean-professional",
  name: "Clean Professional",
  description: "Minimal border, clear hierarchy, generous spacing, simple header/footer.",
  category: "assessment",
  defaults: {
    page: {
      size: "A4",
      orientation: "portrait",
      marginMm: { t: 15, r: 15, b: 15, l: 15 }
    },
    columns: {
      count: 2,
      gapMm: 8
    },
    typography: {
      fontFamily: "Times New Roman",
      questionPt: 10,
      optionPt: 9,
      headingPt: 11.5,
      lineHeight: 1.45,
      paragraphGapPt: 6,
      weight: 400
    },
    questions: {
      autoNumber: true,
      numberFormat: "{n}.",
      optionLabelStyle: "({l})",
      optionLayout: "two-column",
      optionGapPt: 3,
      questionGapPt: 8,
      showMarks: true
    },
    header: {
      instituteName: "NATIONAL TESTING SERVICES",
      subtitle: "Standard Assessment Examination / मानक मूल्यांकन परीक्षा",
      fields: ["studentName", "date", "totalMarks"]
    },
    footer: {
      pageNumber: true,
      pageCount: true
    },
    border: {
      style: "single",
      thicknessPt: 1,
      insetMm: 4
    },
    bwMode: true
  }
};

export const TEMPLATE_COMPACT_APTITUDE: TemplateDefinition = {
  id: "compact-aptitude",
  name: "Compact Aptitude Test",
  description: "Dense 2 columns, short aligned options, small margins but readable.",
  category: "competitive",
  defaults: {
    page: {
      size: "A4",
      orientation: "portrait",
      marginMm: { t: 9, r: 9, b: 9, l: 9 }
    },
    columns: {
      count: 2,
      gapMm: 5
    },
    typography: {
      fontFamily: "Arial",
      questionPt: 8.5,
      optionPt: 8,
      headingPt: 9.5,
      lineHeight: 1.25,
      paragraphGapPt: 3,
      weight: 400
    },
    questions: {
      autoNumber: true,
      numberFormat: "Q{n}.",
      optionLabelStyle: "({L})",
      optionLayout: "two-column",
      optionGapPt: 1.5,
      questionGapPt: 4,
      showMarks: false
    },
    header: {
      instituteName: "COMPETITIVE EXAM ACADEMY",
      subtitle: "Speed & Aptitude Test / गति एवं अभिरुचि परीक्षा",
      fields: ["studentName", "date"]
    },
    footer: {
      pageNumber: true,
      pageCount: false
    },
    border: {
      style: "none",
      thicknessPt: 0,
      insetMm: 0
    },
    bwMode: true
  }
};

export const TEMPLATE_MODERN_ACADEMY: TemplateDefinition = {
  id: "modern-academy",
  name: "Modern Academy",
  description: "Refined header, distinct section headings, subtle separators, restrained print styling.",
  category: "school",
  defaults: {
    page: {
      size: "A4",
      orientation: "portrait",
      marginMm: { t: 13, r: 13, b: 13, l: 13 }
    },
    columns: {
      count: 2,
      gapMm: 7
    },
    typography: {
      fontFamily: "Times New Roman",
      questionPt: 9.5,
      optionPt: 8.5,
      headingPt: 11,
      lineHeight: 1.35,
      paragraphGapPt: 5,
      weight: 400
    },
    questions: {
      autoNumber: true,
      numberFormat: "प्र. {n}.",
      optionLabelStyle: "({DEV})",
      optionLayout: "two-column",
      optionGapPt: 2.5,
      questionGapPt: 6,
      showMarks: true
    },
    header: {
      instituteName: "BHARAT ACADEMY OF EXCELLENCE",
      subtitle: "Semester Final Examination / सत्रान्त अंतिम परीक्षा",
      fields: ["studentName", "guardianSignature", "date", "totalMarks"]
    },
    footer: {
      pageNumber: true,
      pageCount: true
    },
    border: {
      style: "single",
      thicknessPt: 1.5,
      insetMm: 5
    },
    bwMode: true
  }
};

export const BUILTIN_TEMPLATES: TemplateDefinition[] = [
  TEMPLATE_CLASSIC_COACHING,
  TEMPLATE_CLEAN_PROFESSIONAL,
  TEMPLATE_COMPACT_APTITUDE,
  TEMPLATE_MODERN_ACADEMY
];

export function getBuiltinTemplate(id: string): TemplateDefinition {
  const found = BUILTIN_TEMPLATES.find((t) => t.id === id);
  return found || TEMPLATE_CLASSIC_COACHING;
}
