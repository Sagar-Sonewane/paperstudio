import { TextRun, Paragraph, type IParagraphOptions } from "docx";

export interface RichTextDocxOptions {
  fontSizePt?: number;
  boldDefault?: boolean;
  italicDefault?: boolean;
  latinFont?: string;
  devanagariFont?: string;
  paragraphSpacing?: IParagraphOptions["spacing"];
  paragraphAlignment?: IParagraphOptions["alignment"];
  keepNext?: boolean;
}

const DEVANAGARI_REGEX = /[\u0900-\u097F]/;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&minus;/g, "-");
}

interface FormatState {
  bold: boolean;
  italic: boolean;
  superScript: boolean;
  subScript: boolean;
}

/**
 * Converts rich text HTML into an array of docx TextRun instances.
 * Configures font slots (ascii/hAnsi/cs) and sizes in half-points.
 */
export function htmlToTextRuns(
  htmlOrPlain: string,
  options: RichTextDocxOptions = {}
): TextRun[] {
  if (!htmlOrPlain) return [];

  const size = Math.round((options.fontSizePt ?? 10) * 2); // DOCX uses half-points
  const latinFont = options.latinFont || "Times New Roman";
  const devanagariFont = options.devanagariFont || "Mangal";

  const runs: TextRun[] = [];

  // Tokenize HTML tags and text chunks
  // Matches <tag ...>, </tag>, or text
  const tagRegex = /(<\/?([a-zA-Z0-9]+)[^>]*>)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  const state: FormatState = {
    bold: options.boldDefault ?? false,
    italic: options.italicDefault ?? false,
    superScript: false,
    subScript: false
  };

  const addChunk = (rawText: string) => {
    const text = decodeHtmlEntities(rawText);
    if (!text) return;

    const hasDevanagari = DEVANAGARI_REGEX.test(text);

    runs.push(
      new TextRun({
        text,
        bold: state.bold,
        italics: state.italic,
        superScript: state.superScript,
        subScript: state.subScript,
        size,
        font: {
          ascii: latinFont,
          hAnsi: latinFont,
          cs: devanagariFont,
          hint: hasDevanagari ? "cs" : "default"
        }
      })
    );
  };

  while ((match = tagRegex.exec(htmlOrPlain)) !== null) {
    const fullTag = match[1];
    const tagName = match[2].toLowerCase();
    const isClosing = fullTag.startsWith("</");

    // Text prior to the tag
    if (match.index > lastIndex) {
      const textChunk = htmlOrPlain.slice(lastIndex, match.index);
      addChunk(textChunk);
    }
    lastIndex = tagRegex.lastIndex;

    // Handle tag transitions
    if (tagName === "br") {
      runs.push(new TextRun({ break: 1, size }));
    } else if (tagName === "b" || tagName === "strong") {
      state.bold = !isClosing || (options.boldDefault ?? false);
    } else if (tagName === "i" || tagName === "em") {
      state.italic = !isClosing || (options.italicDefault ?? false);
    } else if (tagName === "sup") {
      state.superScript = !isClosing;
      if (!isClosing) state.subScript = false;
    } else if (tagName === "sub") {
      state.subScript = !isClosing;
      if (!isClosing) state.superScript = false;
    }
  }

  // Trailing text after last tag
  if (lastIndex < htmlOrPlain.length) {
    addChunk(htmlOrPlain.slice(lastIndex));
  }

  // Fallback if empty
  if (runs.length === 0 && htmlOrPlain.trim().length > 0) {
    const plain = decodeHtmlEntities(htmlOrPlain.replace(/<[^>]*>/g, ""));
    const hasDevanagari = DEVANAGARI_REGEX.test(plain);
    runs.push(
      new TextRun({
        text: plain,
        bold: options.boldDefault ?? false,
        italics: options.italicDefault ?? false,
        size,
        font: {
          ascii: latinFont,
          hAnsi: latinFont,
          cs: devanagariFont,
          hint: hasDevanagari ? "cs" : "default"
        }
      })
    );
  }

  return runs;
}

/**
 * Converts rich text HTML into one or more docx Paragraph instances.
 * Splits on block elements like <p>...</p> or creates a single paragraph.
 */
export function htmlToParagraphs(
  htmlOrPlain: string,
  options: RichTextDocxOptions = {}
): Paragraph[] {
  if (!htmlOrPlain) return [];

  // Check if text has multiple <p> tags
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const pMatches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = pRegex.exec(htmlOrPlain)) !== null) {
    if (match[1].trim()) {
      pMatches.push(match[1]);
    }
  }

  if (pMatches.length > 0) {
    return pMatches.map((content) => {
      const runs = htmlToTextRuns(content, options);
      return new Paragraph({
        children: runs,
        spacing: options.paragraphSpacing,
        alignment: options.paragraphAlignment,
        keepNext: options.keepNext
      });
    });
  }

  const runs = htmlToTextRuns(htmlOrPlain, options);
  return [
    new Paragraph({
      children: runs,
      spacing: options.paragraphSpacing,
      alignment: options.paragraphAlignment,
      keepNext: options.keepNext
    })
  ];
}
