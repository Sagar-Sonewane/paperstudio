import { nanoid } from "nanoid";

/**
 * Generate a cryptographically strong, URL-safe unique ID.
 * Defaults to 12 characters which is collision-resistant for local datasets.
 */
export function createId(size = 12): string {
  return nanoid(size);
}
