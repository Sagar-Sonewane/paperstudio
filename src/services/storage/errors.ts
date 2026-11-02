export class StorageQuotaError extends Error {
  constructor(message = "Storage quota exceeded. Please export your draft or remove old drafts.") {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export class StorageUnavailableError extends Error {
  constructor(message = "Local storage (IndexedDB) is unavailable or disabled.") {
    super(message);
    this.name = "StorageUnavailableError";
  }
}

export function handleStorageError(err: unknown): never {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const name = err.name.toLowerCase();
    if (name.includes("quota") || msg.includes("quota") || msg.includes("storage limit")) {
      throw new StorageQuotaError();
    }
    if (name.includes("security") || msg.includes("not allowed") || msg.includes("disabled")) {
      throw new StorageUnavailableError();
    }
    throw err;
  }
  throw new Error(String(err));
}
