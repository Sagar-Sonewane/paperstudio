import type { ParsedBlock } from "./walkDocument.ts";

export type ClassifiedKind =
  | "question"
  | "option"
  | "heading"
  | "instruction"
  | "header_meta"
  | "shape"
  | "empty"
  | "unclassified";

export interface InlineOption {
  label: string;
  text: string;
  html?: string;
}

export interface ClassifiedBlock extends ParsedBlock {
  kind: ClassifiedKind;
  questionNumber?: string;
  optionLabel?: string;
  inlineOptions?: InlineOption[];
  stemText?: string;
  stemHtml?: string;
  confidence: number;
  warnings: string[];
}

// Regex patterns
const EXPLICIT_Q_PREFIX_REGEX =
  /^(?:प्र\.?|प्रश्न|Q\.?|Question|Que\.)\s*([0-9\u0966-\u096F]+)(?:[\.\)\-\:]\s*|\s+)\s*(.*)/i;

const NUMBERED_Q_REGEX =
  /^([0-9\u0966-\u096F]+)[\.\)\-\:]\s*(.*)/;

const OPTION_PREFIX_REGEX =
  /^(?:\(([A-Da-d\u0904-\u09391-4])\)|([A-Da-d\u0904-\u0939])[\.\)])\s*(.*)/;

const INLINE_PAREN_OPTIONS_REGEX =
  /\(([A-Da-d\u0904-\u09391-4])\)\s*([^(\n\r]+)/g;

const INLINE_LETTER_OPTIONS_REGEX =
  /(?:^|\s+)([A-D\u0904-\u0939])[\.\)]\s*([^A-D\u0904-\u0939\n\r]+)/g;

const HEADING_REGEX =
  /^(?:Section|SECTION|खण्ड|खंड|भाग|Part|PART)\s+[\w\u0905-\u0939\-]+/i;

const INSTRUCTION_REGEX =
  /^(?:Note|NOTE|Instructions?|INSTRUCTIONS?|नोट|निर्देश|सामान्य निर्देश)\s*[\:\.]/i;

const HEADER_META_KEYWORDS = [
  "full name",
  "student name",
  "candidate name",
  "roll no",
  "roll number",
  "total marks",
  "maximum marks",
  "max marks",
  "marks obtained",
  "parents signature",
  "invigilator signature",
  "date:",
  "time:",
  "duration:",
  "class:",
  "subject:"
];

