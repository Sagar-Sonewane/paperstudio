import { create } from "zustand";
import { getPaper, savePaper } from "../../services/storage/drafts.ts";
import { saveLastUsedSettings } from "../../services/storage/templates.ts";
import { createId } from "../../domain/ids.ts";
import { createDefaultSection } from "../../domain/defaults.ts";
import { getBuiltinTemplate } from "../../domain/templates/registry.ts";
import { mergeTemplateSettings } from "../../domain/templates/merge.ts";
import type {
  PaperType,
  PaperItem,
  QuestionItem,
  QuestionType,
  HeadingItem,
  InstructionItem,
  LayoutSettingsType
} from "../../domain/model.ts";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface HistoryState {
  past: PaperType[];
  future: PaperType[];
}

interface PaperStoreState {
  paper: PaperType | null;
  isLoading: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  loadError: string | null;

  // History & Undo / Redo
  history: HistoryState;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;

  // Selection & UI Drawer
  selectedItemId: string | null;
  activeDrawer: "none" | "question_editor" | "settings";
  selectItem: (id: string | null) => void;
  openQuestionEditor: (id: string) => void;
  openSettingsDrawer: () => void;
  closeDrawer: () => void;

  // Paper & Metadata
  loadPaper: (id: string) => Promise<void>;
  setPaper: (paper: PaperType) => void;
  applyTemplate: (templateId: string) => void;
  updateLayoutSettings: (updater: (prev: LayoutSettingsType) => LayoutSettingsType) => void;
  updateTitle: (title: string) => void;
  updateInstituteName: (instituteName: string) => void;
  updateExamName: (examName: string) => void;
  updateTotalMarks: (marks: number) => void;
  updateDuration: (durationMin: number) => void;
  saveNow: () => Promise<void>;
  reset: () => void;

  // Sections
  addSection: (title?: string) => void;
  renameSection: (sectionId: string, title: string) => void;
  deleteSection: (sectionId: string) => void;

  // Items (Questions, Headings, Instructions)
  addQuestion: (sectionId: string, type?: QuestionType) => string;
  addHeading: (sectionId: string, text?: string) => string;
  addInstruction: (sectionId: string, text?: string) => string;
  updateItemContent: (sectionId: string, itemId: string, html: string, plain?: string) => void;
  deleteItem: (sectionId: string, itemId: string) => void;
  duplicateItem: (sectionId: string, itemId: string) => string;
  moveItem: (sectionId: string, itemId: string, direction: "up" | "down") => void;
  reorderItems: (sectionId: string, activeId: string, overId: string) => void;
  moveItemToSection: (sourceSectionId: string, targetSectionId: string, itemId: string, targetIndex?: number) => void;

