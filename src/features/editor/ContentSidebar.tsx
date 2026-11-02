import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Trash2,
  Copy,
  Edit2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Heading as HeadingIcon,
  FileText,
  FolderPlus,
  Layers
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { ConfirmDialog } from "../../components/ui/dialog.tsx";
import { usePaperStore } from "./paperStore.ts";
import { deriveQuestionNumbers, formatQuestionNumber } from "../../domain/numbering.ts";
import type { PaperItem } from "../../domain/model.ts";

interface SortableItemCardProps {
  item: PaperItem;
  sectionId: string;
  isFirst: boolean;
  isLast: boolean;
  derivedNumber?: string;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SortableItemCard({
  item,
  isFirst,
  isLast,
  derivedNumber,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown
}: SortableItemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1
  };

  const plainSnippet =
    item.content.plain || item.content.html.replace(/<[^>]*>/g, "").trim() || "Empty content...";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border text-xs transition-all ${
        isSelected
          ? "border-blue-500 bg-blue-50/50 shadow-xs ring-1 ring-blue-400"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60"
      }`}
    >
      <div className="flex items-start p-2.5 gap-2">
        {/* Drag Handle */}
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="mt-0.5 p-0.5 text-slate-300 hover:text-slate-600 cursor-grab active:cursor-grabbing rounded focus:outline-hidden"
          title="Drag to reorder"
          aria-label="Drag item to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Content Info */}
        <div
          className="flex-1 min-w-0 cursor-pointer"
          onClick={onSelect}
          onDoubleClick={onEdit}
        >
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            {item.kind === "question" && (
              <>
                <span className="font-bold text-slate-900 shrink-0">
                  {derivedNumber ? formatQuestionNumber(derivedNumber) : "Q."}
                </span>
                <Badge variant="outline" className="text-[10px] uppercase font-mono px-1 py-0 h-4">
                  {item.type}
                </Badge>
                {item.marks && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 text-slate-600">
                    {item.marks} M
                  </Badge>
                )}
                {item.type === "mcq" && (
                  <span className="text-[10px] text-slate-400">
                    {item.options.length} opt
                  </span>
                )}
                {item.diagramId && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 text-blue-700 bg-blue-50 border border-blue-200">
                    Diagram
                  </Badge>
                )}
                {item.mediaIds && item.mediaIds.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1 py-0 h-4 text-slate-600 bg-slate-100">
                    {item.mediaIds.length} img
                  </Badge>
                )}
              </>
            )}

            {item.kind === "heading" && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-slate-700">
                Heading
              </Badge>
            )}

            {item.kind === "instruction" && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 border-amber-200">
                Instruction
              </Badge>
            )}
          </div>

          <p className="text-slate-700 line-clamp-2 leading-relaxed">
            {plainSnippet}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          {/* Keyboard Move Up / Down */}
          <button
            type="button"
            disabled={isFirst}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 cursor-pointer"
            title="Move Up"
            aria-label="Move Up"
          >
            <ChevronUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 hover:bg-slate-100 cursor-pointer"
            title="Move Down"
            aria-label="Move Down"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>

          {/* Edit (if question) */}
          {item.kind === "question" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 cursor-pointer"
              title="Edit Question"
              aria-label="Edit Question"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Duplicate */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Duplicate Item"
            aria-label="Duplicate Item"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
            title="Delete Item"
            aria-label="Delete Item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ContentSidebar() {
  const {
    paper,
    selectedItemId,
    selectItem,
    openQuestionEditor,
    addSection,
    renameSection,
    deleteSection,
    addQuestion,
    addHeading,
    addInstruction,
    deleteItem,
    duplicateItem,
    moveItem,
    reorderItems,
    moveItemToSection
  } = usePaperStore();

  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "section" | "item";
    sectionId: string;
    itemId?: string;
    title: string;
  }>({ open: false, type: "item", sectionId: "", title: "" });

  // Setup DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  if (!paper) return null;

  const derivedNumbers = deriveQuestionNumbers(paper.sections);

  const handleDragEnd = (event: DragEndEvent, sectionId: string) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Check if over is an item in the same section
    const currentSection = paper.sections.find((s) => s.id === sectionId);
    if (currentSection && currentSection.items.some((it) => it.id === over.id)) {
      reorderItems(sectionId, String(active.id), String(over.id));
      return;
    }

    // Check if over is in another section
    for (const sec of paper.sections) {
      const overIndex = sec.items.findIndex((it) => it.id === over.id);
      if (overIndex !== -1) {
        moveItemToSection(sectionId, sec.id, String(active.id), overIndex);
        return;
      }
    }
  };

  const handleRenameCommit = (sectionId: string) => {
    if (newSectionTitle.trim()) {
      renameSection(sectionId, newSectionTitle.trim());
    }
    setRenamingSectionId(null);
  };

  const handleDeleteConfirm = () => {
    if (deleteConfirm.type === "section") {
      deleteSection(deleteConfirm.sectionId);
    } else if (deleteConfirm.itemId) {
      deleteItem(deleteConfirm.sectionId, deleteConfirm.itemId);
    }
    setDeleteConfirm({ open: false, type: "item", sectionId: "", title: "" });
  };

  const totalQuestions = paper.sections.reduce(
    (acc, sec) => acc + sec.items.filter((it) => it.kind === "question").length,
    0
  );

  return (
    <aside className="w-full h-full bg-slate-50 border-r border-slate-200 flex flex-col select-none">
      {/* Sidebar Header */}
      <div className="px-4 py-3 border-b border-slate-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-slate-700" />
          <h2 className="text-sm font-bold text-slate-800">Sections & Items</h2>
        </div>
        <Badge variant="outline" className="text-xs font-mono">
          {totalQuestions} Qs
        </Badge>
      </div>

      {/* Sections Scrollable List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {paper.sections.map((section, sIdx) => {
          const itemIds = section.items.map((it) => it.id);

          return (
            <div
              key={section.id}
              className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden"
            >
              {/* Section Header */}
              <div className="p-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {renamingSectionId === section.id ? (
                    <Input
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      onBlur={() => handleRenameCommit(section.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRenameCommit(section.id);
                        if (e.key === "Escape") setRenamingSectionId(null);
                      }}
                      autoFocus
                      className="h-7 text-xs font-bold bg-white"
                    />
                  ) : (
                    <div
                      className="cursor-pointer group flex items-center gap-1.5"
                      onClick={() => {
                        setRenamingSectionId(section.id);
                        setNewSectionTitle(section.title);
                      }}
                      title="Click to rename section"
                    >
                      <h3 className="text-xs font-bold text-slate-800 line-clamp-1">
                        Section {sIdx + 1}: {section.title}
                      </h3>
                      <Edit2 className="h-3 w-3 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </div>
                  )}
                  <span className="text-[10px] text-slate-400">
                    {section.items.length} item{section.items.length === 1 ? "" : "s"}
                  </span>
                </div>

                {/* Section Action Menu */}
                <div className="flex items-center gap-1">
                  {paper.sections.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirm({
                          open: true,
                          type: "section",
                          sectionId: section.id,
                          title: section.title
                        })
                      }
                      className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-slate-200 cursor-pointer"
                      title="Delete Section"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Items List with DnD */}
              <div className="p-2 space-y-2">
                {section.items.length === 0 ? (
                  <div className="text-center py-6 px-3 border border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400 italic mb-2">No items in this section yet.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => addQuestion(section.id, "mcq")}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add First MCQ
                    </Button>
                  </div>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={(e) => handleDragEnd(e, section.id)}
                  >
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                      {section.items.map((item, idx) => {
                        const derivedNum =
                          item.kind === "question" ? derivedNumbers.get(item.id) : undefined;
                        return (
                          <SortableItemCard
                            key={item.id}
                            item={item}
                            sectionId={section.id}
                            isFirst={idx === 0}
                            isLast={idx === section.items.length - 1}
                            derivedNumber={derivedNum}
                            isSelected={selectedItemId === item.id}
                            onSelect={() => {
                              selectItem(item.id);
                              if (item.kind === "question") {
                                openQuestionEditor(item.id);
                              }
                            }}
                            onEdit={() => {
                              selectItem(item.id);
                              openQuestionEditor(item.id);
                            }}
                            onDuplicate={() => duplicateItem(section.id, item.id)}
                            onDelete={() =>
                              setDeleteConfirm({
                                open: true,
                                type: "item",
                                sectionId: section.id,
                                itemId: item.id,
                                title:
                                  item.content.plain ||
                                  item.content.html.replace(/<[^>]*>/g, "").slice(0, 30) ||
                                  "item"
                              })
                            }
                            onMoveUp={() => moveItem(section.id, item.id, "up")}
                            onMoveDown={() => moveItem(section.id, item.id, "down")}
                          />
                        );
                      })}
                    </SortableContext>
                  </DndContext>
                )}

                {/* Add Item Actions Dropdown / Toolbar */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addQuestion(section.id, "mcq")}
                      className="text-xs h-7 flex-1 border-slate-200 hover:bg-slate-100"
                      title="Add Multiple Choice Question"
                    >
                      <Plus className="h-3 w-3 mr-1" /> MCQ
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addQuestion(section.id, "short")}
                      className="text-xs h-7 border-slate-200 hover:bg-slate-100"
                      title="Add Short Answer Question"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Short
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addQuestion(section.id, "long")}
                      className="text-xs h-7 border-slate-200 hover:bg-slate-100"
                      title="Add Long Answer Question"
                    >
                      <Plus className="h-3 w-3 mr-1" /> Long
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addHeading(section.id)}
                      className="text-xs h-7 px-2 text-slate-600 hover:bg-slate-100"
                      title="Add Heading"
                    >
                      <HeadingIcon className="h-3 w-3" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => addInstruction(section.id)}
                      className="text-xs h-7 px-2 text-slate-600 hover:bg-slate-100"
                      title="Add Instruction Note"
                    >
                      <FileText className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Section Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => addSection(`Section ${paper.sections.length + 1}`)}
          className="w-full text-xs border-dashed border-slate-300 text-slate-600 hover:text-slate-900 bg-white"
        >
          <FolderPlus className="h-3.5 w-3.5 mr-1.5" />
          Add New Section
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteConfirm.type === "section" ? "Delete Section" : "Delete Item"}
        message={
          deleteConfirm.type === "section"
            ? `Are you sure you want to delete section "${deleteConfirm.title}" and all its questions?`
            : `Are you sure you want to delete this ${deleteConfirm.title}?`
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteConfirm({ open: false, type: "item", sectionId: "", title: "" })}
      />
    </aside>
  );
}
