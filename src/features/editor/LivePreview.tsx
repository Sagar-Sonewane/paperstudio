import { useEffect, useState, useMemo, useRef } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Printer,
  AlertTriangle,
  Columns,
  BookOpen,
  FileText,
  RotateCcw,
  Loader2
} from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { paginatePaper } from "../../services/layout/paginate.ts";
import { calcDimensions, type PageLayout, type LayoutDimensions } from "../../services/layout/rules.ts";
import { usePaperStore } from "./paperStore.ts";
import type { PaperType } from "../../domain/model.ts";

interface LivePreviewProps {
  paper: PaperType;
}

export function LivePreview({ paper }: LivePreviewProps) {
  const { selectedItemId, selectItem, openQuestionEditor } = usePaperStore();

  const [paginationData, setPaginationData] = useState<{
    pages: PageLayout[];
    warnings: string[];
    dimensions: LayoutDimensions;
  } | null>(null);

  const [isPaginating, setIsPaginating] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [zoomPercent, setZoomPercent] = useState(100);
  const [viewMode, setViewMode] = useState<"continuous" | "single" | "spread">("continuous");
  const containerRef = useRef<HTMLDivElement>(null);

  // Recalculate pagination whenever paper changes
  useEffect(() => {
    let isCancelled = false;
    setIsPaginating(true);

    paginatePaper(paper)
      .then((res) => {
        if (!isCancelled) {
          setPaginationData(res);
          setIsPaginating(false);
        }
      })
      .catch((err) => {
        console.error("Pagination error:", err);
        if (!isCancelled) {
          setIsPaginating(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [paper]);

  const pages = paginationData?.pages || [];
  const warnings = paginationData?.warnings || [];
  const dimensions = paginationData?.dimensions || calcDimensions(paper.settings);

  // Keep currentPageIndex in valid bounds
  useEffect(() => {
    if (currentPageIndex >= pages.length && pages.length > 0) {
      setCurrentPageIndex(pages.length - 1);
    }
  }, [pages.length, currentPageIndex]);

  const handlePrint = () => {
    window.print();
  };

  const handleFitToWidth = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth - 48; // padding
    const pageWidth = dimensions.pageWidthPx;
    const computedZoom = Math.round((containerWidth / pageWidth) * 100);
    setZoomPercent(Math.min(150, Math.max(40, computedZoom)));
  };

  const visiblePages = useMemo(() => {
    if (viewMode === "continuous") {
      return pages;
    }
    if (viewMode === "single") {
      return pages[currentPageIndex] ? [pages[currentPageIndex]] : [];
    }
    // spread: two pages side by side
    const startIdx = Math.floor(currentPageIndex / 2) * 2;
    return pages.slice(startIdx, startIdx + 2);
  }, [pages, viewMode, currentPageIndex]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-200/80 overflow-hidden relative print:bg-white print:overflow-visible">
      {/* Top Controls Toolbar */}
      <div className="bg-white border-b border-slate-300 px-4 py-2 flex items-center justify-between gap-3 shadow-2xs z-10 shrink-0 print:hidden">
        {/* Left: View Mode & Pages Info */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("continuous")}
              title="Continuous Stack"
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                viewMode === "continuous"
                  ? "bg-white shadow-xs text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileText className="h-3.5 w-3.5 inline mr-1" />
              Scroll
            </button>
            <button
              type="button"
              onClick={() => setViewMode("single")}
              title="Single Page"
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                viewMode === "single"
                  ? "bg-white shadow-xs text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Columns className="h-3.5 w-3.5 inline mr-1" />
              Single
            </button>
            <button
              type="button"
              onClick={() => setViewMode("spread")}
              title="Two-Page Overview"
              className={`px-2 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                viewMode === "spread"
                  ? "bg-white shadow-xs text-slate-900"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 inline mr-1" />
              Spread
            </button>
          </div>

          {/* Page Navigation when not in continuous view */}
          {viewMode !== "continuous" && pages.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <Button
                variant="ghost"
                size="icon"
                disabled={currentPageIndex === 0}
                onClick={() => setCurrentPageIndex((p) => Math.max(0, p - 1))}
                className="h-7 w-7"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium text-slate-700 min-w-[70px] text-center">
                Page {currentPageIndex + 1} of {pages.length}
              </span>
              <Button
                variant="ghost"
                size="icon"
                disabled={currentPageIndex >= pages.length - 1}
                onClick={() => setCurrentPageIndex((p) => Math.min(pages.length - 1, p + 1))}
                className="h-7 w-7"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Center / Right: Zoom & Print */}
        <div className="flex items-center gap-2">
          {/* Pagination spinner indicator */}
          {isPaginating && (
            <div className="flex items-center gap-1 text-xs text-slate-500 mr-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
              <span>Paginating...</span>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:text-slate-900"
              onClick={() => setZoomPercent((z) => Math.max(40, z - 10))}
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-mono font-semibold px-1 text-slate-700 min-w-[42px] text-center">
              {zoomPercent}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:text-slate-900"
              onClick={() => setZoomPercent((z) => Math.min(180, z + 10))}
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:text-slate-900"
              onClick={() => setZoomPercent(100)}
              title="Reset Zoom to 100%"
            >
              <RotateCcw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-slate-600 hover:text-slate-900"
              onClick={handleFitToWidth}
              title="Fit to Width"
            >
              <Maximize2 className="h-3 w-3" />
            </Button>
          </div>

          {/* Print Button */}
          <Button
            size="sm"
            onClick={handlePrint}
            className="h-8 gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
            title="Print Question Paper"
          >
            <Printer className="h-3.5 w-3.5" />
            <span>Print</span>
          </Button>
        </div>
      </div>

      {/* Warning Banner if oversized items */}
      {warnings.length > 0 && (
        <div className="p-3 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs text-amber-800 shrink-0 print:hidden">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Layout Warning: </span>
            {warnings[0]}
            {warnings.length > 1 && ` (+${warnings.length - 1} more)`}
          </div>
        </div>
      )}

      {/* Pages Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-6 flex flex-col items-center gap-8 print:p-0 print:overflow-visible print:block"
      >
        {pages.length === 0 && !isPaginating && (
          <div className="my-auto text-center p-8 bg-white rounded-xl shadow-xs border border-slate-300 max-w-sm">
            <p className="text-sm font-semibold text-slate-700 mb-1">No content to preview</p>
            <p className="text-xs text-slate-400">Add questions or sections from the left sidebar to generate pages.</p>
          </div>
        )}

        {/* Render visible A4 pages */}
        <div
          className={`flex gap-6 items-start justify-center print:block ${
            viewMode === "spread" ? "flex-row flex-wrap" : "flex-col"
          }`}
          style={{
            zoom: `${zoomPercent}%`
          }}
        >
          {visiblePages.map((page) => (
            <div
              key={`page_${page.pageNumber}`}
              id={`print-page-${page.pageNumber}`}
              className="bg-white shadow-xl text-black font-sans relative box-border transition-shadow print:shadow-none print:m-0"
              style={{
                width: `${dimensions.pageWidthPx}px`,
                height: `${dimensions.pageHeightPx}px`,
                maxHeight: `${dimensions.pageHeightPx}px`,
                padding: "8mm 10mm",
                overflow: "hidden",
                pageBreakAfter: "always",
                breakAfter: "page"
              }}
            >
              {/* Outer Double Border for Classic Coaching Template */}
              <div
                className="w-full h-full flex flex-col relative box-border"
                style={{
                  border: "3.5px double #000000",
                  padding: "5mm 6mm"
                }}
              >
                {/* Running Header */}
                <header className="border-b-2 border-black pb-2 mb-3 text-center shrink-0">
                  <h1 className="text-base font-extrabold uppercase tracking-wide text-black">
                    {paper.settings.header.instituteName || "EXCELLENCE COACHING INSTITUTE"}
                  </h1>
                  <div className="flex justify-between items-center text-[11px] font-semibold mt-1 px-1 text-black">
                    <span>{paper.meta.examName || paper.title}</span>
                    <span>Total Marks: {paper.meta.totalMarks || 100}</span>
                    <span>Time: {paper.meta.durationMin || 60} Mins</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-black border-t border-dotted border-black pt-1 mt-1 px-1">
                    <span>Name: _______________________________</span>
                    <span>Roll No: ____________</span>
                    <span>Date: {paper.meta.date || "____________"}</span>
                  </div>
                </header>

                {/* Multi-Column Question Content Area */}
                <main
                  className="flex-1 overflow-hidden"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${dimensions.columnCount}, 1fr)`,
                    columnGap: `${dimensions.columnGapPx}px`
                  }}
                >
                  {page.columns.map((col, colIdx) => (
                    <div
                      key={`col_${col.columnIndex}`}
                      className="flex flex-col relative"
                      style={{
                        paddingRight: colIdx < dimensions.columnCount - 1 ? `${dimensions.columnGapPx / 2}px` : "0",
                        paddingLeft: colIdx > 0 ? `${dimensions.columnGapPx / 2}px` : "0",
                        borderRight: colIdx < dimensions.columnCount - 1 ? "1px solid #000000" : "none",
                        height: "100%",
                        overflow: "hidden"
                      }}
                    >
                      {col.blocks.map((block) => {
                        const isBlockSelected = selectedItemId === block.itemId;
                        return (
                          <div
                            key={block.id}
                            onClick={() => {
                              selectItem(block.itemId);
                              if (block.kind === "question") {
                                openQuestionEditor(block.itemId);
                              }
                            }}
                            className={`cursor-pointer transition-all ${
                              isBlockSelected
                                ? "bg-blue-50/60 ring-2 ring-blue-500 rounded-sm"
                                : "hover:bg-slate-50"
                            }`}
                            title="Click to edit item"
                            dangerouslySetInnerHTML={{ __html: block.html }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </main>

                {/* Running Footer */}
                <footer className="border-t border-black pt-1 mt-2 text-[10px] font-semibold text-black flex justify-between items-center shrink-0">
                  <span>PaperStudio &bull; Classic Series</span>
                  <span>
                    Page {page.pageNumber} of {pages.length}
                  </span>
                  <span>Signature: ____________</span>
                </footer>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
