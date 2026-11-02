import { create } from "zustand";
import { getPaper, savePaper } from "../../services/storage/drafts.ts";
import type { PaperType } from "../../domain/model.ts";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface PaperStoreState {
  paper: PaperType | null;
  isLoading: boolean;
  saveStatus: SaveStatus;
  saveError: string | null;
  loadError: string | null;

  loadPaper: (id: string) => Promise<void>;
  setPaper: (paper: PaperType) => void;
  updateTitle: (title: string) => void;
  updateExamName: (examName: string) => void;
  updateTotalMarks: (marks: number) => void;
  updateDuration: (durationMin: number) => void;
  saveNow: () => Promise<void>;
  reset: () => void;
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

  return {
    paper: null,
    isLoading: false,
    saveStatus: "idle",
    saveError: null,
    loadError: null,

    loadPaper: async (id: string) => {
      set({ isLoading: true, loadError: null, saveStatus: "idle" });
      try {
        const loaded = await getPaper(id);
        if (!loaded) {
          set({ isLoading: false, loadError: `Paper with ID "${id}" was not found.` });
          return;
        }
        set({ paper: loaded, isLoading: false, saveStatus: "saved" });
      } catch (err: any) {
        set({
          isLoading: false,
          loadError: err?.message || "Error loading paper from storage."
        });
      }
    },

    setPaper: (paper: PaperType) => {
      set({ paper, saveStatus: "idle" });
      triggerDebouncedSave();
    },

    updateTitle: (title: string) => {
      const current = get().paper;
      if (!current) return;
      const updated: PaperType = {
        ...current,
        title,
        updatedAt: Date.now()
      };
      set({ paper: updated });
      triggerDebouncedSave();
    },

    updateExamName: (examName: string) => {
      const current = get().paper;
      if (!current) return;
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
        loadError: null
      });
    }
  };
});
