import { useEffect, useState } from "react";
import type { PaperType } from "../../domain/model.ts";
import { getMediaBlob } from "../../services/storage/media.ts";

export interface TemplateHeaderProps {
  paper: PaperType;
  pageNumber?: number;
  totalPages?: number;
}

export function TemplateHeader({ paper }: TemplateHeaderProps) {
  const { templateId, settings, meta } = paper;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (settings.header.logoMediaId) {
      getMediaBlob(settings.header.logoMediaId)
        .then((rec) => {
          if (isMounted && rec && rec.blob) {
            setLogoUrl(URL.createObjectURL(rec.blob));
          }
        })
        .catch(() => {});
    } else {
      setLogoUrl(null);
    }
    return () => {
      isMounted = false;
    };
  }, [settings.header.logoMediaId]);

  const instituteName = settings.header.instituteName || "ACADEMY EXAMINATION SYSTEM";
  const examTitle = meta.examName || paper.title;

  // 1. Clean Professional Template Header
  if (templateId === "clean-professional") {
    return (
      <header className="border-b-2 border-slate-900 pb-2 mb-3 shrink-0">
        <div className="flex items-center justify-between gap-4">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 max-w-[100px] object-contain shrink-0"
            />
          )}
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-base font-bold tracking-tight text-black uppercase">
              {instituteName}
            </h1>
            {settings.header.subtitle && (
              <p className="text-[11px] text-slate-700 italic">{settings.header.subtitle}</p>
            )}
          </div>
          <div className="text-right text-[11px] font-semibold text-black shrink-0">
            <div>{examTitle}</div>
            <div className="text-[10px] text-slate-600 font-normal">
              {meta.totalMarks && `Marks: ${meta.totalMarks}`}
              {meta.totalMarks && meta.durationMin && "  |  "}
              {meta.durationMin && `Time: ${meta.durationMin}m`}
            </div>
          </div>
        </div>

        {/* Student metadata fields */}
        {settings.header.fields.length > 0 && (
          <div className="flex justify-between items-center text-[10px] text-black border-t border-slate-300 pt-1.5 mt-2">
            {settings.header.fields.includes("studentName") && (
              <span>Name: _______________________________</span>
            )}
            {settings.header.fields.includes("date") && (
              <span>Date: {meta.date || "____________"}</span>
            )}
            {settings.header.fields.includes("totalMarks") && (
              <span>Max Marks: {meta.totalMarks || 100}</span>
            )}
            {settings.header.fields.includes("guardianSignature") && (
              <span>Signature: ____________</span>
            )}
          </div>
        )}
      </header>
    );
  }

  // 2. Compact Aptitude Test Header (Dense, single-bar metadata)
  if (templateId === "compact-aptitude") {
    return (
      <header className="border-b-2 border-black pb-1 mb-2 shrink-0">
        <div className="flex justify-between items-baseline gap-2 text-black">
          <div className="flex items-center gap-2 min-w-0">
            {logoUrl && (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-6 max-w-[60px] object-contain shrink-0"
              />
            )}
            <h1 className="text-xs font-black tracking-normal uppercase truncate">
              {instituteName}
            </h1>
          </div>
          <div className="text-[10px] font-bold shrink-0 truncate">
            {examTitle}
            {meta.totalMarks ? `  [Max: ${meta.totalMarks}]` : ""}
            {meta.durationMin ? `  [${meta.durationMin} Min]` : ""}
          </div>
        </div>
        <div className="flex justify-between items-center text-[9px] text-black border-t border-dotted border-black pt-0.5 mt-0.5">
          <span>Candidate: ___________________________</span>
          <span>Roll No: ____________</span>
          <span>Date: {meta.date || "________"}</span>
        </div>
      </header>
    );
  }

  // 3. Modern Academy Template Header (Boxed with double lines & refined typography)
  if (templateId === "modern-academy") {
    return (
      <header className="border-2 border-black p-2.5 mb-3 text-center shrink-0 bg-slate-50/50">
        <div className="flex items-center justify-center gap-3">
          {logoUrl && (
            <img
              src={logoUrl}
              alt="Logo"
              className="h-9 max-w-[80px] object-contain shrink-0"
            />
          )}
          <div>
            <h1 className="text-sm font-extrabold uppercase tracking-wider text-black">
              {instituteName}
            </h1>
            {settings.header.subtitle && (
              <p className="text-[10px] text-slate-700 font-medium">{settings.header.subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center text-[10px] font-semibold text-black border-t border-b border-black py-1 mt-1.5 px-2">
          <span>{examTitle}</span>
          <span>Total Marks: {meta.totalMarks || 100}</span>
          <span>Duration: {meta.durationMin || 60} Minutes</span>
        </div>
        <div className="flex justify-between items-center text-[10px] text-black pt-1 px-2">
          <span>Student Name: _______________________________</span>
          <span>Date: {meta.date || "____________"}</span>
          <span>Sign: ____________</span>
        </div>
      </header>
    );
  }

  // 4. Default: Classic Coaching Paper Header
  return (
    <header className="border-b-2 border-black pb-2 mb-3 text-center shrink-0">
      {logoUrl && (
        <div className="flex justify-center mb-1">
          <img
            src={logoUrl}
            alt="Logo"
            className="h-10 max-w-[120px] object-contain"
          />
        </div>
      )}
      <h1 className="text-base font-extrabold uppercase tracking-wide text-black">
        {instituteName}
      </h1>
      <div className="flex justify-between items-center text-[11px] font-semibold mt-1 px-1 text-black">
        <span>{examTitle}</span>
        <span>Total Marks: {meta.totalMarks || 100}</span>
        <span>Time: {meta.durationMin || 60} Mins</span>
      </div>
      <div className="flex justify-between items-center text-[10px] text-black border-t border-dotted border-black pt-1 mt-1 px-1">
        <span>Name: _______________________________</span>
        <span>Roll No: ____________</span>
        <span>Date: {meta.date || "____________"}</span>
      </div>
    </header>
  );
}
