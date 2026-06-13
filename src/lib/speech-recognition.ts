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

// ===================== 阿里云 NLS 实时转写 WebSocket 协议 =====================

const NLS_WS_URL = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1";
const NLS_APP_KEY = "i781xeacryhWqkzC";

function uid32(): string {
  // 阿里云 NLS 要求 message_id / task_id 为纯十六进制 32 位
  const hex = "0123456789abcdef";
  let id = "";
  for (let i = 0; i < 32; i++) {
    id += hex[(Math.random() * hex.length) | 0];
  }
  return id;
}

// ===================== AudioWorklet 处理器 =====================

// 在独立音频线程中运行，不阻塞主线程 UI
const workletBlob = new Blob(
  [
    `class PcmProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channel = input[0];
      const pcm = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        const s = Math.max(-1, Math.min(1, channel[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }
      this.port.postMessage(pcm, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor("pcm-processor", PcmProcessor);
`,
  ],
  { type: "application/javascript" }
);
const workletUrl = URL.createObjectURL(workletBlob);

// ===================== PCM 录音器（实时回调） =====================

class PcmRecorder {
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private onChunk: ((chunk: Int16Array) => void) | null = null;

  async start(onChunk: (chunk: Int16Array) => void): Promise<void> {
    this.onChunk = onChunk;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16_000,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    this.audioContext = new AudioContext({ sampleRate: 16_000 });
    await this.audioContext.audioWorklet.addModule(workletUrl);

    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

    this.workletNode.port.onmessage = (e: MessageEvent) => {
      this.onChunk?.(new Int16Array(e.data));
    };

    this.source.connect(this.workletNode);
  }

  stop(): void {
    this.source?.disconnect();
    this.workletNode?.disconnect();
    this.workletNode?.port.close();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.audioContext?.close();

    this.source = null;
    this.workletNode = null;
    this.stream = null;
    this.audioContext = null;
    this.onChunk = null;
  }
}

// ===================== 实时语音服务 =====================

function createRealtimeService(): SpeechService {
  let ws: WebSocket | null = null;
  let recorder: PcmRecorder | null = null;
  let taskId = "";
  let started = false; // WebSocket TranscriptionStarted 已收到

  const svc: SpeechService = {
    onResult: null,
    onError: null,
    onEnd: null,
    isListening: false,

    async start() {
      if (svc.isListening) {
        console.log("[Voice] 已在监听中，跳过");
        return;
      }

      try {
        // 1. 获取 Token
        console.log("[Voice] 获取 NLS Token…");
        const tokenRes = await fetch("/api/nls-token");
        if (!tokenRes.ok) {
          const err = await tokenRes.json();
          throw new Error(err.error || "Token 获取失败");
        }
        const { token } = (await tokenRes.json()) as { token: string };
        console.log("[Voice] Token 已获取");

        // 2. 启动录音（每拿到一个 PCM 块就通过 WS 发送）
        recorder = new PcmRecorder();
        await recorder.start((chunk) => {
          if (ws?.readyState === WebSocket.OPEN && started) {
            ws.send(chunk.buffer);
          }
        });
        console.log("[Voice] 录音已启动");

        // 3. 连接 WebSocket
        const wsUrl = `${NLS_WS_URL}?token=${token}`;
        ws = new WebSocket(wsUrl);
        ws.binaryType = "arraybuffer";
        taskId = uid32();
        started = false;

        ws.onopen = () => {
          console.log("[Voice] WebSocket 已连接，发送 StartTranscription…");
          ws?.send(
            JSON.stringify({
              header: {
                message_id: uid32(),
                task_id: taskId,
                namespace: "SpeechTranscriber",
                name: "StartTranscription",
                appkey: NLS_APP_KEY,
              },
              payload: {
                format: "pcm",
                sample_rate: 16_000,
                enable_intermediate_result: true,
                enable_punctuation_prediction: true,
                enable_inverse_text_normalization: true,
                enable_voice_detection: true,
                max_sentence_silence: 800,
              },
            })
          );
        };

        ws.onmessage = (event: MessageEvent) => {
          if (typeof event.data !== "string") {
            return; // 二进制帧不处理
          }

          let msg: {
            header: { name: string; status_text?: string };
            payload?: { result?: string };
          };
          try {
            msg = JSON.parse(event.data as string);
          } catch {
            return;
          }

          const { header, payload } = msg;

          switch (header.name) {
            case "TranscriptionStarted":
              console.log("[Voice] 服务端就绪，开始实时识别");
              started = true;
              svc.isListening = true;
              break;

            case "TranscriptionResultChanged":
              // 实时中间结果 → 显示在 UI
              if (payload?.result && svc.onResult) {
                console.log(`[Voice] 实时: "${payload.result}"`);
                svc.onResult({ type: "interim", text: payload.result });
              }
              break;

            case "SentenceBegin":
              console.log("[Voice] 检测到语音开始");
              break;

            case "SentenceEnd":
              // 一句话结束 → 最终结果 → 执行指令
              if (payload?.result && svc.onResult) {
                console.log(`[Voice] 最终: "${payload.result}"`);
                svc.onResult({ type: "final", text: payload.result });
              }
              break;

            case "TranscriptionCompleted":
              console.log("[Voice] 转写完成");
              break;

            case "TaskFailed":
              console.error("[Voice] 转写失败:", header.status_text);
              if (svc.onError) {
                svc.onError({
                  message: header.status_text || "语音识别失败",
                  error: "network",
                });
              }
              break;

            default:
              break;
          }
        };

        ws.onerror = (err: Event) => {
          console.error("[Voice] WebSocket 错误:", err);
        };

        ws.onclose = (e: CloseEvent) => {
          console.log(`[Voice] WebSocket 关闭 code=${e.code}`);
          started = false;
          recorder?.stop();
          recorder = null;
          svc.isListening = false;
          if (svc.onEnd) svc.onEnd();
        };
      } catch (err) {
        console.error("[Voice] 启动失败:", err);
        svc.isListening = false;
        if (svc.onError) {
          svc.onError({
            message: `启动语音识别失败: ${String(err)}`,
            error: "audio-capture",
          });
        }
      }
    },

    async stop() {
      if (!(svc.isListening && ws && recorder)) {
        return;
      }

      console.log("[Voice] 停止识别…");
      svc.isListening = false;

      // 发送 StopTranscription
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            header: {
              message_id: uid32(),
              task_id: taskId,
              namespace: "SpeechTranscriber",
              name: "StopTranscription",
              appkey: NLS_APP_KEY,
            },
          })
        );
      }

      // 停止录音
      await recorder.stop();
      recorder = null;

      // 关闭 WebSocket（如果还没关）
      setTimeout(() => {
        if (ws?.readyState === WebSocket.OPEN) {
          ws.close();
        }
        ws = null;
      }, 500);
    },
  };

  return svc;
}

// ===================== 服务获取 =====================

let _service: SpeechService | null = null;

export function getSpeechService(): SpeechService {
  if (typeof window === "undefined") {
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
    console.log("[Voice] 首次初始化实时语音服务…");
    _service = createRealtimeService();
  }
  return _service;
}
