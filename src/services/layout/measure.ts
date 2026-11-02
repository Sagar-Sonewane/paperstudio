import type { LayoutBlock } from "./rules.ts";
import type { LayoutSettingsType } from "../../domain/model.ts";

const measurementCache = new Map<string, number>();

function getCacheKey(html: string, widthPx: number, questionPt: number, lineHeight: number): string {
  return `${widthPx}_${questionPt}_${lineHeight}_${html}`;
}

let sandboxEl: HTMLElement | null = null;

function getSandbox(widthPx: number, settings: LayoutSettingsType): HTMLElement | null {
  if (typeof document === "undefined") return null;

  if (!sandboxEl) {
    sandboxEl = document.createElement("div");
    sandboxEl.id = "paperstudio-layout-sandbox";
    sandboxEl.style.position = "absolute";
    sandboxEl.style.top = "0";
    sandboxEl.style.left = "-99999px";
    sandboxEl.style.visibility = "hidden";
    sandboxEl.style.pointerEvents = "none";
    document.body.appendChild(sandboxEl);
  }

  sandboxEl.style.width = `${widthPx}px`;
  sandboxEl.style.fontFamily = settings.typography.fontFamily;
  sandboxEl.style.fontSize = `${settings.typography.questionPt}pt`;
  sandboxEl.style.lineHeight = String(settings.typography.lineHeight);

  return sandboxEl;
}

/**
 * Estimates height when DOM is not available (e.g. Node / unit tests).
 */
function estimateFallbackHeight(block: LayoutBlock, widthPx: number): number {
  // If HTML contains an explicit style height (e.g. diagrams or test mock blocks), respect it
  const explicitHeightMatch = block.html.match(/(?:min-)?height:\s*(\d+)px/i);
  if (explicitHeightMatch) {
    return parseInt(explicitHeightMatch[1], 10);
  }

  if (block.kind === "heading") {
    return 36;
  }
  if (block.kind === "instruction") {
    return 28;
  }

  // Question block
  const rawText = block.html.replace(/<[^>]*>/g, " ").trim();
  const charsPerLine = Math.max(25, Math.floor(widthPx / 7.5));
  const stemLines = Math.max(1, Math.ceil(rawText.length / charsPerLine));
  const stemHeight = stemLines * 20;

  let optionsHeight = 0;
  if (block.item.kind === "question") {
    const optCount = block.item.options.length;
    const layout = block.item.optionLayout || "auto";
    if (layout === "two-column" || layout === "auto") {
      optionsHeight = Math.ceil(optCount / 2) * 22;
    } else if (layout === "inline") {
      optionsHeight = 24;
    } else {
      // vertical
      optionsHeight = optCount * 22;
    }
  }

  return Math.ceil(stemHeight + optionsHeight + 16); // padding and margins
}

/**
 * Measures the rendered height of a layout block.
 * Uses DOM measurement in browser with strict font readiness; falls back to deterministic estimator in non-DOM environments.
 */
export async function measureBlockHeight(
  block: LayoutBlock,
  widthPx: number,
  settings: LayoutSettingsType
): Promise<number> {
  const cacheKey = getCacheKey(block.html, widthPx, settings.typography.questionPt, settings.typography.lineHeight);
  if (measurementCache.has(cacheKey)) {
    return measurementCache.get(cacheKey)!;
  }

  const sandbox = getSandbox(widthPx, settings);

  if (!sandbox) {
    const estimated = estimateFallbackHeight(block, widthPx);
    measurementCache.set(cacheKey, estimated);
    return estimated;
  }

  // Wait for fonts in browser
  if (document.fonts) {
    await document.fonts.ready;
  }

  sandbox.innerHTML = block.html;
  // Read exact height
  const measured = sandbox.getBoundingClientRect().height;
  const finalHeight = Math.ceil(measured) + 6; // 6px inter-block gap allowance

  measurementCache.set(cacheKey, finalHeight);
  return finalHeight;
}

export function clearMeasurementCache(): void {
  measurementCache.clear();
}
