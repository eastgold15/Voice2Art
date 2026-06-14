"use client";

import { create } from "zustand";

import type { Instruction, Position } from "@/types/drawing";
import { ANCHOR_MAP, SIZE_MAP } from "@/types/drawing";

/** 将坐标原地限制在 0-1000 范围内 */
function clampPosition(pos: Position): Position {
  return {
    x: Math.max(0, Math.min(1000, pos.x)),
    y: Math.max(0, Math.min(1000, pos.y)),
  };
}

// ===================== Shape 类型 =====================

export interface Shape {
  closed?: boolean;
  fill?: string;
  height?: number;
  points?: number[];
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  stroke: string;
  strokeWidth: number;
  type: "rect" | "circle" | "ellipse" | "line";
  width?: number;
  x: number;
  y: number;
}

// ===================== Command 类型 =====================

export interface Command {
  id: string;
  shapeCount: number;
  text: string;
  timestamp: number;
}

// ===================== 坐标工具函数 =====================

function normalizeLocation(loc: unknown, lastPos: Position | null): Position {
  if (!loc) {
    return ANCHOR_MAP.center;
  }

  if (typeof loc === "string") {
    return ANCHOR_MAP[loc] ?? ANCHOR_MAP.center;
  }

  if (typeof loc === "object" && loc !== null) {
    const obj = loc as Record<string, unknown>;

    // { relativeTo: "last", dx, dy }
    if ("relativeTo" in obj && obj.relativeTo === "last" && lastPos) {
      return {
        x: lastPos.x + ((obj.dx as number) ?? 0),
        y: lastPos.y + ((obj.dy as number) ?? 0),
      };
    }

    // { x, y }
    if (typeof obj.x === "number" && typeof obj.y === "number") {
      return { x: obj.x, y: obj.y };
    }
  }

  return ANCHOR_MAP.center;
}

function abstractToPixel(value: number, canvasSize: number): number {
  return Math.round((value / 1000) * canvasSize);
}

// ===================== Store 定义 =====================

interface DrawingStore {
  _exportPngHandler: (() => void) | null;
  addCommand: (text: string) => void;
  addShape: (shape: Shape) => void;
  canvasHeight: number;
  canvasWidth: number;
  clearCanvas: () => void;
  clearCommands: () => void;
  commands: Command[];
  currentColor: string;
  currentStrokeWidth: number;
  executeInstructions: (instructions: Instruction[]) => void;
  exportPng: () => void;
  history: Shape[][];
  historyIndex: number;
  isListening: boolean;
  /** 上一个绘图形状的中心位置（抽象坐标），支持跨 executeInstructions 调用的相对定位 */
  lastPosition: Position | null;
  redo: () => void;
  registerExportPng: (handler: () => void) => void;
  setCanvasSize: (w: number, h: number) => void;
  setColor: (color: string) => void;
  setListening: (v: boolean) => void;
  setStrokeWidth: (width: number) => void;
  shapes: Shape[];
  showGrid: boolean;
  theme: "light" | "dark";
  toggleGrid: () => void;
  toggleTheme: () => void;
  undo: () => void;
}

// ===================== 指令执行辅助函数 =====================

interface InsCtx {
  canvasHeight: number;
  canvasWidth: number;
}

function shapeForDraw(
  ins: Extract<Instruction, { action: "draw" }>,
  ctx: InsCtx,
  lastPos: Position | null,
  get: () => DrawingStore
): Shape {
  const { canvasWidth, canvasHeight } = ctx;
  const at = normalizeLocation(ins.at, lastPos);
  const px = abstractToPixel(at.x, canvasWidth);
  const py = abstractToPixel(at.y, canvasHeight);
  const color = ins.color || get().currentColor;
  const fill = ins.fill || color;
  const sw = ins.strokeWidth ?? get().currentStrokeWidth;

  switch (ins.shape) {
    case "rectangle":
      return shapeRect(ins, px, py, canvasWidth, canvasHeight, fill, color, sw);
    case "circle":
      return shapeCircle(
        ins,
        px,
        py,
        canvasWidth,
        canvasHeight,
        fill,
        color,
        sw
      );
    case "ellipse":
      return shapeEllipse(
        ins,
        px,
        py,
        canvasWidth,
        canvasHeight,
        fill,
        color,
        sw
      );
    case "line":
      return shapeLine(
        ins,
        px,
        py,
        at,
        lastPos,
        canvasWidth,
        canvasHeight,
        color,
        sw
      );
    case "triangle":
      return shapeTriangle(
        ins,
        px,
        py,
        canvasWidth,
        canvasHeight,
        fill,
        color,
        sw
      );
    default:
      return shapeRect(ins, px, py, canvasWidth, canvasHeight, fill, color, sw);
  }
}

