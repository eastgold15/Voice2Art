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
  start(): Promise<void>;
  stop(): Promise<void>;
}

// ===================== PCM 录音器 =====================

class PcmRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private chunks: Int16Array[] = [];

  async start(): Promise<void> {
    this.chunks = [];

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16_000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 16_000 });
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    // ScriptProcessorNode 虽已废弃，但兼容性最好（Safari 仍需要）
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e: AudioProcessingEvent) => {
      const input = e.inputBuffer.getChannelData(0);
      const pcm = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        // float32 [-1, 1] → int16 [-32768, 32767]
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm[i] = s < 0 ? s * 0x80_00 : s * 0x7f_ff;
      }
      this.chunks.push(pcm);
    };

    this.source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  async stop(): Promise<ArrayBuffer> {
    this.source?.disconnect();
    this.processor?.disconnect();
    this.stream?.getTracks().map((t) => t.stop());
    await this.audioContext?.close();

    this.source = null;
    this.processor = null;
    this.stream = null;
    this.audioContext = null;

    // 拼接所有 PCM chunk
    const totalLen = this.chunks.reduce((sum, c) => sum + c.length, 0);
    const result = new Int16Array(totalLen);
    let offset = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(
      `[Voice] 录音结束: ${totalLen} samples, ${(totalLen / 16_000).toFixed(1)}s`
    );
    return result.buffer.slice(0); // ArrayBuffer
  }
}

// ===================== NLS 语音服务 =====================

function createNlsService(): SpeechService {
  let recorder: PcmRecorder | null = null;

  const svc: SpeechService = {
    onResult: null,
    onError: null,
    onEnd: null,
    isListening: false,

    async start() {
      if (svc.isListening) {
        console.log("[Voice] 已经在录音中，跳过");
        return;
      }

      try {
        console.log("[Voice] 开始录音…");
        recorder = new PcmRecorder();
        await recorder.start();
        svc.isListening = true;
        console.log("[Voice] 录音已开始");
      } catch (err) {
        console.error("[Voice] 麦克风启动失败:", err);
        svc.isListening = false;
        if (svc.onError) {
          svc.onError({
            message: `无法访问麦克风: ${String(err)}`,
            error: "audio-capture",
          });
        }
      }
    },

    async stop() {
      if (!(svc.isListening && recorder)) {
        return;
      }
      svc.isListening = false;

      try {
        const pcmBuffer = await recorder.stop();
        recorder = null;

        if (pcmBuffer.byteLength < 3200) {
          // < 100ms at 16kHz → 太短，跳过
          console.warn("[Voice] 录音太短，忽略");
          if (svc.onEnd) svc.onEnd();
          return;
        }

        console.log("[Voice] 发送音频到 /api/stt…");
        const response = await fetch("/api/stt", {
          method: "POST",
          body: pcmBuffer,
          headers: { "Content-Type": "application/octet-stream" },
        });

        const data = (await response.json()) as {
          text?: string;
          error?: string;
        };

        if (!response.ok || data.error) {
          console.error("[Voice] API 返回错误:", data.error);
          if (svc.onError) {
            svc.onError({
              message: data.error || "语音识别失败",
              error: "network",
            });
          }
        } else if (data.text && svc.onResult) {
          console.log(`[Voice] 识别结果: "${data.text}"`);
          svc.onResult({ type: "final", text: data.text });
        } else {
          console.warn("[Voice] 未识别到文字");
          if (svc.onError) {
            svc.onError({
              message: "未检测到语音，请再试一次",
              error: "no-speech",
            });
          }
        }
      } catch (err) {
        console.error("[Voice] 识别流程异常:", err);
        if (svc.onError) {
          svc.onError({
            message: `语音识别请求失败: ${String(err)}`,
            error: "network",
          });
        }
      }

      if (svc.onEnd) svc.onEnd();
    },
  };

  return svc;
}

// ===================== 服务获取 =====================

let _service: SpeechService | null = null;

export function getSpeechService(): SpeechService {
  if (typeof window === "undefined") {
    // SSR：返回空壳，不做任何操作
    return {
      isListening: false,
      onResult: null,
      onError: null,
      onEnd: null,
      start: async () => {},
      stop: async () => {},
    };
  }

  if (!_service) {
    console.log("[Voice] 首次初始化 NLS SpeechService…");
    _service = createNlsService();
  }
  return _service;
}
