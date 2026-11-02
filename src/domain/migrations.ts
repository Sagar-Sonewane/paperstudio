import { CURRENT_SCHEMA_VERSION, type PaperType } from "./model.ts";
import { DEFAULT_LAYOUT_SETTINGS } from "./defaults.ts";
import { validatePaper } from "./validation.ts";

/**
 * Migration registry for upgrading older saved drafts to CURRENT_SCHEMA_VERSION.
 */
export function migratePaper(raw: any): PaperType {
  if (!raw || typeof raw !== "object") {
    throw new Error("Cannot migrate invalid paper payload: expected object");
  }

  const version = raw.schemaVersion || 0;

  let current = { ...raw };

  // Example migration from version 0 (unversioned legacy) to version 1
  if (version < 1) {
    if (!current.settings) {
      current.settings = { ...DEFAULT_LAYOUT_SETTINGS };
    }
    if (!current.sections) {
      current.sections = [];
    }
    if (!current.meta) {
      current.meta = {};
    }
    if (!current.templateId) {
      current.templateId = "classic";
    }
    if (!current.createdAt) {
      current.createdAt = Date.now();
    }
    if (!current.updatedAt) {
      current.updatedAt = Date.now();
    }
    current.schemaVersion = 1;
  }

  // Enforce schema version
  current.schemaVersion = CURRENT_SCHEMA_VERSION;

  const result = validatePaper(current);
  if (!result.valid) {
    const errorDetails = result.issues
      .filter((i) => i.severity === "error")
      .map((i) => `${i.path}: ${i.message}`)
      .join("; ");
    throw new Error(`Migration produced invalid paper schema: ${errorDetails}`);
  }

  return result.paper!;
}
