import { useState, useEffect } from "react";
import { Check, LayoutTemplate, Bookmark } from "lucide-react";
import { Modal } from "../../components/ui/dialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { BUILTIN_TEMPLATES } from "../../domain/templates/registry.ts";
import { usePaperStore } from "../editor/paperStore.ts";
import { TemplateHeader } from "./TemplateHeader.tsx";
import { TemplateFooter } from "./TemplateFooter.tsx";
import { getPageBorderStyle } from "./borders.ts";
import { listSavedTemplates } from "../../services/storage/templates.ts";
import type { SavedTemplateType, PaperType } from "../../domain/model.ts";

export interface TemplateGalleryModalProps {
  open: boolean;
  onClose: () => void;
}

export function TemplateGalleryModal({ open, onClose }: TemplateGalleryModalProps) {
  const { paper, applyTemplate, updateLayoutSettings } = usePaperStore();
  const [activeTab, setActiveTab] = useState<"builtin" | "saved">("builtin");
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateType[]>([]);

  useEffect(() => {
    if (open) {
      listSavedTemplates()
        .then((list) => setSavedTemplates(list || []))
        .catch(() => {});
    }
  }, [open]);

  if (!paper) return null;

  const handleSelectTemplate = (templateId: string) => {
    applyTemplate(templateId);
    onClose();
  };

  const handleSelectSavedTemplate = (saved: SavedTemplateType) => {
    updateLayoutSettings(() => JSON.parse(JSON.stringify(saved.settings)));
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Template Gallery"
      description="Select a template design for your question paper. Switching designs updates typography, borders, and header styling instantly without modifying any question content."
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("builtin")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "builtin"
                ? "border-blue-600 text-blue-700 bg-blue-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <LayoutTemplate className="h-3.5 w-3.5" />
            <span>Built-in Templates (4)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("saved")}
            className={`flex-1 py-2 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === "saved"
                ? "border-blue-600 text-blue-700 bg-blue-50/50"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Bookmark className="h-3.5 w-3.5" />
            <span>My Saved Templates ({savedTemplates.length})</span>
          </button>
        </div>

        {activeTab === "builtin" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {BUILTIN_TEMPLATES.map((tpl) => {
              const isActive = paper.templateId === tpl.id;

              // Construct a mock paper representation for rendering the real preview
              const previewPaper: PaperType = {
                ...paper,
                templateId: tpl.id,
                settings: {
                  ...tpl.defaults,
                  header: {
                    ...tpl.defaults.header,
                    instituteName:
                      paper.settings.header.instituteName || tpl.defaults.header.instituteName,
                    subtitle: paper.settings.header.subtitle || tpl.defaults.header.subtitle
                  }
                }
              };

              return (
                <div
                  key={tpl.id}
                  className={`flex flex-col border rounded-xl overflow-hidden transition-all bg-white ${
                    isActive
                      ? "ring-2 ring-blue-600 border-blue-500 shadow-md"
                      : "border-slate-200 hover:border-slate-400 hover:shadow-xs"
                  }`}
                >
                  {/* Card Header */}
                  <div className="p-3 bg-slate-50/80 border-b border-slate-200 flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        {tpl.name}
                        {isActive && (
                          <Badge variant="default" className="text-[9px] h-4 px-1.5 bg-blue-600">
                            Active
                          </Badge>
                        )}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{tpl.description}</p>
                    </div>
                  </div>

                  {/* Real Rendered Mini Preview Frame */}
                  <div className="p-3 bg-slate-100 flex items-center justify-center overflow-hidden">
                    <div
                      className="w-[200px] h-[260px] bg-white shadow-sm overflow-hidden text-[6px] leading-tight select-none relative box-border flex flex-col p-2"
                      style={{
                        fontFamily: tpl.defaults.typography.fontFamily,
                        transform: "scale(1)",
                        transformOrigin: "top center"
                      }}
                    >
                      {/* Inner Page Border */}
                      <div
                        className="w-full h-full flex flex-col relative box-border overflow-hidden"
                        style={getPageBorderStyle(tpl.defaults.border)}
                      >
                        {/* Real Header */}
                        <div className="scale-75 origin-top w-[133%] -mb-2">
                          <TemplateHeader paper={previewPaper} pageNumber={1} totalPages={2} />
                        </div>

                        {/* Simulated 2-Column Content */}
                        <div className="flex-1 grid grid-cols-2 gap-1.5 pt-1 overflow-hidden opacity-85">
                          <div className="space-y-1">
                            <div className="font-bold border-b border-black pb-0.5 text-[5px]">
                              खण्ड - अ : भौतिकी / PHYSICS
                            </div>
                            <div className="text-[5px]">
                              <span className="font-bold">1. </span>What is SI unit of force?
                              <div className="grid grid-cols-2 gap-0.5 text-[4.5px] text-slate-600 pt-0.5">
                                <span>(A) Newton</span>
                                <span>(B) Pascal</span>
                              </div>
                            </div>
                            <div className="text-[5px]">
                              <span className="font-bold">2. </span>प्रकाश का वेग कितना है?
                              <div className="grid grid-cols-2 gap-0.5 text-[4.5px] text-slate-600 pt-0.5">
                                <span>(A) 3×10⁸ m/s</span>
                                <span>(B) 3×10⁶ m/s</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="font-bold border-b border-black pb-0.5 text-[5px]">
                              खण्ड - ब : रसायन / CHEMISTRY
                            </div>
                            <div className="text-[5px]">
                              <span className="font-bold">3. </span>जल का रासायनिक सूत्र क्या है?
                              <div className="grid grid-cols-2 gap-0.5 text-[4.5px] text-slate-600 pt-0.5">
                                <span>(A) H₂O</span>
                                <span>(B) CO₂</span>
                              </div>
                            </div>
                            <div className="text-[5px]">
                              <span className="font-bold">4. </span>Valency of Carbon?
                              <div className="grid grid-cols-2 gap-0.5 text-[4.5px] text-slate-600 pt-0.5">
                                <span>(A) 4</span>
                                <span>(B) 2</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Real Footer */}
                        <div className="scale-75 origin-bottom w-[133%] -mt-1">
                          <TemplateFooter paper={previewPaper} pageNumber={1} totalPages={2} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="p-2.5 bg-white border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 capitalize">
                      {tpl.defaults.columns.count} Col &bull; {tpl.defaults.border.style} border
                    </span>
                    <Button
                      size="sm"
                      variant={isActive ? "secondary" : "default"}
                      onClick={() => handleSelectTemplate(tpl.id)}
                      disabled={isActive}
                      className="h-7 text-xs px-3"
                    >
                      {isActive ? (
                        <>
                          <Check className="h-3 w-3 mr-1 text-emerald-600" /> Current
                        </>
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3 pt-2">
            {savedTemplates.length === 0 ? (
              <div className="text-center py-8 bg-slate-50 rounded-lg border border-slate-200">
                <Bookmark className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No Custom Templates Saved</p>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  Customize margins, borders, or typography in the Settings panel and click &ldquo;Save as
                  Reusable Template&rdquo;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedTemplates.map((saved) => (
                  <div
                    key={saved.id}
                    className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col justify-between gap-3 shadow-2xs hover:border-slate-400 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{saved.name}</h4>
                        <Badge variant="outline" className="text-[9px]">
                          {saved.baseTemplateId}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Saved on {new Date(saved.createdAt).toLocaleDateString()}
                      </p>
                      <div className="mt-2 text-[10px] text-slate-600 flex gap-2">
                        <span>{saved.settings.columns.count} Columns</span>
                        <span>&bull;</span>
                        <span>{saved.settings.border.style} Border</span>
                        <span>&bull;</span>
                        <span>{saved.settings.page.size}</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleSelectSavedTemplate(saved)}
                        className="h-7 text-xs bg-slate-900 text-white"
                      >
                        Apply Layout
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
