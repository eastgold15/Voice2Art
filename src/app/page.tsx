"use client";

import DrawingCanvas from "@/components/DrawingCanvas";
import { useDrawingStore } from "@/store/useDrawingStore";

export default function Home() {
  // 暴露 store 到 window 方便 DevTools 测试
  if (typeof window !== "undefined") {
    (window as any).__store = useDrawingStore;
  }

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 p-4">
      <h1 className="font-bold text-2xl tracking-tight">Voice2Art</h1>
      <p className="text-muted-foreground text-sm">
        在 DevTools Console 中运行以下命令测试画布：
      </p>
      <pre className="max-w-lg rounded bg-muted p-3 text-muted-foreground text-xs">
        {`__store.getState().addShape({
  type: 'rect',
  x: 100, y: 100,
  width: 80, height: 60,
  fill: '#ef4444',
  stroke: '#ef4444',
  strokeWidth: 3,
})`}
      </pre>
      <DrawingCanvas />
    </main>
  );
}
