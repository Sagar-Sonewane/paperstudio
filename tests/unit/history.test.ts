import { describe, it, expect, beforeEach } from "vitest";
import { usePaperStore } from "../../src/features/editor/paperStore.ts";
import { createDefaultPaper } from "../../src/domain/defaults.ts";

describe("Undo / Redo History & Store Mutations", () => {
  beforeEach(() => {
    usePaperStore.getState().reset();
  });

  it("records snapshots on mutations and supports undo/redo", () => {
    const store = usePaperStore.getState();
    const paper = createDefaultPaper("Initial Paper");
    store.setPaper(paper);

    expect(store.canUndo).toBe(false);
    expect(store.canRedo).toBe(false);

    // Mutation 1: update title
    usePaperStore.getState().updateTitle("Title Modified Once");
    expect(usePaperStore.getState().paper?.title).toBe("Title Modified Once");
    expect(usePaperStore.getState().canUndo).toBe(true);
    expect(usePaperStore.getState().canRedo).toBe(false);

    // Mutation 2: update title again
    usePaperStore.getState().updateTitle("Title Modified Twice");
    expect(usePaperStore.getState().paper?.title).toBe("Title Modified Twice");

    // Perform Undo
    usePaperStore.getState().undo();
    expect(usePaperStore.getState().paper?.title).toBe("Title Modified Once");
    expect(usePaperStore.getState().canUndo).toBe(true);
    expect(usePaperStore.getState().canRedo).toBe(true);

    // Perform Undo again
    usePaperStore.getState().undo();
    expect(usePaperStore.getState().paper?.title).toBe("Initial Paper");
    expect(usePaperStore.getState().canUndo).toBe(false);
    expect(usePaperStore.getState().canRedo).toBe(true);

    // Perform Redo
    usePaperStore.getState().redo();
    expect(usePaperStore.getState().paper?.title).toBe("Title Modified Once");
    expect(usePaperStore.getState().canUndo).toBe(true);
  });

  it("supports addQuestion, duplicateItem, moveItem, and deleteItem", () => {
    const store = usePaperStore.getState();
    const paper = createDefaultPaper("Question CRUD Test");
    store.setPaper(paper);

    const secId = paper.sections[0].id;

    // Add 2 questions
    const q1Id = usePaperStore.getState().addQuestion(secId, "mcq");
    const q2Id = usePaperStore.getState().addQuestion(secId, "mcq");

    let currentItems = usePaperStore.getState().paper!.sections[0].items;
    expect(currentItems.length).toBe(2);
    expect(currentItems[0].id).toBe(q1Id);
    expect(currentItems[1].id).toBe(q2Id);

    // Move q2 up
    usePaperStore.getState().moveItem(secId, q2Id, "up");
    currentItems = usePaperStore.getState().paper!.sections[0].items;
    expect(currentItems[0].id).toBe(q2Id);
    expect(currentItems[1].id).toBe(q1Id);

    // Duplicate q1
    const dupId = usePaperStore.getState().duplicateItem(secId, q1Id);
    currentItems = usePaperStore.getState().paper!.sections[0].items;
    expect(currentItems.length).toBe(3);
    expect(dupId).toBeDefined();

    // Delete q2
    usePaperStore.getState().deleteItem(secId, q2Id);
    currentItems = usePaperStore.getState().paper!.sections[0].items;
    expect(currentItems.length).toBe(2);
    expect(currentItems.some((it) => it.id === q2Id)).toBe(false);
  });

  it("supports reordering MCQ options and auto-relabelling", () => {
    const store = usePaperStore.getState();
    const paper = createDefaultPaper("Option Reorder Test");
    store.setPaper(paper);

    const secId = paper.sections[0].id;
    const qId = usePaperStore.getState().addQuestion(secId, "mcq");

    let question = usePaperStore.getState().paper!.sections[0].items.find((i) => i.id === qId) as any;
    expect(question.options.length).toBe(4);
    expect(question.options[0].label).toBe("A");
    expect(question.options[1].label).toBe("B");

    const optBId = question.options[1].id;

    // Move option B up to position 0
    usePaperStore.getState().moveOption(secId, qId, optBId, "up");

    question = usePaperStore.getState().paper!.sections[0].items.find((i) => i.id === qId) as any;
    expect(question.options[0].id).toBe(optBId);
    expect(question.options[0].label).toBe("A"); // relabeled
    expect(question.options[1].label).toBe("B"); // relabeled
  });

  it("supports moving items across sections", () => {
    const store = usePaperStore.getState();
    const paper = createDefaultPaper("Cross-Section Move Test");
    store.setPaper(paper);

    const sec1Id = paper.sections[0].id;
    usePaperStore.getState().addSection("Section 2");
    const sec2Id = usePaperStore.getState().paper!.sections[1].id;

    const q1Id = usePaperStore.getState().addQuestion(sec1Id, "mcq");
    expect(usePaperStore.getState().paper!.sections[0].items.length).toBe(1);
    expect(usePaperStore.getState().paper!.sections[1].items.length).toBe(0);

    // Move q1 from section 1 to section 2
    usePaperStore.getState().moveItemToSection(sec1Id, sec2Id, q1Id, 0);

    expect(usePaperStore.getState().paper!.sections[0].items.length).toBe(0);
    expect(usePaperStore.getState().paper!.sections[1].items.length).toBe(1);
    expect(usePaperStore.getState().paper!.sections[1].items[0].id).toBe(q1Id);
  });

  it("supports setting custom number override and marks", () => {
    const store = usePaperStore.getState();
    const paper = createDefaultPaper("Custom Number Test");
    store.setPaper(paper);

    const secId = paper.sections[0].id;
    const qId = usePaperStore.getState().addQuestion(secId, "mcq");

    usePaperStore.getState().setCustomNumber(secId, qId, "प्र. 9(क)");
    usePaperStore.getState().setQuestionMarks(secId, qId, 5);

    const question = usePaperStore.getState().paper!.sections[0].items.find((i) => i.id === qId) as any;
    expect(question.customNumber).toBe("प्र. 9(क)");
    expect(question.marks).toBe(5);
  });
});
