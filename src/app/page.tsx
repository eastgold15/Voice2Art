"use client";

import DrawingCanvas from "@/components/drawing-canvas";
import BottomToolbar from "@/components/layout/bottom-toolbar";
import CommandHistory from "@/components/layout/command-history";
import Header from "@/components/layout/header";

export default function Home() {
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
