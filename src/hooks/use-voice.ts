"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { routeCommand } from "@/lib/command-router";
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

  const result = await routeCommand(text);

  if (!result) {
    toast.error(`无法识别指令"${text}"，请尝试说"画红色大圆"`);
    return;
  }

  const store = useDrawingStore.getState();
  store.addCommand(text);

  switch (result.type) {
    case "draw":
      store.executeInstructions(result.instructions);
      break;
    case "style":
      store.executeInstructions([result.instruction]);
      break;
    case "action":
      store.executeInstructions([result.instruction]);
      break;
    default:
      toast.error("无法识别的指令");
      break;
  }
}
