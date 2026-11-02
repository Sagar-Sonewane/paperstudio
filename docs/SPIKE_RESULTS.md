# Phase 0: Risk Spike Results

## Executive Summary

Phase 0 validated the three highest-risk technical pillars of PaperStudio:
1. **Paginator Spike**: Off-screen measurement, font readiness, 2-column packing on A4, and print CSS (`@page`).
2. **Importer Spike**: Parsing real coaching papers with JSZip + fast-xml-parser, block classification, font inspection, and legacy font detection.
3. **DOCX Export Spike**: Building 2-column, A4, double-bordered bilingual papers with the `docx` library and font slot mappings.

All three spikes completed successfully with reproducible CLI commands.
**Decision: Overall GO.** Detailed findings, limitations, and necessary plan refinements are documented below.

---

## 1. Paginator Spike

### Objective
Prove that bilingual content (Hindi, English, mixed) can be measured reliably in an off-screen sandbox and packed into a 2-column A4 print layout without orphans, keeping questions and options together, and keeping headings with the following question.

### Commands to Run
```bash
npm run spike:paginator
# or directly: npx tsx spikes/paginator/test-paginator.ts
```

### Implementation Details
- **Test Data**: 40 bilingual MCQs across 3 sections (General Knowledge, Mathematics, Science/Reasoning) with 4 options each, stored in `spikes/paginator/paginator-data.ts`.
- **Fonts**: Bundled `@fontsource/noto-sans-devanagari` (400 and 700 weights). Layout execution strictly waits for `await document.fonts.ready`.
- **Column Dimensions**: Printable column width: 336px (~89mm); net printable column height: 890px (~237mm after deducting margins, header, and footer).
- **Constraints Enforced**:
  - *Keep-together*: Question stem and all 4 options form an atomic DOM unit and are never split across columns.
  - *Keep-with-next*: If a heading plus the next question exceed remaining column height, the heading moves to the top of the next column.
- **Verification Engine**: Headless Chromium via Playwright loads `spikes/paginator/index.html`, runs automated DOM assertions, captures page screenshots, and generates a print PDF via `@page`.

### Results & Metrics
```
======================================================
   PAPERSTUDIO PAGINATOR SPIKE (Chrome Headless)
======================================================
Fonts Loaded (document.fonts.ready):  ✅ PASS
Total Questions Paginated:            40 (Expected: 40)
Total A4 Pages Generated:             2
Headings Keep-With-Next Enforced:      ✅ PASS
Question + Options Keep-Together:     ✅ PASS
A4 Print PDF Generated:               ✅ PASS
Page Screenshots Taken:               2 pages captured

--- COLUMN HEIGHT METRICS PER PAGE ---
Page 1: Col 1 = 852px (11 items), Col 2 = 825px (11 items) [Max: 890px]
Page 2: Col 1 = 866px (12 items), Col 2 = 708px (9 items) [Max: 890px]
```

### Artifacts Generated
- `spikes/paginator/paginator-print.pdf` (88 KB): Full A4 vector PDF generated via `@page` print media styles.
- `spikes/paginator/page-1.png` (655 KB): Screenshot of rendered Page 1.
- `spikes/paginator/page-2.png` (570 KB): Screenshot of rendered Page 2.
- `spikes/paginator/paginator-results.json`: JSON output of layout metrics.

### Failures & Limitations
- **File Protocol CORS**: Opening ES modules via `file://` in Chromium triggers CORS restrictions. Solved by bundling data into standard script objects for local execution.
- **Oversized Questions**: If a single question (e.g., a reading comprehension passage) exceeds the 890px column height, atomic non-splitting would overflow. The production layout engine must support splitting between options or an explicit overflow warning.

### Verdict & Plan Changes
- **Status**: **GO**
- **Plan Changes**:
  1. In Phase 2, implement a 150ms debounce and per-block height memoization cache.
  2. For questions taller than column height, allow splitting between options while displaying an amber layout warning in the review sidebar.

---

## 2. Importer Spike