function shapeRect(
  ins: Extract<Instruction, { action: "draw" }>,
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  fill: string,
  color: string,
  sw: number
): Shape {
  const s = ins.size ? SIZE_MAP[ins.size] : SIZE_MAP.medium;
  const w = ins.width ?? s;
  const h = ins.height ?? s;
  return {
    type: "rect",
    x: px - Math.floor(abstractToPixel(w, canvasWidth) / 2),
    y: py - Math.floor(abstractToPixel(h, canvasHeight) / 2),
    width: abstractToPixel(w, canvasWidth),
    height: abstractToPixel(h, canvasHeight),
    fill,
    stroke: color,
    strokeWidth: sw,
  };
}

function shapeCircle(
  ins: Extract<Instruction, { action: "draw" }>,
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  fill: string,
  color: string,
  sw: number
): Shape {
  const s = ins.size ? SIZE_MAP[ins.size] : SIZE_MAP.medium;
  const r = ins.radius ?? Math.floor(s / 2);
  return {
    type: "circle",
    x: px,
    y: py,
    radius: abstractToPixel(r, Math.min(canvasWidth, canvasHeight)),
    fill,
    stroke: color,
    strokeWidth: sw,
  };
}

function shapeEllipse(
  ins: Extract<Instruction, { action: "draw" }>,
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  fill: string,
  color: string,
  sw: number
): Shape {
  const s = ins.size ? SIZE_MAP[ins.size] : SIZE_MAP.medium;
  const w = ins.width ?? s;
  const h = ins.height ?? s;
  return {
    type: "ellipse",
    x: px,
    y: py,
    radiusX: Math.floor(abstractToPixel(w, canvasWidth) / 2),
    radiusY: Math.floor(abstractToPixel(h, canvasHeight) / 2),
    fill,
    stroke: color,
    strokeWidth: sw,
  };
}

function shapeLine(
  ins: Extract<Instruction, { action: "draw" }>,
  px: number,
  py: number,
  at: Position,
  lastPos: Position | null,
  canvasWidth: number,
  canvasHeight: number,
  color: string,
  sw: number
): Shape {
  const to = ins.to
    ? normalizeLocation(ins.to, lastPos)
    : { x: at.x + 200, y: at.y };
  return {
    type: "line",
    x: 0,
    y: 0,
    points: [
      px,
      py,
      abstractToPixel(to.x, canvasWidth),
      abstractToPixel(to.y, canvasHeight),
    ],
    stroke: color,
    strokeWidth: sw,
  };
}

function shapeTriangle(
  ins: Extract<Instruction, { action: "draw" }>,
  px: number,
  py: number,
  canvasWidth: number,
  canvasHeight: number,
  fill: string,
  color: string,
  sw: number
): Shape {
  const s = ins.size ? SIZE_MAP[ins.size] : SIZE_MAP.medium;
  const side = abstractToPixel(s, Math.min(canvasWidth, canvasHeight));
  const halfSide = Math.floor(side / 2);
  const triHeight = Math.floor(side * 0.866);
  return {
    type: "line",
    x: 0,
    y: 0,
    closed: true,
    points: [
      px,
      py - Math.floor((triHeight * 2) / 3),
      px - halfSide,
      py + Math.floor(triHeight / 3),
      px + halfSide,
      py + Math.floor(triHeight / 3),
    ],
    fill,
    stroke: color,
    strokeWidth: sw,
  };
}

function applyStyle(
  style: "color" | "stroke-width" | "fill",
  value: string | number,
  set: (partial: Partial<DrawingStore>) => void
) {
  if (style === "color") {
    set({ currentColor: String(value) });
  } else if (style === "stroke-width") {
    set({ currentStrokeWidth: Number(value) });
  } else if (style === "fill") {
    set({ currentColor: String(value) });
  }
}

// ===================== 画布序列化（给 LLM 看） =====================

export interface CanvasContext {
  height: number;
  /** 人类可读的图形描述，每行一个 */
  shapeDescriptions: string[];
  width: number;
}

