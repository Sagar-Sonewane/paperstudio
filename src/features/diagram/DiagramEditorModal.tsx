import { useState, useEffect, useRef, useCallback } from "react";
import {
  MousePointer,
  Minus,
  MoveRight,
  Square,
  Circle,
  Triangle,
  Type,
  Workflow,
  Undo2,
  Redo2,
  Trash2,
  Grid,
  ZoomIn,
  ZoomOut,
  Check,
  Shapes
} from "lucide-react";
import { Modal } from "../../components/ui/dialog.tsx";
import { Button } from "../../components/ui/button.tsx";
import { Input } from "../../components/ui/input.tsx";
import { Badge } from "../../components/ui/badge.tsx";
import { createId } from "../../domain/ids.ts";
import type { DiagramShapeType, DiagramType } from "../../domain/model.ts";
import { serializeShapesToSvg } from "../../services/diagram/serializeSvg.ts";
import {
  snapToGrid,
  translateShape,
  resizeShape,
  getShapeBoundingBox
} from "../../services/diagram/transforms.ts";
import { saveDiagram, getDiagram } from "../../services/storage/diagrams.ts";

export type DiagramTool =
  | "select"
  | "line"
  | "arrow"
  | "rect"
  | "ellipse"
  | "polygon"
  | "text"
  | "connector";

export interface DiagramEditorModalProps {
  open: boolean;
  onClose: () => void;
  questionId?: string;
  existingDiagramId?: string;
  onSave: (diagramId: string, svg: string) => void;
}

