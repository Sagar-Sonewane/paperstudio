import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Dashboard } from "./features/dashboard/Dashboard.tsx";
import { PaperEditorView } from "./features/editor/PaperEditorView.tsx";
import { ImportView } from "./features/import/ImportView.tsx";
import { PrintPaperView } from "./features/export/PrintPaperView.tsx";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/paper/:id" element={<PaperEditorView />} />
        <Route path="/paper/:id/print" element={<PrintPaperView />} />
        <Route path="/import" element={<ImportView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
