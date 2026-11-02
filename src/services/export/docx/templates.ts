import {
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  PageBorderOffsetFrom,
  PageNumber
} from "docx";
import type { PaperType } from "../../../domain/model.ts";

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

export interface DocxTemplateHooks {
  getHeaderParagraphs: (
    paper: PaperType,
    latinFont: string,
    devanagariFont: string
  ) => Paragraph[];
  getFooterChildren: (
    paper: PaperType,
    latinFont: string,
    devanagariFont: string
  ) => TextRun[];
  getSectionHeadingParagraph: (
    title: string,
    paper: PaperType,
    headingSize: number,
    latinFont: string,
    devanagariFont: string
  ) => Paragraph;
  getPageBorders: (paper: PaperType) => any;
}

// 1. Classic Coaching Template DOCX Hooks
const classicCoachingHooks: DocxTemplateHooks = {
  getHeaderParagraphs(paper, latinFont, devanagariFont) {
    const { settings, meta } = paper;
    const paras: Paragraph[] = [];
    const institute = settings.header.instituteName || "PAPERSTUDIO COACHING ACADEMY";
    const hasDev = DEVANAGARI_REGEX.test(institute);

    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 60 },
        children: [
          new TextRun({
            text: institute.toUpperCase(),
            bold: true,
            size: 26, // 13pt
            font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
          })
        ]
      })
    );

    const examParts: string[] = [];
    if (meta.examName || paper.title) examParts.push(meta.examName || paper.title);
    if (meta.totalMarks) examParts.push(`कुल अंक / Total Marks: ${meta.totalMarks}`);
    if (meta.durationMin) examParts.push(`समय / Time: ${meta.durationMin} Mins`);

    if (examParts.length > 0) {
      const line = examParts.join("   |   ");
      const hasExamDev = DEVANAGARI_REGEX.test(line);
      paras.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 60 },
          children: [
            new TextRun({
              text: line,
              size: 18,
              font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasExamDev ? "cs" : "default" }
            })
          ]
        })
      );
    }

    if (settings.header.fields.length > 0) {
      const fieldParts: string[] = [];
      if (settings.header.fields.includes("studentName")) {
        fieldParts.push("विद्यार्थी का नाम / Student Name: __________________________");
      }
      if (settings.header.fields.includes("date")) {
        fieldParts.push(`दिनांक / Date: ${meta.date || "____________"}`);
      }
      if (settings.header.fields.includes("guardianSignature")) {
        fieldParts.push("हस्ताक्षर / Sign: ____________");
      }
      const studentLine = fieldParts.join("     ");
      const hasStuDev = DEVANAGARI_REGEX.test(studentLine);
      paras.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 120 },
          children: [
            new TextRun({
              text: studentLine,
              size: 16,
              font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasStuDev ? "cs" : "default" }
            })
          ]
        })
      );
    }

    return paras;
  },

  getFooterChildren(_paper, latinFont) {
    return [
      new TextRun({
        text: "PaperStudio • Classic Series                    Page ",
        size: 16,
        font: { ascii: latinFont, hAnsi: latinFont }
      }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
      new TextRun({ text: " of ", size: 16, font: { ascii: latinFont, hAnsi: latinFont } }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 })
    ];
  },

  getSectionHeadingParagraph(title, _paper, headingSize, latinFont, devanagariFont) {
    const hasDev = DEVANAGARI_REGEX.test(title);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 100 },
      keepNext: true,
      border: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: headingSize,
          font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
        })
      ]
    });
  },

  getPageBorders(paper) {
    return getCommonPageBorders(paper.settings.border);
  }
};

// 2. Clean Professional Template DOCX Hooks
const cleanProfessionalHooks: DocxTemplateHooks = {
  getHeaderParagraphs(paper, latinFont, devanagariFont) {
    const { settings, meta } = paper;
    const paras: Paragraph[] = [];
    const institute = settings.header.instituteName || "NATIONAL TESTING SERVICES";
    const hasDev = DEVANAGARI_REGEX.test(institute);

    paras.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: institute.toUpperCase(),
            bold: true,
            size: 24, // 12pt
            font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
          })
        ]
      })
    );

    const subParts: string[] = [];
    if (meta.examName || paper.title) subParts.push(meta.examName || paper.title);
    if (meta.totalMarks) subParts.push(`Marks: ${meta.totalMarks}`);
    if (meta.durationMin) subParts.push(`Time: ${meta.durationMin}m`);

    const subText = subParts.join("   |   ");
    const hasSubDev = DEVANAGARI_REGEX.test(subText);
    paras.push(
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 0, after: 100 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 12, color: "000000" }
        },
        children: [
          new TextRun({
            text: subText,
            size: 18,
            font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasSubDev ? "cs" : "default" }
          })
        ]
      })
    );

    return paras;
  },

  getFooterChildren(paper, latinFont) {
    return [
      new TextRun({
        text: `${paper.title}                                          Page `,
        size: 16,
        font: { ascii: latinFont, hAnsi: latinFont }
      }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
      new TextRun({ text: " of ", size: 16, font: { ascii: latinFont, hAnsi: latinFont } }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 })
    ];
  },

  getSectionHeadingParagraph(title, _paper, headingSize, latinFont, devanagariFont) {
    const hasDev = DEVANAGARI_REGEX.test(title);
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      spacing: { before: 160, after: 100 },
      keepNext: true,
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 10, color: "000000" }
      },
      children: [
        new TextRun({
          text: title.toUpperCase(),
          bold: true,
          size: headingSize,
          font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
        })
      ]
    });
  },

  getPageBorders(paper) {
    return getCommonPageBorders(paper.settings.border);
  }
};

