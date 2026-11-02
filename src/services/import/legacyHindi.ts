import type JSZip from "jszip";

export const KNOWN_LEGACY_HINDI_FONTS = [
  "kruti dev",
  "krutidev",
  "devlys",
  "chanakya",
  "walkman-chanakya",
  "krishna",
  "agra",
  "shiva",
  "apsara",
  "priyanka",
  "almanac",
  "bharti",
  "kundli",
  "shivaji",
  "shusha",
  "devanagarinew"
];

export function isLegacyHindiFont(fontName?: string): boolean {
  if (!fontName) return false;
  const normalized = fontName.trim().toLowerCase();
  return KNOWN_LEGACY_HINDI_FONTS.some((legacy) => normalized.includes(legacy));
}

/**
 * Inspects word/fontTable.xml in the DOCX zip to identify all installed fonts
 * and detect if legacy non-Unicode Hindi fonts are present.
 */
export async function detectLegacyFontsFromZip(zip: JSZip): Promise<{
  allFonts: string[];
  legacyFonts: string[];
  warning?: string;
}> {
  const allFonts = new Set<string>();
  const legacyFonts = new Set<string>();

  const fontFile = zip.file("word/fontTable.xml");
  if (fontFile) {
    try {
      const xml = await fontFile.async("string");
      const fontMatches = xml.match(/w:name="([^"]+)"/g) || [];
      for (const m of fontMatches) {
        const name = m.replace(/w:name="([^"]+)"/, "$1");
        allFonts.add(name);
        if (isLegacyHindiFont(name)) {
          legacyFonts.add(name);
        }
      }
    } catch (err) {
      console.warn("Could not parse fontTable.xml:", err);
    }
  }

  const legacyList = Array.from(legacyFonts);
  return {
    allFonts: Array.from(allFonts),
    legacyFonts: legacyList,
    warning:
      legacyList.length > 0
        ? `Legacy Hindi font(s) detected: ${legacyList.join(
            ", "
          )}. This document uses non-Unicode glyph encoding. Some Hindi text may appear as Latin characters or require font conversion.`
        : undefined
  };
}

