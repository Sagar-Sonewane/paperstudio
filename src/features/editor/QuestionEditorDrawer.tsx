import { X, Plus, Trash2, LayoutGrid, AlignJustify, Columns, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { RichTextEditor } from "./RichTextEditor.tsx";
import { usePaperStore } from "./paperStore.ts";
import { getOptionLabel } from "../../domain/numbering.ts";
import type { QuestionItem } from "../../domain/model.ts";

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
    setCustomNumber
  } = usePaperStore();

  if (activeDrawer !== "question_editor" || !selectedItemId || !paper) {
    return null;
  }

  // Find question and section
  let targetSectionId = "";
  let targetQuestion: QuestionItem | null = null;

  for (const sec of paper.sections) {
    const item = sec.items.find((it) => it.id === selectedItemId);
    if (item && item.kind === "question") {
      targetSectionId = sec.id;
      targetQuestion = item;
      break;
    }
  }

  if (!targetQuestion) return null;

  const q = targetQuestion;
  const isMcq = q.type === "mcq";

  return (
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
                  <div key={opt.id} className="flex items-start gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="font-bold text-xs text-slate-700 mt-2 shrink-0 w-6 text-center">
                      {label}
                    </span>
                    <div className="flex-1">
                      <Input
                        value={opt.content.plain || opt.content.html.replace(/<[^>]*>/g, "")}
                        onChange={(e) => updateOptionContent(targetSectionId, q.id, opt.id, e.target.value)}
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
  );
}
