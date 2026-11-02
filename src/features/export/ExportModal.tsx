import { useState, useEffect } from "react";
import {
  Printer,
  Download,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink
} from "lucide-react";
import { Modal } from "../../components/ui/dialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import type { PaperType } from "../../domain/model.ts";
import { validatePaperForExport, type ExportValidationSummary, type ValidationIssue } from "../../services/export/validate.ts";
import { exportPaperToDocxBlob } from "../../services/export/docx/builder.ts";
import { db } from "../../services/storage/db.ts";

export interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  paper: PaperType;
  initialMode?: "docx" | "pdf";
  onSelectFixItem?: (itemId: string) => void;
}

export function ExportModal({
  open,
  onClose,
  paper,
  initialMode = "docx",
  onSelectFixItem
}: ExportModalProps) {
  const [activeTab, setActiveTab] = useState<"docx" | "pdf">(initialMode);
  const [validation, setValidation] = useState<ExportValidationSummary | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // Synchronize initial mode when modal opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialMode);
      setStatusMessage(null);
      runValidation();
    }
  }, [open, initialMode, paper]);

  const runValidation = async () => {
    setIsValidating(true);
    try {
      const summary = await validatePaperForExport(paper, {
        checkMediaExists: async (mid) => {
          const rec = await db.media.get(mid);
          return !!rec;
        }
      });
      setValidation(summary);
    } catch (err: any) {
      console.error("Validation error:", err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    setStatusMessage({ type: "info", text: "Generating Microsoft Word (.docx) document..." });

    try {
      const blob = await exportPaperToDocxBlob(paper);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (paper.title || "question-paper")
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "_");
      a.download = `${safeTitle}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage({
        type: "success",
        text: `Export successful! Saved "${safeTitle}.docx" (${(blob.size / 1024).toFixed(1)} KB).`
      });
    } catch (err: any) {
      console.error("DOCX export failed:", err);
      setStatusMessage({
        type: "error",
        text: `Export failed: ${err.message || String(err)}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    setStatusMessage({ type: "info", text: "Preparing printable layout and verifying fonts..." });

    try {
      if (document.fonts) {
        await document.fonts.ready;
      }
      setStatusMessage({
        type: "success",
        text: "Print dialog opened. Select 'Save as PDF' in the destination dropdown to export a PDF."
      });
      setTimeout(() => {
        window.print();
      }, 150);
    } catch (err: any) {
      console.error("Print trigger failed:", err);
      setStatusMessage({
        type: "error",
        text: `Print dialog failed to open: ${err.message || String(err)}`
      });
    }
  };

  const handleFixIssue = (issue: ValidationIssue) => {
    if (issue.itemId && onSelectFixItem) {
      onSelectFixItem(issue.itemId);
      onClose();
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Export & Print Paper"
      description="Validate content layout and export as Microsoft Word (.docx) or print to PDF."
    >
      <div className="space-y-4">
        {/* Export Target Switcher */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => {
              setActiveTab("docx");
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "docx"
                ? "border-blue-600 text-blue-700 bg-blue-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Download className="h-4 w-4" />
            <span>Microsoft Word (.docx)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("pdf");
              setStatusMessage(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "pdf"
                ? "border-blue-600 text-blue-700 bg-blue-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Printer className="h-4 w-4" />
            <span>Print / PDF Document</span>
          </button>
        </div>

        {/* Paper Stats */}
        <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
          <div>
            <div className="text-xs text-slate-500">Questions</div>
            <div className="text-sm font-bold text-slate-900">
              {validation?.stats.questionCount ?? 0}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Sections</div>
            <div className="text-sm font-bold text-slate-900">
              {validation?.stats.sectionCount ?? paper.sections.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Est. Pages</div>
            <div className="text-sm font-bold text-slate-900">
              {validation?.stats.estimatedPageCount ?? "-"}
            </div>
          </div>
        </div>

        {/* Pre-Export Validation Summary */}
        <div className="border border-slate-200 rounded-lg p-3 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-700">Pre-Export Checks</span>
            {isValidating ? (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking...
              </span>
            ) : validation && validation.issues.length === 0 ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> All checks passed
              </span>
            ) : (
              <span className="text-xs text-slate-500">
                {validation?.warningsCount || 0} warning(s), {validation?.errorsCount || 0} error(s)
              </span>
            )}
          </div>

          {validation && validation.issues.length > 0 ? (
            <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
              {validation.issues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-2 rounded text-xs flex items-start justify-between gap-2 border ${
                    issue.severity === "error"
                      ? "bg-red-50 border-red-200 text-red-800"
                      : "bg-amber-50 border-amber-200 text-amber-800"
                  }`}
                >
                  <div className="flex items-start gap-1.5 min-w-0">
                    {issue.severity === "error" ? (
                      <AlertCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <span className="break-words">{issue.message}</span>
                  </div>
                  {issue.itemId && onSelectFixItem && (
                    <button
                      type="button"
                      onClick={() => handleFixIssue(issue)}
                      className="text-xs font-semibold underline text-blue-700 hover:text-blue-900 shrink-0 cursor-pointer"
                    >
                      Fix
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            !isValidating && (
              <p className="text-xs text-slate-500 italic">
                No empty questions, duplicate numbers, or layout issues detected.
              </p>
            )
          )}
        </div>

        {/* Live Feedback / Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs font-medium border flex items-start gap-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : statusMessage.type === "error"
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            {statusMessage.type === "success" && (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            )}
            {statusMessage.type === "error" && (
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            )}
            {statusMessage.type === "info" && (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{statusMessage.text}</div>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>

          <div className="flex items-center gap-2">
            {activeTab === "pdf" ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/paper/${paper.id}/print`, "_blank")}
                  className="text-xs text-slate-700"
                  title="Open full page print view in a new browser tab"
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Print View
                </Button>
                <Button
                  size="sm"
                  onClick={handlePrintPdf}
                  className="bg-slate-900 text-white hover:bg-slate-800 gap-1.5"
                  disabled={isExporting || (validation?.errorsCount ?? 0) > 0}
                >
                  <Printer className="h-4 w-4" />
                  <span>Open Print Dialog</span>
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleExportDocx}
                className="bg-blue-600 text-white hover:bg-blue-700 gap-1.5"
                disabled={isExporting || (validation?.errorsCount ?? 0) > 0}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating DOCX...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    <span>Export DOCX</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
