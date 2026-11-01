# TEST PLAN

## Sample files (put in `samples/`)
1. `english-mcq.docx`
2. `hindi-mcq.docx`
3. `mixed-hindi-english.docx`
4. `math-expressions.docx`
5. `embedded-diagrams.docx`
6. `long-multipage-question.docx`
7. `sections-and-instructions.docx`
8. `mixed-question-types.docx`
9. `legacy-hindi-font.docx` (Kruti Dev text)
10. `corrupt.docx`, `empty.docx`, `not-a-docx.pdf`
11. The real coaching paper that motivated the project

## Automated (Vitest)
- Classifier: every numbering and option pattern in English, Hindi, mixed.
- Importer: samples give expected counts; nothing dropped; order preserved.
- Numbering: reorder, delete, duplicate, custom numbers.
- Model: Zod accepts valid, rejects invalid; migrations.
- Storage: save, reload, duplicate, delete, quota-error path (mocked).
- Paginator: keep-with-next, no split of question+options, oversized warning, no blank pages.
- DOCX export: generate, unzip, validate XML, assert text, options, fonts, columns, borders.

## End-to-end (Playwright)
- Import sample -> review -> editor -> template switch -> preview -> export DOCX.
- Refresh keeps the draft.
- Drag reorder renumbers.
- Diagram create and insert.
- Keyboard-only path through editor basics.

## Export verification (not editor screenshots)
- `soffice --headless --convert-to pdf file.docx`
- Compare `pdftotext` output with model text.
- Render pages with `pdftoppm`, inspect for clipping, borders, Devanagari shaping.
- Open the DOCX in Word manually before each release.

## Manual checklist
- Hindi matras and conjuncts correct in preview, PDF, DOCX.
- Degrees, fractions, superscripts, subscripts, currency symbols survive.
- Page numbers and footers sit inside the border.
- No unexpected blank last page.
- Clear errors for corrupt, empty, oversized, wrong-type files.
