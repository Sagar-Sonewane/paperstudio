import "fake-indexeddb/auto";
import { describe, it, expect, beforeEach } from "vitest";
import {
  snapToGrid,
  translateShape,
  resizeShape,
  getShapeBoundingBox
} from "../../src/services/diagram/transforms.ts";
import { serializeShapesToSvg } from "../../src/services/diagram/serializeSvg.ts";
import {
  saveDiagram,
  getDiagram,
  listDiagrams,
  deleteDiagram
} from "../../src/services/storage/diagrams.ts";
import { db } from "../../src/services/storage/db.ts";
import { createId } from "../../src/domain/ids.ts";
import type { DiagramShapeType, DiagramType, PaperType } from "../../src/domain/model.ts";
import { paginatePaper } from "../../src/services/layout/paginate.ts";
import { buildDocxDocument, exportPaperToDocxBuffer } from "../../src/services/export/docx/index.ts";
import JSZip from "jszip";

describe("Phase 6: Diagram Editor & SVG Engine", () => {
  beforeEach(async () => {
    await db.diagrams.clear();
  });

  describe("Shape Geometry & Transforms", () => {
    it("snaps coordinates to grid accurately", () => {
      expect(snapToGrid(14, 10)).toBe(10);
      expect(snapToGrid(16, 10)).toBe(20);
      expect(snapToGrid(25, 10)).toBe(30);
      expect(snapToGrid(33, 20)).toBe(40);
    });

    it("translates shapes and maintains points / coordinates", () => {
      const rect: DiagramShapeType = {
        id: "rect1",
        type: "rect",
        x: 50,
        y: 60,
        width: 100,
        height: 80,
        stroke: "#000000",
        strokeWidth: 1.5,
        strokeStyle: "solid",
        fill: "none"
      };

      const moved = translateShape(rect, 20, 30);
      expect(moved.x).toBe(70);
      expect(moved.y).toBe(90);
      expect(moved.width).toBe(100);

      // Line translation
      const line: DiagramShapeType = {
        id: "line1",
        type: "line",
        x: 10,
        y: 20,
        x2: 110,
        y2: 70,
        stroke: "#000000",
        strokeWidth: 1,
        strokeStyle: "solid",
        fill: "none"
      };
      const movedLine = translateShape(line, 15, -5);
      expect(movedLine.x).toBe(25);
      expect(movedLine.y).toBe(15);
      expect(movedLine.x2).toBe(125);
      expect(movedLine.y2).toBe(65);

      // Polygon points translation
      const triangle: DiagramShapeType = {
        id: "tri1",
        type: "polygon",
        x: 100,
        y: 100,
        width: 80,
        height: 60,
        points: [
          { x: 140, y: 100 },
          { x: 100, y: 160 },
          { x: 180, y: 160 }
        ],
        stroke: "#000000",
        strokeWidth: 1.5,
        strokeStyle: "solid",
        fill: "none"
      };
      const movedTri = translateShape(triangle, 10, 20);
      expect(movedTri.x).toBe(110);
      expect(movedTri.y).toBe(120);
      expect(movedTri.points).toEqual([
        { x: 150, y: 120 },
        { x: 110, y: 180 },
        { x: 190, y: 180 }
      ]);
    });

    it("resizes shapes via handles properly", () => {
      const rect: DiagramShapeType = {
        id: "r1",
        type: "rect",
        x: 50,
        y: 50,
        width: 100,
        height: 80,
        stroke: "#000000",
        strokeWidth: 1,
        strokeStyle: "solid",
        fill: "none"
      };

      // Drag bottom-right corner outwards
      const resizedSE = resizeShape(rect, "se", 20, 30);
      expect(resizedSE.width).toBe(120);
      expect(resizedSE.height).toBe(110);
      expect(resizedSE.x).toBe(50);
      expect(resizedSE.y).toBe(50);

      // Drag top-left corner
      const resizedNW = resizeShape(rect, "nw", -10, -10);
      expect(resizedNW.x).toBe(40);
      expect(resizedNW.y).toBe(40);
      expect(resizedNW.width).toBe(110);
      expect(resizedNW.height).toBe(90);
    });

    it("computes accurate bounding boxes across shape types", () => {
      const rect: DiagramShapeType = {
        id: "r1",
        type: "rect",
        x: 40,
        y: 50,
        width: 120,
        height: 90,
        stroke: "#000000",
        strokeWidth: 1,
        strokeStyle: "solid",
        fill: "none"
      };
      expect(getShapeBoundingBox(rect)).toEqual({ x: 40, y: 50, width: 120, height: 90 });

      const line: DiagramShapeType = {
        id: "l1",
        type: "line",
        x: 100,
        y: 80,
        x2: 30,
        y2: 40,
        stroke: "#000000",
        strokeWidth: 1,
        strokeStyle: "solid",
        fill: "none"
      };
      const lineBb = getShapeBoundingBox(line);
      expect(lineBb.x).toBe(30);
      expect(lineBb.y).toBe(40);
      expect(lineBb.width).toBe(70);
      expect(lineBb.height).toBe(40);
    });
  });

  describe("SVG Serialization", () => {
    it("serializes geometric shapes into clean valid SVG with labels and styles", () => {
      const shapes: DiagramShapeType[] = [
        {
          id: "tri",
          type: "polygon",
          x: 100,
          y: 50,
          width: 120,
          height: 100,
          points: [
            { x: 160, y: 50 },
            { x: 100, y: 150 },
            { x: 220, y: 150 }
          ],
          stroke: "#000000",
          strokeWidth: 2,
          strokeStyle: "dashed",
          fill: "#ffffff",
          label: "Δ ABC"
        },
        {
          id: "arrow1",
          type: "arrow",
          x: 50,
          y: 200,
          x2: 250,
          y2: 200,
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: "Base = 10 cm"
        },
        {
          id: "lbl1",
          type: "text",
          x: 155,
          y: 35,
          text: "A",
          fontSize: 14,
          stroke: "#000000",
          strokeWidth: 1,
          strokeStyle: "solid",
          fill: "none"
        }
      ];

      const svg = serializeShapesToSvg(shapes, 400, 300);

      // Verify SVG header & viewport
      expect(svg).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 400 300"');

      // Verify arrow marker defs
      expect(svg).toContain('<marker id="arrow"');

      // Verify polygon with points and dashed stroke
      expect(svg).toContain('<polygon points="160,50 100,150 220,150"');
      expect(svg).toContain('stroke-dasharray="6,4"');
      expect(svg).toContain('fill="#ffffff"');
      expect(svg).toContain("Δ ABC");

      // Verify arrow line with marker
      expect(svg).toContain('<line x1="50" y1="200" x2="250" y2="200"');
      expect(svg).toContain('marker-end="url(#arrow)"');
      expect(svg).toContain("Base = 10 cm");

      // Verify text element
      expect(svg).toContain('<text x="155" y="49"');
      expect(svg).toContain(">A</text>");
    });
  });

  describe("Diagram Storage Round Trip", () => {
    it("saves and retrieves diagrams from Dexie storage", async () => {
      const diagramId = createId();
      const shapes: DiagramShapeType[] = [
        {
          id: "s1",
          type: "rect",
          x: 10,
          y: 20,
          width: 80,
          height: 60,
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: "Test Rect"
        }
      ];
      const svg = serializeShapesToSvg(shapes, 300, 200);

      const diagram: DiagramType = {
        id: diagramId,
        width: 300,
        height: 200,
        shapes,
        svg,
        questionId: "q_geo_1"
      };

      const savedId = await saveDiagram(diagram);
      expect(savedId).toBe(diagramId);

      const retrieved = await getDiagram(diagramId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(diagramId);
      expect(retrieved?.width).toBe(300);
      expect(retrieved?.shapes).toHaveLength(1);
      expect(retrieved?.shapes[0].label).toBe("Test Rect");
      expect(retrieved?.svg).toBe(svg);

      // List diagrams
      const all = await listDiagrams();
      expect(all.some((d) => d.id === diagramId)).toBe(true);

      // Delete diagram
      await deleteDiagram(diagramId);
      const afterDelete = await getDiagram(diagramId);
      expect(afterDelete).toBeUndefined();
    });
  });

  describe("Layout Pagination & DOCX Integration with Diagrams", () => {
    const samplePaper: PaperType = {
      id: "paper_diagram_test",
      title: "Geometry Test Paper",
      meta: { examName: "Mathematics Exam 2026" },
      templateId: "classic-coaching",
      settings: {
        page: { size: "A4", orientation: "portrait", marginMm: { t: 10, r: 10, b: 10, l: 10 } },
        columns: { count: 2, gapMm: 6 },
        typography: {
          fontFamily: "Noto Sans Devanagari",
          questionPt: 10,
          optionPt: 9,
          headingPt: 12,
          lineHeight: 1.25,
          paragraphGapPt: 4,
          weight: 400
        },
        questions: {
          autoNumber: true,
          numberFormat: "1.",
          optionLabelStyle: "(A)",
          optionLayout: "two-column",
          optionGapPt: 3,
          questionGapPt: 6,
          showMarks: true
        },
        header: {
          instituteName: "EULER ACADEMY OF MATHEMATICS",
          subtitle: "Class X Geometry Assessment",
          fields: ["studentName", "date", "totalMarks"]
        },
        footer: { pageNumber: true, pageCount: true },
        border: { style: "double", thicknessPt: 2, insetMm: 5 },
        bwMode: true
      },
      schemaVersion: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      sections: [
        {
          id: "sec_1",
          title: "खण्ड - अ : रेखागणित (GEOMETRY)",
          items: [
            {
              kind: "question",
              id: "q_triangle",
              type: "mcq",
              content: {
                html: "<p>दिए गए त्रिभुज ABC में भुजा BC की लंबाई क्या होगी? / What is the length of side BC in triangle ABC?</p>",
                plain: "दिए गए त्रिभुज ABC में भुजा BC की लंबाई क्या होगी?"
              },
              diagramId: "diag_triangle_1",
              options: [
                { id: "opt1", label: "(A)", content: { html: "<p>10 cm</p>", plain: "10 cm" } },
                { id: "opt2", label: "(B)", content: { html: "<p>12 cm</p>", plain: "12 cm" } },
                { id: "opt3", label: "(C)", content: { html: "<p>15 cm</p>", plain: "15 cm" } },
                { id: "opt4", label: "(D)", content: { html: "<p>20 cm</p>", plain: "20 cm" } }
              ],
              marks: 4,
              mediaIds: [],
              optionLayout: "two-column"
            }
          ]
        }
      ]
    };

    it("paginates question paper with embedded SVG diagram sharply", async () => {
      const triangleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200"><polygon points="150,20 50,180 250,180" stroke="#000" stroke-width="2" fill="none"/></svg>`;
      const customDiagrams = new Map<string, string>([["diag_triangle_1", triangleSvg]]);

      const layoutResult = await paginatePaper(samplePaper, customDiagrams);
      expect(layoutResult.pages.length).toBeGreaterThanOrEqual(1);

      // Check first page blocks
      const firstPage = layoutResult.pages[0];
      const allBlocks = firstPage.columns.flatMap((col) => col.blocks);
      const questionBlock = allBlocks.find((b) => b.kind === "question");

      expect(questionBlock).toBeDefined();
      expect(questionBlock?.html).toContain("question-diagram-container");
      expect(questionBlock?.html).toContain('data-diagram-id="diag_triangle_1"');
      expect(questionBlock?.html).toContain('<polygon points="150,20 50,180 250,180"');
    });

    it("exports DOCX with embedded 3x rasterized diagram and generates valid OpenXML image structures", async () => {
      const triangleSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200" width="300" height="200"><polygon points="150,20 50,180 250,180" stroke="#000" stroke-width="2" fill="none"/></svg>`;

      const docxBuffer = await exportPaperToDocxBuffer(samplePaper, {
        diagramResolver: async (id) => {
          if (id === "diag_triangle_1") {
            return { svg: triangleSvg, width: 300, height: 200 };
          }
          return null;
        }
      });

      expect(docxBuffer.byteLength).toBeGreaterThan(5000);

      // Unzip and inspect internal OpenXML
      const zip = await JSZip.loadAsync(docxBuffer);
      const documentXml = await zip.file("word/document.xml")?.async("string");
      expect(documentXml).toBeDefined();

      // Verify w:drawing tag exists representing the embedded diagram
      expect(documentXml).toContain("w:drawing");

      // Verify image file exists inside word/media/
      const mediaFiles = Object.keys(zip.files).filter((f) => f.startsWith("word/media/"));
      expect(mediaFiles.length).toBeGreaterThanOrEqual(1);

      // Verify Hindi question stem and options exist in DOCX
      expect(documentXml).toContain("दिए गए त्रिभुज ABC में भुजा BC की लंबाई क्या होगी?");
      expect(documentXml).toContain("10 cm");

      // Verify header XML contains institute name
      const headerFile = Object.keys(zip.files).find((f) => f.startsWith("word/header"));
      if (headerFile) {
        const headerXml = await zip.file(headerFile)?.async("string");
        expect(headerXml).toContain("EULER ACADEMY OF MATHEMATICS");
      }
    });
  });
});
