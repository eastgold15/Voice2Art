"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { routeCommandStream } from "@/lib/command-router";
import type { SpeechError, SpeechEvent } from "@/lib/speech-recognition";
import { getSpeechService } from "@/lib/speech-recognition";
import { useDrawingStore } from "@/store/use-drawing-store";

export function useVoice() {
  const isListening = useDrawingStore((s) => s.isListening);
  const setListening = useDrawingStore((s) => s.setListening);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<SpeechError | null>(null);
  const [isLlmThinking, setIsLlmThinking] = useState(false);
  const _processingRef = useRef(false);

  // handleFinal 定义在 hook 内，闭包访问 setIsLlmThinking
  const handleFinal = useCallback(async (text: string) => {
    console.log("[Voice] 最终识别文本:", text);

    const store = useDrawingStore.getState();
    store.addCommand(text);

    // 创建一个 Promise 来包装 routeCommandStream，以便追踪 LLM 状态
    const executeStream = async () => {
      let calledLlm = false;

      const ok = await routeCommandStream(
        text,
        (drawShape) => {
          store.executeInstructions([drawShape]);
        },
        (setStyle) => {
          store.executeInstructions([setStyle]);
        },
        (canvasControl) => {
          store.executeInstructions([canvasControl]);
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

      if (!ok) {
        toast.error(`无法识别指令"${text}"，请尝试说"画红色大圆"`);
      }
    };

    await executeStream();
  }, []);

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
