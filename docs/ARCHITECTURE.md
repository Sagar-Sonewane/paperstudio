# ARCHITECTURE

## Principle
One structured paper model. Everything else renders it.

```
DOCX -> Importer -> Review -> Paper model (IndexedDB)
                                  |
   Template + Settings -----------+
                                  v
                        Layout engine (blocks -> columns -> pages)
                         |                        |
                  Page preview              Print HTML -> PDF
Paper model -> DOCX builder (separate renderer)
```

## Folder structure
```
src/
  domain/        model.ts  numbering.ts  validation.ts  ids.ts  migrations.ts
  services/
    import/      unzip.ts  walkDocument.ts  classify.ts  media.ts
                 legacyHindi.ts  omml.ts  report.ts
    layout/      measure.ts  paginate.ts  rules.ts  warnings.ts
    export/      docx/  print/  validate.ts
    storage/     db.ts  drafts.ts  templates.ts  media.ts
  features/
    dashboard/  import-review/  editor/  preview/
    templates/  settings/  diagram/
  templates/     classic/  professional/  aptitude/  academy/  index.ts
  components/ui/ (shadcn)
  lib/
samples/
tests/           unit/  e2e/  fixtures/
```

## Layers
1. **domain**: types, schemas, numbering. Pure TypeScript.
2. **services**: import, layout, export, storage. No React.
3. **features**: React UI that calls services.

## State
- Zustand store with Immer for the active paper.
- History stack (past/future snapshots, capped at 100) for undo and redo.
- Autosave to Dexie, debounced 500 ms, with a "Saved" / "Save failed" indicator.
- UI state (selection, zoom, panel tabs) kept separate from paper content.

## Storage (Dexie)
Tables: `papers`, `media` (Blob), `diagrams`, `templates`, `settings`, `originals` (uploaded DOCX blobs).
Quota errors: catch, show a message, offer to export the draft.

## Importer pipeline
1. Unzip with JSZip. Confirm `word/document.xml` exists. Detect password-protected or corrupt files.
2. Parse `word/document.xml` in order with fast-xml-parser: paragraphs, runs, breaks, tables, drawings, math (OMML), shapes.
3. Resolve `document.xml.rels` and extract media.
4. Normalize runs into rich content (bold, italic, super, sub).
5. Classify each block: question, option, heading, instruction, other. Patterns: `1.`, `Q. 1`, `Q1)`, `प्र. 1`, `(A)`, `A)`, `(a)`, `अ)`.
6. Group options under their question; attach images by position.
7. Assign confidence. Low confidence becomes a review item.
8. Detect legacy Hindi fonts by run font name (Kruti Dev, DevLys, Chanakya, etc.) and warn.
9. Produce an `ImportReport`: counts, warnings, unconverted objects.
Mammoth is a text cross-check only, never the sole source.

## Layout engine
Input: paper model + template + settings. Output: `Page[]`, each with columns of positioned blocks plus warnings.
1. Flatten the model to blocks (heading, question+options, instruction, image).
2. Render each block off-screen at exact column width with final fonts.
3. Measure heights after `document.fonts.ready` and image load.
4. Pack into columns then pages:
   - Heading keeps with next block.
   - Question and options stay together.
   - Images and diagrams never split.
   - No lone heading at a column bottom.
   - Oversized block: split between options; if still too tall, emit a warning.
5. Re-run on content or setting change (debounced, memoized per block).
6. Preview and print both consume the same `Page[]`.

## Templates
```ts
interface TemplateDefinition {
  id: string; name: string; description: string;
  defaults: LayoutSettings;
  Header: React.FC<HeaderProps>;
  Footer: React.FC<FooterProps>;
  SectionHeading: React.FC<SectionHeadingProps>;
  border: BorderStyle;
  docxHooks: DocxTemplateHooks;   // header/footer/borders for DOCX
}
```
User settings override template defaults. Saved custom templates store settings plus a base template ID.

## Export
- **Print/PDF**: dedicated print route renders `Page[]` with `@page`, `break-after: page`, bundled fonts. Wait for fonts before `window.print()`. UI says "print dialog opened", never "downloaded".
- **DOCX**: built from the model with the `docx` package: sections for columns, page borders, headers/footers with page fields, literal question numbers for consistency, images, SVG rasterized to PNG for diagrams, correct Devanagari font slots.
- **Validation**: pre-export summary from layout warnings plus missing media, empty questions, duplicate numbers.

## Diagram editor
- Model: shape array (line, arrow, rect, ellipse, polygon, text, connector) with id, geometry, stroke, fill, label.
- Render to SVG; store both shapes and serialized SVG.
- Select, move, resize via handles, delete, undo/redo, optional snap to grid.
- DOCX: rasterize SVG to PNG at 3x.
- Imported Word shapes: shown as an image with "Replace" or "Redraw".

## Robustness
- Validate imported and stored data with Zod.
- Sanitize HTML from Tiptap and imports (DOMPurify).
- Upload limit (e.g. 25 MB) with a clear message.
- Never execute content from documents.