export function classifyBlock(block: ParsedBlock): ClassifiedBlock {
  const warnings: string[] = [];
  if (block.warning) {
    warnings.push(block.warning);
  }

  const trimmed = block.rawText.trim();

  // 1. Empty block
  if (!trimmed && !block.hasDrawing && !block.hasMath && !block.hasShape && block.mediaIds.length === 0) {
    return {
      ...block,
      kind: "empty",
      confidence: 1.0,
      warnings
    };
  }

  // 2. Shape / Drawing / Text Box without meaningful text
  if (block.hasShape && trimmed.length < 5) {
    warnings.push("Word shape/text box detected. Review or replace with image.");
    return {
      ...block,
      kind: "shape",
      confidence: 0.6,
      warnings
    };
  }

  // 3. Header Metadata
  const lower = trimmed.toLowerCase();
  const isQuestion = EXPLICIT_Q_PREFIX_REGEX.test(trimmed) || NUMBERED_Q_REGEX.test(trimmed);
  const isHeaderMeta = HEADER_META_KEYWORDS.some((kw) => lower.includes(kw));
  if (isHeaderMeta && trimmed.length < 120 && !isQuestion) {
    return {
      ...block,
      kind: "header_meta",
      confidence: 0.95,
      warnings
    };
  }

  // 4. Heading
  if (HEADING_REGEX.test(trimmed)) {
    return {
      ...block,
      kind: "heading",
      stemText: trimmed,
      stemHtml: block.html,
      confidence: 0.95,
      warnings
    };
  }

  // 5. Instruction
  if (INSTRUCTION_REGEX.test(trimmed)) {
    return {
      ...block,
      kind: "instruction",
      stemText: trimmed,
      stemHtml: block.html,
      confidence: 0.95,
      warnings
    };
  }

  // 6. Question check (must check before options if line begins with a question number)
  const explicitQMatch = trimmed.match(EXPLICIT_Q_PREFIX_REGEX);
  const numberedQMatch = trimmed.match(NUMBERED_Q_REGEX);
  const questionMatch = explicitQMatch || numberedQMatch;

  if (questionMatch) {
    const qNum = questionMatch[1];
    let stem = questionMatch[2]?.trim() || "";

    // Check if question contains trailing inline options (e.g. "1. Value of x? (A) 1 (B) 2")
    const questionInlineOptions: InlineOption[] = [];
    const qInlineMatches = Array.from(stem.matchAll(INLINE_PAREN_OPTIONS_REGEX));

    if (qInlineMatches.length >= 2) {
      const firstOptIndex = stem.indexOf(qInlineMatches[0][0]);
      if (firstOptIndex > 0) {
        stem = stem.substring(0, firstOptIndex).trim();

        for (const m of qInlineMatches) {
          questionInlineOptions.push({
            label: m[1].toUpperCase(),
            text: m[2].trim(),
            html: `<p>${escapeHtml(m[2].trim())}</p>`
          });
        }
      }
    }

    return {
      ...block,
      kind: "question",
      questionNumber: qNum,
      stemText: stem,
      stemHtml: `<p>${escapeHtml(stem)}</p>`,
      inlineOptions: questionInlineOptions.length > 0 ? questionInlineOptions : undefined,
      confidence: questionInlineOptions.length > 0 ? 0.98 : 0.92,
      warnings
    };
  }

  // 7. Option check (single option line or inline option row)
  const optionMatch = trimmed.match(OPTION_PREFIX_REGEX);
  const inlineParenMatches = Array.from(trimmed.matchAll(INLINE_PAREN_OPTIONS_REGEX));
  const inlineLetterMatches = Array.from(trimmed.matchAll(INLINE_LETTER_OPTIONS_REGEX));

  // Check if line is purely options (inline options, e.g. (A) 12 (B) 14 (C) 16 (D) 18)
  if (inlineParenMatches.length >= 2 || inlineLetterMatches.length >= 2) {
    const rawMatches = inlineParenMatches.length >= 2 ? inlineParenMatches : inlineLetterMatches;
    const inlineOptions: InlineOption[] = rawMatches.map((m) => ({
      label: m[1].toUpperCase(),
      text: m[2].trim(),
      html: `<p>${escapeHtml(m[2].trim())}</p>`
    }));

    return {
      ...block,
      kind: "option",
      inlineOptions,
      confidence: 0.95,
      warnings
    };
  }

  // Standalone single option (e.g. "(A) Newton" or "B) Einstein" or "ब) एक (1)")
  if (optionMatch) {
    const label = (optionMatch[1] || optionMatch[2]).toUpperCase();
    const optText = optionMatch[3].trim();

    return {
      ...block,
      kind: "option",
      optionLabel: label,
      stemText: optText,
      stemHtml: `<p>${escapeHtml(optText)}</p>`,
      confidence: 0.95,
      warnings
    };
  }

  // 8. General Instruction phrases
  if (
    trimmed.startsWith("Note:") ||
    trimmed.startsWith("सूचना:") ||
    trimmed.startsWith("निर्देश:") ||
    /^(?:All questions|Attempt all|Choose the|Select the|Fill in the|Read the following)\b/i.test(trimmed)
  ) {
    return {
      ...block,
      kind: "instruction",
      stemText: trimmed,
      stemHtml: block.html,
      confidence: 0.9,
      warnings
    };
  }

  // 9. Fallback: Unclassified block
  warnings.push("Unclassified document block. Verify type during review.");
  return {
    ...block,
    kind: "unclassified",
    stemText: trimmed,
    stemHtml: block.html,
    confidence: 0.5,
    warnings
  };
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
