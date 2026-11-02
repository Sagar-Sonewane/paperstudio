import { useState, useEffect, useRef } from "react";
import {
  X,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  Type,
  LayoutGrid,
  CreditCard,
  Frame,
  Bookmark,
  Upload,
  Trash2,
  Edit2,
  Check,
  RotateCcw
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { usePaperStore } from "./paperStore.ts";
import { saveMediaBlob, getMediaBlob } from "../../services/storage/media.ts";
import {
  listSavedTemplates,
  saveCustomTemplate,
  renameCustomTemplate,
  deleteCustomTemplate
} from "../../services/storage/templates.ts";
import { createId } from "../../domain/ids.ts";
import { getBuiltinTemplate } from "../../domain/templates/registry.ts";
import type { SavedTemplateType } from "../../domain/model.ts";

export function SettingsPanelDrawer() {
  const { paper, updateLayoutSettings, applyTemplate, closeDrawer } = usePaperStore();

  // Collapsible section open states
  const [openSections, setOpenSections] = useState({
    paperSetup: true,
    typography: false,
    questions: false,
    headerFooter: false,
    borders: false,
    customTemplates: false
  });

  // Logo state
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Saved templates state
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplateType[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renamingName, setRenamingName] = useState("");

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Load logo thumbnail if logoMediaId exists
  useEffect(() => {
    let isMounted = true;
    if (paper?.settings.header.logoMediaId) {
      getMediaBlob(paper.settings.header.logoMediaId).then((rec) => {
        if (isMounted && rec?.blob) {
          setLogoPreview(URL.createObjectURL(rec.blob));
        }
      });
    } else {
      setLogoPreview(null);
    }
    return () => {
      isMounted = false;
    };
  }, [paper?.settings.header.logoMediaId]);

  // Load saved templates
  const refreshSavedTemplates = async () => {
    try {
      const list = await listSavedTemplates();
      setSavedTemplates(list || []);
    } catch (e) {
      console.warn("Could not load saved templates:", e);
    }
  };

  useEffect(() => {
    refreshSavedTemplates();
  }, []);

  if (!paper) return null;
  const s = paper.settings;

  // Logo handler
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const mediaId = await saveMediaBlob(file.name, file.type, file);
      updateLayoutSettings((prev) => ({
        ...prev,
        header: {
          ...prev.header,
          logoMediaId: mediaId
        }
      }));
    } catch (err: any) {
      alert(`Logo upload failed: ${err.message}`);
    }
  };

  const handleRemoveLogo = () => {
    updateLayoutSettings((prev) => ({
      ...prev,
      header: {
        ...prev.header,
        logoMediaId: undefined
      }
    }));
    setLogoPreview(null);
  };

  // Reset to template default settings
  const handleResetToTemplateDefaults = () => {
    const tpl = getBuiltinTemplate(paper.templateId);
    applyTemplate(tpl.id);
  };

  // Save as custom template
  const handleSaveAsCustomTemplate = async () => {
    if (!newTemplateName.trim()) return;
    try {
      const newTpl: SavedTemplateType = {
        id: createId(),
        name: newTemplateName.trim(),
        description: `Custom layout based on ${paper.templateId}`,
        baseTemplateId: paper.templateId,
        settings: JSON.parse(JSON.stringify(paper.settings)),
        createdAt: Date.now()
      };
      await saveCustomTemplate(newTpl);
      setNewTemplateName("");
      await refreshSavedTemplates();
    } catch (err: any) {
      alert(`Failed to save template: ${err.message}`);
    }
  };

  const handleApplySavedTemplate = (tpl: SavedTemplateType) => {
    updateLayoutSettings(() => JSON.parse(JSON.stringify(tpl.settings)));
  };

  const handleDeleteSavedTemplate = async (id: string) => {
    if (confirm("Delete this saved custom template?")) {
      await deleteCustomTemplate(id);
      await refreshSavedTemplates();
    }
  };

  const handleRenameSavedTemplate = async (id: string) => {
    if (!renamingName.trim()) return;
    await renameCustomTemplate(id, renamingName.trim());
    setRenamingId(null);
    setRenamingName("");
    await refreshSavedTemplates();
  };

  return (
    <div className="h-full flex flex-col bg-white border-l border-slate-200 shadow-lg text-slate-800">
      {/* Header */}
      <div className="h-14 border-b border-slate-200 px-4 flex items-center justify-between shrink-0 bg-slate-50">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Layout & Design Settings</h2>
          <p className="text-[11px] text-slate-500">Fine-tune paper setup, typography & styling</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={closeDrawer}
          className="h-8 w-8 text-slate-500 hover:text-slate-900"
          title="Close Settings Panel"
          aria-label="Close Settings Panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Scrollable Form Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
        {/* Reset to Default Button */}
        <div className="pb-3 flex justify-between items-center">
          <span className="text-xs text-slate-500">
            Active: <span className="font-semibold text-slate-800">{paper.templateId}</span>
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToTemplateDefaults}
            className="h-7 text-xs text-slate-600 gap-1"
            title="Reset current settings to template defaults"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Reset Defaults</span>
          </Button>
        </div>

        {/* 1. Paper Setup */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => toggleSection("paperSetup")}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-900 pb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-slate-600" />
              1. Paper Setup (Page & Columns)
            </span>
            {openSections.paperSetup ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {openSections.paperSetup && (
            <div className="space-y-3 pt-2 pl-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Page Size</label>
                  <select
                    value={s.page.size}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        page: { ...p.page, size: e.target.value as "A4" | "Letter" }
                      }))
                    }
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                  >
                    <option value="A4">A4 (210 × 297 mm)</option>
                    <option value="Letter">Letter (8.5 × 11 in)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Orientation</label>
                  <select
                    value={s.page.orientation}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        page: { ...p.page, orientation: e.target.value as "portrait" | "landscape" }
                      }))
                    }
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                  >
                    <option value="portrait">Portrait</option>
                    <option value="landscape">Landscape</option>
                  </select>
                </div>
              </div>

              {/* Margins */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Margins (mm)</label>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Top</span>
                    <Input
                      type="number"
                      value={s.page.marginMm.t}
                      min={5}
                      max={30}
                      onChange={(e) =>
                        updateLayoutSettings((p) => ({
                          ...p,
                          page: {
                            ...p.page,
                            marginMm: { ...p.page.marginMm, t: Number(e.target.value) }
                          }
                        }))
                      }
                      className="h-7 text-xs px-1 text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Right</span>
                    <Input
                      type="number"
                      value={s.page.marginMm.r}
                      min={5}
                      max={30}
                      onChange={(e) =>
                        updateLayoutSettings((p) => ({
                          ...p,
                          page: {
                            ...p.page,
                            marginMm: { ...p.page.marginMm, r: Number(e.target.value) }
                          }
                        }))
                      }
                      className="h-7 text-xs px-1 text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Bottom</span>
                    <Input
                      type="number"
                      value={s.page.marginMm.b}
                      min={5}
                      max={30}
                      onChange={(e) =>
                        updateLayoutSettings((p) => ({
                          ...p,
                          page: {
                            ...p.page,
                            marginMm: { ...p.page.marginMm, b: Number(e.target.value) }
                          }
                        }))
                      }
                      className="h-7 text-xs px-1 text-center"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block">Left</span>
                    <Input
                      type="number"
                      value={s.page.marginMm.l}
                      min={5}
                      max={30}
                      onChange={(e) =>
                        updateLayoutSettings((p) => ({
                          ...p,
                          page: {
                            ...p.page,
                            marginMm: { ...p.page.marginMm, l: Number(e.target.value) }
                          }
                        }))
                      }
                      className="h-7 text-xs px-1 text-center"
                    />
                  </div>
                </div>
              </div>

              {/* Columns & Gap */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Columns</label>
                  <select
                    value={s.columns.count}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        columns: { ...p.columns, count: Number(e.target.value) }
                      }))
                    }
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                  >
                    <option value={1}>1 Column</option>
                    <option value={2}>2 Columns</option>
                    <option value={3}>3 Columns</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Column Gap (mm)</label>
                  <Input
                    type="number"
                    value={s.columns.gapMm}
                    min={2}
                    max={20}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        columns: { ...p.columns, gapMm: Number(e.target.value) }
                      }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2. Typography */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => toggleSection("typography")}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-900 pb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Type className="h-4 w-4 text-slate-600" />
              2. Typography & Font Sizes
            </span>
            {openSections.typography ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {openSections.typography && (
            <div className="space-y-3 pt-2 pl-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Font Family</label>
                <select
                  value={s.typography.fontFamily}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      typography: { ...p.typography, fontFamily: e.target.value }
                    }))
                  }
                  className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                >
                  <option value="Times New Roman">Times New Roman (Serif Classic)</option>
                  <option value="Arial">Arial (Sans Modern)</option>
                  <option value="Calibri">Calibri (Clean Body)</option>
                  <option value="Mangal">Mangal (Devanagari Standard)</option>
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-slate-600">Questions (pt)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min={7}
                    max={14}
                    value={s.typography.questionPt}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        typography: { ...p.typography, questionPt: Number(e.target.value) }
                      }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600">Options (pt)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min={6}
                    max={12}
                    value={s.typography.optionPt}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        typography: { ...p.typography, optionPt: Number(e.target.value) }
                      }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-slate-600">Headings (pt)</label>
                  <Input
                    type="number"
                    step="0.5"
                    min={8}
                    max={16}
                    value={s.typography.headingPt}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        typography: { ...p.typography, headingPt: Number(e.target.value) }
                      }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Line Height</label>
                  <select
                    value={s.typography.lineHeight}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        typography: { ...p.typography, lineHeight: Number(e.target.value) }
                      }))
                    }
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                  >
                    <option value={1.2}>Tight (1.20)</option>
                    <option value={1.35}>Normal (1.35)</option>
                    <option value={1.5}>Relaxed (1.50)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Paragraph Gap (pt)</label>
                  <Input
                    type="number"
                    value={s.typography.paragraphGapPt}
                    min={1}
                    max={10}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        typography: { ...p.typography, paragraphGapPt: Number(e.target.value) }
                      }))
                    }
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 3. Question Layout */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => toggleSection("questions")}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-900 pb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <LayoutGrid className="h-4 w-4 text-slate-600" />
              3. Question & Option Layout
            </span>
            {openSections.questions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {openSections.questions && (
            <div className="space-y-3 pt-2 pl-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Default Option Layout</label>
                <select
                  value={s.questions.optionLayout}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      questions: {
                        ...p.questions,
                        optionLayout: e.target.value as "two-column" | "vertical" | "inline"
                      }
                    }))
                  }
                  className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                >
                  <option value="two-column">Two-Column (A & B, C & D)</option>
                  <option value="vertical">Vertical (Stacked)</option>
                  <option value="inline">Inline (Single row)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Number Format</label>
                  <select
                    value={s.questions.numberFormat}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        questions: { ...p.questions, numberFormat: e.target.value }
                      }))
                    }
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                  >
                    <option value="Q. {n}.">Q. 1.</option>
                    <option value="Q{n}.">Q1.</option>
                    <option value="{n}.">1.</option>
                    <option value="प्र. {n}.">प्र. 1.</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600">Option Label Style</label>
                  <select
                    value={s.questions.optionLabelStyle}
                    onChange={(e) =>
                      updateLayoutSettings((p) => ({
                        ...p,
                        questions: { ...p.questions, optionLabelStyle: e.target.value }
                      }))
                    }
                    className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                  >
                    <option value="({L})">(A), (B), (C)</option>
                    <option value="{L})">A), B), C)</option>
                    <option value="({l})">(a), (b), (c)</option>
                    <option value="({DEV})">(अ), (ब), (स)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="showMarksToggle"
                  checked={s.questions.showMarks}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      questions: { ...p.questions, showMarks: e.target.checked }
                    }))
                  }
                  className="rounded border-slate-300"
                />
                <label htmlFor="showMarksToggle" className="text-xs text-slate-700 cursor-pointer">
                  Display Marks allocation per question
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 4. Header & Footer */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => toggleSection("headerFooter")}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-900 pb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <CreditCard className="h-4 w-4 text-slate-600" />
              4. Header, Meta & Logo
            </span>
            {openSections.headerFooter ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {openSections.headerFooter && (
            <div className="space-y-3 pt-2 pl-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Institute / Academy Name</label>
                <Input
                  value={s.header.instituteName}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      header: { ...p.header, instituteName: e.target.value }
                    }))
                  }
                  className="h-8 text-xs mt-1"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600">Subtitle / Tagline</label>
                <Input
                  value={s.header.subtitle || ""}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      header: { ...p.header, subtitle: e.target.value }
                    }))
                  }
                  placeholder="e.g. Weekly Assessment Exam"
                  className="h-8 text-xs mt-1"
                />
              </div>

              {/* Logo Upload Section */}
              <div className="p-2.5 rounded border border-slate-200 bg-slate-50">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                  Institute Logo
                </label>
                {logoPreview ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={logoPreview}
                      alt="Logo thumbnail"
                      className="h-10 w-16 object-contain bg-white border border-slate-200 rounded p-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                      className="h-7 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs gap-1.5"
                    >
                      <Upload className="h-3 w-3" />
                      Upload Logo (PNG/JPG)
                    </Button>
                  </div>
                )}
              </div>

              {/* Header Fields Checkboxes */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Header Candidate Fields
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: "studentName", label: "Student Name" },
                    { id: "date", label: "Date" },
                    { id: "totalMarks", label: "Total Marks" },
                    { id: "guardianSignature", label: "Signature / Roll No" }
                  ].map((field) => {
                    const isChecked = s.header.fields.includes(field.id as any);
                    return (
                      <label key={field.id} className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            const newFields = e.target.checked
                              ? [...s.header.fields, field.id as any]
                              : s.header.fields.filter((f) => f !== field.id);
                            updateLayoutSettings((p) => ({
                              ...p,
                              header: { ...p.header, fields: newFields }
                            }));
                          }}
                          className="rounded border-slate-300"
                        />
                        <span>{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Footer Settings */}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="text-[11px] font-semibold text-slate-600">Show Page Numbers</label>
                <input
                  type="checkbox"
                  checked={s.footer.pageNumber}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      footer: { ...p.footer, pageNumber: e.target.checked }
                    }))
                  }
                  className="rounded border-slate-300"
                />
              </div>
            </div>
          )}
        </div>

        {/* 5. Page Borders & Styling */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => toggleSection("borders")}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-900 pb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Frame className="h-4 w-4 text-slate-600" />
              5. Page Borders & Print Styling
            </span>
            {openSections.borders ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {openSections.borders && (
            <div className="space-y-3 pt-2 pl-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600">Page Border Style</label>
                <select
                  value={s.border.style}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      border: { ...p.border, style: e.target.value as "none" | "single" | "double" }
                    }))
                  }
                  className="w-full h-8 text-xs rounded border border-slate-300 bg-white px-2 mt-1"
                >
                  <option value="double">Double Border (Classic Coaching)</option>
                  <option value="single">Single Border (Clean / Modern)</option>
                  <option value="none">No Border (Compact Aptitude)</option>
                </select>
              </div>

              {s.border.style !== "none" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Thickness (pt)</label>
                    <Input
                      type="number"
                      step="0.5"
                      min={0.5}
                      max={5}
                      value={s.border.thicknessPt}
                      onChange={(e) =>
                        updateLayoutSettings((p) => ({
                          ...p,
                          border: { ...p.border, thicknessPt: Number(e.target.value) }
                        }))
                      }
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600">Border Inset (mm)</label>
                    <Input
                      type="number"
                      min={0}
                      max={15}
                      value={s.border.insetMm}
                      onChange={(e) =>
                        updateLayoutSettings((p) => ({
                          ...p,
                          border: { ...p.border, insetMm: Number(e.target.value) }
                        }))
                      }
                      className="h-8 text-xs mt-1"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="bwModeToggle"
                  checked={s.bwMode}
                  onChange={(e) =>
                    updateLayoutSettings((p) => ({
                      ...p,
                      bwMode: e.target.checked
                    }))
                  }
                  className="rounded border-slate-300"
                />
                <label htmlFor="bwModeToggle" className="text-xs text-slate-700 cursor-pointer">
                  High-contrast black & white print mode
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 6. Save as Custom Template */}
        <div className="pt-3">
          <button
            type="button"
            onClick={() => toggleSection("customTemplates")}
            className="w-full flex items-center justify-between text-xs font-bold text-slate-900 pb-2 cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Bookmark className="h-4 w-4 text-slate-600" />
              6. Save & Manage Custom Templates
            </span>
            {openSections.customTemplates ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>

          {openSections.customTemplates && (
            <div className="space-y-3 pt-2 pl-2">
              <div className="flex gap-2">
                <Input
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="New template name..."
                  className="h-8 text-xs"
                />
                <Button
                  size="sm"
                  onClick={handleSaveAsCustomTemplate}
                  disabled={!newTemplateName.trim()}
                  className="h-8 text-xs bg-slate-900 text-white shrink-0"
                >
                  Save
                </Button>
              </div>

              {savedTemplates.length > 0 ? (
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {savedTemplates.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-2 rounded bg-slate-50 border border-slate-200 text-xs flex items-center justify-between gap-2"
                    >
                      {renamingId === tpl.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={renamingName}
                            onChange={(e) => setRenamingName(e.target.value)}
                            className="h-6 text-xs px-1"
                            autoFocus
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSavedTemplate(tpl.id)}
                            className="p-1 text-emerald-600 hover:text-emerald-800"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold text-slate-800 truncate block">{tpl.name}</span>
                          <span className="text-[10px] text-slate-400">Based on {tpl.baseTemplateId}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleApplySavedTemplate(tpl)}
                          className="h-6 px-1.5 text-[10px] text-blue-600 hover:bg-blue-50"
                        >
                          Apply
                        </Button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingId(tpl.id);
                            setRenamingName(tpl.name);
                          }}
                          className="p-1 text-slate-500 hover:text-slate-800"
                          title="Rename"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedTemplate(tpl.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No saved custom templates yet.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
