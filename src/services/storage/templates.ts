import { db } from "./db.ts";
import { handleStorageError } from "./errors.ts";
import type { SavedTemplateType, LayoutSettingsType } from "../../domain/model.ts";

export async function listSavedTemplates(): Promise<SavedTemplateType[]> {
  try {
    return await db.templates.orderBy("createdAt").reverse().toArray();
  } catch (err) {
    handleStorageError(err);
  }
}

export async function getCustomTemplate(id: string): Promise<SavedTemplateType | undefined> {
  try {
    return await db.templates.get(id);
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

export async function renameCustomTemplate(id: string, newName: string): Promise<void> {
  try {
    const existing = await db.templates.get(id);
    if (existing) {
      existing.name = newName;
      await db.templates.put(existing);
    }
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

const LAST_USED_SETTINGS_KEY = "last_used_layout_settings";

export async function saveLastUsedSettings(settings: LayoutSettingsType): Promise<void> {
  try {
    await db.settings.put({
      id: LAST_USED_SETTINGS_KEY,
      value: settings,
      updatedAt: Date.now()
    });
  } catch (err) {
    console.warn("Could not save last used settings:", err);
  }
}

export async function getLastUsedSettings(): Promise<LayoutSettingsType | null> {
  try {
    const rec = await db.settings.get(LAST_USED_SETTINGS_KEY);
    return rec ? rec.value : null;
  } catch (err) {
    console.warn("Could not retrieve last used settings:", err);
    return null;
  }
}
