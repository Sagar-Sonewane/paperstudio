# PaperStudio 📄✨

> **Local-first exam question paper creator and multi-column layout engine for educators, schools, and coaching institutes (Hindi, English & Bilingual).**

Turn unstructured Word documents (`.docx`) or blank drafts into beautifully formatted, print-ready, multi-column exam papers with custom branding, double borders, vector diagrams, and running headers in seconds—**entirely inside your browser with 100% offline privacy.**

---

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg?logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg?logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646cff.svg?logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38b2ac.svg?logo=tailwind-css)](https://tailwindcss.com/)
[![Zod](https://img.shields.io/badge/Schema-Zod_3.24-3068b7.svg?logo=zod)](https://zod.dev/)
[![Dexie](https://img.shields.io/badge/Storage-Dexie_IndexedDB-2c3e50.svg)](https://dexie.org/)
[![Vitest](https://img.shields.io/badge/Unit_Tests-61%20Passed-brightgreen.svg?logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/E2E_Tests-15%20Steps%20Passing-green.svg?logo=playwright)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📑 Table of Contents

- [Why PaperStudio?](#-why-paperstudio)
- [Key Features](#-key-features)
  - [1. Intelligent DOCX Ingestion & Review](#1-intelligent-docx-ingestion--review)
  - [2. Multi-Column Layout & Pagination Engine](#2-multi-column-layout--pagination-engine)
  - [3. Full-Featured Bilingual Editor](#3-full-featured-bilingual-editor)
  - [4. Professional Exam Paper Templates](#4-professional-exam-paper-templates)
  - [5. Built-in SVG Diagram Editor](#5-built-in-svg-diagram-editor)
  - [6. High-Fidelity Export (DOCX & Print-to-PDF)](#6-high-fidelity-export-docx--print-to-pdf)
  - [7. Local-First Offline Privacy](#7-local-first-offline-privacy)
- [Architecture & Design Principles](#-architecture--design-principles)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Available Scripts](#-available-scripts)
- [Project Directory Structure](#-project-directory-structure)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Known Limitations](#-known-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Why PaperStudio?

Creating exam question papers in traditional word processors like Microsoft Word or LibreOffice is notoriously frustrating:
- **Pagination breaks easily**: Adding or deleting a question shifts the entire document, causing questions and options to split across columns or page breaks.
- **Bilingual formatting is painful**: Mixing Devanagari (Hindi) and Latin (English) typography often causes font mismatches, baseline jitter, and broken option alignments.
- **Multi-column struggles**: Setting up 2 columns with centered running headers, candidate information fields (Roll No., Name, Marks), and double page borders requires complex table hacks in Word.
- **Cloud privacy risks**: Teachers and institutions preparing confidential examination papers should never be forced to upload their questions to third-party cloud servers.

**PaperStudio solves this completely.** It treats exam papers as a structured data model, renders them through a deterministic layout engine enforcing strict typographic rules, and outputs both native Word (`.docx`) files and vector-sharp printable PDFs.

---

## 🚀 Key Features

### 1. Intelligent DOCX Ingestion & Review
- **Direct XML Extraction**: Parses Word documents (`.docx`) using JSZip and `fast-xml-parser` walking `word/document.xml` in exact reading order without relying solely on fragile plain-text converters.
- **Pattern Classification**: Automatic detection of question stems (`1.`, `Q. 1`, `Q1)`, `प्र. 1`), MCQ options (`(A)`, `A)`, `(a)`, `अ)`), section headings, and candidate instructions.
- **Math & OMML Support**: Automatically translates simple OMML equations (fractions, powers, roots) to readable text and flags complex equations for review.
- **Legacy Font Warnings**: Scans font declarations across all runs to detect legacy non-Unicode Hindi fonts (such as Kruti Dev, DevLys, or Chanakya) and alerts the user.
- **Pre-Commit Review Screen**: Inspect every parsed block, fix text, add/remove options, split or merge questions, and change item types before committing to your paper draft.

### 2. Multi-Column Layout & Pagination Engine
- **Font-Aware Measurement**: Off-screen measurement container accurately calculates block heights only after `document.fonts.ready` has resolved.
- **Typographic Rules Engine**:
  - **Keep-Together**: Question stems, attached diagrams, and answer options stay strictly together in a single column.
  - **Keep-With-Next**: Section headings and instructions never sit alone at the bottom of a column.
  - **Orphan Prevention**: Blocks that exceed remaining column height cleanly advance to the next column or page.
  - **Oversized Detection**: Automatic detection and warning banners if a single question exceeds column printable height.
- **Interactive Live Preview**: Continuous scrolling, single-page inspection, side-by-side two-page spread, zoom controls (50%–150%), and fit-to-width.

### 3. Full-Featured Bilingual Editor
- **Three-Area Studio Layout**: Left content tree sidebar, center live A4 preview, right properties drawer.
- **Rich Text Support**: Tiptap-powered editing for Hindi (Devanagari) and English text with bold, italic, superscript, subscript, lists, and inline formatting.
- **Special Math & Science Symbol Palette**: One-click insertion of degrees (°), fractions (½, ⅓, ¼), square roots (√), Greek letters (α, β, θ, π, λ, μ, Ω), arrows, and currency symbols (₹, $, €).
- **Flexible MCQ Option Layouts**: Choose per-question or globally between **Two-Column Grid**, **Vertical Stack**, or **Inline Run**.
- **Drag-and-Drop Organization**: Reorder questions within and across sections using `@dnd-kit`, complete with keyboard-accessible move controls.
- **Full History**: Deep undo/redo stack (`Ctrl+Z` / `Ctrl+Y`) with automatic debounce and saved status indicator.

### 4. Professional Exam Paper Templates
PaperStudio comes with **four distinct templates as code**, completely decoupled from your question content:
1. **Classic Coaching Paper**: Traditional Indian coaching institute layout with double outer borders (3pt outer, 0.75pt inner), centered academy header with Hindi tagline, student candidate information grid, and dense 2 columns.
2. **Clean Professional**: Modern school and university layout with minimal 0.75pt border, clear typographic hierarchy, underlined section headings, and generous margins.
3. **Compact Aptitude Test**: Borderless edge-to-edge layout, dense 2-column formatting, and inline options designed for maximum paper economy during competitive tests.
4. **Modern Academy**: Refined boxed section headers, centered academy title with horizontal rule accents, and subtle typography.

> 💡 **Content Invariance Guarantee**: Switching between templates or tweaking layout parameters updates styling instantly and **never alters or mutates question text**.

### 5. Built-in SVG Diagram Editor
- **Vector Drawing Tools**: Select/move/resize, line, arrow, rectangle, circle/ellipse, polygon/triangle, text labels, and orthogonal connectors.
- **Geometric Presets**: Instant insertion of labeled geometry figures:
  - $\Delta ABC$ Triangle with labeled vertices
  - Circle with center $O$ and radius $r$
  - $X\text{-}Y$ Cartesian coordinate axes
  - Quadrilaterals and squares
- **Canvas Features**: Snap-to-grid (10px grid), 8-point resize handles, dashed/solid stroke styles, fill options, and canvas zoom (50% to 200%).
- **Cross-Format Fidelity**: Diagrams render as vector SVG in live preview and printable PDFs, and are automatically rasterized to 3x high-resolution PNGs when exported to Microsoft Word.
- **Honest Word Shape Handling**: Word shapes from imported `.docx` files are clearly flagged as non-vector placeholders with direct **Replace Image** and **Redraw in Diagram Editor** actions.

### 6. High-Fidelity Export (DOCX & Print-to-PDF)
- **Native Microsoft Word (`.docx`)**: Generated using the `docx` library with proper OpenXML multi-column sections, borders, running headers, and page number fields (`Page X of Y`). Correctly maps font slots (`Mangal` / `Nirmala UI` for Devanagari; `Times New Roman` / `Arial` for Latin).
- **Print-to-PDF**: Dedicated `/paper/:id/print` route utilizing `@page` CSS and page-break rules for vector-sharp printing directly from the browser's native print dialog.
- **Pre-Export Validation Dialog**: Automatic scan for empty questions, missing images, oversized blocks, and duplicate question numbers before exporting.

### 7. Local-First Offline Privacy
- **Zero Cloud Storage**: All papers, media blobs, diagrams, and custom templates are stored locally in the browser's **IndexedDB** using **Dexie.js**.
- **Offline Resilience**: Once loaded, PaperStudio works completely offline without network requests. Confidential exam papers never leave your device.

---

## 🏛 Architecture & Design Principles

```
                    ┌─────────────────────────┐
                    │ Raw Word DOCX Ingestion │
                    └────────────┬────────────┘
                                 │ JSZip + fast-xml-parser
                                 v
                    ┌─────────────────────────┐
                    │  Review & Curation UI   │
                    └────────────┬────────────┘
                                 │
                                 v
   ┌─────────────────────────────────────────────────────────────┐
   │           Paper Data Model (Validated by Zod)               │
   │            Stored in Dexie.js (IndexedDB)                   │
   └───────────────┬─────────────────────────────┬───────────────┘
                   │                             │
                   v                             v
  ┌─────────────────────────────────┐   ┌────────────────────────┐
  │         Layout Engine           │   │      DOCX Builder      │
  │ (Offscreen Measurement, Packing)│   │  (OpenXML Multi-Column,│
  └────────┬────────────────────────┘   │   Headers & 3x Images) │
           │                            └──────────┬─────────────┘
           v                                       v
┌──────────────────────┐                ┌────────────────────────┐
│ Interactive Preview  │                │  Microsoft Word (.docx)│
│ & @page Print-to-PDF │                └────────────────────────┘
└──────────────────────┘
```

### Architectural Rules
1. **Single Source of Truth**: The paper model (Zod schema in `src/domain/model.ts`) is the only source of truth. Renderers never render from one another.
2. **Pure TypeScript Core**: `src/domain/` and `src/services/` contain zero React or UI imports. All parsing, layout calculations, and export logic remain testable in headless Node/Vitest environments.
3. **Decoupled Content & Styling**: Templates and settings customize headers, footers, borders, fonts, and column spacing, but never mutate question content.
4. **Stable IDs**: Questions and options use `nanoid` IDs. Question numbers (`1.`, `2.`, `प्र. 1`) are derived dynamically at render time.
5. **Binary Media Storage**: Images and diagrams are stored as binary Blobs in IndexedDB, referenced solely by ID without polluting the paper JSON with base64 strings.

---

## 🛠 Technology Stack

| Layer | Technologies |
|---|---|
| **Framework & Language** | [React 19](https://react.dev/), [TypeScript 5.8](https://www.typescriptlang.org/), [Vite 6](https://vitejs.dev/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [lucide-react](https://lucide.dev/) |
| **State & Data Store** | [Zustand](https://github.com/pmndrs/zustand) with [Immer](https://immerjs.github.io/immer/), [Dexie.js](https://dexie.org/) (IndexedDB) |
| **Schema Validation** | [Zod 3](https://zod.dev/) |
| **Typography & Fonts** | [@fontsource/noto-sans-devanagari](https://fontsource.org/), Mangal, Nirmala UI, Times New Roman |
| **Rich Text Editor** | [Tiptap 3](https://tiptap.dev/) (StarterKit, Subscript, Superscript, Image) |
| **Drag & Drop** | [@dnd-kit/core](https://dndkit.com/), `@dnd-kit/sortable` |
| **DOCX Parsing & Export** | [docx](https://docx.js.org/), [JSZip](https://stuk.github.io/jszip/), [fast-xml-parser](https://naturalintelligence.github.io/fast-xml-parser/) |
| **Testing** | [Vitest 3](https://vitest.dev/), [Playwright](https://playwright.dev/), [fake-indexeddb](https://github.com/dumbmatter/fake-indexeddb) |

---

## 📦 Getting Started

### Prerequisites
- **Node.js**: `18.0.0` or higher (Node 20+ recommended)
- **Package Manager**: `npm` (bundled with Node)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Sagar-Sonewane/paperstudio.git
   cd paperstudio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the local development server**:
   ```bash
   npm run dev
   ```

4. **Open PaperStudio**:
   Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 📜 Available Scripts

| Script | Command | Purpose |
|---|---|---|
| **Development** | `npm run dev` | Starts Vite dev server with hot module replacement (HMR) at port `5173`. |
| **Typecheck** | `npm run typecheck` | Runs `tsc --noEmit` to verify TypeScript types across all files. |
| **Production Build** | `npm run build` | Compiles TypeScript and creates an optimized production bundle in `dist/`. |
| **Unit Tests** | `npm test` | Runs the full Vitest suite (61 unit tests covering domain, import, layout, templates, export, and diagrams). |
| **E2E Tests** | `npm run test:e2e` | Runs Playwright end-to-end tests through dev server and Chromium browser. |
| **Spikes** | `npm run spikes` | Executes architectural spike verification scripts for importer, paginator, and docx export. |

---

## 📂 Project Directory Structure

```text
paperstudio/
├── docs/                   # Architecture, Data Model, Test Plan, and Export notes
│   ├── ARCHITECTURE.md     # Layering, pipelines, and layout engine specification
│   ├── DATA_MODEL.md       # Zod schemas, IDs, and numbering rules
│   ├── EXPORT_NOTES.md     # OpenXML compliance and PDF printing rules
│   ├── PLAN.md             # Development roadmap and exit criteria
│   └── TEST_PLAN.md        # Test matrix and manual verification checklists
├── samples/                # Sample question paper documents for testing
│   └── paper.docx          # Real 50-question bilingual test document
├── spikes/                 # Pre-implementation architectural feasibility spikes
│   ├── docx/               # DOCX generation and XML validation spike
│   ├── importer/           # JSZip + fast-xml-parser ingestion spike
│   └── paginator/          # Offscreen multi-column packing spike
├── src/
│   ├── components/         # Reusable design system primitives (shadcn/ui)
│   │   └── ui/             # Button, Input, Modal, Badge, Card, Alert
│   ├── domain/             # Pure TypeScript domain logic (NO React/UI imports)
│   │   ├── defaults.ts     # Default paper and layout configurations
│   │   ├── ids.ts          # nanoid collision-resistant ID generator
│   │   ├── migrations.ts   # Schema version migration stubs
│   │   ├── model.ts        # Zod schemas: Paper, Section, Question, Diagram
│   │   ├── numbering.ts    # Question numbering and option label resolvers
│   │   └── templates/      # Built-in template registries and settings merge
│   ├── features/           # User interface features and React views
│   │   ├── dashboard/      # Paper listing, creation, and template gallery cards
│   │   ├── diagram/        # Interactive SVG canvas diagram editor & presets
│   │   ├── editor/         # 3-area paper editor, Tiptap, settings drawer, preview
│   │   ├── export/         # Pre-export validation dialog & dedicated print view
│   │   ├── import/         # File dropzone, parsing progress, and review screen
│   │   └── templates/      # Real header/footer renderers & CSS borders
│   ├── lib/                # Utility helpers (cn, tailwind merge)
│   ├── services/           # Business logic & services (NO React imports)
│   │   ├── diagram/        # SVG serialization, geometry transforms, grid snapping
│   │   ├── export/         # OpenXML DOCX builder, rich text, images, validation
│   │   ├── import/         # DOCX unpacker, XML classifier, legacy font detector
│   │   ├── layout/         # Offscreen height measurement and column paginator
│   │   └── storage/        # Dexie IndexedDB tables (papers, media, diagrams)
│   ├── App.tsx             # Route definitions and application shell
│   ├── index.css           # Tailwind CSS imports and @page print stylesheet
│   └── main.tsx            # Vite entry point and font bootstrapping
├── tests/
│   ├── e2e/                # Playwright end-to-end integration test runner
│   │   └── run-e2e.ts      # Automated browser test covering all 6 phases
│   └── unit/               # Vitest unit test suite (61 tests)
│       ├── diagrams.test.ts # SVG transforms, serialization, and storage tests
│       ├── domain.test.ts   # Zod schema validation & numbering tests
│       ├── export.test.ts   # DOCX OpenXML and validation tests
│       ├── history.test.ts  # Undo/redo stack tests
│       ├── import.test.ts   # DOCX parser, classifier, and legacy font tests
│       ├── layout.test.ts   # Column paginator and keep-together rules
│       ├── spikes.test.ts   # Validation of architectural spikes
│       ├── storage.test.ts  # Dexie CRUD and quota error handling
│       └── templates.test.ts# Template registry and content invariance tests
├── .gitignore              # Strict exclusions for prompts, secrets, and caches
├── package.json            # Node.js dependencies and run scripts
├── README.md               # Project documentation
├── RULES.md                # Agent workflow and engineering constraints
├── tsconfig.json           # TypeScript configuration
└── vite.config.ts          # Vite configuration with Tailwind CSS plugin
```

---

## 🧪 Testing & Quality Assurance

PaperStudio enforces strict quality gates before any phase or feature is committed.

### Running Unit Tests
```bash
npm test
```
- **61 Unit Tests**: Verifies schema validation, numbering algorithms, Dexie IndexedDB CRUD, undo/redo history, DOCX OpenXML structure, legacy Hindi font detection, and SVG geometry transforms.

### Running End-to-End Tests
```bash
npm run test:e2e
```
Playwright executes a complete headless browser workflow:
1. Loads Dashboard and navigates to the Import page.
2. Ingests a real 50-question bilingual `.docx` exam paper.
3. Validates Hindi text extraction (`वह कौन-सी संख्या...`) in the Review Screen.
4. Performs an inline fix and adds an option to Question 1.
5. Commits to the Paper Editor and confirms automatic multi-column pagination.
6. Switches across all 4 templates and verifies **strict question text invariance**.
7. Adjusts layout settings (columns, borders, margins) and saves a reusable custom template.
8. Launches the **SVG Diagram Editor**, creates a geometry triangle with labeled vertices, and inserts it into Question 1.
9. Confirms the vector SVG renders sharply in the live preview.
10. Triggers DOCX export, unzips the generated file, and verifies the embedded `<w:drawing>` raster image.
11. Verifies the dedicated `@page` print route and browser print dialog trigger.

### Running TypeScript Check
```bash
npm run typecheck
```

---

## 🔍 Known Limitations

In accordance with PaperStudio's honest design philosophy (`RULES.md`):
- **Word Equation Conversion**: Microsoft Word equations (OMML) with complex matrices or nested integrals are flagged during import and preserved as image placeholders; full bidirectional equation editing is planned for a future release.
- **Word Drawing Vectors**: Native Word drawing shapes (`w:drawing`, `v:shape`) cannot be converted to editable vector paths due to Microsoft Office proprietary shape records. They are imported as image placeholders with clear **Replace Image** and **Redraw in Diagram Editor** actions.
- **Print Dialog Automation**: Web browsers do not allow background automation of the native system print dialog. PaperStudio confirms that the print dialog was opened rather than making false claims that a PDF file was downloaded directly.
- **DOCX vs. Preview Rendering**: Due to differences between browser layout engines and Microsoft Word's pagination algorithm, minor line-wrapping variations may occur. Exported `.docx` documents remain fully editable in Word.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the repository** on GitHub.
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit your changes**:
   ```bash
   git commit -m "Add amazing feature"
   ```
4. **Run all tests to ensure zero regressions**:
   ```bash
   npm run typecheck && npm test
   ```
5. **Push to your branch**:
   ```bash
   git push origin feature/amazing-feature
   ```
6. **Open a Pull Request**.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

*Built with ❤️ for teachers, coaching academies, and educators.*
