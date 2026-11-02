import type { LayoutSettingsType, PaperItem } from "../../domain/model.ts";

export const MM_TO_PX = 3.779527559; // Standard 96 DPI screen/print conversion

export interface LayoutDimensions {
  pageWidthPx: number;
  pageHeightPx: number;
  marginTopPx: number;
  marginRightPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  headerHeightPx: number;
  footerHeightPx: number;
  columnCount: number;
  columnGapPx: number;
  columnWidthPx: number;
  maxColumnHeightPx: number;
}

export function calcDimensions(settings: LayoutSettingsType): LayoutDimensions {
  const isA4 = settings.page.size === "A4";
  const isLandscape = settings.page.orientation === "landscape";

  const rawWidthMm = isA4 ? 210 : 215.9;
  const rawHeightMm = isA4 ? 297 : 279.4;

  const widthMm = isLandscape ? rawHeightMm : rawWidthMm;
  const heightMm = isLandscape ? rawWidthMm : rawHeightMm;

  const pageWidthPx = Math.round(widthMm * MM_TO_PX);
  const pageHeightPx = Math.round(heightMm * MM_TO_PX);

  const marginTopPx = Math.round(settings.page.marginMm.t * MM_TO_PX);
  const marginRightPx = Math.round(settings.page.marginMm.r * MM_TO_PX);
  const marginBottomPx = Math.round(settings.page.marginMm.b * MM_TO_PX);
  const marginLeftPx = Math.round(settings.page.marginMm.l * MM_TO_PX);

  // Reserved space for header and footer in Classic template
  const headerHeightPx = 80; // Title, Subtitle, Student meta row (~21mm)
  const footerHeightPx = 40; // Page number and border padding (~10.5mm)

  const columnCount = settings.columns.count || 2;
  const columnGapPx = Math.round(settings.columns.gapMm * MM_TO_PX);

  const availableWidthPx = pageWidthPx - marginLeftPx - marginRightPx;
  const totalGapWidthPx = (columnCount - 1) * columnGapPx;
  const columnWidthPx = Math.floor((availableWidthPx - totalGapWidthPx) / columnCount);

  // Net column height inside border
  const borderInsetPx = Math.round(settings.border.insetMm * MM_TO_PX * 2);
  const maxColumnHeightPx = pageHeightPx - marginTopPx - marginBottomPx - headerHeightPx - footerHeightPx - borderInsetPx;

  return {
    pageWidthPx,
    pageHeightPx,
    marginTopPx,
    marginRightPx,
    marginBottomPx,
    marginLeftPx,
    headerHeightPx,
    footerHeightPx,
    columnCount,
    columnGapPx,
    columnWidthPx,
    maxColumnHeightPx: Math.max(200, maxColumnHeightPx)
  };
}

export interface LayoutBlock {
  id: string; // unique block id
  itemId: string; // reference to domain Item ID
  sectionId: string;
  kind: "question" | "heading" | "instruction";
  item: PaperItem;
  html: string;
  derivedNumber?: string;
  heightPx: number;
  isOversized?: boolean;
}

export interface ColumnLayout {
  columnIndex: number;
  blocks: LayoutBlock[];
  usedHeightPx: number;
  maxHeightPx: number;
}

export interface PageLayout {
  pageNumber: number;
  columns: ColumnLayout[];
  warnings: string[];
}
