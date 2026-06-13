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
  const _processingRef = useRef(false);

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

    return () => {
      svc.onResult = null;
      svc.onError = null;
      svc.onEnd = null;
    };
  }, [setListening]);

  const startListening = useCallback(() => {
    const svc = getSpeechService();
    setError(null);
    svc.start();
    setListening(true);
  }, [setListening]);

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
  };
}

async function handleFinal(text: string) {
  console.log("[Voice] 最终识别文本:", text);

  const store = useDrawingStore.getState();

  // 收集指令，流式绘制完成后存入历史（供回放使用，避免重复调 API）
  const collected: import("@/types/drawing").Instruction[] = [];

  const ok = await routeCommandStream(
    text,
    (drawShape) => {
      console.log(
        `[Voice] 流式绘制 → ${drawShape.shape} ${drawShape.color || ""}`
      );
      store.executeInstructions([drawShape]);
      collected.push(drawShape);
    },
    (setStyle) => {
      store.executeInstructions([setStyle]);
      collected.push(setStyle);
    },
    (canvasControl) => {
      store.executeInstructions([canvasControl]);
      collected.push(canvasControl);
    }
  );

  if (!ok) {
    toast.error(`无法识别指令"${text}"，请尝试说"画红色大圆"`);
    return;
  }

  // 存指令历史（含完整 parsed 结果，回放无需调 API）
  store.addCommand(text, collected);
}
