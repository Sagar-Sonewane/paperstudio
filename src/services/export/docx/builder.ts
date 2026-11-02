import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Header,
  Footer,
  AlignmentType,
  PageOrientation
} from "docx";
import type { PaperType } from "../../../domain/model.ts";
import { deriveQuestionNumbers, formatQuestionNumber, getOptionLabel } from "../../../domain/numbering.ts";
import { htmlToTextRuns } from "./richText.ts";
import { createImageParagraph, rasterizeSvgToPng, type MediaImagePayload } from "./images.ts";
import { getDocxTemplateHooks } from "./templates.ts";
import { getMediaBlob } from "../../storage/media.ts";
import { db } from "../../storage/db.ts";

export interface DocxBuildOptions {
  mediaResolver?: (mediaId: string) => Promise<MediaImagePayload | null>;
  diagramResolver?: (
    diagramId: string
  ) => Promise<{ svg: string; width: number; height: number } | null>;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

function resolveLatinFont(fontFamily?: string): string {
  if (!fontFamily) return "Times New Roman";
  if (fontFamily.includes("Arial")) return "Arial";
  if (fontFamily.includes("Calibri")) return "Calibri";
  if (fontFamily.includes("Times")) return "Times New Roman";
  if (fontFamily.includes("Cambria")) return "Cambria";

  const parts = fontFamily.split(",").map((p) => p.trim().replace(/['"]/g, ""));
  const nonDev = parts.find(
    (p) =>
      !p.toLowerCase().includes("devanagari") &&
      p.toLowerCase() !== "sans-serif" &&
      p.toLowerCase() !== "serif"
  );
  return nonDev || "Times New Roman";
}

/**
 * Builds a docx Document directly from the Paper model.
 * Adheres strictly to requirements:
 * - Page size (A4 / Letter), orientation, margins, columns and column gap
 * - Page borders (none, single, double), thickness and inset
 * - Header with institute name, subtitle, exam meta & student fields
 * - Running footer with dynamic page number and total pages
 * - Literal derived question numbers, options layout (inline, vertical, two-column)
 * - Headings with keepWithNext to avoid lone column bottoms
 * - Font slots: ascii/hAnsi for Latin, cs for Devanagari (Mangal/Nirmala UI)
 * - Rich text: bold, italic, superscript, subscript
 */
export async function buildDocxDocument(
  paper: PaperType,
  options: DocxBuildOptions = {}
): Promise<Document> {
  const { settings } = paper;

  // 1. Typography & Font Configuration
  const latinFont = resolveLatinFont(settings.typography.fontFamily);
  const devanagariFont = "Mangal"; // Standard Windows complex script font for Devanagari
  const questionPt = settings.typography.questionPt || 10;
  const optionPt = settings.typography.optionPt || 9;
  const headingPt = settings.typography.headingPt || 11;

  const questionSize = Math.round(questionPt * 2);
  const optionSize = Math.round(optionPt * 2);
  const headingSize = Math.round(headingPt * 2);

  // 2. Page Dimensions & Margins
  const isA4 = settings.page.size === "A4";
  const pageWidthTwips = isA4 ? 11906 : 12240; // 210mm or 8.5in
  const pageHeightTwips = isA4 ? 16838 : 15840; // 297mm or 11in
  const isLandscape = settings.page.orientation === "landscape";

  const width = isLandscape ? pageHeightTwips : pageWidthTwips;
  const height = isLandscape ? pageWidthTwips : pageHeightTwips;

  const marginTopTwips = Math.round((settings.page.marginMm.t || 12) * 56.7);
  const marginRightTwips = Math.round((settings.page.marginMm.r || 12) * 56.7);
  const marginBottomTwips = Math.round((settings.page.marginMm.b || 12) * 56.7);
  const marginLeftTwips = Math.round((settings.page.marginMm.l || 12) * 56.7);

  // 3. Multi-Column Setup
  const columnCount = settings.columns.count ?? 2;
  const columnGapTwips = Math.round((settings.columns.gapMm ?? 10) * 56.7);

  // 4. Template Hooks for Header, Footer & Borders
  const templateHooks = getDocxTemplateHooks(paper.templateId);
  const pageBorderConfig = templateHooks.getPageBorders(paper);
  const headerParagraphs = templateHooks.getHeaderParagraphs(paper, latinFont, devanagariFont);
  const footerChildren = templateHooks.getFooterChildren(paper, latinFont, devanagariFont);

  // 5. Body Item Generation
  const children: Paragraph[] = [];
  const derivedNumbers = deriveQuestionNumbers(paper.sections);

  // Media helper function
  async function resolveMedia(mediaId: string): Promise<MediaImagePayload | null> {
    if (options.mediaResolver) {
      return await options.mediaResolver(mediaId);
    }
    try {
      const rec = await getMediaBlob(mediaId);
      if (rec && rec.blob) {
        const ab = await rec.blob.arrayBuffer();
        return {
          bytes: new Uint8Array(ab),
          mime: rec.mime
        };
      }
    } catch (e) {
      // In tests where db isn't active
    }
    return null;
  }

  // Diagram helper function
  async function resolveDiagram(diagramId: string): Promise<Uint8Array | null> {
    if (options.diagramResolver) {
      const res = await options.diagramResolver(diagramId);
      if (res) {
        return await rasterizeSvgToPng(res.svg, res.width, res.height, 3);
      }
    }
    try {
      const rec = await db.diagrams.get(diagramId);
      if (rec && rec.svg) {
        return await rasterizeSvgToPng(rec.svg, rec.width, rec.height, 3);
      }
    } catch (e) {
      // Storage fallback
    }
    return null;
  }

  for (const section of paper.sections) {
    // Section Heading
    if (section.title && section.title.trim() !== "") {
      const titleText = section.title.trim();
      children.push(
        templateHooks.getSectionHeadingParagraph(
          titleText,
          paper,
          headingSize,
          latinFont,
          devanagariFont
        )
      );
    }

    // Section Instructions
    if (section.instructions && (section.instructions.html || section.instructions.plain)) {
      const instRuns = htmlToTextRuns(
        section.instructions.html || section.instructions.plain || "",
        {
          fontSizePt: optionPt,
          italicDefault: true,
          latinFont,
          devanagariFont
        }
      );
      children.push(
        new Paragraph({
          spacing: { before: 40, after: 80 },
          keepNext: true,
          children: instRuns
        })
      );
    }

    // Section Items
    for (const item of section.items) {
      if (item.kind === "heading") {
        const headRuns = htmlToTextRuns(item.content.html || item.content.plain || "", {
          fontSizePt: headingPt,
          boldDefault: true,
          latinFont,
          devanagariFont
        });
        children.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 120, after: 80 },
            keepNext: true,
            children: headRuns
          })
        );
      } else if (item.kind === "instruction") {
        const instRuns = htmlToTextRuns(item.content.html || item.content.plain || "", {
          fontSizePt: optionPt,
          italicDefault: true,
          latinFont,
          devanagariFont
        });
        children.push(
          new Paragraph({
            spacing: { before: 60, after: 60 },
            keepNext: true,
            children: instRuns
          })
        );
      } else if (item.kind === "question") {
        // Derive question number
        const derivedNum = derivedNumbers.get(item.id) || "1";
        const formattedNum = formatQuestionNumber(derivedNum, settings.questions.numberFormat);
        const hasNumDev = DEVANAGARI_REGEX.test(formattedNum);

        const stemRuns = htmlToTextRuns(item.content.html || item.content.plain || "", {
          fontSizePt: questionPt,
          boldDefault: true,
          latinFont,
          devanagariFont
        });

        // Question Stem Paragraph
        children.push(
          new Paragraph({
            spacing: { before: 100, after: 40 },
            keepNext: true, // Keep stem attached to options
            children: [
              new TextRun({
                text: `${formattedNum} `,
                bold: true,
                size: questionSize,
                font: {
                  ascii: latinFont,
                  hAnsi: latinFont,
                  cs: devanagariFont,
                  hint: hasNumDev ? "cs" : "default"
                }
              }),
              ...stemRuns
            ]
          })
        );

        // Attached Images
        for (const mid of item.mediaIds) {
          const payload = await resolveMedia(mid);
          if (payload) {
            children.push(
              createImageParagraph(payload.bytes, {
                originalWidth: payload.width,
                originalHeight: payload.height
              })
            );
          }
        }

        // Attached Diagram
        if (item.diagramId) {
          const pngBytes = await resolveDiagram(item.diagramId);
          if (pngBytes) {
            children.push(createImageParagraph(pngBytes));
          }
        }

        // MCQ Options
        if (item.options && item.options.length > 0) {
          const optLayout =
            item.optionLayout === "auto" ? settings.questions.optionLayout : item.optionLayout;

          if (optLayout === "inline") {
            // All options rendered in a single inline paragraph
            const inlineRuns: TextRun[] = [];
            item.options.forEach((opt, idx) => {
              const label = getOptionLabel(idx, settings.questions.optionLabelStyle);
              const hasLabelDev = DEVANAGARI_REGEX.test(label);
              if (idx > 0) {
                inlineRuns.push(new TextRun({ text: "    ", size: optionSize }));
              }
              inlineRuns.push(
                new TextRun({
                  text: `${label} `,
                  bold: true,
                  size: optionSize,
                  font: {
                    ascii: latinFont,
                    hAnsi: latinFont,
                    cs: devanagariFont,
                    hint: hasLabelDev ? "cs" : "default"
                  }
                })
              );
              inlineRuns.push(
                ...htmlToTextRuns(opt.content.html || opt.content.plain || "", {
                  fontSizePt: optionPt,
                  latinFont,
                  devanagariFont
                })
              );
            });

            children.push(
              new Paragraph({
                spacing: { before: 20, after: 100 },
                children: inlineRuns
              })
            );
          } else if (optLayout === "vertical") {
            // Each option on its own line
            item.options.forEach((opt, idx) => {
              const label = getOptionLabel(idx, settings.questions.optionLabelStyle);
              const hasLabelDev = DEVANAGARI_REGEX.test(label);
              const optRuns = htmlToTextRuns(opt.content.html || opt.content.plain || "", {
                fontSizePt: optionPt,
                latinFont,
                devanagariFont
              });

              children.push(
                new Paragraph({
                  spacing: { before: 10, after: idx === item.options.length - 1 ? 100 : 20 },
                  indent: { left: 240 },
                  children: [
                    new TextRun({
                      text: `${label} `,
                      bold: true,
                      size: optionSize,
                      font: {
                        ascii: latinFont,
                        hAnsi: latinFont,
                        cs: devanagariFont,
                        hint: hasLabelDev ? "cs" : "default"
                      }
                    }),
                    ...optRuns
                  ]
                })
              );
            });
          } else {
            // two-column layout: options in pairs (0 & 1, 2 & 3)
            for (let i = 0; i < item.options.length; i += 2) {
              const pairRuns: TextRun[] = [];

              // First option of pair
              const opt1 = item.options[i];
              const label1 = getOptionLabel(i, settings.questions.optionLabelStyle);
              const hasLabel1Dev = DEVANAGARI_REGEX.test(label1);
              pairRuns.push(
                new TextRun({
                  text: `${label1} `,
                  bold: true,
                  size: optionSize,
                  font: {
                    ascii: latinFont,
                    hAnsi: latinFont,
                    cs: devanagariFont,
                    hint: hasLabel1Dev ? "cs" : "default"
                  }
                })
              );
              pairRuns.push(
                ...htmlToTextRuns(opt1.content.html || opt1.content.plain || "", {
                  fontSizePt: optionPt,
                  latinFont,
                  devanagariFont
                })
              );

              // Second option of pair (if present)
              if (i + 1 < item.options.length) {
                const opt2 = item.options[i + 1];
                const label2 = getOptionLabel(i + 1, settings.questions.optionLabelStyle);
                const hasLabel2Dev = DEVANAGARI_REGEX.test(label2);
                pairRuns.push(new TextRun({ text: "        ", size: optionSize }));
                pairRuns.push(
                  new TextRun({
                    text: `${label2} `,
                    bold: true,
                    size: optionSize,
                    font: {
                      ascii: latinFont,
                      hAnsi: latinFont,
                      cs: devanagariFont,
                      hint: hasLabel2Dev ? "cs" : "default"
                    }
                  })
                );
                pairRuns.push(
                  ...htmlToTextRuns(opt2.content.html || opt2.content.plain || "", {
                    fontSizePt: optionPt,
                    latinFont,
                    devanagariFont
                  })
                );
              }

              children.push(
                new Paragraph({
                  spacing: {
                    before: 10,
                    after: i + 2 >= item.options.length ? 100 : 20
                  },
                  indent: { left: 240 },
                  children: pairRuns
                })
              );
            }
          }
        }
      }
    }
  }

