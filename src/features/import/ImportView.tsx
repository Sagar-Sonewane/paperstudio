import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/card.tsx";
import { Alert } from "../../components/ui/alert.tsx";

export function ImportView() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Application Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="text-slate-600 hover:text-slate-900"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Dashboard
            </Button>
            <div className="h-5 w-px bg-slate-200" />
            <h1 className="font-semibold text-sm text-slate-900">Import Word Document</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 flex-1 w-full flex flex-col gap-6">
        <Alert variant="warning" title="Feature Status: Scheduled for Phase 3">
          Word Document (.docx) upload and the interactive Review Screen will be wired in Phase 3.
          The core import engine (JSZip + fast-xml-parser with Hindi font classification) was proven in Phase 0.
        </Alert>

        <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Upload className="h-7 w-7 text-slate-400" />
            </div>
            <CardTitle className="text-lg text-slate-700">Upload Exam DOCX File</CardTitle>
            <CardDescription className="max-w-md mx-auto text-xs text-slate-500">
              Drag and drop your question paper file (.docx) here to extract questions, options, equations, and diagrams.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center justify-center pt-4 pb-8">
            <div className="flex items-center gap-2 bg-amber-100/70 text-amber-900 px-3 py-1.5 rounded-full text-xs font-medium mb-6">
              <Lock className="h-3.5 w-3.5" />
              <span>Import UI Disabled &bull; Scheduled for Phase 3</span>
            </div>

            <Button disabled variant="secondary" className="cursor-not-allowed">
              <FileText className="h-4 w-4 mr-2 opacity-50" />
              Select .docx File (Disabled)
            </Button>
          </CardContent>
        </Card>

        {/* Phase 0 Spike Findings Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Phase 0 Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-2">
            <p>
              &bull; <strong>Real Paper Tested:</strong> Successfully parsed <code>samples/paper.docx</code> with 50 questions and 79 options identified.
            </p>
            <p>
              &bull; <strong>Font Classification:</strong> Verified clean Unicode <code>Mangal Pro</code> and <code>Times New Roman</code> without legacy encoding errors.
            </p>
            <p>
              &bull; <strong>OMML Math Formulas:</strong> Extracted inline mathematical equations directly from Word XML.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
