export interface SpeechEvent {
  text: string;
  type: "interim" | "final";
}

export interface SpeechError {
  error?: string;
  message: string;
}

export interface SpeechService {
  isListening: boolean;
  onEnd: (() => void) | null;
  onError: ((error: SpeechError) => void) | null;
  onResult: ((event: SpeechEvent) => void) | null;
  start(): void;
  stop(): void;
}

// 定义 SpeechRecognition 相关的事件类型
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  item(index: number): SpeechRecognitionAlternative;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

interface SpeechRecognitionResultList {
  item(index: number): SpeechRecognitionResult;
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechErrorCode;
}

type SpeechErrorCode =
  | "aborted"
  | "audio-capture"
  | "bad-grammar"
  | "language-not-supported"
  | "network"
  | "no-speech"
  | "not-allowed"
  | "service-not-allowed";

// 定义 SpeechRecognition 构造函数类型
interface SpeechRecognitionConstructor {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any)
    | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any)
    | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

function createStubService(): SpeechService {
  return {
    start: () => {
      // Not supported
    },
    stop: () => {
      // Not supported
    },
    onResult: null as ((event: SpeechEvent) => void) | null,
    onError: null as ((error: SpeechError) => void) | null,
    onEnd: null as (() => void) | null,
    isListening: false,
  };
}

function createSpeechService(): SpeechService {
  // Guard against SSR: window is only available in the browser
  if (typeof window === "undefined") {
    return createStubService();
  }

  const SpeechRecognitionAPI =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionAPI) {
    return createStubService();
  }

  const recognition = new SpeechRecognitionAPI();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "zh-CN";

  const svc: SpeechService = {
    onResult: null,
    onError: null,
    onEnd: null,
    isListening: false,

    start() {
      try {
        recognition.start();
        svc.isListening = true;
      } catch {
        // Already started or not supported
      }
    },

    stop() {
      try {
        recognition.stop();
      } catch {
        // Already stopped
      }
      svc.isListening = false;
    },
  };

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let interim = "";
    let finalText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalText += result[0].transcript;
      } else {
        interim += result[0].transcript;
      }
    }

    if (finalText && svc.onResult) {
      svc.onResult({ type: "final", text: finalText.trim() });
    }
    if (interim && svc.onResult) {
      svc.onResult({ type: "interim", text: interim.trim() });
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    if (svc.onError) {
      svc.onError({
        message: `语音识别错误: ${event.error}`,
        error: event.error,
      });
    }

    if (
      event.error === "not-allowed" ||
      event.error === "service-not-allowed"
    ) {
      svc.isListening = false;
    }
  };

  recognition.onend = () => {
    svc.isListening = false;
    if (svc.onEnd) {
      svc.onEnd();
    }
  };

  return svc;
}

export const speechService = createSpeechService();
