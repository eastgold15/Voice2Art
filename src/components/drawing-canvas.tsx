"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Circle, Layer, Line, Rect, Stage } from "react-konva";

import { useDrawingStore } from "@/store/use-drawing-store";

export default function DrawingCanvas() {
  const shapes = useDrawingStore((s) => s.shapes);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const measure = () => {
      setSize((prev) => {
        const w = el.clientWidth;
        const h = el.clientHeight;
        if (prev.width === w && prev.height === h) {
          return prev;
        }
        return { width: w, height: h };
      });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div
      className="canvas-grid flex flex-1 overflow-hidden rounded-xl"
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
              if (shape.type === "rect") {
                return <Rect key={i} {...shape} />;
              }
              if (shape.type === "circle") {
                return <Circle key={i} {...shape} />;
              }
              if (shape.type === "line") {
                return <Line key={i} {...shape} />;
              }
              return null;
            })}
          </Layer>
        </Stage>
      )}
    </div>
  );
}