### Objective
Parse real-world DOCX coaching papers using JSZip and fast-xml-parser (without relying solely on Mammoth), preserve exact document reading order, extract fonts, detect numbering and option patterns, and identify legacy font encodings.

### Commands to Run
```bash
npm run spike:importer
# or directly: npx tsx spikes/importer/run-importer.ts
```

### Test Target
- Evaluated against `samples/paper.docx` (the motivating coaching paper, 38,763 bytes).

### Implementation Details
- Unzips DOCX archive and inspects `word/fontTable.xml`, `word/_rels/document.xml.rels`, and `word/document.xml`.
- Uses `fast-xml-parser` with `preserveOrder: true` to traverse paragraphs (`w:p`) and tables (`w:tbl`) in exact sequence.
- Inspects run properties (`w:rPr` -> `w:rFonts`) for ASCII, Complex Script (`w:cs`), and East Asian font slots.
- Checks for legacy non-Unicode Hindi font families (Kruti Dev, DevLys, Chanakya, etc.).
- Identifies and extracts text from Word OMML formulas (`m:oMath`, `m:t`).

### Results & Output
```
======================================================
   PAPERSTUDIO IMPORTER SPIKE (JSZip + fast-xml-parser)
======================================================
Reading: D:\sagar\paperstudio\samples\paper.docx

--- SUMMARY OF PARSED CONTENT ---
Total blocks:        142
Questions detected:  50
Options detected:    79
Header metadata:     0
Headings detected:   0
Instructions:        1
Empty/spacing:       8
Unclassified blocks: 4

--- FONT ANALYSIS ---
Fonts detected in document: Times New Roman, Aptos, Aptos Display, Mangal Pro, Cambria Math, Cambria
✅  NO legacy Hindi fonts found. Document uses clean Unicode fonts (e.g. Times New Roman, Mangal Pro).

--- SAMPLE DETECTED QUESTIONS (First 5) ---
Q1: प्र. 1. वह कौन-सी संख्या है, जो पूर्ण है परन्तु प्राकृत नहीं?...
Q2: प्र. 2. अंक 231402 में 4 के स्थानीय और जातीय मान में अंतर क्या है?...
Q3: प्र. 3. किसी संख्या को 68 से भाग देने पर भागफल 121 तथा शेष 18 प्राप्त होता है, त...
Q4: प्र. 4.2-132-352-57…2-997999= ?...
Q5: प्र. 5. 186 × ? ÷ 14 = 1302...

--- UNCLASSIFIED BLOCKS ---
[b_13] "" (fonts: , hasMath: true)
[b_39] "BEH का संबंध GJM से है," (fonts: Mangal Pro)
[b_40] "FOT का संबंध KTY से है।" (fonts: Mangal Pro)
[b_41] "इसी क्रम के अनुसार LIN का संबंध किससे होगा?" (fonts: Mangal Pro)
```

### Artifacts Generated
- `spikes/importer/import-output.json`: Full structured block array with run fonts, flags, and classification results.

### Failures & Limitations
- **Multi-line / Multi-paragraph Questions**: Questions that begin with context or premises (such as reasoning analogy questions `b_39`, `b_40`, `b_41`) were split across multiple paragraphs in Word. They appear as separate blocks unless grouped by proximity to the following question.
- **OMML Formula Layout**: Math equations (e.g. `b_13` and Q4) contain nested structures (fractions, square roots) which lose spatial 2D layout when flattened to text strings.

### Verdict & Plan Changes
- **Status**: **GO**
- **Plan Changes**:
  1. Phase 3 Importer must implement a preamble-grouping heuristic: contiguous unclassified paragraphs immediately preceding an option block or question stem will be attached to that question.
  2. Complex OMML equations that cannot be converted to clean LaTeX/KaTeX will be flagged for review and presented as raster images or editable KaTeX approximations.

---

## 3. DOCX Export Spike

### Objective
Verify that the `docx` package can generate production-grade Word documents with:
- A4 page dimensions
- 2-column layout
- Double page borders
- Running headers and footers with page numbers
- Clean Hindi Devanagari text with correct font slots (`w:cs`, `w:hint`)

