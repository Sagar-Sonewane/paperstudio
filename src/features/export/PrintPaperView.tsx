import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Printer, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Card } from "../../components/ui/card.tsx";
import { db } from "../../services/storage/db.ts";
import { paginatePaper } from "../../services/layout/paginate.ts";
import { calcDimensions, type PageLayout, type LayoutDimensions } from "../../services/layout/rules.ts";
import type { PaperType } from "../../domain/model.ts";

export function PrintPaperView() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const autoPrint = searchParams.get("auto") === "true";

  const [paper, setPaper] = useState<PaperType | null>(null);
  const [pages, setPages] = useState<PageLayout[]>([]);
  const [dimensions, setDimensions] = useState<LayoutDimensions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<string | null>(null);
  const hasAutoPrintedRef = useRef(false);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setIsLoading(true);

    db.papers
      .get(id)
      .then(async (doc) => {
        if (!isMounted) return;
        if (!doc) {
          setError("Paper not found in local database.");
          setIsLoading(false);
          return;
        }

        setPaper(doc);
        const dims = calcDimensions(doc.settings);
        setDimensions(dims);

        // Paginate paper
        const result = await paginatePaper(doc);
        if (!isMounted) return;
        setPages(result.pages);
        setIsLoading(false);

        // Auto print trigger if requested
        if (autoPrint && !hasAutoPrintedRef.current) {
          hasAutoPrintedRef.current = true;
          if (document.fonts) {
            await document.fonts.ready;
          }
          setPrintStatus("Print dialog opened. Select 'Save as PDF' to save your file.");
          setTimeout(() => {
            window.print();
          }, 200);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Error loading paper for print:", err);
        setError(err.message || "Failed to load paper for printing.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, autoPrint]);

  const handlePrint = async () => {
    if (document.fonts) {
      await document.fonts.ready;
    }
    setPrintStatus("Print dialog opened. Select 'Save as PDF' in the destination dropdown to export a PDF.");
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600 mb-2" />
        <p className="text-sm text-slate-600 font-medium">Preparing printable pages and loading fonts...</p>
      </div>
    );
  }

  if (error || !paper || !dimensions) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-900 mb-2">Print Unavailable</h2>
          <p className="text-sm text-slate-500 mb-6">{error || "Could not prepare print layout."}</p>
          <Button onClick={() => navigate(id ? `/paper/${id}` : "/")} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white text-black">
      {/* Onscreen Control Toolbar (Hidden during print) */}
      <aside className="sticky top-0 bg-white border-b border-slate-300 px-4 py-3 flex items-center justify-between shadow-xs z-30 print:hidden">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/paper/${id}`)}
            className="text-slate-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Editor
          </Button>
          <div className="text-xs text-slate-600 font-medium">
            <span className="font-bold text-slate-900">{paper.title}</span> &bull; {pages.length} Page
            {pages.length === 1 ? "" : "s"}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {printStatus && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>{printStatus}</span>
            </div>
          )}

          <Button
            onClick={handlePrint}
            className="bg-slate-900 text-white hover:bg-slate-800 gap-1.5 shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>Open Print Dialog</span>
          </Button>
        </div>
      </aside>

      {/* Pages Container */}
      <main className="p-6 print:p-0 flex flex-col items-center gap-6 print:block">
        {pages.map((page) => (
          <div
            key={`page_${page.pageNumber}`}
            className="print-page bg-white shadow-xl text-black box-border relative print:shadow-none print:m-0"
            style={{
              width: `${dimensions.pageWidthPx}px`,
              height: `${dimensions.pageHeightPx}px`,
              maxHeight: `${dimensions.pageHeightPx}px`,
              padding: "8mm 10mm",
              overflow: "hidden"
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
              <section
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
                      paddingRight:
                        colIdx < dimensions.columnCount - 1
                          ? `${dimensions.columnGapPx / 2}px`
                          : "0",
                      paddingLeft: colIdx > 0 ? `${dimensions.columnGapPx / 2}px` : "0",
                      borderRight:
                        colIdx < dimensions.columnCount - 1 ? "1px solid #000000" : "none",
                      height: "100%",
                      overflow: "hidden"
                    }}
                  >
                    {col.blocks.map((block) => (
                      <div
                        key={block.id}
                        dangerouslySetInnerHTML={{ __html: block.html }}
                      />
                    ))}
                  </div>
                ))}
              </section>

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
      </main>
    </div>
  );
}
