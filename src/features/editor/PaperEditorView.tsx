import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Trash2,
  Undo2,
  Redo2,
  Settings,
  Calendar,
  Award,
  Clock,
  School,
  Columns,
  List,
  Edit3
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Card } from "../../components/ui/card.tsx";
import { Modal, ConfirmDialog } from "../../components/ui/dialog.tsx";
import { usePaperStore } from "./paperStore.ts";
import { duplicatePaper, deletePaper } from "../../services/storage/drafts.ts";
import { ContentSidebar } from "./ContentSidebar.tsx";
import { LivePreview } from "./LivePreview.tsx";
import { QuestionEditorDrawer } from "./QuestionEditorDrawer.tsx";

export function PaperEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    paper,
    isLoading,
    loadError,
    saveStatus,
    saveError,
    canUndo,
    canRedo,
    undo,
    redo,
    activeDrawer,
    loadPaper,
    updateTitle,
    updateInstituteName,
    updateExamName,
    updateTotalMarks,
    updateDuration,
    saveNow,
    reset
  } = usePaperStore();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [mobileTab, setMobileTab] = useState<"sidebar" | "preview" | "drawer">("preview");

  // Load draft on mount
  useEffect(() => {
    if (id) {
      loadPaper(id);
    }
    return () => {
      reset();
    };
  }, [id]);

  // Synchronize local title
  useEffect(() => {
    if (paper) {
      setLocalTitle(paper.title);
    }
  }, [paper?.title]);

  // Switch mobile tab to drawer when drawer opens
  useEffect(() => {
    if (activeDrawer === "question_editor") {
      setMobileTab("drawer");
    }
  }, [activeDrawer]);

  // Global Undo / Redo keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when actively typing in input or textarea or Tiptap editor
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if ((e.ctrlKey || e.metaKey) && !isInput) {
        if (e.key === "z" || e.key === "Z") {
          if (e.shiftKey) {
            e.preventDefault();
            redo();
          } else {
            e.preventDefault();
            undo();
          }
        } else if (e.key === "y" || e.key === "Y") {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);

  const handleTitleCommit = () => {
    if (localTitle.trim() && localTitle !== paper?.title) {
      updateTitle(localTitle.trim());
    } else if (paper) {
      setLocalTitle(paper.title);
    }
    setIsEditingTitle(false);
  };

  const handleDuplicate = async () => {
    if (!paper) return;
    try {
      const dup = await duplicatePaper(paper.id);
      navigate(`/paper/${dup.id}`);
    } catch (err: any) {
      alert(`Duplicate failed: ${err.message}`);
    }
  };

  const handleDelete = async () => {
    if (!paper) return;
    try {
      await deletePaper(paper.id);
      navigate("/");
    } catch (err: any) {
      alert(`Delete failed: ${err.message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600 mb-2" />
        <p className="text-sm text-slate-500">Loading paper editor...</p>
      </div>
    );
  }

  if (loadError || !paper) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Paper Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">
            {loadError || "This paper draft does not exist or was deleted."}
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white h-14 flex items-center justify-between px-3 md:px-4 shrink-0 shadow-2xs z-20 print:hidden">
        {/* Left Section: Back & Editable Title */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="text-slate-600 hover:text-slate-900 shrink-0 h-8 px-2"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Dashboard</span>
          </Button>

          <div className="h-4 w-px bg-slate-200 shrink-0" />

          {/* Editable Title */}
          {isEditingTitle ? (
            <Input
              value={localTitle}
              onChange={(e) => setLocalTitle(e.target.value)}
              onBlur={handleTitleCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleTitleCommit();
                if (e.key === "Escape") {
                  setLocalTitle(paper.title);
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="h-8 max-w-xs text-xs md:text-sm font-semibold"
            />
          ) : (
            <h1
              onClick={() => setIsEditingTitle(true)}
              className="text-xs md:text-sm font-semibold text-slate-900 hover:bg-slate-100 rounded px-2 py-1 cursor-pointer transition-colors truncate max-w-[200px] sm:max-w-xs"
              title="Click to rename"
            >
              {paper.title}
            </h1>
          )}
        </div>

        {/* Center: Undo / Redo & Autosave */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo Buttons */}
          <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              variant="ghost"
              size="icon"
              disabled={!canUndo}
              onClick={undo}
              className="h-7 w-7 text-slate-600 disabled:opacity-30"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              disabled={!canRedo}
              onClick={redo}
              className="h-7 w-7 text-slate-600 disabled:opacity-30"
              title="Redo (Ctrl+Shift+Z)"
              aria-label="Redo"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Autosave Status */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
            {saveStatus === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                <span className="text-slate-400">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-medium">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <div className="flex items-center gap-1 text-red-600">
                <AlertCircle className="h-3.5 w-3.5" />
                <span className="font-medium">Save failed</span>
                <button
                  type="button"
                  onClick={saveNow}
                  className="text-xs text-red-700 underline font-semibold ml-1 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Paper Settings */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsModalOpen(true)}
            className="h-8 text-xs text-slate-700"
            title="Configure Paper Header & Meta"
          >
            <Settings className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Settings</span>
          </Button>

          {/* Duplicate Draft */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDuplicate}
            className="h-8 text-xs text-slate-700 hidden sm:flex"
            title="Duplicate paper draft"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            <span>Duplicate</span>
          </Button>

          {/* Delete Draft */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteConfirmOpen(true)}
            className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-1.5 sm:px-2"
            title="Delete paper"
            aria-label="Delete paper"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </header>

      {/* Mobile Tab Switcher (Visible on small screens only) */}
      <div className="md:hidden flex border-b border-slate-200 bg-white px-2 py-1 gap-1 shrink-0 z-10 print:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("sidebar")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded text-center ${
            mobileTab === "sidebar" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <List className="h-3 w-3 inline mr-1" />
          Questions
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("preview")}
          className={`flex-1 py-1.5 text-xs font-semibold rounded text-center ${
            mobileTab === "preview" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Columns className="h-3 w-3 inline mr-1" />
          Preview
        </button>
        {activeDrawer === "question_editor" && (
          <button
            type="button"
            onClick={() => setMobileTab("drawer")}
            className={`flex-1 py-1.5 text-xs font-semibold rounded text-center ${
              mobileTab === "drawer" ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Edit3 className="h-3 w-3 inline mr-1" />
            Editor
          </button>
        )}
      </div>

      {/* Main 3-Area Editor Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Area: Content Sidebar */}
        <div
          className={`w-full md:w-[340px] shrink-0 h-full border-r border-slate-200 z-10 transition-all ${
            mobileTab === "sidebar" ? "block" : "hidden md:block"
          }`}
        >
          <ContentSidebar />
        </div>

        {/* Center Area: Live A4 Preview */}
        <div
          className={`flex-1 h-full overflow-hidden ${
            mobileTab === "preview" ? "block" : "hidden md:block"
          }`}
        >
          <LivePreview paper={paper} />
        </div>

        {/* Right Area: Question Editor Drawer */}
        {activeDrawer === "question_editor" && (
          <div
            className={`w-full md:w-[420px] shrink-0 h-full z-20 transition-all ${
              mobileTab === "drawer" ? "block" : "hidden md:block"
            }`}
          >
            <QuestionEditorDrawer />
          </div>
        )}
      </div>

      {/* Paper Metadata & Header Settings Modal */}
      <Modal
        open={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        title="Paper Settings & Header Details"
        description="Configure institute name, exam title, duration and marks for the header."
      >
        <div className="space-y-4 pt-2">
          {saveError && (
            <div className="p-2 rounded bg-red-50 text-red-700 text-xs flex items-center gap-1.5 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <School className="h-3.5 w-3.5" /> Institute / Coaching Name
            </label>
            <Input
              value={paper.settings.header.instituteName || ""}
              onChange={(e) => updateInstituteName(e.target.value)}
              placeholder="e.g. EXCELLENCE COACHING ACADEMY"
              className="text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5" /> Exam Name
              </label>
              <Input
                value={paper.meta.examName || ""}
                onChange={(e) => updateExamName(e.target.value)}
                placeholder="e.g. Weekly Mock Test - 01"
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Exam Date
              </label>
              <Input
                value={paper.meta.date || ""}
                readOnly
                className="text-xs bg-slate-50 text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> Total Marks
              </label>
              <Input
                type="number"
                value={paper.meta.totalMarks || 0}
                onChange={(e) => updateTotalMarks(Number(e.target.value))}
                min={1}
                max={500}
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Duration (Minutes)
              </label>
              <Input
                type="number"
                value={paper.meta.durationMin || 0}
                onChange={(e) => updateDuration(Number(e.target.value))}
                min={10}
                max={300}
                className="text-xs"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end">
            <Button size="sm" onClick={() => setSettingsModalOpen(false)}>
              Save Settings
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Draft Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Question Paper"
        message={`Are you sure you want to delete "${paper.title}"? This draft will be permanently removed from local storage.`}
        confirmLabel="Delete Draft"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
