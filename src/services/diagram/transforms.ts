import type { DiagramShapeType } from "../../domain/model.ts";

export function snapToGrid(val: number, gridSize = 10): number {
  return Math.round(val / gridSize) * gridSize;
}

export function getShapeBoundingBox(shape: DiagramShapeType): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  switch (shape.type) {
    case "line":
    case "arrow": {
      const x2 = shape.x2 !== undefined ? shape.x2 : shape.x + (shape.width || 100);
      const y2 = shape.y2 !== undefined ? shape.y2 : shape.y + (shape.height || 0);
      const minX = Math.min(shape.x, x2);
      const minY = Math.min(shape.y, y2);
      const maxX = Math.max(shape.x, x2);
      const maxY = Math.max(shape.y, y2);
      return {
        x: minX,
        y: minY,
        width: Math.max(16, maxX - minX),
        height: Math.max(16, maxY - minY)
      };
    }

    case "polygon": {
      if (shape.points && shape.points.length > 0) {
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        return {
          x: minX,
          y: minY,
          width: Math.max(16, maxX - minX),
          height: Math.max(16, maxY - minY)
        };
      }
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width || 100,
        height: shape.height || 90
      };
    }

    case "connector": {
      if (shape.points && shape.points.length > 0) {
        const xs = shape.points.map((p) => p.x);
        const ys = shape.points.map((p) => p.y);
        const minX = Math.min(...xs);
        const minY = Math.min(...ys);
        const maxX = Math.max(...xs);
        const maxY = Math.max(...ys);
        return {
          x: minX,
          y: minY,
          width: Math.max(16, maxX - minX),
          height: Math.max(16, maxY - minY)
        };
      }
      const x2 = shape.x2 !== undefined ? shape.x2 : shape.x + (shape.width || 100);
      const y2 = shape.y2 !== undefined ? shape.y2 : shape.y + (shape.height || 60);
      const minX = Math.min(shape.x, x2);
      const minY = Math.min(shape.y, y2);
      const maxX = Math.max(shape.x, x2);
      const maxY = Math.max(shape.y, y2);
      return {
        x: minX,
        y: minY,
        width: Math.max(16, maxX - minX),
        height: Math.max(16, maxY - minY)
      };
    }

    case "text": {
      const fontSize = shape.fontSize || 14;
      const textLen = (shape.text || shape.label || "Text").length;
      return {
        x: shape.x,
        y: shape.y,
        width: Math.max(20, textLen * fontSize * 0.65),
        height: Math.max(16, fontSize * 1.3)
      };
    }

    case "rect":
    case "ellipse":
    default: {
      return {
        x: shape.x,
        y: shape.y,
        width: shape.width || 80,
        height: shape.height || 60
      };
    }
  }
}

export function translateShape(
  shape: DiagramShapeType,
  dx: number,
  dy: number,
  gridSnap = false,
  gridSize = 10
): DiagramShapeType {
  const newX = gridSnap ? snapToGrid(shape.x + dx, gridSize) : shape.x + dx;
  const newY = gridSnap ? snapToGrid(shape.y + dy, gridSize) : shape.y + dy;
  const actualDx = newX - shape.x;
  const actualDy = newY - shape.y;

  const updated: DiagramShapeType = {
    ...shape,
    x: newX,
    y: newY
  };

  if (shape.x2 !== undefined) {
    updated.x2 = shape.x2 + actualDx;
  }
  if (shape.y2 !== undefined) {
    updated.y2 = shape.y2 + actualDy;
  }
  if (shape.points && shape.points.length > 0) {
    updated.points = shape.points.map((p) => ({
      x: p.x + actualDx,
      y: p.y + actualDy
    }));
  }

  return updated;
}

export function resizeShape(
  shape: DiagramShapeType,
  handle: "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w" | "end",
  dx: number,
  dy: number,
  gridSnap = false,
  gridSize = 10
): DiagramShapeType {
  const curW = shape.width || 80;
  const curH = shape.height || 60;

  if (shape.type === "line" || shape.type === "arrow") {
    const curX2 = shape.x2 !== undefined ? shape.x2 : shape.x + curW;
    const curY2 = shape.y2 !== undefined ? shape.y2 : shape.y + curH;
    let newX2 = curX2 + dx;
    let newY2 = curY2 + dy;
    if (gridSnap) {
      newX2 = snapToGrid(newX2, gridSize);
      newY2 = snapToGrid(newY2, gridSize);
    }
    return {
      ...shape,
      x2: newX2,
      y2: newY2,
      width: Math.abs(newX2 - shape.x),
      height: Math.abs(newY2 - shape.y)
    };
  }

  let newX = shape.x;
  let newY = shape.y;
  let newW = curW;
  let newH = curH;

  switch (handle) {
    case "se":
      newW = Math.max(10, curW + dx);
      newH = Math.max(10, curH + dy);
      break;
    case "sw":
      newW = Math.max(10, curW - dx);
      newX = shape.x + (curW - newW);
      newH = Math.max(10, curH + dy);
      break;
    case "ne":
      newW = Math.max(10, curW + dx);
      newH = Math.max(10, curH - dy);
      newY = shape.y + (curH - newH);
      break;
    case "nw":
      newW = Math.max(10, curW - dx);
      newH = Math.max(10, curH - dy);
      newX = shape.x + (curW - newW);
      newY = shape.y + (curH - newH);
      break;
    case "e":
      newW = Math.max(10, curW + dx);
      break;
    case "s":
      newH = Math.max(10, curH + dy);
      break;
    case "w":
      newW = Math.max(10, curW - dx);
      newX = shape.x + (curW - newW);
      break;
    case "n":
      newH = Math.max(10, curH - dy);
      newY = shape.y + (curH - newH);
      break;
  }

  if (gridSnap) {
    newW = snapToGrid(newW, gridSize);
    newH = snapToGrid(newH, gridSize);
    newX = snapToGrid(newX, gridSize);
    newY = snapToGrid(newY, gridSize);
  }

  const updated: DiagramShapeType = {
    ...shape,
    x: newX,
    y: newY,
    width: newW,
    height: newH
  };

  // If polygon, scale vertices proportionally
  if (shape.type === "polygon" && shape.points && shape.points.length > 0 && curW > 0 && curH > 0) {
    const scaleX = newW / curW;
    const scaleY = newH / curH;
    updated.points = shape.points.map((p) => ({
      x: newX + (p.x - shape.x) * scaleX,
      y: newY + (p.y - shape.y) * scaleY
    }));
  }

  return updated;
}

