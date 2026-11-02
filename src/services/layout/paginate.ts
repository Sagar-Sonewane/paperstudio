import { calcDimensions, type LayoutBlock, type PageLayout, type ColumnLayout } from "./rules.ts";
import { measureBlockHeight } from "./measure.ts";
import { deriveQuestionNumbers, formatQuestionNumber, getOptionLabel } from "../../domain/numbering.ts";
import type { PaperType } from "../../domain/model.ts";
import { db } from "../storage/db.ts";

function generateBlockHtml(
  block: Omit<LayoutBlock, "heightPx">,
  optionLayoutDefault = "two-column",
  templateId = "classic-coaching",
  diagramSvgMap?: Map<string, string>,
  mediaUrlMap?: Map<string, string>
): string {
  if (block.kind === "heading") {
    if (templateId === "clean-professional") {
      return `<div class="block-heading" data-block-id="${block.id}" style="font-weight: 700; text-align: left; border-bottom: 2px solid #000; padding: 2px 0 4px 0; margin: 8px 0 6px 0; text-transform: uppercase; font-size: 1.05em;">${block.html}</div>`;
    }
    if (templateId === "compact-aptitude") {
      return `<div class="block-heading" data-block-id="${block.id}" style="font-weight: 700; text-align: center; border-bottom: 1px solid #000; padding: 2px; margin: 4px 0; font-size: 0.9em;">${block.html}</div>`;
    }
    if (templateId === "modern-academy") {
      return `<div class="block-heading" data-block-id="${block.id}" style="font-weight: 700; text-align: center; border: 1.5px solid #000; padding: 3px 6px; margin: 6px 0; background-color: #f8fafc; letter-spacing: 0.5px;">${block.html}</div>`;
    }
    // Classic Coaching or default
    return `<div class="block-heading" data-block-id="${block.id}" style="font-weight: 700; text-align: center; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px; margin: 6px 0; background-color: #f8fafc;">${block.html}</div>`;
  }

  if (block.kind === "instruction") {
    return `<div class="block-instruction" data-block-id="${block.id}" style="font-style: italic; margin-bottom: 6px; padding: 2px 4px; color: #334155;">${block.html}</div>`;
  }

  // Question block
  const item = block.item;
  if (item.kind !== "question") return block.html;

  const qNum = block.derivedNumber ? formatQuestionNumber(block.derivedNumber) : "";
  const stem = `<div class="question-stem" style="font-weight: 700; margin-bottom: 4px; text-align: justify;"><span class="q-num">${qNum} </span>${item.content.html || item.content.plain || ""}</div>`;

  let diagramHtml = "";
  if (item.diagramId && diagramSvgMap?.has(item.diagramId)) {
    const rawSvg = diagramSvgMap.get(item.diagramId)!;
    diagramHtml = `<div class="question-diagram-container" data-diagram-id="${item.diagramId}" style="display: flex; justify-content: center; align-items: center; margin: 6px auto; max-width: 100%; overflow: hidden;">${rawSvg}</div>`;
  }

  let mediaHtml = "";
  if (item.mediaIds && item.mediaIds.length > 0 && mediaUrlMap) {
    for (const mId of item.mediaIds) {
      if (mediaUrlMap.has(mId)) {
        mediaHtml += `<div class="question-media-container" data-media-id="${mId}" style="text-align: center; margin: 4px auto;"><img src="${mediaUrlMap.get(mId)}" style="max-width: 85%; max-height: 140px; object-fit: contain; margin: 0 auto; display: block;" /></div>`;
      }
    }
  }

  let optionsHtml = "";
  if (item.options && item.options.length > 0) {
    const layout = item.optionLayout === "auto" ? optionLayoutDefault : item.optionLayout;
    const optionItems = item.options.map((opt, idx) => {
      const label = getOptionLabel(idx);
      const text = opt.content.html || opt.content.plain || "";
      return `<div class="option-item" style="font-size: 0.9em; word-break: break-word;"><span class="opt-label" style="font-weight: 600;">${label} </span>${text}</div>`;
    });

    if (layout === "two-column") {
      optionsHtml = `<div class="options-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; padding-left: 4px;">${optionItems.join("")}</div>`;
    } else if (layout === "inline") {
      optionsHtml = `<div class="options-inline" style="display: flex; flex-wrap: wrap; gap: 12px; padding-left: 4px;">${optionItems.join("")}</div>`;
    } else {
      // vertical
      optionsHtml = `<div class="options-vertical" style="display: flex; flex-direction: column; gap: 3px; padding-left: 4px;">${optionItems.join("")}</div>`;
    }
  }

  return `<div class="block-question" data-block-id="${block.id}" data-item-id="${item.id}" style="margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">${stem}${diagramHtml}${mediaHtml}${optionsHtml}</div>`;
}

/**
 * Packs paper into multi-column A4 pages enforcing:
 * - Keep-Together: Question stem, diagrams, and options stay in one column.
 * - Keep-With-Next: Headings never sit alone at column bottoms.
 * - Oversized Detection: Emits warning if a single block exceeds column height.
 */
