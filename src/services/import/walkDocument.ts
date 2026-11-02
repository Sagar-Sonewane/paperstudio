import { XMLParser } from "fast-xml-parser";
import { parseOmmlNode } from "./omml.ts";
import type { ExtractedMediaInfo } from "./media.ts";

export interface RunInfo {
  text: string;
  fontAscii?: string;
  fontCs?: string;
  fontHAnsi?: string;
  bold?: boolean;
  italic?: boolean;
  subscript?: boolean;
  superscript?: boolean;
}

export interface ParsedBlock {
  id: string;
  rawText: string;
  html: string;
  runs: RunInfo[];
  fontsUsed: string[];
  mediaIds: string[];
  hasMath: boolean;
  hasDrawing: boolean;
  hasShape: boolean;
  warning?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function walkDocumentXml(
  docXml: string,
  mediaMap: Map<string, ExtractedMediaInfo>
): ParsedBlock[] {
  const parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: "@_"
  });

  const parsedDoc = parser.parse(docXml);

  // Find w:body
  let bodyNodes: any[] = [];
  for (const root of parsedDoc) {
    if (root["w:document"] && Array.isArray(root["w:document"])) {
      for (const docChild of root["w:document"]) {
        if (docChild["w:body"] && Array.isArray(docChild["w:body"])) {
          bodyNodes = docChild["w:body"];
          break;
        }
      }
    }
  }

  const blocks: ParsedBlock[] = [];
  let blockCounter = 1;

  for (const bodyChild of bodyNodes) {
    for (const [key, val] of Object.entries(bodyChild)) {
      if (key === ":@") continue;

      if (key === "w:p") {
        const paragraphNodes = Array.isArray(val) ? val : [];
        const block = processParagraph(paragraphNodes, mediaMap, `blk_${blockCounter++}`);
        blocks.push(block);
      } else if (key === "w:tbl") {
        const tableNodes = Array.isArray(val) ? val : [];
        const block = processTable(tableNodes, mediaMap, `blk_${blockCounter++}`);
        blocks.push(block);
      }
    }
  }

  return blocks;
}

function processParagraph(
  pNodes: any[],
  mediaMap: Map<string, ExtractedMediaInfo>,
  blockId: string
): ParsedBlock {
  let rawText = "";
  let html = "";
  const runs: RunInfo[] = [];
  const fontsUsed = new Set<string>();
  const mediaIds: string[] = [];
  let hasMath = false;
  let hasDrawing = false;
  let hasShape = false;
  const warnings: string[] = [];

  function traverse(nodes: any[]) {
    if (!Array.isArray(nodes)) return;

    for (const node of nodes) {
      for (const [key, val] of Object.entries(node)) {
        if (key === ":@" || key === "#text") continue;

        // 1. Math formulas (OMML)
        if (key === "m:oMath" || key === "m:oMathPara") {
          hasMath = true;
          const ommlRes = parseOmmlNode(val);
          if (ommlRes.html) {
            html += ` ${ommlRes.html} `;
            rawText += ` ${ommlRes.plain} `;
            runs.push({
              text: ommlRes.plain,
              fontAscii: "Cambria Math"
            });
            if (ommlRes.warning) warnings.push(ommlRes.warning);
          }
        }

        // 2. Drawings and images
        else if (key === "w:drawing") {
          hasDrawing = true;
          const extractedRIds = findBlipEmbedRIds(val);
          for (const rId of extractedRIds) {
            const media = mediaMap.get(rId);
            if (media) {
              mediaIds.push(media.mediaId);
              html += `<img src="" alt="${media.mediaId}" data-media-id="${media.mediaId}" class="imported-image" />`;
            }
          }
        }

        // 3. VML shapes, text boxes, and SmartArt
        else if (key === "w:pict" || key === "v:shape" || key === "w:txbxContent") {
          hasShape = true;
          warnings.push("Word drawing/shape detected. Native vector conversion not supported; keep or replace with image.");
          // Also check for embedded images in pict/shape
          const extractedRIds = findBlipEmbedRIds(val);
          for (const rId of extractedRIds) {
            const media = mediaMap.get(rId);
            if (media) {
              mediaIds.push(media.mediaId);
              html += `<img src="" alt="${media.mediaId}" data-media-id="${media.mediaId}" class="imported-image" />`;
            }
          }
        }

        // 4. Text runs (w:r)
        else if (key === "w:r") {
          let runText = "";
          let fontAscii: string | undefined;
          let fontCs: string | undefined;
          let fontHAnsi: string | undefined;
          let bold = false;
          let italic = false;
          let subscript = false;
          let superscript = false;

          if (Array.isArray(val)) {
            for (const child of val) {
              if (child["w:rPr"] && Array.isArray(child["w:rPr"])) {
                for (const rPr of child["w:rPr"]) {
                  if (rPr[":@"]) {
                    const attrs = rPr[":@"];
                    if (rPr["w:rFonts"]) {
                      fontAscii = attrs["@_w:ascii"];
                      fontCs = attrs["@_w:cs"];
                      fontHAnsi = attrs["@_w:hAnsi"];
                    }
                    if (rPr["w:vertAlign"]) {
                      const val = attrs["@_w:val"];
                      if (val === "subscript") subscript = true;
                      if (val === "superscript") superscript = true;
                    }
                  }
                  if (rPr["w:b"] !== undefined) bold = true;
                  if (rPr["w:i"] !== undefined) italic = true;
                  if (rPr["w:rFonts"] && rPr[":@"]) {
                    const attrs = rPr[":@"];
                    fontAscii = fontAscii || attrs["@_w:ascii"];
                    fontCs = fontCs || attrs["@_w:cs"];
                    fontHAnsi = fontHAnsi || attrs["@_w:hAnsi"];
                  }
                }
              }

              if (child["w:t"]) {
                const t = extractTextValue(child["w:t"]);
                runText += t;
              }
              if (child["w:tab"] !== undefined) runText += "\t";
              if (child["w:br"] !== undefined) runText += "\n";
              if (child["w:drawing"] !== undefined) {
                hasDrawing = true;
                const rIds = findBlipEmbedRIds(child["w:drawing"]);
                for (const rId of rIds) {
                  const media = mediaMap.get(rId);
                  if (media) {
                    mediaIds.push(media.mediaId);
                    html += `<img src="" alt="${media.mediaId}" data-media-id="${media.mediaId}" class="imported-image" />`;
                  }
                }
              }
            }
          }

          if (fontAscii) fontsUsed.add(fontAscii);
          if (fontCs) fontsUsed.add(fontCs);
          if (fontHAnsi) fontsUsed.add(fontHAnsi);

          if (runText) {
            rawText += runText;
            runs.push({
              text: runText,
              fontAscii,
              fontCs,
              fontHAnsi,
              bold,
              italic,
              subscript,
              superscript
            });

            // Format HTML
            let formattedRun = escapeHtml(runText);
            if (bold) formattedRun = `<strong>${formattedRun}</strong>`;
            if (italic) formattedRun = `<em>${formattedRun}</em>`;
            if (subscript) formattedRun = `<sub>${formattedRun}</sub>`;
            if (superscript) formattedRun = `<sup>${formattedRun}</sup>`;

            html += formattedRun;
          }
        } else if (Array.isArray(val)) {
          traverse(val);
        }
      }
    }
  }

  traverse(pNodes);

  return {
    id: blockId,
    rawText: rawText.trim(),
    html: html.trim() ? `<p>${html.trim()}</p>` : "",
    runs,
    fontsUsed: Array.from(fontsUsed),
    mediaIds,
    hasMath,
    hasDrawing,
    hasShape,
    warning: warnings.length > 0 ? warnings.join("; ") : undefined
  };
}