export function DiagramEditorModal({
  open,
  onClose,
  questionId,
  existingDiagramId,
  onSave
}: DiagramEditorModalProps) {
  const canvasWidth = 440;
  const canvasHeight = 280;

  // Tools & Canvas State
  const [activeTool, setActiveTool] = useState<DiagramTool>("select");
  const [shapes, setShapes] = useState<DiagramShapeType[]>([]);
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);

  // History for Undo/Redo
  const [history, setHistory] = useState<DiagramShapeType[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  // Style Settings
  const [strokeWidth, setStrokeWidth] = useState<number>(1.5);
  const [strokeStyle, setStrokeStyle] = useState<"solid" | "dashed">("solid");
  const [strokeColor, setStrokeColor] = useState<string>("#000000");
  const [fillColor, setFillColor] = useState<string>("none");
  const [labelInput, setLabelInput] = useState<string>("");

  // Canvas Settings
  const [gridSnap, setGridSnap] = useState<boolean>(true);
  const [gridSize] = useState<number>(10);
  const [zoomPercent, setZoomPercent] = useState<number>(100);

  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [shapeUnderConstruction, setShapeUnderConstruction] = useState<DiagramShapeType | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);

  // Load existing diagram if provided
  useEffect(() => {
    if (open) {
      if (existingDiagramId) {
        getDiagram(existingDiagramId).then((rec) => {
          if (rec && rec.shapes && rec.shapes.length > 0) {
            setShapes(rec.shapes);
            setHistory([rec.shapes]);
            setHistoryIdx(0);
            setSelectedShapeId(null);
          } else {
            initDefaultShapes();
          }
        });
      } else {
        initDefaultShapes();
      }
    }
  }, [open, existingDiagramId]);

  const initDefaultShapes = () => {
    setShapes([]);
    setHistory([[]]);
    setHistoryIdx(0);
    setSelectedShapeId(null);
  };

  const pushHistory = useCallback(
    (newShapes: DiagramShapeType[]) => {
      const upToCurrent = history.slice(0, historyIdx + 1);
      setHistory([...upToCurrent, newShapes]);
      setHistoryIdx(upToCurrent.length);
      setShapes(newShapes);
    },
    [history, historyIdx]
  );

  const handleUndo = useCallback(() => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1;
      setHistoryIdx(prevIdx);
      setShapes(history[prevIdx]);
      setSelectedShapeId(null);
    }
  }, [history, historyIdx]);

  const handleRedo = useCallback(() => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1;
      setHistoryIdx(nextIdx);
      setShapes(history[nextIdx]);
      setSelectedShapeId(null);
    }
  }, [history, historyIdx]);

  // Keyboard Delete & Undo
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedShapeId) {
        e.preventDefault();
        const filtered = shapes.filter((s) => s.id !== selectedShapeId);
        pushHistory(filtered);
        setSelectedShapeId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, selectedShapeId, shapes, pushHistory, handleUndo, handleRedo]);

  // Synchronize style controls with selected shape
  const selectedShape = shapes.find((s) => s.id === selectedShapeId) || null;
  useEffect(() => {
    if (selectedShape) {
      setStrokeWidth(selectedShape.strokeWidth || 1.5);
      setStrokeStyle(selectedShape.strokeStyle || "solid");
      setStrokeColor(selectedShape.stroke || "#000000");
      setFillColor(selectedShape.fill || "none");
      setLabelInput(selectedShape.label || selectedShape.text || "");
    }
  }, [selectedShapeId]);

  // Update selected shape styles
  const updateSelectedShape = (updater: (prev: DiagramShapeType) => DiagramShapeType) => {
    if (!selectedShapeId) return;
    const nextShapes = shapes.map((s) => (s.id === selectedShapeId ? updater(s) : s));
    pushHistory(nextShapes);
  };

  // Convert client mouse coordinates to SVG canvas space
  const getCanvasCoords = (e: React.MouseEvent<any>): { x: number; y: number } => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;
    const scale = rect.width / canvasWidth;
    let x = clientX / scale;
    let y = clientY / scale;

    if (gridSnap) {
      x = snapToGrid(x, gridSize);
      y = snapToGrid(y, gridSize);
    }
    return { x: Math.round(x), y: Math.round(y) };
  };

  // Canvas Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCanvasCoords(e);

    if (activeTool === "select") {
      // Clicking on empty canvas deselects
      if ((e.target as HTMLElement).tagName === "svg" || (e.target as HTMLElement).id === "grid-rect") {
        setSelectedShapeId(null);
      }
      return;
    }

    // Creating a new shape
    setIsDrawing(true);
    setDragStartPos(coords);

    let newShape: DiagramShapeType;
    const id = createId();

    switch (activeTool) {
      case "line":
        newShape = {
          id,
          type: "line",
          x: coords.x,
          y: coords.y,
          x2: coords.x,
          y2: coords.y,
          stroke: strokeColor,
          strokeWidth,
          strokeStyle,
          fill: "none"
        };
        break;

      case "arrow":
        newShape = {
          id,
          type: "arrow",
          x: coords.x,
          y: coords.y,
          x2: coords.x,
          y2: coords.y,
          stroke: strokeColor,
          strokeWidth,
          strokeStyle,
          fill: "none"
        };
        break;

      case "rect":
        newShape = {
          id,
          type: "rect",
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0,
          stroke: strokeColor,
          strokeWidth,
          strokeStyle,
          fill: fillColor
        };
        break;

      case "ellipse":
        newShape = {
          id,
          type: "ellipse",
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0,
          stroke: strokeColor,
          strokeWidth,
          strokeStyle,
          fill: fillColor
        };
        break;

      case "polygon":
        // Triangle default
        newShape = {
          id,
          type: "polygon",
          x: coords.x,
          y: coords.y,
          width: 0,
          height: 0,
          points: [
            { x: coords.x, y: coords.y },
            { x: coords.x, y: coords.y },
            { x: coords.x, y: coords.y }
          ],
          stroke: strokeColor,
          strokeWidth,
          strokeStyle,
          fill: fillColor
        };
        break;

      case "connector":
        newShape = {
          id,
          type: "connector",
          x: coords.x,
          y: coords.y,
          x2: coords.x,
          y2: coords.y,
          stroke: strokeColor,
          strokeWidth,
          strokeStyle,
          fill: "none"
        };
        break;

      case "text":
        newShape = {
          id,
          type: "text",
          x: coords.x,
          y: coords.y,
          text: labelInput || "Text",
          fontSize: 14,
          stroke: strokeColor,
          strokeWidth: 1,
          strokeStyle: "solid",
          fill: "none"
        };
        break;
    }

    setShapeUnderConstruction(newShape);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const coords = getCanvasCoords(e);

    if (isDrawing && shapeUnderConstruction) {
      const s = { ...shapeUnderConstruction };
      const dx = coords.x - dragStartPos.x;
      const dy = coords.y - dragStartPos.y;

      if (s.type === "line" || s.type === "arrow" || s.type === "connector") {
        s.x2 = coords.x;
        s.y2 = coords.y;
        s.width = Math.abs(dx);
        s.height = Math.abs(dy);
      } else if (s.type === "rect" || s.type === "ellipse") {
        s.x = Math.min(dragStartPos.x, coords.x);
        s.y = Math.min(dragStartPos.y, coords.y);
        s.width = Math.max(4, Math.abs(dx));
        s.height = Math.max(4, Math.abs(dy));
      } else if (s.type === "polygon") {
        const minX = Math.min(dragStartPos.x, coords.x);
        const minY = Math.min(dragStartPos.y, coords.y);
        const w = Math.max(4, Math.abs(dx));
        const h = Math.max(4, Math.abs(dy));
        s.x = minX;
        s.y = minY;
        s.width = w;
        s.height = h;
        // Triangle: Top peak, bottom left, bottom right
        s.points = [
          { x: minX + w / 2, y: minY },
          { x: minX, y: minY + h },
          { x: minX + w, y: minY + h }
        ];
      }
      setShapeUnderConstruction(s);
    } else if (isDragging && selectedShapeId) {
      const dx = coords.x - dragStartPos.x;
      const dy = coords.y - dragStartPos.y;
      if (dx !== 0 || dy !== 0) {
        const nextShapes = shapes.map((s) => {
          if (s.id !== selectedShapeId) return s;
          return translateShape(s, dx, dy, gridSnap, gridSize);
        });
        setShapes(nextShapes);
        setDragStartPos(coords);
      }
    } else if (isResizing && selectedShapeId && resizeHandle) {
      const dx = coords.x - dragStartPos.x;
      const dy = coords.y - dragStartPos.y;
      if (dx !== 0 || dy !== 0) {
        const nextShapes = shapes.map((s) => {
          if (s.id !== selectedShapeId) return s;
          return resizeShape(s, resizeHandle as any, dx, dy, gridSnap, gridSize);
        });
        setShapes(nextShapes);
        setDragStartPos(coords);
      }
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && shapeUnderConstruction) {
      const finalized = { ...shapeUnderConstruction };
      // Ensure sensible minimum dimensions
      if (finalized.type === "rect" || finalized.type === "ellipse" || finalized.type === "polygon") {
        if (!finalized.width || finalized.width < 10) finalized.width = 60;
        if (!finalized.height || finalized.height < 10) finalized.height = 50;
        if (finalized.type === "polygon" && (!finalized.points || finalized.points.length < 3)) {
          finalized.points = [
            { x: finalized.x + finalized.width / 2, y: finalized.y },
            { x: finalized.x, y: finalized.y + finalized.height },
            { x: finalized.x + finalized.width, y: finalized.y + finalized.height }
          ];
        }
      } else if (finalized.type === "line" || finalized.type === "arrow") {
        if (finalized.x === finalized.x2 && finalized.y === finalized.y2) {
          finalized.x2 = finalized.x + 80;
        }
      }

      const nextShapes = [...shapes, finalized];
      pushHistory(nextShapes);
      setSelectedShapeId(finalized.id);
      setShapeUnderConstruction(null);
      setIsDrawing(false);
      setActiveTool("select");
    }

    if (isDragging || isResizing) {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
      pushHistory(shapes);
    }
  };

  // Quick Preset Insert
  const insertPreset = (presetType: "triangle" | "circle_radius" | "axes" | "square") => {
    const id = createId();
    let newPresetShapes: DiagramShapeType[] = [];

    if (presetType === "triangle") {
      newPresetShapes = [
        {
          id,
          type: "polygon",
          x: 140,
          y: 70,
          width: 160,
          height: 140,
          points: [
            { x: 220, y: 70 },
            { x: 140, y: 210 },
            { x: 300, y: 210 }
          ],
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: "Δ ABC"
        },
        {
          id: createId(),
          type: "text",
          x: 215,
          y: 50,
          text: "A",
          fontSize: 13,
          stroke: "#000000",
          strokeWidth: 1,
          strokeStyle: "solid",
          fill: "none"
        },
        {
          id: createId(),
          type: "text",
          x: 120,
          y: 225,
          text: "B",
          fontSize: 13,
          stroke: "#000000",
          strokeWidth: 1,
          strokeStyle: "solid",
          fill: "none"
        },
        {
          id: createId(),
          type: "text",
          x: 310,
          y: 225,
          text: "C",
          fontSize: 13,
          stroke: "#000000",
          strokeWidth: 1,
          strokeStyle: "solid",
          fill: "none"
        }
      ];
    } else if (presetType === "circle_radius") {
      newPresetShapes = [
        {
          id,
          type: "ellipse",
          x: 150,
          y: 70,
          width: 140,
          height: 140,
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: ""
        },
        {
          id: createId(),
          type: "line",
          x: 220,
          y: 140,
          x2: 290,
          y2: 140,
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: "r"
        },
        {
          id: createId(),
          type: "ellipse",
          x: 218,
          y: 138,
          width: 4,
          height: 4,
          stroke: "#000000",
          strokeWidth: 2,
          strokeStyle: "solid",
          fill: "#000000",
          label: ""
        },
        {
          id: createId(),
          type: "text",
          x: 205,
          y: 155,
          text: "O",
          fontSize: 12,
          stroke: "#000000",
          strokeWidth: 1,
          strokeStyle: "solid",
          fill: "none"
        }
      ];
    } else if (presetType === "axes") {
      newPresetShapes = [
        {
          id,
          type: "arrow",
          x: 80,
          y: 150,
          x2: 360,
          y2: 150,
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: "X"
        },
        {
          id: createId(),
          type: "arrow",
          x: 220,
          y: 240,
          x2: 220,
          y2: 40,
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: "Y"
        }
      ];
    } else if (presetType === "square") {
      newPresetShapes = [
        {
          id,
          type: "rect",
          x: 160,
          y: 80,
          width: 120,
          height: 120,
          stroke: "#000000",
          strokeWidth: 1.5,
          strokeStyle: "solid",
          fill: "none",
          label: "Square"
        }
      ];
    }

    const next = [...shapes, ...newPresetShapes];
    pushHistory(next);
    setSelectedShapeId(id);
    setActiveTool("select");
  };

  // Save Diagram to IndexedDB and update Question
  const handleSaveAndInsert = async () => {
    const finalSvg = serializeShapesToSvg(shapes, canvasWidth, canvasHeight);
    const diagramId = existingDiagramId || createId();

    const diagramData: DiagramType = {
      id: diagramId,
      width: canvasWidth,
      height: canvasHeight,
      shapes,
      svg: finalSvg,
      questionId
    };

    await saveDiagram(diagramData);
    onSave(diagramId, finalSvg);
    onClose();
  };

  // Render SVG shapes helper
  const allShapesToRender = shapeUnderConstruction
    ? [...shapes, shapeUnderConstruction]
    : shapes;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bilingual SVG Diagram Editor"
      description="Create vector diagrams, geometric figures, and mathematical illustrations for your question paper. Preserves crisp vector sharpness in preview and print."
    >
      <div className="flex flex-col gap-3">
        {/* Top Control Bar: Tools & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-100 rounded-lg border border-slate-200 text-xs">
          {/* Main Drawing Tools */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-md border border-slate-200 shadow-2xs">
            {[
              { id: "select", label: "Select (V)", icon: MousePointer },
              { id: "line", label: "Line", icon: Minus },
              { id: "arrow", label: "Arrow", icon: MoveRight },
              { id: "rect", label: "Rectangle", icon: Square },
              { id: "ellipse", label: "Circle / Ellipse", icon: Circle },
              { id: "polygon", label: "Triangle / Polygon", icon: Triangle },
              { id: "connector", label: "Connector", icon: Workflow },
              { id: "text", label: "Text Label", icon: Type }
            ].map((tool) => {
              const Icon = tool.icon;
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  type="button"
                  title={tool.label}
                  onClick={() => {
                    setActiveTool(tool.id as DiagramTool);
                    if (tool.id !== "select") setSelectedShapeId(null);
                  }}
                  className={`p-1.5 rounded cursor-pointer transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>

          {/* Preset Geometries for Exam Papers */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
              <Shapes className="h-3 w-3" /> Presets:
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertPreset("triangle")}
              className="h-7 text-[11px] px-2"
              title="Insert Triangle with A, B, C vertex labels"
            >
              Triangle Δ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertPreset("circle_radius")}
              className="h-7 text-[11px] px-2"
              title="Insert Circle with Radius (r) and Center (O)"
            >
              Circle
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertPreset("axes")}
              className="h-7 text-[11px] px-2"
              title="Insert X-Y Coordinate Axes"
            >
              X-Y Axes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => insertPreset("square")}
              className="h-7 text-[11px] px-2"
              title="Insert Square"
            >
              Square
            </Button>
          </div>

          {/* Undo / Redo / Delete */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleUndo}
              disabled={historyIdx === 0}
              className="h-7 w-7 text-slate-600"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRedo}
              disabled={historyIdx >= history.length - 1}
              className="h-7 w-7 text-slate-600"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (selectedShapeId) {
                  const filtered = shapes.filter((s) => s.id !== selectedShapeId);
                  pushHistory(filtered);
                  setSelectedShapeId(null);
                }
              }}
              disabled={!selectedShapeId}
              className="h-7 w-7 text-red-500 hover:text-red-700 disabled:opacity-30"
              title="Delete Selected Shape (Delete/Backspace)"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Secondary Styling Bar (when shape selected or setting defaults) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div className="flex items-center gap-3">
            {/* Stroke Width */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold">Stroke:</span>
              <select
                value={strokeWidth}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setStrokeWidth(val);
                  updateSelectedShape((s) => ({ ...s, strokeWidth: val }));
                }}
                className="h-6 text-xs bg-white border border-slate-300 rounded px-1.5"
              >
                <option value={1}>1 px</option>
                <option value={1.5}>1.5 px</option>
                <option value={2}>2 px</option>
                <option value={3}>3 px</option>
                <option value={4}>4 px</option>
              </select>
            </div>

            {/* Stroke Style */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold">Style:</span>
              <select
                value={strokeStyle}
                onChange={(e) => {
                  const val = e.target.value as "solid" | "dashed";
                  setStrokeStyle(val);
                  updateSelectedShape((s) => ({ ...s, strokeStyle: val }));
                }}
                className="h-6 text-xs bg-white border border-slate-300 rounded px-1.5"
              >
                <option value="solid">Solid ───</option>
                <option value="dashed">Dashed ┄┄┄</option>
              </select>
            </div>

            {/* Fill Mode */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold">Fill:</span>
              <select
                value={fillColor}
                onChange={(e) => {
                  const val = e.target.value;
                  setFillColor(val);
                  updateSelectedShape((s) => ({ ...s, fill: val }));
                }}
                className="h-6 text-xs bg-white border border-slate-300 rounded px-1.5"
              >
                <option value="none">None (Transparent)</option>
                <option value="#ffffff">White (#ffffff)</option>
                <option value="#f1f5f9">Light Gray</option>
                <option value="#000000">Black</option>
              </select>
            </div>

            {/* Label Input */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-500 font-semibold">Label:</span>
              <Input
                value={labelInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setLabelInput(val);
                  if (selectedShapeId) {
                    updateSelectedShape((s) => ({
                      ...s,
                      label: val,
                      text: s.type === "text" ? val : s.text
                    }));
                  }
                }}
                placeholder="e.g. 10 cm or A"
                className="h-6 text-xs w-28 px-1.5"
              />
            </div>
          </div>

          {/* Grid Snap & Zoom */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGridSnap(!gridSnap)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer border ${
                gridSnap
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-slate-200 text-slate-500"
              }`}
              title="Snap coordinates to 10px grid"
            >
              <Grid className="h-3 w-3" />
              <span>Snap Grid</span>
            </button>

            <div className="flex items-center gap-1 border border-slate-200 bg-white rounded px-1">
              <button
                type="button"
                onClick={() => setZoomPercent(Math.max(50, zoomPercent - 25))}
                className="p-1 text-slate-500 hover:text-slate-800"
                title="Zoom Out"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <span className="text-[10px] font-mono text-slate-600 w-8 text-center">
                {zoomPercent}%
              </span>
              <button
                type="button"
                onClick={() => setZoomPercent(Math.min(200, zoomPercent + 25))}
                className="p-1 text-slate-500 hover:text-slate-800"
                title="Zoom In"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>
          </div>
        </div>

        {/* SVG Drawing Canvas Frame */}
        <div className="relative border-2 border-slate-300 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-4 min-h-[320px]">
          <div
            className="shadow-md bg-white border border-slate-300 relative select-none"
            style={{
              width: `${canvasWidth}px`,
              height: `${canvasHeight}px`,
              transform: `scale(${zoomPercent / 100})`,
              transformOrigin: "center center"
            }}
          >
            <svg
              ref={svgRef}
              width={canvasWidth}
              height={canvasHeight}
              viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              className={`w-full h-full block ${
                activeTool === "select" ? "cursor-default" : "cursor-crosshair"
              }`}
            >
              {/* Defs: Grid pattern & arrow marker */}
              <defs>
                <pattern id="canvas-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                </pattern>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#000000" />
                </marker>
              </defs>

              {/* Grid Background */}
              <rect
                id="grid-rect"
                width={canvasWidth}
                height={canvasHeight}
                fill="url(#canvas-grid)"
              />

              {/* Render Existing & In-Progress Shapes */}
              {allShapesToRender.map((s) => {
                const isSelected = s.id === selectedShapeId;
                const dashAttr = s.strokeStyle === "dashed" ? "6,4" : undefined;
                const stroke = s.stroke || "#000000";
                const strokeWidth = s.strokeWidth || 1.5;
                const fill = s.fill || "none";

                return (
                  <g
                    key={s.id}
                    onClick={(e) => {
                      if (activeTool === "select") {
                        e.stopPropagation();
                        setSelectedShapeId(s.id);
                      }
                    }}
                    onMouseDown={(e) => {
                      if (activeTool === "select") {
                        e.stopPropagation();
                        setSelectedShapeId(s.id);
                        setIsDragging(true);
                        setDragStartPos(getCanvasCoords(e));
                      }
                    }}
                    className={activeTool === "select" ? "cursor-move" : ""}
                  >
                    {s.type === "line" && (
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={s.x2 !== undefined ? s.x2 : s.x + (s.width || 80)}
                        y2={s.y2 !== undefined ? s.y2 : s.y + (s.height || 0)}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashAttr}
                        strokeLinecap="round"
                      />
                    )}

                    {s.type === "arrow" && (
                      <line
                        x1={s.x}
                        y1={s.y}
                        x2={s.x2 !== undefined ? s.x2 : s.x + (s.width || 80)}
                        y2={s.y2 !== undefined ? s.y2 : s.y + (s.height || 0)}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashAttr}
                        markerEnd="url(#arrow)"
                        strokeLinecap="round"
                      />
                    )}

                    {s.type === "rect" && (
                      <rect
                        x={s.x}
                        y={s.y}
                        width={Math.max(1, s.width || 80)}
                        height={Math.max(1, s.height || 60)}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashAttr}
                        fill={fill}
                        rx="2"
                      />
                    )}

                    {s.type === "ellipse" && (
                      <ellipse
                        cx={s.x + (s.width || 80) / 2}
                        cy={s.y + (s.height || 60) / 2}
                        rx={Math.max(1, (s.width || 80) / 2)}
                        ry={Math.max(1, (s.height || 60) / 2)}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashAttr}
                        fill={fill}
                      />
                    )}

                    {s.type === "polygon" && (
                      <polygon
                        points={
                          s.points && s.points.length > 0
                            ? s.points.map((p) => `${p.x},${p.y}`).join(" ")
                            : `${s.x + (s.width || 80) / 2},${s.y} ${s.x},${s.y + (s.height || 60)} ${s.x + (s.width || 80)},${s.y + (s.height || 60)}`
                        }
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashAttr}
                        fill={fill}
                      />
                    )}

                    {s.type === "connector" && (
                      <polyline
                        points={
                          s.points && s.points.length > 0
                            ? s.points.map((p) => `${p.x},${p.y}`).join(" ")
                            : `${s.x},${s.y} ${(s.x + (s.x2 ?? s.x + 80)) / 2},${s.y} ${(s.x + (s.x2 ?? s.x + 80)) / 2},${s.y2 ?? s.y + 60} ${s.x2 ?? s.x + 80},${s.y2 ?? s.y + 60}`
                        }
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeDasharray={dashAttr}
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {s.type === "text" && (
                      <text
                        x={s.x}
                        y={s.y + (s.fontSize || 14)}
                        fontFamily="Noto Sans Devanagari, Arial, sans-serif"
                        fontSize={s.fontSize || 14}
                        fontWeight="600"
                        fill={stroke}
                      >
                        {s.text || s.label || "Text"}
                      </text>
                    )}

                    {/* Shape Attached Label */}
                    {s.label && s.type !== "text" && (
                      <text
                        x={
                          s.type === "polygon" && s.points
                            ? s.points.reduce((acc, p) => acc + p.x, 0) / s.points.length
                            : s.x + (s.width || 80) / 2
                        }
                        y={
                          s.type === "polygon" && s.points
                            ? s.points.reduce((acc, p) => acc + p.y, 0) / s.points.length + 4
                            : s.type === "line" || s.type === "arrow"
                            ? (s.y + (s.y2 ?? s.y)) / 2 - 8
                            : s.y + (s.height || 60) / 2 + 4
                        }
                        fontFamily="Noto Sans Devanagari, Arial, sans-serif"
                        fontSize="12"
                        fontWeight="600"
                        textAnchor="middle"
                        fill="#000000"
                      >
                        {s.label}
                      </text>
                    )}

                    {/* Selected Highlight Overlay */}
                    {isSelected && (
                      <rect
                        {...getShapeBoundingBox(s)}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="1.5"
                        strokeDasharray="4,3"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}

              {/* Resize Handles for Selected Shape */}
              {selectedShape && (
                (() => {
                  const bb = getShapeBoundingBox(selectedShape);
                  const handleSize = 8;
                  const half = handleSize / 2;

                  if (selectedShape.type === "line" || selectedShape.type === "arrow") {
                    const x2 = selectedShape.x2 ?? selectedShape.x + (selectedShape.width || 80);
                    const y2 = selectedShape.y2 ?? selectedShape.y + (selectedShape.height || 0);
                    return (
                      <g>
                        <rect
                          x={x2 - half}
                          y={y2 - half}
                          width={handleSize}
                          height={handleSize}
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="1.5"
                          className="cursor-crosshair"
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsResizing(true);
                            setResizeHandle("end");
                            setDragStartPos(getCanvasCoords(e));
                          }}
                        />
                      </g>
                    );
                  }

                  const handles: Array<{ handle: "nw" | "ne" | "se" | "sw" | "n" | "s" | "e" | "w"; x: number; y: number; cursor: string }> = [
                    { handle: "nw", x: bb.x, y: bb.y, cursor: "nwse-resize" },
                    { handle: "n", x: bb.x + bb.width / 2, y: bb.y, cursor: "ns-resize" },
                    { handle: "ne", x: bb.x + bb.width, y: bb.y, cursor: "nesw-resize" },
                    { handle: "e", x: bb.x + bb.width, y: bb.y + bb.height / 2, cursor: "ew-resize" },
                    { handle: "se", x: bb.x + bb.width, y: bb.y + bb.height, cursor: "nwse-resize" },
                    { handle: "s", x: bb.x + bb.width / 2, y: bb.y + bb.height, cursor: "ns-resize" },
                    { handle: "sw", x: bb.x, y: bb.y + bb.height, cursor: "nesw-resize" },
                    { handle: "w", x: bb.x, y: bb.y + bb.height / 2, cursor: "ew-resize" }
                  ];

                  return (
                    <g>
                      {handles.map((h) => (
                        <rect
                          key={h.handle}
                          x={h.x - half}
                          y={h.y - half}
                          width={handleSize}
                          height={handleSize}
                          fill="#ffffff"
                          stroke="#2563eb"
                          strokeWidth="1.5"
                          style={{ cursor: h.cursor }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            setIsResizing(true);
                            setResizeHandle(h.handle);
                            setDragStartPos(getCanvasCoords(e));
                          }}
                        />
                      ))}
                    </g>
                  );
                })()
              )}
            </svg>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Badge variant="outline" className="font-mono text-[10px]">
              {shapes.length} {shapes.length === 1 ? "shape" : "shapes"}
            </Badge>
            <span>{canvasWidth} × {canvasHeight} px (A4 Column Fit)</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAndInsert}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
            >
              <Check className="h-4 w-4" />
              <span>Insert into Question</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
