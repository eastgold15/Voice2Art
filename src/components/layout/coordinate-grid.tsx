"use client";

import { useDrawingStore } from "@/store/use-drawing-store";

/** 抽象坐标标注 — 等间距显示 0、200、400、600、800、1000 */
const LABELS = [0, 200, 400, 600, 800, 1000] as const;

const GRID_LINES = [
  0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
] as const;

/**
 * 坐标参考网格 SVG 叠层
 *
 * 覆盖在画布上方，显示 100 单位间隔的网格线和坐标标注。
 * 仅在 showGrid 为 true 时渲染。
 */
export default function CoordinateGrid() {
  const showGrid = useDrawingStore((s) => s.showGrid);
  const canvasWidth = useDrawingStore((s) => s.canvasWidth);
  const canvasHeight = useDrawingStore((s) => s.canvasHeight);

  if (!showGrid) {
    return null;
  }

  const toPixelX = (v: number) => (v / 1000) * canvasWidth;
  const toPixelY = (v: number) => (v / 1000) * canvasHeight;

  return (
    <svg
      aria-label="坐标参考网格"
      className="pointer-events-none absolute inset-0"
      height={canvasHeight}
      width={canvasWidth}
    >
      {/* 竖线 */}
      {GRID_LINES.map((v) => {
        const x = toPixelX(v);
        // 主格线（100 间隔）细，每 200 加粗
        const isMajor = v % 200 === 0;
        return (
          <line
            key={`v-${v}`}
            opacity={isMajor ? 0.25 : 0.1}
            stroke="currentColor"
            strokeWidth={isMajor ? 1 : 0.5}
            x1={x}
            x2={x}
            y1={0}
            y2={canvasHeight}
          />
        );
      })}

      {/* 横线 */}
      {GRID_LINES.map((v) => {
        const y = toPixelY(v);
        const isMajor = v % 200 === 0;
        return (
          <line
            key={`h-${v}`}
            opacity={isMajor ? 0.25 : 0.1}
            stroke="currentColor"
            strokeWidth={isMajor ? 1 : 0.5}
            x1={0}
            x2={canvasWidth}
            y1={y}
            y2={y}
          />
        );
      })}

      {/* X 轴标注 */}
      {LABELS.map((v) => (
        <text
          fill="currentColor"
          fontSize={10}
          key={`lx-${v}`}
          opacity={0.5}
          textAnchor="middle"
          x={toPixelX(v)}
          y={toPixelY(0) + 14}
        >
          {v}
        </text>
      ))}

      {/* Y 轴标注 */}
      {LABELS.map((v) => {
        if (v === 0) {
          return null; // x 轴上已有
        }
        return (
          <text
            fill="currentColor"
            fontSize={10}
            key={`ly-${v}`}
            opacity={0.5}
            textAnchor="start"
            x={toPixelX(0) + 4}
            y={toPixelY(v) + 3}
          >
            {v}
          </text>
        );
      })}
    </svg>
  );
}