/** 将当前画布上的图形序列化为 LLM 可读的描述文本 */
export function getCanvasContext(): CanvasContext {
  const { shapes, canvasWidth, canvasHeight } = useDrawingStore.getState();
  const minDim = Math.min(canvasWidth, canvasHeight);

  const descriptions = shapes.map((s, i) => {
    const idx = i + 1;

    switch (s.type) {
      case "circle": {
        const cx = Math.round((s.x / canvasWidth) * 1000);
        const cy = Math.round((s.y / canvasHeight) * 1000);
        const r = Math.round(((s.radius ?? 0) / minDim) * 1000);
        return `#${idx} 圆形 中心=(${cx},${cy}) 半径=${r} 颜色=${s.stroke}`;
      }
      case "rect": {
        const cw = s.width ?? 0;
        const ch = s.height ?? 0;
        const cx = Math.round(((s.x + cw / 2) / canvasWidth) * 1000);
        const cy = Math.round(((s.y + ch / 2) / canvasHeight) * 1000);
        const aw = Math.round((cw / canvasWidth) * 1000);
        const ah = Math.round((ch / canvasHeight) * 1000);
        return `#${idx} 矩形 中心=(${cx},${cy}) 宽=${aw} 高=${ah} 颜色=${s.stroke}`;
      }
      case "ellipse": {
        const cx = Math.round((s.x / canvasWidth) * 1000);
        const cy = Math.round((s.y / canvasHeight) * 1000);
        const rx = Math.round(((s.radiusX ?? 0) / minDim) * 1000);
        const ry = Math.round(((s.radiusY ?? 0) / minDim) * 1000);
        return `#${idx} 椭圆 中心=(${cx},${cy}) 半径X=${rx} 半径Y=${ry} 颜色=${s.stroke}`;
      }
      case "line": {
        // 三个顶点且 closed → 三角形
        const pts = s.points;
        if (s.closed && pts && pts.length === 6) {
          const cx = Math.round(
            ((pts[0] + pts[2] + pts[4]) / 3 / canvasWidth) * 1000
          );
          const cy = Math.round(
            ((pts[1] + pts[3] + pts[5]) / 3 / canvasHeight) * 1000
          );
          return `#${idx} 三角形 中心≈(${cx},${cy}) 颜色=${s.stroke}`;
        }
        return `#${idx} 直线`;
      }
      default:
        return `#${idx} 未知形状`;
    }
  });

  return {
    width: canvasWidth,
    height: canvasHeight,
    shapeDescriptions: descriptions,
  };
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  // === 状态 ===
  _exportPngHandler: null,
  canvasHeight: 600,
  canvasWidth: 800,
  commands: [],
  currentColor: "#000000",
  currentStrokeWidth: 3,
  history: [[]],
  historyIndex: 0,
  isListening: false,
  lastPosition: null,
  shapes: [],
  showGrid: false,
  theme: "light",

  // === 基础操作 ===

  setColor: (color) => set({ currentColor: color }),

  setStrokeWidth: (width) => set({ currentStrokeWidth: width }),

  setCanvasSize: (w, h) =>
    set((s) => {
      if (s.canvasWidth === w && s.canvasHeight === h) {
        return s;
      }
      return { canvasWidth: w, canvasHeight: h };
    }),

  addShape: (shape) => {
    const newShapes = [...get().shapes, shape];
    const newHistory = get().history.slice(0, get().historyIndex + 1);
    newHistory.push(newShapes);
    set({
      shapes: newShapes,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  },

  clearCanvas: () => {
    const newHistory = [...get().history.slice(0, get().historyIndex + 1), []];
    set({
      shapes: [],
      history: newHistory,
      historyIndex: newHistory.length - 1,
      lastPosition: null,
    });
  },

  undo: () => {
    if (get().historyIndex > 0) {
      const newIndex = get().historyIndex - 1;
      set({ shapes: get().history[newIndex], historyIndex: newIndex });
    }
  },

  redo: () => {
    if (get().historyIndex < get().history.length - 1) {
      const newIndex = get().historyIndex + 1;
      set({ shapes: get().history[newIndex], historyIndex: newIndex });
    }
  },

  addCommand: (text) => {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    set({
      commands: [
        ...get().commands,
        {
          id,
          text,
          timestamp: Date.now(),
          shapeCount: get().shapes.length,
        },
      ],
    });
  },

  clearCommands: () => set({ commands: [] }),

  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "light" ? "dark" : "light" })),

  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),

  setListening: (v) => set({ isListening: v }),

  registerExportPng: (handler) => set({ _exportPngHandler: handler }),

  exportPng: () => get()._exportPngHandler?.(),

  // === executeInstructions (PR6 核心) ===

  executeInstructions: (instructions) => {
    const { canvasWidth, canvasHeight, lastPosition } = get();
    let lastPos: Position | null = lastPosition;
    const insCtx = { canvasWidth, canvasHeight };

    for (const ins of instructions) {
      switch (ins.action) {
        case "draw": {
          const shape = shapeForDraw(ins, insCtx, lastPos, get);
          get().addShape(shape);

          const s = ins.size ? SIZE_MAP[ins.size] : SIZE_MAP.medium;
          const refW = ins.width ?? s;
          const at = normalizeLocation(ins.at, lastPos);
          lastPos = clampPosition({
            x: at.x + Math.floor(refW / 2),
            y: at.y + 100,
          });
          break;
        }
        case "set-style":
          applyStyle(ins.style, ins.value, set);
          break;
        case "clear":
          get().clearCanvas();
          lastPos = null;
          break;
        case "undo":
          get().undo();
          break;
        case "redo":
          get().redo();
          break;
        case "toggle-grid":
          get().toggleGrid();
          break;
        default:
          break;
      }
    }

    // 持久化 lastPos，下次 executeInstructions 调用可继续相对定位
    set({ lastPosition: lastPos });
  },
}));
