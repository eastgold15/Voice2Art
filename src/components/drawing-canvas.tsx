"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Circle, Ellipse, Layer, Line, Rect, Stage } from "react-konva";

import CoordinateGrid from "@/components/layout/coordinate-grid";
import { useDrawingStore } from "@/store/use-drawing-store";

export default function DrawingCanvas() {
  const shapes = useDrawingStore((s) => s.shapes);
  const setCanvasSize = useDrawingStore((s) => s.setCanvasSize);
  const registerExportPng = useDrawingStore((s) => s.registerExportPng);
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // 注册 PNG 导出处理器
  useEffect(() => {
    registerExportPng(() => {
      if (!stageRef.current) {
        return;
      }
      const dataUrl = stageRef.current.toDataURL({
        mimeType: "image/png",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `voice2art-${Date.now()}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }, [registerExportPng]);

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
          ref={stageRef}
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
