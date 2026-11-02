import { useState, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Merge,
  Split,
  Plus,
  X,
  ImageIcon,
  Upload,
  Shapes
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import type { ReviewItem } from "../../services/import/group.ts";
import type { QuestionType } from "../../domain/model.ts";
import { createId } from "../../domain/ids.ts";
import { DiagramEditorModal } from "../diagram/DiagramEditorModal.tsx";
import { saveMediaBlob } from "../../services/storage/media.ts";

interface ReviewItemCardProps {
  item: ReviewItem;
  index: number;
  totalItems: number;
  onUpdate: (updated: ReviewItem) => void;
  onDelete: (id: string) => void;
  onMergeWithAbove: (id: string) => void;
  onSplit: (id: string, textPart1: string, textPart2: string) => void;
}

export function ReviewItemCard({
  item,
  index,
  onUpdate,
  onDelete,
  onMergeWithAbove,
  onSplit
}: ReviewItemCardProps) {
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitText1, setSplitText1] = useState(item.content.plain);
  const [splitText2, setSplitText2] = useState("");
  const [diagramModalOpen, setDiagramModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasShapeWarning = item.warnings.some(
    (w) => w.toLowerCase().includes("shape") || w.toLowerCase().includes("drawing")
  );

  const handleReplaceImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const mediaId = await saveMediaBlob(file.name, file.type, file);
      onUpdate({
        ...item,
        mediaIds: [...item.mediaIds, mediaId],
        warnings: item.warnings.filter((w) => !w.toLowerCase().includes("shape"))
      });
    } catch (err) {
      console.error("Failed to replace image:", err);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const isLowConfidence = item.confidence < 0.85 || item.warnings.length > 0;

  const handleKindChange = (newKind: "question" | "heading" | "instruction" | "other") => {
    onUpdate({
      ...item,
      kind: newKind,
      type: newKind === "question" ? (item.type || "mcq") : undefined
    });
  };

  const handleTypeChange = (newType: QuestionType) => {
    onUpdate({
      ...item,
      type: newType
    });
  };

  const handleContentChange = (plain: string) => {
    onUpdate({
      ...item,
      content: {
        html: `<p>${plain}</p>`,
        plain
      }
    });
  };

  const handleOptionChange = (optId: string, text: string) => {
    onUpdate({
      ...item,
      options: item.options.map((opt) =>
        opt.id === optId
          ? { ...opt, content: { html: `<p>${text}</p>`, plain: text } }
          : opt
      )
    });
  };

  const handleAddOption = () => {
    const nextLabel = String.fromCharCode(65 + item.options.length);
    onUpdate({
      ...item,
      options: [
        ...item.options,
        {
          id: createId(),
          label: nextLabel,
          content: { html: `<p>New Option</p>`, plain: "New Option" }
        }
      ]
    });
  };

  const handleRemoveOption = (optId: string) => {
    onUpdate({
      ...item,
      options: item.options.filter((opt) => opt.id !== optId)
    });
  };

  const handleOpenSplit = () => {
    const half = Math.floor(item.content.plain.length / 2);
    setSplitText1(item.content.plain.slice(0, half));
    setSplitText2(item.content.plain.slice(half).trim());
    setSplitDialogOpen(true);
  };

  const handleConfirmSplit = () => {
    if (splitText1.trim() && splitText2.trim()) {
      onSplit(item.id, splitText1.trim(), splitText2.trim());
    }
    setSplitDialogOpen(false);
  };

  return (
    <div
      className={`rounded-xl border p-4 bg-white shadow-2xs transition-all ${
        isLowConfidence
          ? "border-amber-300 ring-1 ring-amber-200"
          : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {/* Top Header of Card */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-bold text-xs text-slate-500">#{index + 1}</span>

          {/* Kind Selector */}
          <select
            value={item.kind}
            onChange={(e) => handleKindChange(e.target.value as any)}
            className="text-xs font-semibold bg-slate-100 border border-slate-300 rounded px-2 py-1 text-slate-800 cursor-pointer"
          >
            <option value="question">Question</option>
            <option value="heading">Section Heading</option>
            <option value="instruction">Instruction Note</option>
            <option value="other">Other / Unclassified</option>
          </select>

          {/* Question Subtype Selector */}
          {item.kind === "question" && (
            <select
              value={item.type || "mcq"}
              onChange={(e) => handleTypeChange(e.target.value as any)}
              className="text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 cursor-pointer"
            >
              <option value="mcq">MCQ</option>
              <option value="short">Short Answer</option>
              <option value="long">Long Answer</option>
              <option value="image">Image Based</option>
            </select>
          )}

          {/* Question Number Badge */}
          {item.kind === "question" && item.number && (
            <Badge variant="outline" className="text-xs font-mono font-bold">
              Q. {item.number}
            </Badge>
          )}

          {/* Confidence Badge */}
          {item.confidence < 0.85 ? (
            <Badge variant="warning" className="text-[10px] gap-1 px-1.5">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              <span>{Math.round(item.confidence * 100)}% Confidence</span>
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] gap-1 px-1.5 text-slate-600">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>{Math.round(item.confidence * 100)}%</span>
            </Badge>
          )}
        </div>

        {/* Card Actions */}
        <div className="flex items-center gap-1">
          {index > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMergeWithAbove(item.id)}
              className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2"
              title="Merge text into item above"
            >
              <Merge className="h-3 w-3 mr-1" />
              Merge Up
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleOpenSplit}
            className="h-7 text-xs text-slate-600 hover:text-slate-900 px-2"
            title="Split this item into two"
          >
            <Split className="h-3 w-3 mr-1" />
            Split
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onDelete(item.id)}
            className="h-7 w-7 text-slate-400 hover:text-red-600"
            title="Delete this item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Word Shape / Drawing Banner with Replace and Redraw Actions */}
      {hasShapeWarning && (
        <div className="mt-2.5 p-2.5 rounded-lg border border-amber-300 bg-amber-50/80 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-900 bg-amber-100 font-medium">
                Word Shape / Drawing
              </Badge>
              <span className="text-xs font-semibold text-amber-900">Non-Vector Placeholder</span>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.svg"
                onChange={handleReplaceImage}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-6 text-[11px] px-2 bg-white gap-1"
                title="Replace with your own PNG, JPG or SVG image"
              >
                <Upload className="h-3 w-3" />
                <span>Replace</span>
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => setDiagramModalOpen(true)}
                className="h-6 text-[11px] px-2 bg-slate-900 text-white gap-1 hover:bg-slate-800"
                title="Redraw as clean vector SVG in Diagram Editor"
              >
                <Shapes className="h-3 w-3" />
                <span>Redraw</span>
              </Button>
            </div>
          </div>
          <p className="text-[11px] text-amber-800 leading-tight">
            Word drawing/shape detected. Native vector conversion is not supported; Microsoft Word shapes are kept as non-vector placeholders. You can replace with an image or redraw as an SVG diagram.
          </p>
          {item.diagramId && (
            <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              <span>Redrawn with clean vector diagram</span>
            </div>
          )}
        </div>
      )}

      {/* Warnings Banner if any (non-shape warnings) */}
      {item.warnings.filter((w) => !w.toLowerCase().includes("shape") && !w.toLowerCase().includes("drawing")).length > 0 && (
        <div className="mt-2.5 p-2 rounded bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
          {item.warnings
            .filter((w) => !w.toLowerCase().includes("shape") && !w.toLowerCase().includes("drawing"))
            .map((w, wIdx) => (
              <div key={wIdx} className="flex items-center gap-1.5">
                <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
        </div>
      )}

      {/* Main Content Text */}
      <div className="mt-3">
        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
          {item.kind === "question" ? "Question Stem" : "Content Text"}
        </label>
        <textarea
          value={item.content.plain}
          onChange={(e) => handleContentChange(e.target.value)}
          rows={Math.min(5, Math.max(2, Math.ceil(item.content.plain.length / 80)))}
          className="w-full text-xs font-sans p-2 rounded border border-slate-300 focus:border-slate-500 focus:ring-1 focus:ring-slate-400 bg-white"
        />
      </div>

      {/* MCQ Options Section */}
      {item.kind === "question" && item.type === "mcq" && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700">
              Answer Options ({item.options.length})
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddOption}
              className="text-xs h-6 px-2 border-dashed"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Option
            </Button>
          </div>

          <div className="space-y-1.5">
            {item.options.map((opt) => (
              <div key={opt.id} className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded border border-slate-200">
                <span className="text-xs font-bold text-slate-700 w-6 text-center">
                  {opt.label}
                </span>
                <Input
                  value={opt.content.plain}
                  onChange={(e) => handleOptionChange(opt.id, e.target.value)}
                  placeholder={`Option ${opt.label} text`}
                  className="text-xs h-7 bg-white flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveOption(opt.id)}
                  className="h-6 w-6 text-slate-400 hover:text-red-600"
                  title="Remove option"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Media Attachments */}
      {item.mediaIds.length > 0 && (
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
          <ImageIcon className="h-4 w-4 text-blue-600 shrink-0" />
          <span>{item.mediaIds.length} image attachment{item.mediaIds.length === 1 ? "" : "s"}</span>
        </div>
      )}

      {/* Split Modal Dialog */}
      {splitDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="bg-white rounded-xl p-5 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="font-bold text-sm text-slate-800">Split Item</h3>
            <p className="text-xs text-slate-500">
              Adjust the two text portions below. Two separate items will be created in order.
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Part 1 (Item 1)</label>
              <textarea
                value={splitText1}
                onChange={(e) => setSplitText1(e.target.value)}
                rows={3}
                className="w-full text-xs p-2 rounded border border-slate-300"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-600 mb-1 block">Part 2 (Item 2)</label>
              <textarea
                value={splitText2}
                onChange={(e) => setSplitText2(e.target.value)}
                rows={3}
                className="w-full text-xs p-2 rounded border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setSplitDialogOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleConfirmSplit}>
                Confirm Split
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Redraw in Diagram Editor Modal */}
      {diagramModalOpen && (
        <DiagramEditorModal
          open={diagramModalOpen}
          onClose={() => setDiagramModalOpen(false)}
          questionId={item.id}
          existingDiagramId={item.diagramId}
          onSave={(newDiagramId) => {
            onUpdate({
              ...item,
              diagramId: newDiagramId,
              warnings: item.warnings.filter((w) => !w.toLowerCase().includes("shape"))
            });
          }}
        />
      )}
    </div>
  );
}
