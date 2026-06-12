"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Circle, Ellipse, Layer, Line, Rect, Stage } from "react-konva";

import CoordinateGrid from "@/components/layout/coordinate-grid";
import { useDrawingStore } from "@/store/use-drawing-store";

export default function DrawingCanvas() {
  const shapes = useDrawingStore((s) => s.shapes);
  const setCanvasSize = useDrawingStore((s) => s.setCanvasSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      // 先更新 store 尺寸（用于 Canvas 外部，如 CoordinateGrid / executeInstructions）
      setCanvasSize(w, h);
      // 再更新本地 size 状态
      setSize((prev) => {
        if (prev.width === w && prev.height === h) {
          return prev;
        }
        // 同步到 store 方便 executeInstructions 使用
        setCanvasSize(w, h);
        return { width: w, height: h };
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [setCanvasSize]);

  return (
    <div
      className="canvas-grid relative flex flex-1 overflow-hidden rounded-xl"
      ref={containerRef}
    >
      {size.width > 0 && size.height > 0 && (
        <Stage
          className="rounded-lg border bg-card shadow-xs"
          height={size.height}
          width={size.width}
        >
          <Layer>
            {shapes.map((shape, i) => {
              switch (shape.type) {
                case "rect":
                  return <Rect key={i} {...shape} />;
                case "circle":
                  return <Circle key={i} {...shape} />;
                case "ellipse":
                  return (
                    <Ellipse
                      fill={shape.fill}
                      key={i}
                      radiusX={shape.radiusX ?? 50}
                      radiusY={shape.radiusY ?? 50}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      x={shape.x}
                      y={shape.y}
                    />
                  );
                case "line":
                  return (
                    <Line
                      closed={shape.closed}
                      fill={shape.fill}
                      key={i}
                      points={shape.points}
                      stroke={shape.stroke}
                      strokeWidth={shape.strokeWidth}
                      x={shape.x}
                      y={shape.y}
                    />
                  );
                default:
                  return null;
              }
            })}
          </Layer>
        </Stage>
      )}

      {/* 坐标网格叠层 */}
      <CoordinateGrid />
    </div>
  );
}
