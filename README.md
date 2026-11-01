# PaperStudio

Question paper creator and designer for teachers and coaching institutes.
Upload a Word document, review the extracted questions, pick a template, customize the layout, preview real pages, export DOCX or PDF.

## Status
Planning kit. Build one phase at a time using the files in `prompts/`.

## Repo kit contents
| File | Purpose |
|---|---|
| `RULES.md` | Non-negotiable rules for the coding agent. Read first, every session. |
| `docs/PLAN.md` | Scope, phases, exit checks, risks |
| `docs/ARCHITECTURE.md` | Layers, folders, pipelines, layout engine |
| `docs/DATA_MODEL.md` | Zod schemas and ID/numbering rules |
| `docs/TEST_PLAN.md` | Sample files, automated and manual checks |
| `prompts/` | One prompt per phase, paste into the agent in order |
| `samples/` | Real `.docx` test files (add yours here) |

## Planned setup commands (agent must keep these working)
```bash
npm install
npm run dev        # local dev server
npm run build      # production build, must pass with no errors
npm run test       # Vitest unit tests
npm run test:e2e   # Playwright end-to-end tests
npm run typecheck  # tsc --noEmit
```

## Stack
React, TypeScript, Vite, Tailwind, shadcn/ui, lucide-react, Zustand + Immer, Zod, Dexie (IndexedDB), dnd-kit, Tiptap, KaTeX, JSZip + fast-xml-parser (+ Mammoth helper), `docx`, print CSS for PDF, Vitest, Playwright.

## Known limitations (to keep updated)
- DOCX output is close to the preview, not pixel-identical.
- Word-drawn shapes and some equations cannot be made editable; they are kept as images and flagged.
- PDF in v1 uses the browser print dialog unless a PDF server is added.
