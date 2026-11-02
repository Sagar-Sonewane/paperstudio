import { Paragraph, ImageRun, AlignmentType } from "docx";

// 1x1 transparent PNG fallback buffer for environments without canvas support (e.g. Node tests)
const MINIMAL_PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0b, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x02, 0x00, 0x00, 0x05, 0x00, 0x01,
  0xe9, 0xfa, 0xdc, 0xd8, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

export interface MediaImagePayload {
  bytes: Uint8Array;
  mime: string;
  width?: number;
  height?: number;
}

/**
 * Creates an ImageRun paragraph scaled appropriately for column layout.
 * Standard column width in twips is ~4800 (approx 240-260 pt or ~320 px at 96 dpi).
 */
export function createImageParagraph(
  imageBytes: Uint8Array,
  options: {
    maxWidthPt?: number;
    originalWidth?: number;
    originalHeight?: number;
    caption?: string;
    type?: "png" | "jpg" | "gif" | "bmp";
  } = {}
): Paragraph {
  const maxW = options.maxWidthPt ?? 240;
  let targetW = maxW;
  let targetH = 160;

  if (options.originalWidth && options.originalHeight && options.originalWidth > 0) {
    const ratio = options.originalHeight / options.originalWidth;
    targetW = Math.min(maxW, options.originalWidth);
    targetH = Math.round(targetW * ratio);
  }

  const imageRun = new ImageRun({
    data: imageBytes,
    type: options.type || "png",
    transformation: {
      width: targetW,
      height: targetH
    }
  });

  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 100 },
    children: [imageRun]
  });
}

/**
 * Rasterizes an SVG string to a PNG at 3x scale.
 * Runs in the browser via canvas; falls back to minimal PNG in Node/test environments.
 */
export async function rasterizeSvgToPng(
  svgString: string,
  width = 300,
  height = 200,
  scale = 3
): Promise<Uint8Array> {
  // If running in browser environment with HTMLCanvasElement or OffscreenCanvas
  if (typeof window !== "undefined" && typeof document !== "undefined") {
    try {
      const targetWidth = width * scale;
      const targetHeight = height * scale;

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        return await new Promise<Uint8Array>((resolve) => {
          const img = new Image();
          img.onload = () => {
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
            URL.revokeObjectURL(url);
            canvas.toBlob((blob) => {
              if (blob) {
                blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
              } else {
                resolve(MINIMAL_PNG_BYTES);
              }
            }, "image/png");
          };
          img.onerror = () => {
            URL.revokeObjectURL(url);
            resolve(MINIMAL_PNG_BYTES);
          };
          img.src = url;
        });
      }
    } catch (err) {
      console.warn("Browser SVG rasterization failed:", err);
      return MINIMAL_PNG_BYTES;
    }
  }

  // Node or headless fallback without Canvas
  return MINIMAL_PNG_BYTES;
}
