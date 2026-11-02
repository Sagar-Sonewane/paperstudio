# PaperStudio: Export Notes & Format Comparison

This document describes the rendering architecture, differences, and fidelity considerations between PaperStudio's **Live Preview (and Print / PDF route)** and the **Exported Microsoft Word (.docx)** format.

---

## 1. Architectural Model

Per PaperStudio's core architectural rules:
- **The paper model (JSON validated by Zod) is the single source of truth.**
- **Preview, PDF, and DOCX are independent renderers of the model.** Neither renders from the other.
- Content is strictly separated from template configuration. Changing export settings never mutates question or option text.

```
                           +--------------------------+
                           |  Paper Model (Zod / JSON)|
                           +------------+-------------+
                                        |
                 +----------------------+----------------------+
                 |                                             |
                 v                                             v
    +-------------------------+                   +-------------------------+
    |   Browser Layout Engine  |                   |   DOCX Document Builder |
    |   (src/services/layout/) |                   |   (src/services/export/) |
    +------------+------------+                   +------------+------------+
                 |                                             |
         +-------+-------+                                     v
         |               |                           Microsoft Word (.docx)
         v               v                           - word/document.xml
    Live Preview    Print / PDF                      - word/header1.xml
    (Interactive)   (window.print())                 - word/footer1.xml
```

---

## 2. Format Comparison Matrix

| Feature | Browser Preview & Print Route | Microsoft Word (.docx) Export |
| :--- | :--- | :--- |
| **Rendering Engine** | Chromium Blink / DOM layout engine | Microsoft Word / LibreOffice WordprocessingML |
| **Page Dimensions** | A4: 794px × 1123px (at 96 DPI / 210mm × 297mm) | A4: 11906 dxa × 16838 dxa (twips) |
| **Columns** | CSS Grid / Flexbox 2-column layout per page | Native `<w:cols w:num="2" w:space="..."/>` |
| **Column Breaks** | Explicit deterministic packing via `paginatePaper()` | Continuous text flow with `<w:keepNext/>` rules |
| **Page Borders** | CSS `border: 3.5px double #000000` | Word `<w:pgBorders w:offsetFrom="page">` double border |
| **Devanagari Font** | `@fontsource/noto-sans-devanagari` (webfont) | Windows system font (`Mangal` / `Nirmala UI`) in `w:cs` |
| **Latin Font** | `Times New Roman` / system serif | `Times New Roman` in `w:ascii` and `w:hAnsi` |
| **MCQ Options** | CSS Grid (`grid-template-columns: 1fr 1fr`) | Tab/space-aligned paragraphs with `keepNext` |
| **Dynamic Headers** | DOM header repeated on each page div | Native Word running header (`word/header1.xml`) |
| **Page Numbers** | Derived page index in DOM loop (`Page X of Y`) | Dynamic XML fields (`w:fldSimple` `PAGE` / `NUMPAGES`) |
| **Images & Diagrams**| Rendered SVG or IndexedDB image Blobs | Embedded `w:drawing` PNG (diagrams rasterized at 3x) |

---

## 3. Key Differences in Layout Behavior

### 3.1 Column Flow & Keep-Together Rules
- **Live Preview / Print**: The offscreen DOM measurement engine calculates the height of each question block down to sub-pixel accuracy. If a block cannot fit in the remaining height of Column 1, it moves to Column 2 of the same page, or opens a new page. Questions and their options are packed together atomically.
- **DOCX**: Word formats text as continuous paragraphs within sections. To ensure questions never detach from their options in Word, the DOCX builder emits `<w:keepNext/>` on question stems, section titles, and intermediate options. This prevents orphan headings and solitary question stems at the bottom of Word columns.

### 3.2 Two-Column MCQ Options
- **Live Preview**: Uses modern CSS Grid (`display: grid; grid-template-columns: 1fr 1fr`).
- **DOCX**: While Word tables can be embedded inside multi-column sections, tables inside columns in Word frequently trigger overflow or margin-clipping when opening on different desktop word processors. Therefore, DOCX two-column options are formatted as paired runs with precise tab stops (`(A) ...         (B) ...`), ensuring rock-solid compatibility across Microsoft Word 2013-365, LibreOffice Writer, and Google Docs.

### 3.3 Font Slots & Devanagari Shaping
- **Live Preview**: Chromium renders both Latin and Devanagari text through HarfBuzz font shaping using the bundled Noto Sans Devanagari web font.
- **DOCX**: Microsoft Word requires separate font declarations for Latin vs. Complex Script (CTL):
  - `w:ascii="Times New Roman"` and `w:hAnsi="Times New Roman"` for Latin characters, numbers, and basic punctuation.
  - `w:cs="Mangal"` and `w:hint="cs"` for Devanagari Unicode codepoints (`\u0900-\u097F`).
  - Without explicit `w:cs` and `w:hint="cs"`, Word defaults complex scripts to system fallback fonts which can distort conjuncts and matra positions.

### 3.4 Page Numbering
- **Live Preview**: Page numbers are statically stamped from the calculated `PageLayout.pageNumber` and total pages array.
- **DOCX**: Word generates page numbers dynamically via `w:fldSimple` fields (`PAGE` and `NUMPAGES`). If a user edits the document in Word, page counts update automatically.

---

## 4. PDF Generation & Print Route Fidelity

- PaperStudio generates PDF via the browser's native print pipeline (`window.print()`).
- The dedicated `/paper/:id/print` route and modal print trigger wait for `document.fonts.ready` prior to opening the print dialog.
- Print stylesheets enforce `@page { size: A4 portrait; margin: 0; }` with `.print-page:last-child { break-after: auto }`. This guarantees:
  1. No clipping of double borders.
  2. No extra trailing blank page in Chrome, Edge, or Safari print dialogs.
  3. Strict adherence to the honesty rule: the UI and logs explicitly state "print dialog opened", never that a PDF was directly downloaded.

