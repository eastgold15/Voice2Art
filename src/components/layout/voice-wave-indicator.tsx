"use client";

import { Mic, MicOff } from "lucide-react";
import { useVoice } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";

export default function VoiceWaveIndicator() {
  const { isListening, toggleListening, interimText } = useVoice();

  return (
    <div className="flex items-center gap-2">
      <button
        aria-label={isListening ? "停止监听" : "开始监听"}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-muted",
          isListening
            ? "bg-voice-wave/10 text-voice-wave"
            : "text-muted-foreground"
        )}
        onClick={toggleListening}
        type="button"
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
            <span className="hidden sm:inline">点击开始监听</span>
          </>
        )}
      </button>
      {interimText && (
        <span className="max-w-48 truncate text-muted-foreground text-xs">
          {interimText}
        </span>
      )}
    </div>
  );
}
