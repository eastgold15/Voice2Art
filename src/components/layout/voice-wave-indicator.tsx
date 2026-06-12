"use client";

import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDrawingStore } from "@/store/use-drawing-store";

export default function VoiceWaveIndicator() {
  const isListening = useDrawingStore((s) => s.isListening);

  return (
    <div
      aria-label={isListening ? "正在监听" : "未在监听"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
        isListening
          ? "bg-voice-wave/10 text-voice-wave"
          : "text-muted-foreground"
      )}
      role="status"
    >
      {isListening ? (
        <>
          <Mic className="size-4" />
          <span className="hidden sm:inline">正在监听</span>
          <div className="flex items-center gap-[2px]">
            {[0, 1, 2, 3].map((i) => (
              <div
                className="voice-wave-bar h-3 w-[2px] rounded-full bg-current"
                key={i}
              />
            ))}
          </div>
        </>
      ) : (
        <>
          <MicOff className="size-4" />
          <span className="hidden sm:inline">麦克风已关闭</span>
        </>
      )}
    </div>
  );
}
