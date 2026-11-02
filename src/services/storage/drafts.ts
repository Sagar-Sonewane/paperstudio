import { db } from "./db.ts";
import { handleStorageError } from "./errors.ts";
import { validatePaper } from "../../domain/validation.ts";
import { migratePaper } from "../../domain/migrations.ts";
import { createId } from "../../domain/ids.ts";
import type { PaperType, SectionType, PaperItem } from "../../domain/model.ts";

export interface PaperSummary {
  id: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  examName?: string;
  questionCount: number;
  sectionCount: number;
}

/**
 * Persists a paper to Dexie IndexedDB.
 * Validates domain schema before write.
 */
export async function savePaper(paper: PaperType): Promise<void> {
  const validation = validatePaper(paper);
  if (!validation.valid) {
    const errorDetails = validation.issues
      .filter((i) => i.severity === "error")
      .map((i) => `${i.path}: ${i.message}`)
      .join("; ");
    throw new Error(`Cannot save invalid paper: ${errorDetails}`);
  }

  try {
    const toSave: PaperType = {
      ...paper,
      updatedAt: Date.now()
    };
    await db.papers.put(toSave);
  } catch (err) {
    handleStorageError(err);
  }
}

/**
 * Loads a paper by ID, running schema migrations if needed.
 */
export async function getPaper(id: string): Promise<PaperType | undefined> {
  try {
    const raw = await db.papers.get(id);
    if (!raw) return undefined;
    return migratePaper(raw);
  } catch (err) {
    handleStorageError(err);
  }
}

/**
 * Lists all saved papers ordered by last updated date descending.
 */
export async function listPapers(): Promise<PaperSummary[]> {
  try {
    const all = await db.papers.orderBy("updatedAt").reverse().toArray();
    return all.map((p) => {
      let questionCount = 0;
      if (Array.isArray(p.sections)) {
        for (const s of p.sections) {
          if (Array.isArray(s.items)) {
            questionCount += s.items.filter((it) => it.kind === "question").length;
          }
        }
      }

      return {
        id: p.id,
        title: p.title,
        updatedAt: p.updatedAt,
        createdAt: p.createdAt,
        examName: p.meta?.examName,
        questionCount,
        sectionCount: p.sections?.length || 0
      };
    });
  } catch (err) {
    handleStorageError(err);
  }
}

/**
 * Renames an existing paper.
 */
export async function renamePaper(id: string, newTitle: string): Promise<void> {
  try {
    const trimmed = newTitle.trim();
    if (!trimmed) throw new Error("Title cannot be empty");
    const paper = await getPaper(id);
    if (!paper) throw new Error(`Paper not found: ${id}`);

    paper.title = trimmed;
    paper.updatedAt = Date.now();
    await db.papers.put(paper);
  } catch (err) {
    handleStorageError(err);
  }
}

/**
 * Deletes a paper from storage.
 */
export async function deletePaper(id: string): Promise<void> {
  try {
    await db.papers.delete(id);
  } catch (err) {
    handleStorageError(err);
  }
}

/**
 * Duplicates a paper with completely regenerated unique IDs.
 * Strictly adheres to rule: IDs are stable, never reused.
 */
export async function duplicatePaper(id: string): Promise<PaperType> {
  try {
    const original = await getPaper(id);
    if (!original) throw new Error(`Source paper not found: ${id}`);

    const now = Date.now();
    const newPaperId = createId();

    const newSections: SectionType[] = original.sections.map((section) => {
      const newItems: PaperItem[] = section.items.map((item) => {
        if (item.kind === "question") {
          return {
            ...item,
            id: createId(),
            options: item.options.map((opt) => ({
              ...opt,
              id: createId()
            })),
            diagramId: item.diagramId ? createId() : undefined
          };
        }
        return {
          ...item,
          id: createId()
        };
      });

      return {
        ...section,
        id: createId(),
        items: newItems
      };
    });

    const duplicated: PaperType = {
      ...original,
      id: newPaperId,
      title: `${original.title} (Copy)`,
      sections: newSections,
      createdAt: now,
      updatedAt: now
    };

    await savePaper(duplicated);
    return duplicated;
  } catch (err) {
    handleStorageError(err);
  }
}
