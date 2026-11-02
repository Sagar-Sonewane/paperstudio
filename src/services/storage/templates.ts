import { db } from "./db.ts";
import { handleStorageError } from "./errors.ts";
import type { SavedTemplateType } from "../../domain/model.ts";

export async function listSavedTemplates(): Promise<SavedTemplateType[]> {
  try {
    return await db.templates.orderBy("createdAt").reverse().toArray();
  } catch (err) {
    handleStorageError(err);
  }
}

export async function saveCustomTemplate(tpl: SavedTemplateType): Promise<void> {
  try {
    await db.templates.put(tpl);
  } catch (err) {
    handleStorageError(err);
  }
}

export async function deleteCustomTemplate(id: string): Promise<void> {
  try {
    await db.templates.delete(id);
  } catch (err) {
    handleStorageError(err);
  }
}

