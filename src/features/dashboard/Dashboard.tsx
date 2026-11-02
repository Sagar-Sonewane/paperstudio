import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  Plus,
  Upload,
  Copy,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  BookOpen,
  LayoutTemplate
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "../../components/ui/card.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { Modal, ConfirmDialog } from "../../components/ui/dialog.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Alert } from "../../components/ui/alert.tsx";
import {
  listPapers,
  renamePaper,
  deletePaper,
  duplicatePaper,
  type PaperSummary
} from "../../services/storage/drafts.ts";
import { createDefaultPaper } from "../../domain/defaults.ts";
import { savePaper } from "../../services/storage/drafts.ts";
import { loadDevSamplePaper } from "./devSample.ts";

export function Dashboard() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState<PaperSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rename Dialog State
  const [renameTarget, setRenameTarget] = useState<PaperSummary | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // Delete Dialog State
  const [deleteTarget, setDeleteTarget] = useState<PaperSummary | null>(null);

  // Success Notification
  const [notice, setNotice] = useState<string | null>(null);

  const fetchPapers = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listPapers();
      setPapers(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load papers.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPapers();
  }, []);

  const handleCreateNew = async () => {
    try {
      const newPaper = createDefaultPaper("Untitled Question Paper");
      await savePaper(newPaper);
      navigate(`/paper/${newPaper.id}`);
    } catch (err: any) {
      setError(`Failed to create paper: ${err.message}`);
    }
  };

  const handleLoadDevSample = async () => {
    try {
      setLoading(true);
      const sample = await loadDevSamplePaper();
      navigate(`/paper/${sample.id}`);
    } catch (err: any) {
      setError(`Failed to load dev sample: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const duplicated = await duplicatePaper(id);
      setNotice(`Duplicated paper as "${duplicated.title}".`);
      await fetchPapers();
    } catch (err: any) {
      setError(`Duplicate failed: ${err.message}`);
    }
  };

  const submitRename = async () => {
    if (!renameTarget) return;
    try {
      await renamePaper(renameTarget.id, renameValue);
      setRenameTarget(null);
      setNotice("Paper renamed successfully.");
      await fetchPapers();
    } catch (err: any) {
      setError(`Rename failed: ${err.message}`);
    }
  };

  const submitDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePaper(deleteTarget.id);
      setDeleteTarget(null);
      setNotice("Paper deleted.");
      await fetchPapers();
    } catch (err: any) {
      setError(`Delete failed: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Application Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-lg">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900 leading-tight">PaperStudio</h1>
              <p className="text-xs text-slate-500">Question Paper Creator for Institutes</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadDevSample}
                className="border-dashed border-amber-400 bg-amber-50/50 hover:bg-amber-100/50 text-amber-900"
                title="Loads 40 bilingual questions for testing (Dev only)"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                Dev Sample Paper
                <Badge variant="warning" className="ml-2 text-[10px] px-1 py-0">Dev</Badge>
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={() => navigate("/import")}>
              <Upload className="h-4 w-4 mr-1.5" />
              Import Word Document
            </Button>

            <Button size="sm" onClick={handleCreateNew}>
              <Plus className="h-4 w-4 mr-1.5" />
              Create New Paper
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full flex flex-col gap-8">
        {/* Alerts & Notifications */}
        {notice && (
          <Alert variant="success" title="Success">
            <div className="flex justify-between items-center">
              <span>{notice}</span>
              <button
                onClick={() => setNotice(null)}
                className="text-xs text-emerald-800 underline ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" title="Storage Error">
            <div className="flex justify-between items-center">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-800 underline ml-4 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </Alert>
        )}

        {/* Recent Papers Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Recent Papers</h2>
              <p className="text-xs text-slate-500">Local drafts stored securely in your browser</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">{papers.length} drafts</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Loading your drafts...</div>
          ) : papers.length === 0 ? (
            /* Empty State */
            <Card className="border-dashed border-2 bg-white/50 text-center py-12 px-6">
              <CardContent className="flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-slate-800 text-lg mb-1">No question papers yet</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  Create your first question paper from scratch or import a formatted DOCX exam paper.
                </p>
                <div className="flex gap-3">
                  <Button onClick={handleCreateNew}>
                    <Plus className="h-4 w-4 mr-1.5" />
                    Create New Paper
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/import")}>
                    <Upload className="h-4 w-4 mr-1.5" />
                    Import Word Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Papers Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {papers.map((p) => (
                <Card
                  key={p.id}
                  className="hover:shadow-md transition-shadow flex flex-col justify-between group border-slate-200"
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                      <CardTitle
                        onClick={() => navigate(`/paper/${p.id}`)}
                        className="text-base font-semibold hover:text-blue-600 cursor-pointer line-clamp-1"
                        title={p.title}
                      >
                        {p.title}
                      </CardTitle>
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {p.questionCount} {p.questionCount === 1 ? "Q" : "Qs"}
                      </Badge>
                    </div>
                    {p.examName && (
                      <CardDescription className="line-clamp-1 text-xs">{p.examName}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="pb-3">
                    <div className="flex items-center text-xs text-slate-400 gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Modified: {new Date(p.updatedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}</span>
                    </div>
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-slate-100 flex justify-between items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/paper/${p.id}`)}
                      className="text-xs h-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
                    >
                      Open Draft
                    </Button>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-slate-800"
                        title="Rename paper"
                        aria-label="Rename paper"
                        onClick={() => {
                          setRenameTarget(p);
                          setRenameValue(p.title);
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-slate-800"
                        title="Duplicate paper"
                        aria-label="Duplicate paper"
                        onClick={() => handleDuplicate(p.id)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-slate-500 hover:text-red-600"
                        title="Delete paper"
                        aria-label="Delete paper"
                        onClick={() => setDeleteTarget(p)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Templates Section */}
        <section className="pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <LayoutTemplate className="h-5 w-5 text-slate-600" />
                Templates
              </h2>
              <p className="text-xs text-slate-500">Built-in question paper layouts</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-white">
              <CardHeader className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-sm">Classic</h4>
                  <Badge variant="outline" className="text-[10px]">Default</Badge>
                </div>
                <CardDescription className="text-xs">
                  2-column dense layout with double page borders and student meta box.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white opacity-85">
              <CardHeader className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-sm">Professional</h4>
                  <Badge variant="secondary" className="text-[10px]">Phase 5</Badge>
                </div>
                <CardDescription className="text-xs">
                  Clean serif typography with boxed sections and minimal headers.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white opacity-85">
              <CardHeader className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-sm">Aptitude</h4>
                  <Badge variant="secondary" className="text-[10px]">Phase 5</Badge>
                </div>
                <CardDescription className="text-xs">
                  Compact 3-column format optimized for rapid competitive MCQs.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="bg-white opacity-85">
              <CardHeader className="p-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-semibold text-sm">Academy</h4>
                  <Badge variant="secondary" className="text-[10px]">Phase 5</Badge>
                </div>
                <CardDescription className="text-xs">
                  Single-column school examination template with ample working space.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>
      </main>

      {/* Rename Dialog */}
      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename Question Paper"
        description="Enter a new title for this paper draft."
      >
        <div className="space-y-4">
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Paper title"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
            }}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={!renameValue.trim()}>
              Save Title
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Question Paper"
        message={`Are you sure you want to permanently delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmLabel="Delete Paper"
        destructive
        onConfirm={submitDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
