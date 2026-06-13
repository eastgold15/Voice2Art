"use client";

import {
  Grid3X3,
  Minus,
  Paintbrush,
  Plus,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import VoiceWaveIndicator from "@/components/layout/voice-wave-indicator";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useDrawingStore } from "@/store/use-drawing-store";

const PRESET_COLORS = [
  "#000000",
  "#EF4444",
  "#F97316",
  "#EAB308",
  "#22C55E",
  "#06B6D4",
  "#3B82F6",
  "#7C5CFC",
  "#EC4899",
  "#FFFFFF",
];

export default function BottomToolbar() {
  const {
    currentColor,
    currentStrokeWidth,
    showGrid,
    shapes,
    historyIndex,
    history,
    setColor,
    setStrokeWidth,
    clearCanvas,
    undo,
    redo,
    toggleGrid,
  } = useDrawingStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasShapes = shapes.length > 0;

  return (
    <footer className="flex h-14 shrink-0 items-center gap-2 border-t px-3">
      {/* Voice status */}
      <VoiceWaveIndicator />

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Color picker */}
      <div className="flex items-center gap-0.5">
        <Paintbrush className="mr-1 size-3.5 text-muted-foreground" />
        {PRESET_COLORS.map((color) => (
          <button
            aria-label={`颜色 ${color}`}
            className="relative flex size-5 items-center justify-center rounded-full transition-transform hover:scale-110"
            key={color}
            onClick={() => setColor(color)}
            type="button"
          >
            <span
              className="block size-3.5 rounded-full ring-1 ring-border ring-inset"
              style={{ backgroundColor: color }}
            />
            {currentColor === color && (
              <span className="absolute -inset-0.5 rounded-full ring-2 ring-voice-accent" />
            )}
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="mx-1 h-6 w-px bg-border" />

      {/* Stroke width */}
      <div className="flex items-center gap-2">
        <Minus className="size-3 text-muted-foreground" />
        <Slider
          aria-label="画笔粗细"
          className="w-20"
          max={20}
          min={1}
          onValueChange={(value) => {
            const v = Array.isArray(value) ? value[0] : value;
            setStrokeWidth(v);
          }}
          step={1}
          value={[currentStrokeWidth]}
        />
        <Plus className="size-3 text-muted-foreground" />
        <span className="w-5 text-center text-[11px] text-muted-foreground tabular-nums">
          {currentStrokeWidth}
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <Button
          aria-label={showGrid ? "隐藏坐标网格" : "显示坐标网格"}
          className={showGrid ? "text-voice-accent" : ""}
          data-active={showGrid ? "" : undefined}
          onClick={toggleGrid}
          size="icon-sm"
          variant="ghost"
        >
          <Grid3X3 className="size-4" />
        </Button>
        <Button
          aria-label="撤销"
          disabled={!canUndo}
          onClick={undo}
          size="icon-sm"
          variant="ghost"
        >
          <Undo2 className="size-4" />
        </Button>
        <Button
          aria-label="重做"
          disabled={!canRedo}
          onClick={redo}
          size="icon-sm"
          variant="ghost"
        >
          <Redo2 className="size-4" />
        </Button>
        <Button
          aria-label="清空画布"
          className="hover:text-destructive"
          disabled={!hasShapes}
          onClick={clearCanvas}
          size="icon-sm"
          variant="ghost"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </footer>
  );
}