// 3. Compact Aptitude Test Template DOCX Hooks
const compactAptitudeHooks: DocxTemplateHooks = {
  getHeaderParagraphs(paper, latinFont, devanagariFont) {
    const { settings, meta } = paper;
    const paras: Paragraph[] = [];
    const institute = settings.header.instituteName || "COMPETITIVE EXAM ACADEMY";
    const exam = meta.examName || paper.title;
    const hasDev = DEVANAGARI_REGEX.test(institute) || DEVANAGARI_REGEX.test(exam);

    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" }
        },
        children: [
          new TextRun({
            text: `${institute.toUpperCase()}  |  ${exam.toUpperCase()}`,
            bold: true,
            size: 20, // 10pt
            font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
          })
        ]
      })
    );

    return paras;
  },

  getFooterChildren(_paper, latinFont) {
    return [
      new TextRun({
        text: "P. ",
        bold: true,
        size: 16,
        font: { ascii: latinFont, hAnsi: latinFont }
      }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16 })
    ];
  },

  getSectionHeadingParagraph(title, _paper, headingSize, latinFont, devanagariFont) {
    const hasDev = DEVANAGARI_REGEX.test(title);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 60 },
      keepNext: true,
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: headingSize,
          font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
        })
      ]
    });
  },

  getPageBorders(paper) {
    return getCommonPageBorders(paper.settings.border);
  }
};

// 4. Modern Academy Template DOCX Hooks
const modernAcademyHooks: DocxTemplateHooks = {
  getHeaderParagraphs(paper, latinFont, devanagariFont) {
    const { settings, meta } = paper;
    const paras: Paragraph[] = [];
    const institute = settings.header.instituteName || "BHARAT ACADEMY OF EXCELLENCE";
    const hasDev = DEVANAGARI_REGEX.test(institute);

    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 40 },
        children: [
          new TextRun({
            text: institute.toUpperCase(),
            bold: true,
            size: 26,
            font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
          })
        ]
      })
    );

    const subTitle = settings.header.subtitle || meta.examName || paper.title;
    const hasSubDev = DEVANAGARI_REGEX.test(subTitle);
    paras.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 120 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" }
        },
        children: [
          new TextRun({
            text: subTitle,
            size: 18,
            font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasSubDev ? "cs" : "default" }
          })
        ]
      })
    );

    return paras;
  },

  getFooterChildren(_paper, latinFont) {
    return [
      new TextRun({
        text: "PaperStudio Academic Series                    Page ",
        size: 16,
        font: { ascii: latinFont, hAnsi: latinFont }
      }),
      new TextRun({ children: [PageNumber.CURRENT], size: 16 }),
      new TextRun({ text: " of ", size: 16, font: { ascii: latinFont, hAnsi: latinFont } }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16 })
    ];
  },

  getSectionHeadingParagraph(title, _paper, headingSize, latinFont, devanagariFont) {
    const hasDev = DEVANAGARI_REGEX.test(title);
    return new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 140, after: 100 },
      keepNext: true,
      border: {
        top: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 8, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 8, color: "000000" }
      },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: headingSize,
          font: { ascii: latinFont, hAnsi: latinFont, cs: devanagariFont, hint: hasDev ? "cs" : "default" }
        })
      ]
    });
  },

  getPageBorders(paper) {
    return getCommonPageBorders(paper.settings.border);
  }
};

function getCommonPageBorders(border: PaperType["settings"]["border"]) {
  if (border.style === "double") {
    return {
      pageBorders: {
        offsetFrom: PageBorderOffsetFrom.PAGE
      },
      pageBorderTop: { style: BorderStyle.DOUBLE, size: 24, space: 16, color: "000000" },
      pageBorderRight: { style: BorderStyle.DOUBLE, size: 24, space: 16, color: "000000" },
      pageBorderBottom: { style: BorderStyle.DOUBLE, size: 24, space: 16, color: "000000" },
      pageBorderLeft: { style: BorderStyle.DOUBLE, size: 24, space: 16, color: "000000" }
    };
  }

  if (border.style === "single") {
    return {
      pageBorders: {
        offsetFrom: PageBorderOffsetFrom.PAGE
      },
      pageBorderTop: { style: BorderStyle.SINGLE, size: 12, space: 16, color: "000000" },
      pageBorderRight: { style: BorderStyle.SINGLE, size: 12, space: 16, color: "000000" },
      pageBorderBottom: { style: BorderStyle.SINGLE, size: 12, space: 16, color: "000000" },
      pageBorderLeft: { style: BorderStyle.SINGLE, size: 12, space: 16, color: "000000" }
    };
  }

  return undefined;
}

export function getDocxTemplateHooks(templateId: string): DocxTemplateHooks {
  switch (templateId) {
    case "clean-professional":
      return cleanProfessionalHooks;
    case "compact-aptitude":
      return compactAptitudeHooks;
    case "modern-academy":
      return modernAcademyHooks;
    case "classic-coaching":
    default:
      return classicCoachingHooks;
  }
}