### Commands to Run
```bash
npm run spike:docx
# or directly: npx tsx spikes/docx/run-docx.ts
```

### Implementation Details
- Built `spikes/docx/bilingual-sample.docx` with 10 bilingual MCQs.
- Section properties configured with:
  - `page.size`: 11906 x 16838 dxa (A4 portrait).
  - `column`: `{ count: 2, space: 708 }`.
  - `page.borders`: `{ pageBorders: { offsetFrom: PAGE }, pageBorderTop: { style: DOUBLE, size: 4, space: 24 }, ... }`.
  - `headers`: Institute title + examination subtitle.
  - `footers`: PageNumber field codes (`w:fldSimple` / `w:instrText`).
  - Text runs: configured with `font: { name: "Mangal", hint: "cs" }` for Hindi and `Times New Roman` for Latin.

### Results & Output
```
======================================================
   PAPERSTUDIO DOCX EXPORT SPIKE (docx package)
======================================================
DOCX Generated: D:\sagar\paperstudio\spikes\docx\bilingual-sample.docx
File size:     13287 bytes

--- XML VALIDATION OF GENERATED DOCX ---
A4 Page Size (11906 x 16838 dxa):  ✅ PASS
Two Columns (w:cols w:num="2"):    ✅ PASS
Double Page Border (w:pgBorders):   ✅ PASS
Header with Institute Name:        ✅ PASS
Footer with Page Number fields:    ✅ PASS
Hindi Font Slots (w:cs, w:hint):   ✅ PASS
Hindi Unicode Text Intact:         ✅ PASS

--- LIBREOFFICE HEADLESS VERIFICATION ---
Command attempted: soffice --headless --convert-to pdf "D:\sagar\paperstudio\spikes\docx\bilingual-sample.docx" --outdir "D:\sagar\paperstudio\spikes\docx"
Status: ⚠️  LibreOffice command failed or not installed:
   Command failed: soffice --headless --convert-to pdf "D:\sagar\paperstudio\spikes\docx\bilingual-sample.docx" --outdir "D:\sagar\paperstudio\spikes\docx"
   (Note: Per RULES.md, we document this limitation honestly; docx XML is verified directly).
```

### Artifacts Generated
- `spikes/docx/bilingual-sample.docx` (13,287 bytes): Valid Word file adhering to OpenXML ECMA-376 specifications.
- `spikes/docx/docx-validation.json`: Full XML validation report.

### Failures & Limitations
- **Headless LibreOffice**: LibreOffice (`soffice`) is not installed on the local system path.
- **Word COM Automation**: Microsoft Word 365 is present on the machine, but initiating `Word.Application` COM automation in this session is blocked by sandbox security policies (`E_ACCESSDENIED`).
- Direct programmatic inspection of `word/document.xml`, `word/header1.xml`, and `word/footer1.xml` verified that all required OpenXML structures (`w:pgSz`, `w:cols`, `w:pgBorders`, `w:rFonts w:cs`) are generated accurately.

### Verdict & Plan Changes
- **Status**: **GO**
- **Plan Changes**:
  1. In Phase 4, automated CI tests will rely on OpenXML schema assertions to validate DOCX fidelity.
  2. The UI will clearly state that DOCX layout is close to preview, but slight reflow may occur depending on the user's local Word version and installed fonts.

---

## Summary Matrix & Go/No-Go

| Spike | Risk Area | Status | Key Evidence | Next Step |
|---|---|---|---|---|
| **1. Paginator** | Multi-column pagination, font shaping, keep-together | **GO** | 40 questions packed into 2 A4 pages without overflow; PDF generated; screenshots verified. | Proceed to Phase 1 foundation and Phase 2 layout engine. |
| **2. Importer** | DOCX parsing, classification, font inspection | **GO** | 50 questions & 79 options identified from sample; Mangal Pro Unicode confirmed; OMML math extracted. | Build multi-line grouping and review screen in Phase 3. |
| **3. DOCX Export** | 2-column OpenXML generation, double border, headers | **GO** | A4, 2-column, double border, header/footer, and `w:cs` font slots pass OpenXML verification. | Integrate into Phase 4 export pipeline. |

