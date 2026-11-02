import { db, type OriginalDocxRecord } from "./db.ts";
import { handleStorageError } from "./errors.ts";
import { createId } from "../../domain/ids.ts";

export async function saveOriginalDocx(filename: string, blob: Blob, idOverride?: string): Promise<string> {
  try {
    const id = idOverride || createId();
    const record: OriginalDocxRecord = {
      id,
      filename,
      blob,
      size: blob.size,
      uploadedAt: Date.now()
    };
    await db.originals.put(record);
    return id;
  } catch (err) {
    handleStorageError(err);
  }
}

export async function getOriginalDocx(id: string): Promise<OriginalDocxRecord | undefined> {
  try {
    return await db.originals.get(id);
  } catch (err) {
    handleStorageError(err);
  }
}
