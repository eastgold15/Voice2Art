// ========================================
// PR6 核心定义：DrawInstruction 类型体系
// ========================================
// 设计原则：
// 1. LLM 友好 —— 字段名像说话一样自然，可省略的都有默认值
// 2. 原子操作 —— 每个指令做一件事，LLM 自由组合
// 3. 抽象坐标系 0-1000 —— LLM 不需要知道实际像素
// ========================================

// ---------- 坐标系统 ----------

/** 抽象坐标 0-1000，执行器会映射到实际画布像素 */
export interface Position {
  x: number; // 0-1000
  y: number; // 0-1000
}

/** 位置指定方式 */
export type Location =
  // 九宫格命名
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  // 抽象坐标 0-1000
  | Position
  // 相对上一个图形
  | { relativeTo: "last"; dx: number; dy: number };

// ---------- 形状类型 ----------

export type ShapeKind =
  | "rectangle"
  | "circle"
  | "line"
  | "ellipse"
  | "triangle";

// ---------- 尺寸 ----------

export type Size = "small" | "medium" | "large";

// ---------- 指令联合体 ----------

export type Instruction = DrawShape | SetStyle | CanvasControl;

// --- 画形状 ---

export interface DrawShape {
  action: "draw";
  at?: Location; // 起点位置，不传 → 居中
  color?: string; // 描边色，不传 → 用当前颜色
  fill?: string; // 填充色，不传 → 同 color
  height?: number; // 精确高（覆盖 size）
  radius?: number; // circle 专用
  shape: ShapeKind;
  size?: Size; // 不传 → medium
  strokeWidth?: number; // 不传 → 用当前粗细
  to?: Location; // 终点位置（仅 line 使用）
  width?: number; // 精确宽（覆盖 size）
}

// --- 改样式 ---

export interface SetStyle {
  action: "set-style";
  style: "color" | "stroke-width" | "fill";
  value: string | number;
}

// --- 画布控制 ---

export interface CanvasControl {
  action: "clear" | "undo" | "redo" | "toggle-grid";
}

// ---------- 内置尺寸映射 ----------

/** 九宫格 -> 抽象坐标映射 */
export const ANCHOR_MAP: Record<string, Position> = {
  "top-left": { x: 100, y: 100 },
  "top-center": { x: 500, y: 100 },
  "top-right": { x: 900, y: 100 },
  "center-left": { x: 100, y: 500 },
  center: { x: 500, y: 500 },
  "center-right": { x: 900, y: 500 },
  "bottom-left": { x: 100, y: 900 },
  "bottom-center": { x: 500, y: 900 },
  "bottom-right": { x: 900, y: 900 },
};

/** 尺寸预设 -> 抽象长度映射 */
export const SIZE_MAP: Record<Size, number> = {
  small: 100,
  medium: 200,
  large: 400,
};
