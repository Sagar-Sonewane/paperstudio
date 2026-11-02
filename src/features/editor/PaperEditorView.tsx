import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Trash2,
  Calendar,
  Award,
  Clock,
  Layers
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Alert } from "../../components/ui/alert.tsx";
import { ConfirmDialog } from "../../components/ui/dialog.tsx";
import { usePaperStore } from "./paperStore.ts";
import { duplicatePaper, deletePaper } from "../../services/storage/drafts.ts";

export function PaperEditorView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    paper,
    isLoading,
    loadError,
    saveStatus,
    saveError,
    loadPaper,
    updateTitle,
    updateExamName,
    updateTotalMarks,
    updateDuration,
    saveNow,
    reset
  } = usePaperStore();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [localTitle, setLocalTitle] = useState("");
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  useEffect(() => {
    if (id) {
      loadPaper(id);
    }
    return () => {
      reset();
    };
  }, [id]);

  useEffect(() => {
    if (paper) {
      setLocalTitle(paper.title);
    }
  }, [paper?.title]);

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
        <p className="text-sm text-slate-500">Loading paper draft...</p>
      </div>
    );
  }

  if (loadError || !paper) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Paper Not Found</h2>
          <p className="text-sm text-slate-500 mb-6">{loadError || "This paper draft does not exist or was deleted."}</p>
          <Button onClick={() => navigate("/")} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </Card>
      </div>
    );
  }

  const totalQuestions = paper.sections.reduce(
    (acc, sec) => acc + sec.items.filter((it) => it.kind === "question").length,
    0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-slate-600 hover:text-slate-900"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Dashboard
            </Button>

            <div className="h-5 w-px bg-slate-200" />

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
                className="h-8 max-w-sm text-sm font-semibold"
              />
            ) : (
              <h1
                onClick={() => setIsEditingTitle(true)}
                className="text-sm font-semibold text-slate-900 hover:bg-slate-100 rounded px-2 py-1 cursor-pointer transition-colors line-clamp-1"
                title="Click to rename"
              >
                {paper.title}
              </h1>
            )}
          </div>

          {/* Right Action Bar */}
          <div className="flex items-center gap-3">
            {/* Autosave Status Indicator */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500" aria-live="polite">
              {saveStatus === "saving" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-500" />
                  <span>Saving...</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center gap-1 text-red-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span className="font-medium">Save failed</span>
                  <Button variant="link" size="sm" onClick={saveNow} className="text-xs p-0 h-auto text-red-700 underline">
                    Retry
                  </Button>
                </div>
              )}
            </div>

            <Button variant="outline" size="sm" onClick={handleDuplicate} title="Duplicate paper">
              <Copy className="h-4 w-4 mr-1.5" />
              Duplicate
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Delete paper"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full flex flex-col gap-6">
        {saveError && (
          <Alert variant="destructive" title="Storage Quota Warning">
            {saveError}
          </Alert>
        )}

        {/* Phase Info Banner */}
        <Alert variant="default" title="Phase 1: Foundation Active">
          Local draft storage, autosave, and persistence are active. Question CRUD, rich-text formatting (Tiptap),
          and live 2-column A4 preview are scheduled for Phase 2.
        </Alert>

        {/* Paper Overview & Metadata Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Paper Metadata & Settings</span>
              <Badge variant="outline" className="text-xs">
                Template: {paper.templateId}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Award className="h-3.5 w-3.5" /> Exam Name
              </label>
              <Input
                value={paper.meta.examName || ""}
                onChange={(e) => updateExamName(e.target.value)}
                placeholder="e.g. Weekly Model Test"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Exam Date
              </label>
              <Input
                value={paper.meta.date || ""}
                readOnly
                className="bg-slate-50 text-slate-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Total Marks
              </label>
              <Input
                type="number"
                value={paper.meta.totalMarks || 0}
                onChange={(e) => updateTotalMarks(Number(e.target.value))}
                min={1}
                max={500}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Duration (Minutes)
              </label>
              <Input
                type="number"
                value={paper.meta.durationMin || 0}
                onChange={(e) => updateDuration(Number(e.target.value))}
                min={10}
                max={300}
              />
            </div>
          </CardContent>
        </Card>

        {/* Sections & Questions Summary */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Paper Structure
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                {paper.sections.length} Section{paper.sections.length === 1 ? "" : "s"} &bull; {totalQuestions} Question{totalQuestions === 1 ? "" : "s"}
              </p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {paper.sections.map((section, sIdx) => {
              const qCount = section.items.filter((it) => it.kind === "question").length;
              return (
                <div key={section.id} className="border border-slate-200 rounded-lg p-4 bg-white">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm text-slate-900">
                      Section {sIdx + 1}: {section.title}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {qCount} Questions
                    </Badge>
                  </div>

                  {section.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No questions in this section yet.</p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {section.items.slice(0, 5).map((item, iIdx) => (
                        <div key={item.id} className="text-xs p-2.5 rounded bg-slate-50 border border-slate-100 flex items-start gap-2">
                          <span className="font-semibold text-slate-700 shrink-0">{iIdx + 1}.</span>
                          <span className="text-slate-800 line-clamp-2">
                            {item.kind === "question"
                              ? item.content.plain || item.content.html.replace(/<[^>]*>/g, "")
                              : item.content.html.replace(/<[^>]*>/g, "")}
                          </span>
                        </div>
                      ))}
                      {section.items.length > 5 && (
                        <p className="text-xs text-slate-400 text-center pt-1">
                          + {section.items.length - 5} more items in this section
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete Question Paper"
        message={`Are you sure you want to delete "${paper.title}"? This draft will be removed from local storage.`}
        confirmLabel="Delete Draft"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </div>
  );
}
