import { calcDimensions, type LayoutBlock, type PageLayout, type ColumnLayout } from "./rules.ts";
import { measureBlockHeight } from "./measure.ts";
import { deriveQuestionNumbers, formatQuestionNumber, getOptionLabel } from "../../domain/numbering.ts";
import type { PaperType } from "../../domain/model.ts";

function generateBlockHtml(
  block: Omit<LayoutBlock, "heightPx">,
  optionLayoutDefault = "two-column"
): string {
  if (block.kind === "heading") {
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

  return `<div class="block-question" data-block-id="${block.id}" data-item-id="${item.id}" style="margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid;">${stem}${optionsHtml}</div>`;
}

/**
 * Packs paper into multi-column A4 pages enforcing:
 * - Keep-Together: Question stem and options stay in one column.
 * - Keep-With-Next: Headings never sit alone at column bottoms.
 * - Oversized Detection: Emits warning if a single block exceeds column height.
 */
export async function paginatePaper(paper: PaperType): Promise<{
  pages: PageLayout[];
  warnings: string[];
  dimensions: ReturnType<typeof calcDimensions>;
}> {
  const dimensions = calcDimensions(paper.settings);
  const derivedNumbers = deriveQuestionNumbers(paper.sections);
  const warnings: string[] = [];

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
    const fullHtml = generateBlockHtml(unmeasured, paper.settings.questions.optionLayout);
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
