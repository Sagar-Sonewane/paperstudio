import Dexie, { type EntityTable } from "dexie";
import type { PaperType, SavedTemplateType } from "../../domain/model.ts";

export interface MediaRecord {
  id: string;
  filename: string;
  mime: string;
  blob: Blob;
  size: number;
  createdAt: number;
}

export interface DiagramRecord {
  id: string;
  questionId?: string;
  width: number;
  height: number;
  shapes: any[];
  svg: string;
  updatedAt: number;
}

export interface OriginalDocxRecord {
  id: string;
  filename: string;
  blob: Blob;
  size: number;
  uploadedAt: number;
}

export interface AppSettingRecord {
  id: string;
  value: any;
  updatedAt: number;
}

export class PaperStudioDatabase extends Dexie {
  papers!: EntityTable<PaperType, "id">;
  media!: EntityTable<MediaRecord, "id">;
  diagrams!: EntityTable<DiagramRecord, "id">;
  templates!: EntityTable<SavedTemplateType, "id">;
  originals!: EntityTable<OriginalDocxRecord, "id">;
  settings!: EntityTable<AppSettingRecord, "id">;

  constructor(databaseName = "PaperStudioDB") {
    super(databaseName);

    this.version(1).stores({
      papers: "id, title, updatedAt, createdAt",
      media: "id, filename, mime, createdAt",
      diagrams: "id, questionId, updatedAt",
      templates: "id, name, baseTemplateId, createdAt",
      originals: "id, filename, uploadedAt",
      settings: "id, updatedAt"
    });
  }
}

export const db = new PaperStudioDatabase();

