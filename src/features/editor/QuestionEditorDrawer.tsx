import { useState, useEffect, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  LayoutGrid,
  AlignJustify,
  Columns,
  ChevronUp,
  ChevronDown,
  Shapes,
  Upload,
  ImageIcon,
  Edit3
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { RichTextEditor } from "./RichTextEditor.tsx";
import { usePaperStore } from "./paperStore.ts";
import { getOptionLabel } from "../../domain/numbering.ts";
import type { QuestionItem } from "../../domain/model.ts";
import { DiagramEditorModal } from "../diagram/DiagramEditorModal.tsx";
import { getDiagram, saveDiagram } from "../../services/storage/diagrams.ts";
import { saveMediaBlob, getMediaBlob, deleteMediaBlob } from "../../services/storage/media.ts";
import { createId } from "../../domain/ids.ts";

export function QuestionEditorDrawer() {
  const {
    paper,
    selectedItemId,
    activeDrawer,
    closeDrawer,
    updateItemContent,
    addOption,
    removeOption,
    moveOption,
    updateOptionContent,
    setOptionLayout,
    setQuestionMarks,
    setCustomNumber,
    setQuestionDiagram,
    addQuestionMedia,
    removeQuestionMedia
  } = usePaperStore();

  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const [diagramSvg, setDiagramSvg] = useState<string | null>(null);
  const [mediaUrls, setMediaUrls] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Find question and section
  let targetSectionId = "";
  let targetQuestion: QuestionItem | null = null;

  if (paper && selectedItemId) {
    for (const sec of paper.sections) {
      const item = sec.items.find((it) => it.id === selectedItemId);
      if (item && item.kind === "question") {
        targetSectionId = sec.id;
        targetQuestion = item;
        break;
      }
    }
  }

  const q = targetQuestion;

  // Load Diagram SVG if diagramId exists
  useEffect(() => {
    let isMounted = true;
    if (q?.diagramId) {
      getDiagram(q.diagramId).then((rec) => {
        if (isMounted) {
          setDiagramSvg(rec?.svg || null);
        }
      });
    } else {
      setDiagramSvg(null);
    }
    return () => {
      isMounted = false;
    };
  }, [q?.diagramId]);

  // Load Media Blob URLs
  useEffect(() => {
    let isMounted = true;
    const urls: Record<string, string> = {};

    if (q?.mediaIds && q.mediaIds.length > 0) {
      Promise.all(
        q.mediaIds.map(async (mId) => {
          const rec = await getMediaBlob(mId);
          if (rec?.blob) {
            urls[mId] = URL.createObjectURL(rec.blob);
          }
        })
      ).then(() => {
        if (isMounted) {
          setMediaUrls(urls);
        }
      });
    } else {
      setMediaUrls({});
    }

    return () => {
      isMounted = false;
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [q?.mediaIds]);

  if (activeDrawer !== "question_editor" || !selectedItemId || !paper || !q) {
    return null;
  }

  const isMcq = q.type === "mcq";

  // Handle Image or Diagram Upload (PNG, JPG, SVG)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const isSvg = file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg");

      if (isSvg) {
        // Read SVG as text and save as a Diagram
        const svgText = await file.text();
        const diagramId = createId();
        await saveDiagram({
          id: diagramId,
          width: 440,
          height: 280,
          shapes: [],
          svg: svgText,
          questionId: q.id
        });
        setQuestionDiagram(targetSectionId, q.id, diagramId);
        setDiagramSvg(svgText);
      } else {
        // Save as binary image media blob
        const mediaId = await saveMediaBlob(file.name, file.type, file);
        addQuestionMedia(targetSectionId, q.id, mediaId);
      }
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload image or diagram.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveDiagram = () => {
    setQuestionDiagram(targetSectionId, q.id, undefined);
    setDiagramSvg(null);
  };

  const handleRemoveMedia = async (mediaId: string) => {
    removeQuestionMedia(targetSectionId, q.id, mediaId);
    await deleteMediaBlob(mediaId);
  };

  return (
    <>
      <aside className="w-full h-full bg-white border-l border-slate-200 flex flex-col shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase font-mono">
              {q.type}
            </Badge>
            <h2 className="text-sm font-bold text-slate-800">Edit Question</h2>
          </div>
          <button
            onClick={closeDrawer}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 cursor-pointer"
            aria-label="Close question editor"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {/* Question Stem */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Question Stem (Hindi / English Rich Text)
            </label>
            <RichTextEditor
              initialContent={q.content.html || ""}
              onChange={(html, plain) => updateItemContent(targetSectionId, q.id, html, plain)}
              minHeight="110px"
            />
          </div>

          {/* Question Metadata: Custom Number & Marks */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Custom Number (Optional)
              </label>
              <Input
                value={q.customNumber || ""}
                onChange={(e) => setCustomNumber(targetSectionId, q.id, e.target.value)}
                placeholder="e.g. 1A or प्र. 1"
                className="text-xs h-8"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Marks (Optional)
              </label>
              <Input
                type="number"
                value={q.marks ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : undefined;
                  setQuestionMarks(targetSectionId, q.id, val);
                }}
                placeholder="e.g. 2"
                className="text-xs h-8"
                min={1}
              />
            </div>
          </div>

          {/* Diagrams & Visuals Section */}
          <div className="pt-3 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Shapes className="h-3.5 w-3.5 text-blue-600" />
                  Diagrams & Visuals
                </h3>
                <p className="text-[11px] text-slate-500">
                  Embed vector diagrams or illustrations attached to this question
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-7 text-xs gap-1"
                  title="Upload existing image (PNG, JPG) or vector (SVG)"
                >
                  <Upload className="h-3 w-3" />
                  <span>Upload</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => setDiagramModalOpen(true)}
                  className="h-7 text-xs bg-slate-900 text-white hover:bg-slate-800 gap-1"
                  title="Open SVG Diagram Editor"
                >
                  <Shapes className="h-3 w-3" />
                  <span>{q.diagramId ? "Edit Diagram" : "Draw Diagram"}</span>
                </Button>
              </div>
            </div>

            {/* Render Attached Diagram if any */}
            {q.diagramId && (
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="default" className="text-[9px] h-4 bg-blue-600">
                      Vector SVG
                    </Badge>
                    <span className="text-xs font-semibold text-slate-700">Geometric Diagram</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDiagramModalOpen(true)}
                      className="h-6 text-xs text-blue-700 hover:bg-blue-100 px-2"
                    >
                      <Edit3 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveDiagram}
                      className="h-6 text-xs text-red-600 hover:bg-red-50 px-2"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* SVG Visual Preview */}
                <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-center max-h-48 overflow-hidden">
                  {diagramSvg ? (
                    <div
                      className="w-full max-w-[280px] flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: diagramSvg }}
                    />
                  ) : (
                    <span className="text-xs text-slate-400 italic">Loading diagram...</span>
                  )}
                </div>
              </div>
            )}

            {/* Render Attached Media Images if any */}
            {q.mediaIds && q.mediaIds.length > 0 && (
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Attached Images ({q.mediaIds.length})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {q.mediaIds.map((mId) => (
                    <div
                      key={mId}
                      className="p-1.5 rounded bg-slate-50 border border-slate-200 relative group flex flex-col items-center"
                    >
                      {mediaUrls[mId] ? (
                        <img
                          src={mediaUrls[mId]}
                          alt="Question attachment"
                          className="h-20 w-full object-contain bg-white rounded"
                        />
                      ) : (
                        <div className="h-20 w-full flex items-center justify-center bg-slate-100 rounded">
                          <ImageIcon className="h-5 w-5 text-slate-400" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(mId)}
                        className="mt-1 text-[10px] text-red-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* MCQ Options Section */}
          {isMcq && (
            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Answer Options</h3>
                  <span className="text-[11px] text-slate-500">
                    {q.options.length} options configured
                  </span>
                </div>

                {/* Option Layout Selector */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md border border-slate-200">
                  <button
                    type="button"
                    title="Two Columns"
                    onClick={() => setOptionLayout(targetSectionId, q.id, "two-column")}
                    className={`p-1 rounded cursor-pointer ${
                      (q.optionLayout || "two-column") === "two-column"
                        ? "bg-white shadow-xs text-blue-600"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Columns className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Vertical List"
                    onClick={() => setOptionLayout(targetSectionId, q.id, "vertical")}
                    className={`p-1 rounded cursor-pointer ${
                      q.optionLayout === "vertical"
                        ? "bg-white shadow-xs text-blue-600"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <AlignJustify className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Inline"
                    onClick={() => setOptionLayout(targetSectionId, q.id, "inline")}
                    className={`p-1 rounded cursor-pointer ${
                      q.optionLayout === "inline"
                        ? "bg-white shadow-xs text-blue-600"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Options List */}
              <div className="space-y-2.5">
                {q.options.map((opt, idx) => {
                  const label = getOptionLabel(idx);
                  return (
                    <div
                      key={opt.id}
                      className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
                    >
                      <span className="font-bold text-xs text-slate-700 mt-2 shrink-0 w-6 text-center">
                        {label}
                      </span>
                      <div className="flex-1">
                        <Input
                          value={opt.content.plain || opt.content.html.replace(/<[^>]*>/g, "")}
                          onChange={(e) =>
                            updateOptionContent(targetSectionId, q.id, opt.id, e.target.value)
                          }
                          placeholder={`Option ${label} text`}
                          className="text-xs h-8 bg-white"
                        />
                      </div>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-6 p-0 text-slate-400 hover:text-slate-700"
                          disabled={idx === 0}
                          onClick={() => moveOption(targetSectionId, q.id, opt.id, "up")}
                          title="Move option up"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-6 p-0 text-slate-400 hover:text-slate-700"
                          disabled={idx === q.options.length - 1}
                          onClick={() => moveOption(targetSectionId, q.id, opt.id, "down")}
                          title="Move option down"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                        {q.options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-7 p-0 text-slate-400 hover:text-red-600"
                            onClick={() => removeOption(targetSectionId, q.id, opt.id)}
                            title="Delete option"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addOption(targetSectionId, q.id)}
                  className="w-full text-xs mt-2 border-dashed"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <Button size="sm" onClick={closeDrawer}>
            Done Editing
          </Button>
        </div>
      </aside>

      {/* Diagram Editor Modal */}
      {diagramModalOpen && (
        <DiagramEditorModal
          open={diagramModalOpen}
          onClose={() => setDiagramModalOpen(false)}
          questionId={q.id}
          existingDiagramId={q.diagramId}
          onSave={(newDiagramId, newSvg) => {
            setQuestionDiagram(targetSectionId, q.id, newDiagramId);
            setDiagramSvg(newSvg);
          }}
        />
      )}
    </>
  );
}
