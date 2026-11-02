import type { SectionType } from "./model.ts";

export interface NumberingOptions {
  format?: string; // e.g. "Q. {n}.", "{n}.", "प्र. {n}."
  startFrom?: number;
}

/**
 * Derives visible question numbers for all questions across sections.
 * Strictly adheres to rule:
 * - Question numbers are derived at display time, never stored as keys or identifiers.
 * - Walk sections in order, increment counter for each question without `customNumber`.
 * - Custom numbers override derived numbers for that specific question.
 */
export function deriveQuestionNumbers(
  sections: SectionType[],
  options: NumberingOptions = {}
): Map<string, string> {
  const numberMap = new Map<string, string>();
  let currentCounter = options.startFrom ?? 1;

  for (const section of sections) {
    for (const item of section.items) {
      if (item.kind === "question") {
        if (item.customNumber && item.customNumber.trim() !== "") {
          numberMap.set(item.id, item.customNumber.trim());
        } else {
          const formatted = String(currentCounter);
          numberMap.set(item.id, formatted);
          currentCounter++;
        }
      }
    }
  }

  return numberMap;
}

/**
 * Format a derived number into a template string (e.g. "Q. 1." or "प्र. 1.").
 */
export function formatQuestionNumber(numStr: string, formatTemplate = "Q. {n}."): string {
  if (!formatTemplate.includes("{n}")) {
    return `${numStr}.`;
  }
  return formatTemplate.replace("{n}", numStr);
}

/**
 * Get option label by index and style (e.g. 0 -> "(A)", 1 -> "(B)", or Devanagari 0 -> "(अ)").
 */
export function getOptionLabel(index: number, style = "({L})"): string {
  const LATIN_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const DEVANAGARI_LETTERS = ["अ", "ब", "स", "द", "य", "र", "ल", "व"];

  const latinChar = LATIN_LETTERS[index] || String.fromCharCode(65 + index);
  const devanagariChar = DEVANAGARI_LETTERS[index] || latinChar;

  if (style.includes("{DEV}")) {
    return style.replace("{DEV}", devanagariChar);
  }
  if (style.includes("{l}")) {
    return style.replace("{l}", latinChar.toLowerCase());
  }
  if (style.includes("{n}")) {
    return style.replace("{n}", String(index + 1));
  }
  // Default: {L}
  return style.replace("{L}", latinChar);
}