export async function paginatePaper(
  paper: PaperType,
  customDiagrams?: Map<string, string>
): Promise<{
  pages: PageLayout[];
  warnings: string[];
  dimensions: ReturnType<typeof calcDimensions>;
}> {
  const dimensions = calcDimensions(paper.settings);
  const derivedNumbers = deriveQuestionNumbers(paper.sections);
  const warnings: string[] = [];

  // Pre-load diagram SVGs and media URLs
  const diagramSvgMap = new Map<string, string>();
  const mediaUrlMap = new Map<string, string>();

  if (customDiagrams) {
    for (const [dId, svg] of customDiagrams.entries()) {
      diagramSvgMap.set(dId, svg);
    }
  }

  for (const section of paper.sections) {
    for (const item of section.items) {
      if (item.kind === "question") {
        if (item.diagramId && !diagramSvgMap.has(item.diagramId)) {
          try {
            const rec = await db.diagrams.get(item.diagramId);
            if (rec?.svg) {
              diagramSvgMap.set(item.diagramId, rec.svg);
            }
          } catch {
            // Storage fallback
          }
        }
        for (const mId of item.mediaIds) {
          if (!mediaUrlMap.has(mId)) {
            try {
              const mRec = await db.media.get(mId);
              if (mRec?.blob && typeof window !== "undefined" && typeof URL !== "undefined") {
                mediaUrlMap.set(mId, URL.createObjectURL(mRec.blob));
              }
            } catch {
              // Storage fallback
            }
          }
        }
      }
    }
  }

  // 1. Flatten items to layout blocks
  const unmeasuredBlocks: Omit<LayoutBlock, "heightPx">[] = [];

  for (const section of paper.sections) {
    if (section.title) {
      unmeasuredBlocks.push({
        id: `blk_${section.id}_title`,
        itemId: section.id,
        sectionId: section.id,
        kind: "heading",
        item: {
          kind: "heading",
          id: section.id,
          content: { html: section.title, plain: section.title }
        },
        html: section.title
      });
    }

    if (section.instructions && section.instructions.html) {
      unmeasuredBlocks.push({
        id: `blk_${section.id}_inst`,
        itemId: section.id,
        sectionId: section.id,
        kind: "instruction",
        item: {
          kind: "instruction",
          id: `${section.id}_inst`,
          content: section.instructions
        },
        html: section.instructions.html
      });
    }

    for (const item of section.items) {
      const derivedNumber = item.kind === "question" ? derivedNumbers.get(item.id) : undefined;
      unmeasuredBlocks.push({
        id: `blk_${item.id}`,
        itemId: item.id,
        sectionId: section.id,
        kind: item.kind,
        item,
        html: item.content.html || item.content.plain || "",
        derivedNumber
      });
    }
  }

  // 2. Measure blocks
  const blocks: LayoutBlock[] = [];
  for (const unmeasured of unmeasuredBlocks) {
    const fullHtml = generateBlockHtml(
      unmeasured,
      paper.settings.questions.optionLayout,
      paper.templateId,
      diagramSvgMap,
      mediaUrlMap
    );
    const heightPx = await measureBlockHeight(
      { ...unmeasured, html: fullHtml, heightPx: 0 },
      dimensions.columnWidthPx,
      paper.settings
    );

    const isOversized = heightPx > dimensions.maxColumnHeightPx;
    if (isOversized) {
      const label = unmeasured.derivedNumber ? `Question ${unmeasured.derivedNumber}` : "Content block";
      warnings.push(`${label} is oversized (${heightPx}px) and exceeds printable column height (${dimensions.maxColumnHeightPx}px).`);
    }

    blocks.push({
      ...unmeasured,
      html: fullHtml,
      heightPx,
      isOversized
    });
  }

  // 3. Pack blocks into columns and pages
  const pages: PageLayout[] = [];

  function createEmptyColumn(idx: number): ColumnLayout {
    return {
      columnIndex: idx,
      blocks: [],
      usedHeightPx: 0,
      maxHeightPx: dimensions.maxColumnHeightPx
    };
  }

  function createNewPage(): PageLayout {
    const cols: ColumnLayout[] = [];
    for (let c = 0; c < dimensions.columnCount; c++) {
      cols.push(createEmptyColumn(c));
    }
    return {
      pageNumber: pages.length + 1,
      columns: cols,
      warnings: []
    };
  }

  let currentPage = createNewPage();
  let currentColIndex = 0;

  function advance() {
    if (currentColIndex < dimensions.columnCount - 1) {
      currentColIndex++;
    } else {
      pages.push(currentPage);
      currentPage = createNewPage();
      currentColIndex = 0;
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    let currentCol = currentPage.columns[currentColIndex];

    // Rule: Heading Keep-With-Next
    if (block.kind === "heading") {
      const nextBlock = blocks[i + 1];
      const nextHeight = nextBlock ? nextBlock.heightPx : 0;
      const combined = block.heightPx + nextHeight;

      if (currentCol.usedHeightPx + combined > dimensions.maxColumnHeightPx && currentCol.blocks.length > 0) {
        advance();
        currentCol = currentPage.columns[currentColIndex];
      }
      currentCol.blocks.push(block);
      currentCol.usedHeightPx += block.heightPx;
      continue;
    }

    // Rule: Keep-Together for Question + Options
    if (currentCol.usedHeightPx + block.heightPx > dimensions.maxColumnHeightPx && currentCol.blocks.length > 0) {
      advance();
      currentCol = currentPage.columns[currentColIndex];
    }

    currentCol.blocks.push(block);
    currentCol.usedHeightPx += block.heightPx;
  }

  // Push final page if it contains any content
  const hasContent = currentPage.columns.some((col) => col.blocks.length > 0);
  if (hasContent || pages.length === 0) {
    pages.push(currentPage);
  }

  return {
    pages,
    warnings,
    dimensions
  };
}

