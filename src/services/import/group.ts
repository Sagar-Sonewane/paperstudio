import { createId } from "../../domain/ids.ts";
import type { QuestionType } from "../../domain/model.ts";
import type { ClassifiedBlock } from "./classify.ts";

export interface ReviewItem {
  id: string;
  kind: "question" | "heading" | "instruction" | "other";
  type?: QuestionType; // mcq, short, long, image
  number?: string;
  content: { html: string; plain: string };
  options: { id: string; label: string; content: { html: string; plain: string } }[];
  mediaIds: string[];
  confidence: number;
  warnings: string[];
}

export function groupClassifiedBlocks(blocks: ClassifiedBlock[]): {
  items: ReviewItem[];
  meta: {
    instituteName?: string;
    examName?: string;
    date?: string;
    totalMarks?: number;
    durationMin?: number;
  };
} {
  const items: ReviewItem[] = [];
  const meta: {
    instituteName?: string;
    examName?: string;
    date?: string;
    totalMarks?: number;
    durationMin?: number;
  } = {};

  let currentQuestion: ReviewItem | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Skip empty blocks
    if (block.kind === "empty") continue;

    // Header metadata extraction
    if (block.kind === "header_meta") {
      const text = block.rawText;
      const marksMatch = text.match(/(?:Total Marks|Max(?:imum)? Marks)[\s\:\.\-]+(\d+)/i);
      if (marksMatch) meta.totalMarks = parseInt(marksMatch[1], 10);

      const timeMatch = text.match(/(?:Time|Duration)[\s\:\.\-]+(\d+)\s*(?:Mins?|Minutes|Hours?|Hrs?)/i);
      if (timeMatch) {
        const val = parseInt(timeMatch[1], 10);
        meta.durationMin = text.toLowerCase().includes("hour") ? val * 60 : val;
      }

      const dateMatch = text.match(/Date[\s\:\.\-]+([^\n\,]+)/i);
      if (dateMatch) meta.date = dateMatch[1].trim();

      // If text contains an institute title at top
      if (
        (text.toUpperCase().includes("COACHING") ||
          text.toUpperCase().includes("ACADEMY") ||
          text.toUpperCase().includes("INSTITUTE") ||
          text.toUpperCase().includes("CLASSES") ||
          text.toUpperCase().includes("SCHOOL")) &&
        !meta.instituteName
      ) {
        meta.instituteName = text.split("\n")[0].trim();
      }
      continue;
    }

    // Heading block
    if (block.kind === "heading") {
      currentQuestion = null; // reset question context
      items.push({
        id: createId(),
        kind: "heading",
        content: {
          html: block.stemHtml || block.html || `<p>${block.rawText}</p>`,
          plain: block.stemText || block.rawText
        },
        options: [],
        mediaIds: [...block.mediaIds],
        confidence: block.confidence,
        warnings: [...block.warnings]
      });
      continue;
    }

    // Instruction block
    if (block.kind === "instruction") {
      currentQuestion = null; // reset question context
      items.push({
        id: createId(),
        kind: "instruction",
        content: {
          html: block.stemHtml || block.html || `<p>${block.rawText}</p>`,
          plain: block.stemText || block.rawText
        },
        options: [],
        mediaIds: [...block.mediaIds],
        confidence: block.confidence,
        warnings: [...block.warnings]
      });
      continue;
    }

    // Option block
    if (block.kind === "option") {
      if (currentQuestion) {
        // Attach options to current question
        if (block.inlineOptions && block.inlineOptions.length > 0) {
          for (const opt of block.inlineOptions) {
            currentQuestion.options.push({
              id: createId(),
              label: opt.label,
              content: { html: opt.html || `<p>${opt.text}</p>`, plain: opt.text }
            });
          }
        } else if (block.optionLabel) {
          currentQuestion.options.push({
            id: createId(),
            label: block.optionLabel,
            content: {
              html: block.stemHtml || `<p>${block.stemText || block.rawText}</p>`,
              plain: block.stemText || block.rawText
            }
          });
        }
        if (block.mediaIds.length > 0) {
          currentQuestion.mediaIds.push(...block.mediaIds);
        }
        // Update question type to MCQ
        currentQuestion.type = "mcq";
      } else {
        // Dangling option without question
        const warnings = [...block.warnings, "Option found without preceding question. Review type or merge."];
        items.push({
          id: createId(),
          kind: "other",
          content: {
            html: block.html || `<p>${block.rawText}</p>`,
            plain: block.rawText
          },
          options: [],
          mediaIds: [...block.mediaIds],
          confidence: 0.5,
          warnings
        });
      }
      continue;
    }

    // Question block
    if (block.kind === "question") {
      const qOptions: { id: string; label: string; content: { html: string; plain: string } }[] = [];
      if (block.inlineOptions && block.inlineOptions.length > 0) {
        for (const opt of block.inlineOptions) {
          qOptions.push({
            id: createId(),
            label: opt.label,
            content: { html: opt.html || `<p>${opt.text}</p>`, plain: opt.text }
          });
        }
      }

      const qItem: ReviewItem = {
        id: createId(),
        kind: "question",
        type: qOptions.length > 0 ? "mcq" : "short",
        number: block.questionNumber,
        content: {
          html: block.stemHtml || `<p>${block.stemText || block.rawText}</p>`,
          plain: block.stemText || block.rawText
        },
        options: qOptions,
        mediaIds: [...block.mediaIds],
        confidence: block.confidence,
        warnings: [...block.warnings]
      };

      items.push(qItem);
      currentQuestion = qItem;
      continue;
    }

    // Word Shapes / SmartArt
    if (block.kind === "shape") {
      const warnings = [...block.warnings];
      if (currentQuestion && block.mediaIds.length > 0) {
        // Attach extracted image to current question
        currentQuestion.mediaIds.push(...block.mediaIds);
        currentQuestion.warnings.push("Attached Word drawing/shape to question.");
      } else {
        items.push({
          id: createId(),
          kind: "other",
          content: {
            html: block.html || `<p>[Shape / Drawing: ${block.rawText || "Word Drawing"}]</p>`,
            plain: block.rawText || "[Shape / Drawing]"
          },
          options: [],
          mediaIds: [...block.mediaIds],
          confidence: 0.6,
          warnings
        });
      }
      continue;
    }

    // Unclassified Block
    if (block.kind === "unclassified") {
      // Check if image-only block
      if (block.mediaIds.length > 0 && block.rawText.length < 5) {
        if (currentQuestion) {
          currentQuestion.mediaIds.push(...block.mediaIds);
          continue;
        } else {
          items.push({
            id: createId(),
            kind: "question",
            type: "image",
            content: {
              html: `<p>[Question Image]</p>`,
              plain: "[Question Image]"
            },
            options: [],
            mediaIds: [...block.mediaIds],
            confidence: 0.8,
            warnings: ["Extracted image block without text."]
          });
          continue;
        }
      }

      items.push({
        id: createId(),
        kind: "other",
        content: {
          html: block.html || `<p>${block.rawText}</p>`,
          plain: block.rawText
        },
        options: [],
        mediaIds: [...block.mediaIds],
        confidence: 0.5,
        warnings: [...block.warnings]
      });
    }
  }

  // Refine question confidences and types
  for (const it of items) {
    if (it.kind === "question") {
      if (it.options.length >= 4) {
        it.type = "mcq";
        it.confidence = Math.max(it.confidence, 0.98);
      } else if (it.options.length > 0) {
        it.type = "mcq";
        it.warnings.push(`Question has ${it.options.length} options (standard is 4).`);
        it.confidence = Math.min(it.confidence, 0.85);
      } else {
        it.type = "short";
      }
    }
  }

  return { items, meta };
}

