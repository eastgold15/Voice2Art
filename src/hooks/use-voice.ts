"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { routeCommand } from "@/lib/command-router";
import type { SpeechError, SpeechEvent } from "@/lib/speech-recognition";
import { speechService } from "@/lib/speech-recognition";
import { useDrawingStore } from "@/store/use-drawing-store";

export function useVoice() {
  const isListening = useDrawingStore((s) => s.isListening);
  const setListening = useDrawingStore((s) => s.setListening);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<SpeechError | null>(null);

  useEffect(() => {
    speechService.onResult = (event: SpeechEvent) => {
      if (event.type === "interim") {
        setInterimText(event.text);
      } else {
        setInterimText("");
        handleFinal(event.text);
      }
    };

    speechService.onError = (err: SpeechError) => {
      setError(err);
      setListening(false);
      toast.error(err.message);
    };

    speechService.onEnd = () => {
      setListening(false);
    };

    return () => {
      speechService.onResult = null;
      speechService.onError = null;
      speechService.onEnd = null;
    };
  }, [setListening]);

  const startListening = useCallback(() => {
    speechService.start();
    setListening(true);
    setError(null);
  }, [setListening]);

  const stopListening = useCallback(() => {
    speechService.stop();
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

function handleFinal(text: string) {
  const result = routeCommand(text);

  if (!result) {
    toast.error('无法识别的指令，请尝试说"画红色大圆"');
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
