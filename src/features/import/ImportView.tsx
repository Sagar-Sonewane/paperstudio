import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowRight,
  RotateCcw
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card.tsx";
import { Alert } from "../../components/ui/alert.tsx";
import { importDocx, type ImportResult } from "../../services/import/index.ts";
import { saveOriginalDocx } from "../../services/storage/originals.ts";
import { savePaper } from "../../services/storage/drafts.ts";
import { createDefaultPaper } from "../../domain/defaults.ts";
import { createId } from "../../domain/ids.ts";
import type { SectionType, QuestionItem } from "../../domain/model.ts";
import { ReviewItemCard } from "./ReviewItemCard.tsx";
import type { ReviewItem } from "../../services/import/group.ts";

export function ImportView() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Import Result State
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "review" | "questions" | "sections">("all");

  const handleFileSelected = async (file: File) => {
    setErrorMessage(null);

    // Validate extension
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setErrorMessage("Invalid file format. Please select a Word document (.docx).");
      return;
    }

    setIsProcessing(true);
    setProgressStep("Archiving original document...");

    try {
      // 1. Keep original in originals table
      await saveOriginalDocx(file.name, file);

      setProgressStep("Parsing document structure & fonts...");
      const result = await importDocx(file, file.name);

      setImportResult(result);
      setReviewItems(result.items);
    } catch (err: any) {
      console.error("Import failed:", err);
      setErrorMessage(err?.message || "Failed to parse document.");
    } finally {
      setIsProcessing(false);
      setProgressStep("");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  };

  // Review Item Actions
  const handleUpdateItem = (updated: ReviewItem) => {
    setReviewItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
  };

  const handleDeleteItem = (id: string) => {
    setReviewItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleMergeWithAbove = (id: string) => {
    const idx = reviewItems.findIndex((it) => it.id === id);
    if (idx <= 0) return;

    const current = reviewItems[idx];
    const prev = reviewItems[idx - 1];

    const mergedPlain = `${prev.content.plain}\n${current.content.plain}`;
    const mergedHtml = `<p>${mergedPlain.replace(/\n/g, "<br/>")}</p>`;
    const mergedOptions = [...prev.options, ...current.options];
    const mergedMedia = [...prev.mediaIds, ...current.mediaIds];

    const updatedPrev: ReviewItem = {
      ...prev,
      content: { html: mergedHtml, plain: mergedPlain },
      options: mergedOptions,
      mediaIds: mergedMedia,
      type: mergedOptions.length > 0 ? "mcq" : prev.type
    };

    setReviewItems((prevItems) => {
      const copy = [...prevItems];
      copy[idx - 1] = updatedPrev;
      copy.splice(idx, 1);
      return copy;
    });
  };

  const handleSplitItem = (id: string, textPart1: string, textPart2: string) => {
    const idx = reviewItems.findIndex((it) => it.id === id);
    if (idx === -1) return;

    const original = reviewItems[idx];

    const item1: ReviewItem = {
      ...original,
      content: { html: `<p>${textPart1}</p>`, plain: textPart1 }
    };

    const item2: ReviewItem = {
      id: createId(),
      kind: original.kind,
      type: original.type,
      content: { html: `<p>${textPart2}</p>`, plain: textPart2 },
      options: [],
      mediaIds: [],
      confidence: original.confidence,
      warnings: ["Split from preceding item."]
    };

    setReviewItems((prevItems) => {
      const copy = [...prevItems];
      copy.splice(idx, 1, item1, item2);
      return copy;
    });
  };

  // Commit to Editor
  const handleContinueToEditor = async () => {
    if (!importResult) return;

    setIsProcessing(true);
    setProgressStep("Creating paper draft...");

    try {
      const paperName = importResult.report.filename.replace(/\.docx$/i, "");
      const newPaper = createDefaultPaper(paperName || "Imported Question Paper");

      // Set Metadata
      if (importResult.meta.instituteName) {
        newPaper.settings.header.instituteName = importResult.meta.instituteName;
      }
      if (importResult.meta.examName) {
        newPaper.meta.examName = importResult.meta.examName;
      }
      if (importResult.meta.totalMarks) {
        newPaper.meta.totalMarks = importResult.meta.totalMarks;
      }
      if (importResult.meta.durationMin) {
        newPaper.meta.durationMin = importResult.meta.durationMin;
      }
      if (importResult.meta.date) {
        newPaper.meta.date = importResult.meta.date;
      }

      // Convert ReviewItems to Sections
      const sections: SectionType[] = [];
      let currentSection: SectionType = {
        id: createId(),
        title: "Section A",
        items: []
      };

      for (const item of reviewItems) {
        if (item.kind === "heading") {
          if (currentSection.items.length > 0) {
            sections.push(currentSection);
          }
          currentSection = {
            id: createId(),
            title: item.content.plain || "Section",
            items: []
          };
        } else if (item.kind === "instruction") {
          currentSection.items.push({
            kind: "instruction",
            id: createId(),
            content: item.content
          });
        } else if (item.kind === "question") {
          const q: QuestionItem = {
            kind: "question",
            id: createId(),
            type: item.type || "mcq",
            content: item.content,
            options: item.options.map((opt) => ({
              id: createId(),
              label: opt.label,
              content: opt.content
            })),
            mediaIds: item.mediaIds,
            optionLayout: "two-column",
            customNumber: item.number,
            review: {
              confidence: item.confidence,
              warnings: item.warnings
            }
          };
          currentSection.items.push(q);
        } else {
          // kind === "other"
          currentSection.items.push({
            kind: "instruction",
            id: createId(),
            content: item.content
          });
        }
      }

      if (currentSection.items.length > 0 || sections.length === 0) {
        sections.push(currentSection);
      }

      newPaper.sections = sections;
      newPaper.updatedAt = Date.now();

      // Save as brand new draft in Dexie
      await savePaper(newPaper);

      // Navigate to editor
      navigate(`/paper/${newPaper.id}`);
    } catch (err: any) {
      setErrorMessage(`Failed to create paper draft: ${err?.message}`);
      setIsProcessing(false);
    }
  };

  const filteredItems = reviewItems.filter((it) => {
    if (activeFilter === "review") return it.confidence < 0.85 || it.warnings.length > 0;
    if (activeFilter === "questions") return it.kind === "question";
    if (activeFilter === "sections") return it.kind === "heading" || it.kind === "instruction";
    return true;
  });

  const needsReviewCount = reviewItems.filter(
    (it) => it.confidence < 0.85 || it.warnings.length > 0
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Application Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-20 shadow-2xs">
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
            <h1 className="font-bold text-sm text-slate-900">
              {importResult ? "Review Document Content" : "Import Word Document"}
            </h1>
          </div>

          {importResult && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportResult(null);
                  setReviewItems([]);
                }}
                className="text-xs text-slate-600"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                Import Another File
              </Button>

              <Button
                size="sm"
                onClick={handleContinueToEditor}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
              >
                <span>Continue to Editor</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full flex flex-col gap-6">
        {errorMessage && (
          <Alert variant="destructive" title="Import Error">
            {errorMessage}
          </Alert>
        )}

        {/* State 1: Upload Dropzone */}
        {!importResult && (
          <div className="max-w-2xl mx-auto w-full space-y-6">
            <Card
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-dashed border-2 transition-all p-8 text-center cursor-pointer ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                  : "border-slate-300 bg-white hover:border-slate-400"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />

              <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-4 shadow-2xs">
                <Upload className="h-8 w-8 text-slate-600" />
              </div>

              <h2 className="text-lg font-bold text-slate-800 mb-1">
                Upload Question Paper DOCX
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
                Drag and drop your Word document (.docx) here, or click to browse. Supports Hindi, English, equations, and diagrams.
              </p>

              {isProcessing ? (
                <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded-lg text-xs font-semibold">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span>{progressStep || "Processing document..."}</span>
                </div>
              ) : (
                <Button size="sm" className="font-semibold text-xs">
                  <FileText className="h-4 w-4 mr-2" />
                  Select .docx File
                </Button>
              )}
            </Card>

            {/* Supported Document Features */}
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Supported Document Formats
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-slate-600 space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Bilingual & Hindi:</strong> Full Unicode Mangal, Nirmala UI, and Devanagari text recognition.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Numbered Patterns:</strong> Automatically groups <code>1.</code>, <code>Q. 1</code>, <code>प्र. 1</code> with options <code>(A)</code>, <code>(B)</code>, <code>(C)</code>, <code>(D)</code> or <code>(अ)</code>, <code>(ब)</code>.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Formulas & Images:</strong> Converts OMML mathematical fractions/powers/roots and attaches diagrams.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* State 2: Review Screen */}
        {importResult && (
          <div className="space-y-6">
            {/* Import Summary Banner */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Import Result Summary: {importResult.report.filename}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Inspected {importResult.report.totalBlocks} document blocks in {importResult.report.durationMs}ms
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleContinueToEditor}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
                  >
                    <span>Continue to Editor</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Metric Counters Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-xl font-extrabold text-blue-600">
                    {importResult.report.questionCount}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Questions</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-xl font-extrabold text-slate-800">
                    {importResult.report.optionCount}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Options</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-xl font-extrabold text-slate-800">
                    {importResult.report.sectionCount}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Sections</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-xl font-extrabold text-slate-800">
                    {importResult.report.imageCount}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Images</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="block text-xl font-extrabold text-slate-800">
                    {importResult.report.mathCount}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Math Blocks</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className={`block text-xl font-extrabold ${importResult.report.unclassifiedCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {importResult.report.unclassifiedCount}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-600">Unclassified</span>
                </div>
              </div>

              {/* Legacy Font Alert if any */}
              {importResult.report.legacyHindiFonts.length > 0 && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Legacy Non-Unicode Hindi Fonts Detected: </strong>
                    {importResult.report.legacyHindiFonts.join(", ")}. Please review characters for accuracy.
                  </div>
                </div>
              )}
            </div>

            {/* Filter Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    activeFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  All Items ({reviewItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("review")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    activeFilter === "review" ? "bg-amber-500 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Needs Review ({needsReviewCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("questions")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    activeFilter === "questions" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Questions Only ({reviewItems.filter((i) => i.kind === "question").length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter("sections")}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                    activeFilter === "sections" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  Headings & Notes ({reviewItems.filter((i) => i.kind !== "question").length})
                </button>
              </div>

              <span className="text-xs text-slate-500">
                Showing {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Review Items List */}
            <div className="space-y-4">
              {filteredItems.map((item, idx) => (
                <ReviewItemCard
                  key={item.id}
                  item={item}
                  index={idx}
                  totalItems={filteredItems.length}
                  onUpdate={handleUpdateItem}
                  onDelete={handleDeleteItem}
                  onMergeWithAbove={handleMergeWithAbove}
                  onSplit={handleSplitItem}
                />
              ))}

              {filteredItems.length === 0 && (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-800">No items match this filter.</p>
                  <p className="text-xs text-slate-400 mt-1">Switch to "All Items" to inspect all extracted content.</p>
                </div>
              )}
            </div>

            {/* Bottom Floating Commit Bar */}
            <div className="sticky bottom-4 bg-white/95 backdrop-blur-xs border border-slate-200 p-4 rounded-xl shadow-lg flex items-center justify-between z-10">
              <div className="text-xs text-slate-600">
                <span>Reviewed <strong>{reviewItems.length}</strong> items. Click Continue to transfer content into the Paper Editor.</span>
              </div>

              <Button
                size="sm"
                onClick={handleContinueToEditor}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
              >
                <span>Continue to Editor</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
