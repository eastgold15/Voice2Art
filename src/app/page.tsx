"use client";

import DrawingCanvas from "@/components/drawing-canvas";
import BottomToolbar from "@/components/layout/bottom-toolbar";
import CommandHistory from "@/components/layout/command-history";
import Header from "@/components/layout/header";
import { useDrawingStore } from "@/store/use-drawing-store";

export default function Home() {
  // 暴露 store 到 window 方便 DevTools 测试
  if (typeof window !== "undefined") {
    (window as any).__store = useDrawingStore;
  }

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col p-3">
          <DrawingCanvas />
        </main>
        <CommandHistory />
      </div>
      <BottomToolbar />
    </div>
  );
}
