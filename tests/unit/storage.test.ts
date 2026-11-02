import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  savePaper,
  getPaper,
  listPapers,
  renamePaper,
  deletePaper,
  duplicatePaper
} from "../../src/services/storage/drafts.ts";
import { saveMediaBlob, getMediaBlob } from "../../src/services/storage/media.ts";
import { handleStorageError, StorageQuotaError } from "../../src/services/storage/errors.ts";
import { createDefaultPaper } from "../../src/domain/defaults.ts";
import { createId } from "../../src/domain/ids.ts";
import { db } from "../../src/services/storage/db.ts";

describe("Storage Services (Dexie IndexedDB)", () => {
  beforeEach(async () => {
    await db.papers.clear();
    await db.media.clear();
  });

  it("creates, saves, and retrieves a paper draft", async () => {
    const paper = createDefaultPaper("Test Paper 101");
    await savePaper(paper);

    const loaded = await getPaper(paper.id);
    expect(loaded).toBeDefined();
    expect(loaded?.title).toBe("Test Paper 101");
    expect(loaded?.id).toBe(paper.id);
  });

  it("lists all papers sorted by updatedAt", async () => {
    const p1 = createDefaultPaper("Older Paper");
    p1.updatedAt = 1000;
    await savePaper(p1);

    const p2 = createDefaultPaper("Newer Paper");
    p2.updatedAt = 5000;
    await savePaper(p2);

    const list = await listPapers();
    expect(list.length).toBe(2);
    expect(list[0].id).toBe(p2.id); // newer first
    expect(list[1].id).toBe(p1.id);
  });

  it("renames a paper draft", async () => {
    const paper = createDefaultPaper("Initial Title");
    await savePaper(paper);

    await renamePaper(paper.id, "Renamed Title");
    const updated = await getPaper(paper.id);

    expect(updated?.title).toBe("Renamed Title");
  });

  it("deletes a paper draft", async () => {
    const paper = createDefaultPaper("To Delete");
    await savePaper(paper);

    await deletePaper(paper.id);
    const loaded = await getPaper(paper.id);

    expect(loaded).toBeUndefined();
  });

  it("duplicates a paper creating entirely new IDs for paper, sections, questions and options", async () => {
    const paper = createDefaultPaper("Original Paper");
    const qId = createId();
    const optId = createId();

    paper.sections[0].items = [
      {
        kind: "question",
        id: qId,
        type: "mcq",
        content: { html: "<p>Original Question</p>" },
        options: [
          {
            id: optId,
            label: "A",
            content: { html: "Option A" }
          }
        ],
        mediaIds: []
      }
    ];

    await savePaper(paper);

    const dup = await duplicatePaper(paper.id);

    expect(dup.id).not.toBe(paper.id);
    expect(dup.title).toBe("Original Paper (Copy)");
    expect(dup.sections[0].id).not.toBe(paper.sections[0].id);

    const dupQuestion = dup.sections[0].items[0];
    expect(dupQuestion.kind).toBe("question");
    if (dupQuestion.kind === "question") {
      expect(dupQuestion.id).not.toBe(qId);
      expect(dupQuestion.options[0].id).not.toBe(optId);
      expect(dupQuestion.options[0].content.html).toBe("Option A");
    }
  });

  it("stores and retrieves binary media blobs", async () => {
    const sampleBytes = new Uint8Array([1, 2, 3, 4, 5]);
    const blob = new Blob([sampleBytes], { type: "image/png" });

    const mediaId = await saveMediaBlob("diagram.png", "image/png", blob);
    expect(mediaId).toBeDefined();

    const retrieved = await getMediaBlob(mediaId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.filename).toBe("diagram.png");
    expect(retrieved?.mime).toBe("image/png");
    expect(retrieved?.blob.size).toBe(5);
  });

  it("handles storage quota errors", () => {
    const quotaExceededDOMError = new DOMException("The quota has been exceeded", "QuotaExceededError");
    expect(() => handleStorageError(quotaExceededDOMError)).toThrow(StorageQuotaError);
  });
});

