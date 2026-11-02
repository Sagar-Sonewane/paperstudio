import type { PaperType } from "../../domain/model.ts";

export interface TemplateFooterProps {
  paper: PaperType;
  pageNumber: number;
  totalPages: number;
}

export function TemplateFooter({ paper, pageNumber, totalPages }: TemplateFooterProps) {
  const { templateId, settings } = paper;

  // 1. Clean Professional Footer
  if (templateId === "clean-professional") {
    return (
      <footer className="border-t border-slate-300 pt-1 mt-2 text-[10px] text-slate-700 flex justify-between items-center shrink-0">
        <span className="italic">{paper.title}</span>
        {settings.footer.pageNumber && (
          <span className="font-medium">
            Page {pageNumber}
            {settings.footer.pageCount && ` of ${totalPages}`}
          </span>
        )}
      </footer>
    );
  }

  // 2. Compact Aptitude Test Footer
  if (templateId === "compact-aptitude") {
    return (
      <footer className="border-t border-black pt-0.5 mt-1 text-[9px] font-bold text-black flex justify-between items-center shrink-0">
        <span>Aptitude Assessment</span>
        {settings.footer.pageNumber && <span>P. {pageNumber}</span>}
      </footer>
    );
  }

  // 3. Modern Academy Footer
  if (templateId === "modern-academy") {
    return (
      <footer className="border-t-2 border-black pt-1 mt-2 text-[10px] font-semibold text-black flex justify-between items-center shrink-0">
        <span className="uppercase tracking-wider">Academic Series</span>
        {settings.footer.pageNumber && (
          <span className="border border-black px-2 py-0.5 rounded-xs">
            Page {pageNumber}
            {settings.footer.pageCount && ` of ${totalPages}`}
          </span>
        )}
        <span>Invigilator Sign: ____________</span>
      </footer>
    );
  }

  // 4. Default: Classic Coaching Paper Footer
  return (
    <footer className="border-t border-black pt-1 mt-2 text-[10px] font-semibold text-black flex justify-between items-center shrink-0">
      <span>PaperStudio &bull; Classic Series</span>
      {settings.footer.pageNumber && (
        <span>
          Page {pageNumber}
          {settings.footer.pageCount && ` of ${totalPages}`}
        </span>
      )}
      <span>Signature: ____________</span>
    </footer>
  );
}

