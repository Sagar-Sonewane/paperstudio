import type JSZip from "jszip";
import { saveMediaBlob } from "../storage/media.ts";

export interface ExtractedMediaInfo {
  relationshipId: string;
  mediaId: string;
  filename: string;
  mime: string;
  sizeBytes: number;
}

const MIME_MAP: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  bmp: "image/bmp",
  emf: "image/x-emf",
  wmf: "image/x-wmf"
};

export function getMimeTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  return MIME_MAP[ext] || "application/octet-stream";
}

/**
 * Extracts all embedded images and media relationships from word/_rels/document.xml.rels
 * and persists them into the Dexie media storage table.
 */
export async function extractAndStoreMedia(
  zip: JSZip
): Promise<Map<string, ExtractedMediaInfo>> {
  const mediaMap = new Map<string, ExtractedMediaInfo>();

  const relsFile = zip.file("word/_rels/document.xml.rels");
  if (!relsFile) return mediaMap;

  let relsXml = "";
  try {
    relsXml = await relsFile.async("string");
  } catch (err) {
    console.warn("Could not read document.xml.rels:", err);
    return mediaMap;
  }

  // Parse Relationship tags
  // Example: <Relationship Id="rId5" Type=".../image" Target="media/image1.png"/>
  const relRegex = /<Relationship\s+([^>]+)\/>/gi;
  let match: RegExpExecArray | null;

  while ((match = relRegex.exec(relsXml)) !== null) {
    const attrsStr = match[1];
    const idMatch = attrsStr.match(/Id="([^"]+)"/i);
    const typeMatch = attrsStr.match(/Type="([^"]+)"/i);
    const targetMatch = attrsStr.match(/Target="([^"]+)"/i);

    if (!idMatch || !targetMatch) continue;

    const rId = idMatch[1];
    const target = targetMatch[1];
    const type = typeMatch ? typeMatch[1] : "";

    // Check if it's an image relationship or targets media/
    const isImageRel =
      type.includes("relationships/image") ||
      target.startsWith("media/") ||
      target.startsWith("../media/");

    if (isImageRel) {
      // Normalize zip file path
      let cleanPath = target.replace(/^\.\.\//, "");
      if (!cleanPath.startsWith("word/")) {
        cleanPath = `word/${cleanPath}`;
      }

      const zipFile = zip.file(cleanPath);
      if (zipFile) {
        try {
          const uint8 = await zipFile.async("uint8array");
          const filename = target.split("/").pop() || `image_${rId}.png`;
          const mime = getMimeTypeFromFilename(filename);

          const blob = new Blob([uint8.buffer as ArrayBuffer], { type: mime });
          const mediaId = await saveMediaBlob(filename, mime, blob);

          mediaMap.set(rId, {
            relationshipId: rId,
            mediaId,
            filename,
            mime,
            sizeBytes: blob.size
          });
        } catch (err) {
          console.warn(`Failed to extract media item ${cleanPath}:`, err);
        }
      }
    }
  }

  return mediaMap;
}
