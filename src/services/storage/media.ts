import { db, type MediaRecord } from "./db.ts";
import { handleStorageError } from "./errors.ts";
import { createId } from "../../domain/ids.ts";

export async function saveMediaBlob(
  filename: string,
  mime: string,
  blob: Blob,
  idOverride?: string
): Promise<string> {
  try {
    const id = idOverride || createId();
    const record: MediaRecord = {
      id,
      filename,
      mime,
      blob,
      size: blob.size,
      createdAt: Date.now()
    };
    await db.media.put(record);
    return id;
  } catch (err) {
    handleStorageError(err);
  }
}

export async function getMediaBlob(id: string): Promise<MediaRecord | undefined> {
  try {
    return await db.media.get(id);
  } catch (err) {
    handleStorageError(err);
  }
}

export async function deleteMediaBlob(id: string): Promise<void> {
  try {
    await db.media.delete(id);
  } catch (err) {
    handleStorageError(err);
  }
}

