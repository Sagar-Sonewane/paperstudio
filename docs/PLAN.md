# PLAN

## Goal
Remove the repetitive Word work of building exam papers.
Flow: Upload DOCX -> Review -> Edit -> Template -> Preview -> Export.

## v1 scope
Import, review screen, question and section editor, 4 templates, settings panel, paginated preview, DOCX export, print-to-PDF, basic SVG diagram editor, local drafts and saved templates.

## Out of scope for v1
Cloud sync, authentication, payments, answer keys, question bank, full OMML round-trip, server-side PDF (optional v2).

## Phases and exit checks

| # | Phase | Deliverable | Exit check |
|---|---|---|---|
| 0 | Risk spikes | Throwaway proofs: paginator, importer, DOCX export | Results written to `docs/SPIKE_RESULTS.md`; go/no-go decided |
| 1 | Foundation | Model, schemas, Dexie, dashboard, draft CRUD | Create, rename, duplicate, delete; draft survives refresh |
| 2 | Editor + preview | Question CRUD, Tiptap, reorder, renumber, Classic template, paginated preview | 30-question paper paginates correctly in 2 columns |
| 3 | Import + review | Importer, classification, review screen | Sample paper imports; uncertain items flagged; nothing dropped |
| 4 | Export | DOCX export, print-to-PDF, validation summary | Both files open cleanly in Word or LibreOffice; Hindi intact |
| 5 | Templates + settings | 3 more templates, settings panel, save custom template | Template switch never alters text; settings visibly change preview |
| 6 | Diagrams | SVG editor, image upload, insert into question | Diagram sharp in preview, PDF and DOCX |
| 7 | Polish | Error states, keyboard, responsive, docs, full test pass | All acceptance criteria pass |

Export is built before the extra templates on purpose so fidelity problems appear early.

## Acceptance criteria
1. Upload a valid `.docx`.
2. Questions and options become editable items.
3. Hindi and English stay readable.
4. Images and diagrams preserved where supported; uncertain content flagged.
5. Correct and reorder questions without reformatting everything.
6. Four genuinely different templates.
7. Template change does not alter content.
8. Layout controls visibly affect the paper.
9. Create and insert a vector diagram.
10. Drafts persist after refresh.
11. Valid editable DOCX export.
12. Print-ready PDF or clearly explained print-to-PDF flow.
13. No routine overlap or missing content in output.
14. Errors and unsupported content reported honestly.
15. No dead buttons.
16. Documented commands run with no build errors.

## Risk register
| Risk | Impact | Mitigation |
|---|---|---|
| Preview vs DOCX mismatch | High | Accept "close", say so in UI, test in Word |
| Equations and Word shapes | High | Flag, keep as image, offer replace |
| Legacy Hindi fonts (Kruti Dev etc.) | High | Detect, warn, optional conversion |
| Pagination bugs | High | Build paginator first, test hardest |
| Diagram editor time sink | Medium | Keep tool set small; consider Konva if needed |
| Agent drift | Medium | One phase per prompt, RULES.md, review each diff |
| Scope creep | Medium | Hold to this table |
