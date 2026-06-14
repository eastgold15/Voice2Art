"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { routeCommandStream } from "@/lib/command-router";
import type { SpeechError, SpeechEvent } from "@/lib/speech-recognition";
import { getSpeechService } from "@/lib/speech-recognition";
import { useDrawingStore } from "@/store/use-drawing-store";
import type { Instruction } from "@/types/drawing";

export function useVoice() {
  const isListening = useDrawingStore((s) => s.isListening);
  const setListening = useDrawingStore((s) => s.setListening);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<SpeechError | null>(null);
  const [isLlmThinking, setIsLlmThinking] = useState(false);
  const _processingRef = useRef(false);

  /** 逐条延迟执行：每条间隔 600ms，产生逐条画出的动画效果 */
  const executeWithDelay = useCallback(async (instructions: Instruction[]) => {
    for (const instruction of instructions) {
      await new Promise((r) => setTimeout(r, 600));
      useDrawingStore.getState().executeInstructions([instruction]);
    }
  }, []);

  // handleFinal 定义在 hook 内，闭包访问 setIsLlmThinking
  const handleFinal = useCallback(
    async (text: string) => {
      console.log("[Voice] 最终识别文本:", text);

      const store = useDrawingStore.getState();
      store.addCommand(text);
      let calledLlm = false;

      // 缓冲所有指令，等流结束后一起处理（支持延迟执行 + 相对定位）
      const buffer: Instruction[] = [];

      const ok = await routeCommandStream(
        text,
        (drawShape) => {
          buffer.push(drawShape);
        },
        (setStyle) => {
          buffer.push(setStyle);
        },
        (canvasControl) => {
          buffer.push(canvasControl);
        },
        // onLlmStart — LLM 开始流式调用
        () => {
          calledLlm = true;
          setIsLlmThinking(true);
        },
        // onLlmEnd — LLM 流式完成
        () => {
          setIsLlmThinking(false);
        }
      );

      // 如果走了 LLM 路径但失败了，也要关闭云朵
      if (calledLlm) {
        setIsLlmThinking(false);
      }

      // 有缓冲指令 → 逐条延迟执行（含 set-style 等非 draw 指令）
      if (buffer.length > 0) {
        await executeWithDelay(buffer);
        // 存储指令供回放使用
        useDrawingStore.getState().setLastCommandInstructions(buffer);
      } else if (!ok) {
        toast.error(`无法识别指令"${text}"，请尝试说"画红色大圆"`);
      }
    },
    [executeWithDelay]
  );

  useEffect(() => {
    const svc = getSpeechService();

    svc.onResult = (event: SpeechEvent) => {
      if (event.type === "interim") {
        setInterimText(event.text);
      } else {
        setInterimText("");
        handleFinal(event.text);
      }
    };

    svc.onError = (err: SpeechError) => {
      console.error("[Voice] onError:", err);
      setError(err);
      setListening(false);
      toast.error(err.message);
    };

    svc.onEnd = () => {
      console.log("[Voice] onEnd");
      setListening(false);
    };

    // 服务真正就绪后才切换 UI 状态
    svc.onReady = () => {
      console.log("[Voice] onReady → 服务已就绪");
      setListening(true);
    };

    return () => {
      svc.onResult = null;
      svc.onError = null;
      svc.onEnd = null;
      svc.onReady = null;
    };
  }, [setListening, handleFinal]);

  const startListening = useCallback(async () => {
    const svc = getSpeechService();
    setError(null);
    setIsLlmThinking(false);

    try {
      await svc.start();
      // UI 状态由 onReady 回调在 TranscriptionStarted 时设置
    } catch (err) {
      console.error("[Voice] 启动失败:", err);
      setError({
        message: `启动语音识别失败: ${String(err)}`,
        error: "audio-capture",
      });
    }
  }, []);

  const stopListening = useCallback(() => {
    const svc = getSpeechService();
    svc.stop();
    setListening(false);
  }, [setListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    startListening,
    stopListening,
    toggleListening,
    interimText,
    error,
    isLlmThinking,
  };
}
