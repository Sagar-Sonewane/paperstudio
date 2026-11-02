import { Paper, type PaperType } from "./model.ts";

export interface ValidationIssue {
  path: string;
  message: string;
  severity: "error" | "warning";
}

export interface ValidationResult {
  valid: boolean;
  paper?: PaperType;
  issues: ValidationIssue[];
}

/**
 * Validates paper schema and enforces structural domain rules.
 */
export function validatePaper(input: unknown): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Zod Schema parse
  const parseResult = Paper.safeParse(input);
  if (!parseResult.success) {
    for (const err of parseResult.error.issues) {
      issues.push({
        path: err.path.join("."),
        message: err.message,
        severity: "error"
      });
    }
    return { valid: false, issues };
  }

  const paper = parseResult.data;

  // 2. ID Uniqueness Check
  const seenIds = new Set<string>();
  seenIds.add(paper.id);

  for (let sIdx = 0; sIdx < paper.sections.length; sIdx++) {
    const section = paper.sections[sIdx];
    if (seenIds.has(section.id)) {
      issues.push({
        path: `sections[${sIdx}].id`,
        message: `Duplicate section ID detected: "${section.id}"`,
        severity: "error"
      });
    }
    seenIds.add(section.id);

    for (let iIdx = 0; iIdx < section.items.length; iIdx++) {
      const item = section.items[iIdx];
      if (seenIds.has(item.id)) {
        issues.push({
          path: `sections[${sIdx}].items[${iIdx}].id`,
          message: `Duplicate item ID detected: "${item.id}"`,
          severity: "error"
        });
      }
      seenIds.add(item.id);

      if (item.kind === "question") {
        if (!item.content.html || item.content.html.trim() === "") {
          issues.push({
            path: `sections[${sIdx}].items[${iIdx}].content`,
            message: `Question has empty content text.`,
            severity: "warning"
          });
        }

        if (item.type === "mcq" && item.options.length === 0) {
          issues.push({
            path: `sections[${sIdx}].items[${iIdx}].options`,
            message: `Multiple choice question has zero options.`,
            severity: "warning"
          });
        }
      }
    }
  }

  const hasErrors = issues.some((i) => i.severity === "error");
  return {
    valid: !hasErrors,
    paper: hasErrors ? undefined : paper,
    issues
  };
}

