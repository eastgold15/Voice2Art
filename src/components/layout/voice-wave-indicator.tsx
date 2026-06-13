"use client";

import { Mic, MicOff } from "lucide-react";

import LlmCloud from "@/components/llm-cloud";
import { useVoice } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";

export default function VoiceWaveIndicator() {
  const { isListening, toggleListening, interimText, error, isLlmThinking } =
    useVoice();

  return (
    <div className="relative flex items-center gap-2">
      {/* 实时识别文字 — 显示在按钮上方 */}
      {interimText && (
        <div className="absolute -top-8 right-0 left-0 z-10">
          <div className="mx-auto w-fit max-w-64 rounded-full bg-muted/80 px-3 py-1 backdrop-blur-sm">
            <p className="animate-pulse text-center text-[11px] text-muted-foreground">
              🎤 {interimText}
            </p>
          </div>
        </div>
      )}

      {/* LLM 云朵 */}
      <LlmCloud thinking={isLlmThinking} />

      {/* 麦克风按钮 */}
      <button
        aria-label={isListening ? "停止监听" : "开始监听"}
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-all duration-300 hover:bg-muted",
          isListening
            ? "bg-voice-wave/10 text-voice-wave shadow-[0_0_12px_-4px] shadow-voice-wave/30"
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

      {/* 错误提示 */}
      {error && !isListening && (
        <span className="max-w-48 truncate text-red-500 text-xs">
          {error.error}: {error.message}
        </span>
      )}
    </div>
  );
}