  // 8. Assemble Document with Sections
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width,
              height,
              orientation: isLandscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT
            },
            margin: {
              top: marginTopTwips,
              right: marginRightTwips,
              bottom: marginBottomTwips,
              left: marginLeftTwips,
              header: 500,
              footer: 500
            },
            borders: pageBorderConfig
          },
          column: {
            count: columnCount,
            space: columnGapTwips
          }
        },
        headers: {
          default: new Header({
            children: headerParagraphs
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: footerChildren
              })
            ]
          })
        },
        children
      }
    ]
  });

  return doc;
}

/**
 * Builds a DOCX file and returns it as a Blob for browser downloads.
 */
export async function exportPaperToDocxBlob(
  paper: PaperType,
  options: DocxBuildOptions = {}
): Promise<Blob> {
  const doc = await buildDocxDocument(paper, options);
  const blob = await Packer.toBlob(doc);
  return blob;
}

/**
 * Builds a DOCX file and returns it as a Uint8Array buffer for testing / Node environments.
 */
export async function exportPaperToDocxBuffer(
  paper: PaperType,
  options: DocxBuildOptions = {}
): Promise<Uint8Array> {
  const doc = await buildDocxDocument(paper, options);
  const buffer = await Packer.toBuffer(doc);
  return new Uint8Array(buffer);
}