function processTable(
  tNodes: any[],
  mediaMap: Map<string, ExtractedMediaInfo>,
  blockId: string
): ParsedBlock {
  let tableHtml = "<table class=\"border border-slate-400 border-collapse my-2\">";
  let rawText = "";
  const fonts = new Set<string>();
  const mediaIds: string[] = [];

  function traverseTable(nodes: any[]) {
    if (!Array.isArray(nodes)) return;
    for (const row of nodes) {
      if (row["w:tr"] && Array.isArray(row["w:tr"])) {
        tableHtml += "<tr>";
        for (const cell of row["w:tr"]) {
          if (cell["w:tc"] && Array.isArray(cell["w:tc"])) {
            tableHtml += "<td class=\"border border-slate-300 p-1.5\">";
            for (const cellChild of cell["w:tc"]) {
              if (cellChild["w:p"] && Array.isArray(cellChild["w:p"])) {
                const cellBlock = processParagraph(cellChild["w:p"], mediaMap, `${blockId}_tc`);
                tableHtml += cellBlock.html || cellBlock.rawText;
                rawText += ` ${cellBlock.rawText} `;
                cellBlock.fontsUsed.forEach((f) => fonts.add(f));
                cellBlock.mediaIds.forEach((m) => mediaIds.push(m));
              }
            }
            tableHtml += "</td>";
          }
        }
        tableHtml += "</tr>";
      }
    }
  }

  traverseTable(tNodes);
  tableHtml += "</table>";

  return {
    id: blockId,
    rawText: rawText.trim(),
    html: tableHtml,
    runs: [{ text: rawText.trim() }],
    fontsUsed: Array.from(fonts),
    mediaIds,
    hasMath: false,
    hasDrawing: false,
    hasShape: false
  };
}

function findBlipEmbedRIds(node: any): string[] {
  const rIds: string[] = [];
  function search(curr: any) {
    if (!curr) return;
    if (Array.isArray(curr)) {
      curr.forEach(search);
      return;
    }
    if (typeof curr === "object") {
      if (curr[":@"]) {
        const attrs = curr[":@"];
        if (attrs["@_r:embed"]) rIds.push(attrs["@_r:embed"]);
        if (attrs["@_r:id"]) rIds.push(attrs["@_r:id"]);
        if (attrs["@_r:link"]) rIds.push(attrs["@_r:link"]);
      }
      for (const val of Object.values(curr)) {
        if (typeof val === "object") search(val);
      }
    }
  }
  search(node);
  return rIds;
}

function extractTextValue(tVal: any): string {
  if (typeof tVal === "string") return tVal;
  if (Array.isArray(tVal) && tVal[0]) {
    if (typeof tVal[0] === "string") return tVal[0];
    if (tVal[0]["#text"]) return tVal[0]["#text"];
  }
  if (tVal && typeof tVal === "object" && tVal["#text"]) {
    return tVal["#text"];
  }
  return "";
}

