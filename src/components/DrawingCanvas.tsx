"use client";

import { Circle, Layer, Line, Rect, Stage } from "react-konva";
import { useDrawingStore } from "@/store/useDrawingStore";

export default function DrawingCanvas() {
  const shapes = useDrawingStore((s) => s.shapes);

  return (
    <Stage
      className="rounded-lg border bg-white dark:bg-gray-900"
      height={600}
      width={800}
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
  );
}
