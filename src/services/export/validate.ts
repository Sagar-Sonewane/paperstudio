import type { PaperType, QuestionItem } from "../../domain/model.ts";
import { paginatePaper } from "../layout/paginate.ts";

export type ValidationSeverity = "error" | "warning";

export type ValidationCategory =
  | "empty_question"
  | "duplicate_number"
  | "missing_media"
  | "oversized"
  | "legacy_font";

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  category: ValidationCategory;
  message: string;
  sectionId?: string;
  itemId?: string;
}

export interface ExportValidationSummary {
  canExport: boolean;
  errorsCount: number;
  warningsCount: number;
  issues: ValidationIssue[];
  stats: {
    questionCount: number;
    sectionCount: number;
    mediaCount: number;
    estimatedPageCount?: number;
  };
}

export interface ValidationOptions {
  checkMediaExists?: (mediaId: string) => Promise<boolean>;
  skipPaginationCheck?: boolean;
}

/**
 * Checks if question content has meaningful text
 */
function isQuestionEmpty(q: QuestionItem): boolean {
  const plain = (q.content.plain || "").trim();
  if (plain.length > 0) return false;

  const html = (q.content.html || "")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim();

  return html.length === 0 && q.mediaIds.length === 0;
}

/**
 * Pre-export validation for PaperStudio.
 * Analyzes paper model against export constraints:
 * - Empty questions (no stem text or media)
 * - Duplicate custom question numbers
 * - Missing referenced media items
 * - Oversized blocks that exceed printable column height
 * - Legacy Hindi font warnings carried over from import
 */
export async function validatePaperForExport(
  paper: PaperType,
  options: ValidationOptions = {}
): Promise<ExportValidationSummary> {
  const issues: ValidationIssue[] = [];
  let questionCount = 0;
  let mediaCount = 0;

  // Track custom numbers for duplicate detection
  const customNumberOccurrences = new Map<string, string[]>(); // number -> itemIds[]

  // Gather referenced media IDs
  const referencedMediaIds = new Set<string>();
  if (paper.settings.header.logoMediaId) {
    referencedMediaIds.add(paper.settings.header.logoMediaId);
  }

  for (const section of paper.sections) {
    for (const item of section.items) {
      if (item.kind === "question") {
        questionCount++;

        // 1. Check empty question
        if (isQuestionEmpty(item)) {
          issues.push({
            id: `empty_${item.id}`,
            severity: "warning",
            category: "empty_question",
            message: `Question in section "${section.title || "Untitled"}" has no text.`,
            sectionId: section.id,
            itemId: item.id
          });
        }

        // 2. Track custom numbers
        if (item.customNumber && item.customNumber.trim() !== "") {
          const num = item.customNumber.trim();
          const existing = customNumberOccurrences.get(num) || [];
          existing.push(item.id);
          customNumberOccurrences.set(num, existing);
        }

        // 3. Track media IDs
        for (const mid of item.mediaIds) {
          referencedMediaIds.add(mid);
        }
        for (const opt of item.options) {
          if (opt.mediaId) {
            referencedMediaIds.add(opt.mediaId);
          }
        }

        // 4. Check legacy Hindi font warnings
        if (item.review && item.review.warnings) {
          for (const warn of item.review.warnings) {
            if (
              warn.toLowerCase().includes("legacy") ||
              warn.toLowerCase().includes("font") ||
              warn.toLowerCase().includes("kruti") ||
              warn.toLowerCase().includes("devlys")
            ) {
              issues.push({
                id: `legacy_${item.id}`,
                severity: "warning",
                category: "legacy_font",
                message: `Legacy Hindi font warning: ${warn}`,
                sectionId: section.id,
                itemId: item.id
              });
              break;
            }
          }
        }
      }
    }
  }

  mediaCount = referencedMediaIds.size;

  // 2b. Evaluate duplicate numbers
  for (const [num, ids] of customNumberOccurrences.entries()) {
    if (ids.length > 1) {
      for (const id of ids) {
        issues.push({
          id: `dup_num_${num}_${id}`,
          severity: "warning",
          category: "duplicate_number",
          message: `Custom question number "${num}" is duplicated across multiple questions.`,
          itemId: id
        });
      }
    }
  }

  // 3b. Verify media existence if checker callback provided
  if (options.checkMediaExists && referencedMediaIds.size > 0) {
    for (const mid of referencedMediaIds) {
      const exists = await options.checkMediaExists(mid);
      if (!exists) {
        issues.push({
          id: `missing_media_${mid}`,
          severity: "error",
          category: "missing_media",
          message: `Media file referenced in paper (ID: ${mid}) was not found in storage.`
        });
      }
    }
  }

  // 4b. Check oversized blocks using layout paginator
  let estimatedPageCount: number | undefined;
  if (!options.skipPaginationCheck && questionCount > 0) {
    try {
      const layoutResult = await paginatePaper(paper);
      estimatedPageCount = layoutResult.pages.length;
      for (let i = 0; i < layoutResult.warnings.length; i++) {
        const warn = layoutResult.warnings[i];
        issues.push({
          id: `oversized_${i}`,
          severity: "warning",
          category: "oversized",
          message: warn
        });
      }
    } catch (err: any) {
      console.warn("Could not calculate pagination for export validation:", err);
    }
  }

  const errorsCount = issues.filter((i) => i.severity === "error").length;
  const warningsCount = issues.filter((i) => i.severity === "warning").length;

  return {
    canExport: errorsCount === 0,
    errorsCount,
    warningsCount,
    issues,
    stats: {
      questionCount,
      sectionCount: paper.sections.length,
      mediaCount,
      estimatedPageCount
    }
  };
}

