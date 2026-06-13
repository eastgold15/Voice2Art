"use client";

import { Brain, Mic, MicOff } from "lucide-react";
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

      {/* LLM 云端思考动画 */}
      {isLlmThinking && (
        <div className="absolute -top-14 left-1/2 z-20 -translate-x-1/2">
          <div className="flex animate-float items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 px-4 py-2 shadow-lg ring-1 ring-blue-200/50 dark:from-blue-950/40 dark:to-purple-950/40 dark:ring-blue-800/30">
            <div className="relative flex size-6 items-center justify-center">
              <Brain className="size-4 text-blue-500 dark:text-blue-400" />
              {/* 旋转光圈 */}
              <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-blue-400 opacity-60" />
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-[11px] text-blue-700 dark:text-blue-300">
                AI 思考中
              </span>
              <span className="text-[10px] text-blue-500/70 dark:text-blue-400/60">
                正在解析指令
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  className="h-2 w-1 animate-bounce rounded-full bg-blue-400"
                  key={i}
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

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
