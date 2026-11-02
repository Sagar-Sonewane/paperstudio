import type { DiagramShapeType } from "../../domain/model.ts";

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function serializeShapesToSvg(
  shapes: DiagramShapeType[],
  width = 400,
  height = 300
): string {
  const elements: string[] = [];

  for (const s of shapes) {
    const stroke = s.stroke || "#000000";
    const strokeWidth = s.strokeWidth || 1.5;
    const fill = s.fill || "none";
    const dashAttr = s.strokeStyle === "dashed" ? ' stroke-dasharray="6,4"' : "";

    switch (s.type) {
      case "line": {
        const x1 = s.x;
        const y1 = s.y;
        const x2 = s.x2 !== undefined ? s.x2 : s.x + (s.width || 100);
        const y2 = s.y2 !== undefined ? s.y2 : s.y + (s.height || 0);
        elements.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"${dashAttr} stroke-linecap="round" />`
        );
        if (s.label) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2 - 8;
          elements.push(
            `<text x="${midX}" y="${midY}" font-family="Noto Sans Devanagari, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(s.label)}</text>`
          );
        }
        break;
      }

      case "arrow": {
        const x1 = s.x;
        const y1 = s.y;
        const x2 = s.x2 !== undefined ? s.x2 : s.x + (s.width || 100);
        const y2 = s.y2 !== undefined ? s.y2 : s.y + (s.height || 0);
        elements.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}" marker-end="url(#arrow)"${dashAttr} stroke-linecap="round" />`
        );
        if (s.label) {
          const midX = (x1 + x2) / 2;
          const midY = (y1 + y2) / 2 - 8;
          elements.push(
            `<text x="${midX}" y="${midY}" font-family="Noto Sans Devanagari, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(s.label)}</text>`
          );
        }
        break;
      }

      case "rect": {
        const w = Math.max(1, s.width || 80);
        const h = Math.max(1, s.height || 60);
        elements.push(
          `<rect x="${s.x}" y="${s.y}" width="${w}" height="${h}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"${dashAttr} rx="2" />`
        );
        if (s.label) {
          const cx = s.x + w / 2;
          const cy = s.y + h / 2 + 4;
          elements.push(
            `<text x="${cx}" y="${cy}" font-family="Noto Sans Devanagari, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(s.label)}</text>`
          );
        }
        break;
      }

      case "ellipse": {
        const rx = Math.max(1, (s.width || 80) / 2);
        const ry = Math.max(1, (s.height || 60) / 2);
        const cx = s.x + rx;
        const cy = s.y + ry;
        elements.push(
          `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"${dashAttr} />`
        );
        if (s.label) {
          elements.push(
            `<text x="${cx}" y="${cy + 4}" font-family="Noto Sans Devanagari, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(s.label)}</text>`
          );
        }
        break;
      }

      case "polygon": {
        // If points provided use them, otherwise default to a triangle
        let points = s.points;
        if (!points || points.length === 0) {
          const w = s.width || 100;
          const h = s.height || 90;
          points = [
            { x: s.x + w / 2, y: s.y },
            { x: s.x, y: s.y + h },
            { x: s.x + w, y: s.y + h }
          ];
        }
        const ptsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
        elements.push(
          `<polygon points="${ptsStr}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="${fill}"${dashAttr} />`
        );
        if (s.label) {
          const avgX = points.reduce((acc, p) => acc + p.x, 0) / points.length;
          const avgY = points.reduce((acc, p) => acc + p.y, 0) / points.length + 4;
          elements.push(
            `<text x="${avgX}" y="${avgY}" font-family="Noto Sans Devanagari, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(s.label)}</text>`
          );
        }
        break;
      }

      case "connector": {
        // Orthogonal or polyline connector
        let points = s.points;
        if (!points || points.length === 0) {
          const x2 = s.x2 !== undefined ? s.x2 : s.x + (s.width || 100);
          const y2 = s.y2 !== undefined ? s.y2 : s.y + (s.height || 60);
          const midX = (s.x + x2) / 2;
          points = [
            { x: s.x, y: s.y },
            { x: midX, y: s.y },
            { x: midX, y: y2 },
            { x: x2, y: y2 }
          ];
        }
        const ptsStr = points.map((p) => `${p.x},${p.y}`).join(" ");
        elements.push(
          `<polyline points="${ptsStr}" stroke="${stroke}" stroke-width="${strokeWidth}" fill="none"${dashAttr} stroke-linecap="round" stroke-linejoin="round" />`
        );
        if (s.label) {
          const mid = points[Math.floor(points.length / 2)];
          elements.push(
            `<text x="${mid.x}" y="${mid.y - 6}" font-family="Noto Sans Devanagari, Arial, sans-serif" font-size="12" font-weight="600" text-anchor="middle" fill="#000000">${escapeXml(s.label)}</text>`
          );
        }
        break;
      }

      case "text": {
        const textContent = s.text || s.label || "Text";
        const fontSize = s.fontSize || 14;
        elements.push(
          `<text x="${s.x}" y="${s.y + fontSize}" font-family="Noto Sans Devanagari, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="${stroke}">${escapeXml(textContent)}</text>`
        );
        break;
      }
    }
  }

  const defs = `
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#000000" />
    </marker>
  </defs>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="background-color: transparent;">${defs}
  ${elements.join("\n  ")}
</svg>`;
}