  // Question Specifics
  addOption: (sectionId: string, questionId: string, text?: string) => void;
  removeOption: (sectionId: string, questionId: string, optionId: string) => void;
  moveOption: (sectionId: string, questionId: string, optionId: string, direction: "up" | "down") => void;
  updateOptionContent: (sectionId: string, questionId: string, optionId: string, html: string) => void;
  setOptionLayout: (sectionId: string, questionId: string, layout: "auto" | "inline" | "vertical" | "two-column") => void;
  setQuestionMarks: (sectionId: string, questionId: string, marks?: number) => void;
  setCustomNumber: (sectionId: string, questionId: string, customNumber?: string) => void;
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const usePaperStore = create<PaperStoreState>((set, get) => {
  const triggerDebouncedSave = () => {
    const currentPaper = get().paper;
    if (!currentPaper) return;

    if (debounceTimer) clearTimeout(debounceTimer);
    set({ saveStatus: "saving", saveError: null });

    debounceTimer = setTimeout(async () => {
      try {
        const paperToSave = get().paper;
        if (!paperToSave) return;
        await savePaper(paperToSave);
        set({ saveStatus: "saved", saveError: null });
      } catch (err: any) {
        set({
          saveStatus: "error",
          saveError: err?.message || "Failed to save draft."
        });
      }
    }, 500);
  };

  /**
   * Records a snapshot of the current paper into history before mutating.
   * Capped at 100 snapshots.
   */
  const recordHistory = () => {
    const current = get().paper;
    if (!current) return;

    // Deep clone snapshot
    const snapshot: PaperType = JSON.parse(JSON.stringify(current));
    const past = [...get().history.past, snapshot].slice(-100);

    set({
      history: {
        past,
        future: [] // Any new mutation clears the redo future stack
      },
      canUndo: past.length > 0,
      canRedo: false
    });
  };

  return {
    paper: null,
    isLoading: false,
    saveStatus: "idle",
    saveError: null,
    loadError: null,

    history: { past: [], future: [] },
    canUndo: false,
    canRedo: false,

    selectedItemId: null,
    activeDrawer: "none",

    selectItem: (id: string | null) => set({ selectedItemId: id }),
    openQuestionEditor: (id: string) => set({ selectedItemId: id, activeDrawer: "question_editor" }),
    openSettingsDrawer: () => set({ activeDrawer: "settings" }),
    closeDrawer: () => set({ activeDrawer: "none" }),

    undo: () => {
      const { past, future } = get().history;
      const current = get().paper;
      if (past.length === 0 || !current) return;

      const previous = past[past.length - 1];
      const newPast = past.slice(0, -1);
      const newFuture = [JSON.parse(JSON.stringify(current)), ...future].slice(0, 100);

      set({
        paper: previous,
        history: { past: newPast, future: newFuture },
        canUndo: newPast.length > 0,
        canRedo: true
      });
      triggerDebouncedSave();
    },

    redo: () => {
      const { past, future } = get().history;
      const current = get().paper;
      if (future.length === 0 || !current) return;

      const next = future[0];
      const newFuture = future.slice(1);
      const newPast = [...past, JSON.parse(JSON.stringify(current))].slice(-100);

      set({
        paper: next,
        history: { past: newPast, future: newFuture },
        canUndo: true,
        canRedo: newFuture.length > 0
      });
      triggerDebouncedSave();
    },

    loadPaper: async (id: string) => {
      set({ isLoading: true, loadError: null, saveStatus: "idle" });
      try {
        const loaded = await getPaper(id);
        if (!loaded) {
          set({ isLoading: false, loadError: `Paper with ID "${id}" was not found.` });
          return;
        }
        set({
          paper: loaded,
          isLoading: false,
          saveStatus: "saved",
          history: { past: [], future: [] },
          canUndo: false,
          canRedo: false
        });
      } catch (err: any) {
        set({
          isLoading: false,
          loadError: err?.message || "Error loading paper from storage."
        });
      }
    },

    setPaper: (paper: PaperType) => {
      recordHistory();
      set({ paper });
      triggerDebouncedSave();
    },

    applyTemplate: (templateId: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const tpl = getBuiltinTemplate(templateId);
      const mergedSettings = mergeTemplateSettings(tpl.defaults, {
        header: {
          ...tpl.defaults.header,
          instituteName: current.settings.header.instituteName || tpl.defaults.header.instituteName,
          subtitle: current.settings.header.subtitle || tpl.defaults.header.subtitle,
          logoMediaId: current.settings.header.logoMediaId
        }
      });

      const updated: PaperType = {
        ...current,
        templateId,
        settings: mergedSettings,
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
      saveLastUsedSettings(mergedSettings);
    },

    updateLayoutSettings: (updater: (prev: LayoutSettingsType) => LayoutSettingsType) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const newSettings = updater(current.settings);
      const updated: PaperType = {
        ...current,
        settings: newSettings,
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
      saveLastUsedSettings(newSettings);
    },

    updateTitle: (title: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const updated: PaperType = {
        ...current,
        title,
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
    },

    updateInstituteName: (instituteName: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const updated: PaperType = {
        ...current,
        settings: {
          ...current.settings,
          header: {
            ...current.settings.header,
            instituteName
          }
        },
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
    },

    updateExamName: (examName: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const updated: PaperType = {
        ...current,
        meta: { ...current.meta, examName },
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
    },

    updateTotalMarks: (totalMarks: number) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const updated: PaperType = {
        ...current,
        meta: { ...current.meta, totalMarks },
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
    },

    updateDuration: (durationMin: number) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const updated: PaperType = {
        ...current,
        meta: { ...current.meta, durationMin },
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
    },

    saveNow: async () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      const paper = get().paper;
      if (!paper) return;

      set({ saveStatus: "saving", saveError: null });
      try {
        await savePaper(paper);
        set({ saveStatus: "saved", saveError: null });
      } catch (err: any) {
        set({
          saveStatus: "error",
          saveError: err?.message || "Save failed."
        });
      }
    },

    reset: () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      set({
        paper: null,
        isLoading: false,
        saveStatus: "idle",
        saveError: null,
        loadError: null,
        history: { past: [], future: [] },
        canUndo: false,
        canRedo: false,
        selectedItemId: null,
        activeDrawer: "none"
      });
    },

    // Sections CRUD
    addSection: (title = "New Section") => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      const newSec = createDefaultSection(title);
      set({
        paper: {
          ...current,
          sections: [...current.sections, newSec],
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    renameSection: (sectionId: string, title: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();
      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, title } : sec
          ),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    deleteSection: (sectionId: string) => {
      const current = get().paper;
      if (!current || current.sections.length <= 1) return; // Keep at least 1 section
      recordHistory();
      set({
        paper: {
          ...current,
          sections: current.sections.filter((sec) => sec.id !== sectionId),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    // Items CRUD
    addQuestion: (sectionId: string, type: QuestionType = "mcq") => {
      const current = get().paper;
      if (!current) return "";
      recordHistory();
      const qId = createId();

      const newQuestion: QuestionItem = {
        kind: "question",
        id: qId,
        type,
        content: {
          html: "<p>New question text...</p>",
          plain: "New question text..."
        },
        options:
          type === "mcq"
            ? [
                { id: createId(), label: "A", content: { html: "<p>Option A</p>", plain: "Option A" } },
                { id: createId(), label: "B", content: { html: "<p>Option B</p>", plain: "Option B" } },
                { id: createId(), label: "C", content: { html: "<p>Option C</p>", plain: "Option C" } },
                { id: createId(), label: "D", content: { html: "<p>Option D</p>", plain: "Option D" } }
              ]
            : [],
        mediaIds: [],
        optionLayout: "two-column"
      };

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, items: [...sec.items, newQuestion] } : sec
          ),
          updatedAt: Date.now()
        },
        selectedItemId: qId,
        activeDrawer: "question_editor"
      });
      triggerDebouncedSave();
      return qId;
    },

    addHeading: (sectionId: string, text = "SECTION HEADING") => {
      const current = get().paper;
      if (!current) return "";
      recordHistory();
      const hId = createId();

      const newHeading: HeadingItem = {
        kind: "heading",
        id: hId,
        content: { html: `<p>${text}</p>`, plain: text }
      };

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, items: [...sec.items, newHeading] } : sec
          ),
          updatedAt: Date.now()
        },
        selectedItemId: hId
      });
      triggerDebouncedSave();
      return hId;
    },

    addInstruction: (sectionId: string, text = "Note: Answer all questions carefully.") => {
      const current = get().paper;
      if (!current) return "";
      recordHistory();
      const iId = createId();

      const newInstruction: InstructionItem = {
        kind: "instruction",
        id: iId,
        content: { html: `<p>${text}</p>`, plain: text }
      };

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) =>
            sec.id === sectionId ? { ...sec, items: [...sec.items, newInstruction] } : sec
          ),
          updatedAt: Date.now()
        },
        selectedItemId: iId
      });
      triggerDebouncedSave();
      return iId;
    },

    updateItemContent: (sectionId: string, itemId: string, html: string, plain?: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== itemId) return item;
                return {
                  ...item,
                  content: { html, plain: plain || html.replace(/<[^>]*>/g, "") }
                };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    deleteItem: (sectionId: string, itemId: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.filter((item) => item.id !== itemId)
            };
          }),
          updatedAt: Date.now()
        },
        selectedItemId: get().selectedItemId === itemId ? null : get().selectedItemId,
        activeDrawer: get().selectedItemId === itemId ? "none" : get().activeDrawer
      });
      triggerDebouncedSave();
    },

    duplicateItem: (sectionId: string, itemId: string) => {
      const current = get().paper;
      if (!current) return "";
      recordHistory();

      let createdId = "";
      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            const newItems: PaperItem[] = [];
            for (const item of sec.items) {
              newItems.push(item);
              if (item.id === itemId) {
                createdId = createId();
                if (item.kind === "question") {
                  newItems.push({
                    ...item,
                    id: createdId,
                    options: item.options.map((opt) => ({ ...opt, id: createId() }))
                  });
                } else {
                  newItems.push({
                    ...item,
                    id: createdId
                  });
                }
              }
            }
            return { ...sec, items: newItems };
          }),
          updatedAt: Date.now()
        },
        selectedItemId: createdId
      });
      triggerDebouncedSave();
      return createdId;
    },

    moveItem: (sectionId: string, itemId: string, direction: "up" | "down") => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            const idx = sec.items.findIndex((it) => it.id === itemId);
            if (idx === -1) return sec;
            const targetIdx = direction === "up" ? idx - 1 : idx + 1;
            if (targetIdx < 0 || targetIdx >= sec.items.length) return sec;

            const itemsCopy = [...sec.items];
            const [moved] = itemsCopy.splice(idx, 1);
            itemsCopy.splice(targetIdx, 0, moved);
            return { ...sec, items: itemsCopy };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    reorderItems: (sectionId: string, activeId: string, overId: string) => {
      if (activeId === overId) return;
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            const oldIndex = sec.items.findIndex((it) => it.id === activeId);
            const newIndex = sec.items.findIndex((it) => it.id === overId);
            if (oldIndex === -1 || newIndex === -1) return sec;

            const newItems = [...sec.items];
            const [removed] = newItems.splice(oldIndex, 1);
            newItems.splice(newIndex, 0, removed);
            return { ...sec, items: newItems };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    moveItemToSection: (sourceSectionId: string, targetSectionId: string, itemId: string, targetIndex?: number) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      let movedItem: PaperItem | null = null;
      const updatedSections = current.sections.map((sec) => {
        if (sec.id === sourceSectionId) {
          const item = sec.items.find((it) => it.id === itemId);
          if (item) movedItem = item;
          return {
            ...sec,
            items: sec.items.filter((it) => it.id !== itemId)
          };
        }
        return sec;
      });

      if (!movedItem) return;

      const finalSections = updatedSections.map((sec) => {
        if (sec.id === targetSectionId) {
          const itemsCopy = [...sec.items];
          if (targetIndex !== undefined && targetIndex >= 0 && targetIndex <= itemsCopy.length) {
            itemsCopy.splice(targetIndex, 0, movedItem!);
          } else {
            itemsCopy.push(movedItem!);
          }
          return {
            ...sec,
            items: itemsCopy
          };
        }
        return sec;
      });

      set({
        paper: {
          ...current,
          sections: finalSections,
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    // Option Management
    addOption: (sectionId: string, questionId: string, text = "New Option") => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== questionId || item.kind !== "question") return item;
                const nextLabel = String.fromCharCode(65 + item.options.length);
                const newOpt = {
                  id: createId(),
                  label: nextLabel,
                  content: { html: `<p>${text}</p>`, plain: text }
                };
                return {
                  ...item,
                  options: [...item.options, newOpt]
                };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    removeOption: (sectionId: string, questionId: string, optionId: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== questionId || item.kind !== "question") return item;
                return {
                  ...item,
                  options: item.options.filter((opt) => opt.id !== optionId)
                };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    moveOption: (sectionId: string, questionId: string, optionId: string, direction: "up" | "down") => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== questionId || item.kind !== "question") return item;
                const idx = item.options.findIndex((opt) => opt.id === optionId);
                if (idx === -1) return item;
                const targetIdx = direction === "up" ? idx - 1 : idx + 1;
                if (targetIdx < 0 || targetIdx >= item.options.length) return item;

                const optionsCopy = [...item.options];
                const [moved] = optionsCopy.splice(idx, 1);
                optionsCopy.splice(targetIdx, 0, moved);

                // Auto re-label A, B, C, D
                const reLabeled = optionsCopy.map((opt, i) => ({
                  ...opt,
                  label: String.fromCharCode(65 + i)
                }));

                return {
                  ...item,
                  options: reLabeled
                };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    updateOptionContent: (sectionId: string, questionId: string, optionId: string, html: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== questionId || item.kind !== "question") return item;
                return {
                  ...item,
                  options: item.options.map((opt) => {
                    if (opt.id !== optionId) return opt;
                    return {
                      ...opt,
                      content: { html, plain: html.replace(/<[^>]*>/g, "") }
                    };
                  })
                };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    setOptionLayout: (sectionId: string, questionId: string, layout: "auto" | "inline" | "vertical" | "two-column") => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== questionId || item.kind !== "question") return item;
                return { ...item, optionLayout: layout };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    setQuestionMarks: (sectionId: string, questionId: string, marks?: number) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== questionId || item.kind !== "question") return item;
                return { ...item, marks };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    },

    setCustomNumber: (sectionId: string, questionId: string, customNumber?: string) => {
      const current = get().paper;
      if (!current) return;
      recordHistory();

      set({
        paper: {
          ...current,
          sections: current.sections.map((sec) => {
            if (sec.id !== sectionId) return sec;
            return {
              ...sec,
              items: sec.items.map((item) => {
                if (item.id !== questionId || item.kind !== "question") return item;
                return { ...item, customNumber: customNumber?.trim() || undefined };
              })
            };
          }),
          updatedAt: Date.now()
        }
      });
      triggerDebouncedSave();
    }
  };
});
