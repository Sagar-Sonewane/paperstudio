import { db, type DiagramRecord } from "./db.ts";
import { handleStorageError } from "./errors.ts";
import { Diagram, type DiagramType } from "../../domain/model.ts";

export async function saveDiagram(diagram: DiagramType): Promise<string> {
  try {
    const validated = Diagram.parse(diagram);
    const record: DiagramRecord = {
      id: validated.id,
      questionId: validated.questionId,
      width: validated.width,
      height: validated.height,
      shapes: validated.shapes,
      svg: validated.svg,
      updatedAt: Date.now()
    };
    await db.diagrams.put(record);
    return validated.id;
  } catch (err) {
    handleStorageError(err);
  }
}

export async function getDiagram(id: string): Promise<DiagramType | undefined> {
  try {
    const record = await db.diagrams.get(id);
    if (!record) return undefined;
    const result = Diagram.safeParse({
      id: record.id,
      questionId: record.questionId,
      width: record.width,
      height: record.height,
      shapes: record.shapes || [],
      svg: record.svg
    });
    if (result.success) {
      return result.data;
    }
    console.warn(`Diagram ${id} failed validation:`, result.error);
    return undefined;
  } catch (err) {
    handleStorageError(err);
  }
}

export async function deleteDiagram(id: string): Promise<void> {
  try {
    await db.diagrams.delete(id);
  } catch (err) {
    handleStorageError(err);
  }
}

export async function listDiagrams(): Promise<DiagramType[]> {
  try {
    const records = await db.diagrams.toArray();
    const diagrams: DiagramType[] = [];
    for (const rec of records) {
      const parsed = Diagram.safeParse({
        id: rec.id,
        questionId: rec.questionId,
        width: rec.width,
        height: rec.height,
        shapes: rec.shapes || [],
        svg: rec.svg
      });
      if (parsed.success) {
        diagrams.push(parsed.data);
      }
    }
    return diagrams;
  } catch (err) {
    handleStorageError(err);
    return [];
  }
}

