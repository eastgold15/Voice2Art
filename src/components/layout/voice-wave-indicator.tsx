"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useVoice } from "@/hooks/use-voice";
import { cn } from "@/lib/utils";

/** LLM 云朵组件：纯 CSS 云朵 + 渐入渐出 + 随机上浮 */
function LlmCloud({ thinking }: { thinking: boolean }) {
  const [phase, setPhase] = useState<
    "hidden" | "entering" | "visible" | "exiting"
  >("hidden");
  const randomX = useRef(Math.random() * 40 - 20); // -20px ~ 20px 随机水平偏移

  useEffect(() => {
    if (thinking) {
      setPhase("entering");
      // fade-in 结束后进入 visible
      const t = setTimeout(() => setPhase("visible"), 300);
      return () => clearTimeout(t);
    }
    if (phase === "visible") {
      // LLM 完成 → 开始消散
      setPhase("exiting");
      const t = setTimeout(() => setPhase("hidden"), 500);
      return () => clearTimeout(t);
    }
    setPhase("hidden");
  }, [thinking, phase]);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute z-20"
      style={{
        bottom: "100%",
        left: "50%",
        marginBottom: "12px",
        transform: `translateX(calc(-50% + ${randomX.current}px))`,
      }}
    >
      {/* 云朵主体 */}
      <div
        className={cn(
          "relative flex items-center justify-center",
          phase === "entering" && "animate-cloud-in",
          phase === "visible" && "animate-cloud-float",
          phase === "exiting" && "animate-cloud-out"
        )}
      >
        {/* 云朵背景（纯 CSS 绘制） */}
        <svg
          aria-hidden
          className="h-14 w-24 drop-shadow-md"
          fill="none"
          role="presentation"
          viewBox="0 0 200 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="fill-blue-100/90 dark:fill-blue-900/70"
            d="M50 100C22.4 100 0 77.6 0 50C0 27.8 14.4 9 34.4 3.2C44.8 1.2 56 2.8 65.2 8.2C79.2 -2.8 99.6 -0.6 110.8 12.6C124.4 6.4 141.2 9.2 151.6 21.4C170.8 17.4 190.8 29.8 195.6 49.6C200.4 69.4 188.4 89.2 169.6 94.8C170.4 96.4 170.8 98.2 170.8 100C170.8 111 162 120 150.8 120H50C36.8 120 26 109.2 26 96C26 82 36.8 71.2 50 71.2C50.4 71.2 50.8 71.2 51.2 71.2C46.8 64.8 44 57.2 44 49.2C44 28.4 60.4 11.2 80.4 10C77.2 14.8 75.2 20.4 75.2 26.4C75.2 44.4 90 59.2 108 59.2C110 59.2 112 59.2 114 58.8C110.4 62.8 105.6 65.6 100 66.4C98.8 66.8 97.6 67.2 96.4 67.2H50C44 67.2 38.8 72.4 38.8 78.4C38.8 84.4 44 89.6 50 89.6H169.6C173.2 89.6 176.8 88 179.2 85.2C181.6 82.4 182.8 78.8 182 75.2C181.2 71.6 178.8 68.8 175.6 67.6C172.4 66.4 168.8 66.4 165.6 67.6L158.4 70.4C156 50 139.6 34 120 34C114.8 34 110 35.6 105.6 38.4C98.4 26.8 84 20 69.6 20C47.2 20 28.8 38.4 28.8 60.8C28.8 62 28.8 63.2 29.2 64.4C12 70.8 0 87.2 0 106.4C0 114.8 6.8 120 16 120H150.8C162 120 170.8 111.2 170.8 100C170.8 96.8 170 93.6 168.8 90.8C175.6 88.8 181.2 84 184 78C192.8 79.6 200 87.2 200 96.4C200 109.2 189.6 120 176.8 120H50Z"
          />
        </svg>

        {/* 云中文字 */}
        <span className="absolute whitespace-nowrap font-medium text-[11px] text-blue-600 dark:text-blue-300">
          AI 思考中...
        </span>
        {phase === "visible" && (
          <span className="absolute -bottom-4 text-[10px] text-blue-400/60 dark:text-blue-500/50">
            正在解析指令
          </span>
        )}
      </div>
    </div>
  );
}

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
