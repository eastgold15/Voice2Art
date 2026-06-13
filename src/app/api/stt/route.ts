import { NextResponse } from "next/server";

// ===================== 配置 =====================

const NLS_URL = "wss://nls-gateway.cn-shanghai.aliyuncs.com/ws/v1";
const NLS_APP_KEY = process.env.NLS_APP_KEY || "i781xeacryhWqkzC";
const ALIYUN_AK_ID = process.env.ALIYUN_AK_ID || "";
const ALIYUN_AK_SECRET = process.env.ALIYUN_AK_SECRET || "";
const ALIYUN_ENDPOINT = "http://nls-meta.cn-shanghai.aliyuncs.com";

// ===================== Token 缓存 =====================

interface CachedToken {
  expireTime: number; // epoch ms
  id: string;
}

let _cachedToken: CachedToken | null = null;

async function getNlsToken(): Promise<string> {
  // 缓存有效时直接返回（提前 5 分钟刷新）
  if (_cachedToken && Date.now() < _cachedToken.expireTime - 300_000) {
    console.log("[NLS] 使用缓存 Token");
    return _cachedToken.id;
  }

  console.log("[NLS] 生成新 Token…");

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { RPCClient } = require("@alicloud/pop-core");

  const client = new RPCClient({
    accessKeyId: ALIYUN_AK_ID,
    accessKeySecret: ALIYUN_AK_SECRET,
    endpoint: ALIYUN_ENDPOINT,
    apiVersion: "2019-02-28",
  });

  const result = await client.request("CreateToken");
  _cachedToken = {
    id: result.Token.Id as string,
    expireTime: (result.Token.ExpireTime as number) * 1000, // 秒 → 毫秒
  };

  console.log(
    `[NLS] Token 已更新，过期时间: ${new Date(_cachedToken.expireTime).toISOString()}`
  );
  return _cachedToken.id;
}

// ===================== 识别函数 =====================

function recognizePcm(audioBuffer: Buffer, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Nls = require("alibabacloud-nls");

    const sr = new Nls.SpeechRecognition({
      url: NLS_URL,
      appkey: NLS_APP_KEY,
      token,
    });

    let finalText = "";

    sr.on("started", (msg: string) => {
      console.log("[NLS] 识别已启动:", msg);
      // started 事件后发送音频
      sr.sendAudio(audioBuffer);
      // 发送完成后关闭
      sr.close().catch((err: unknown) => {
        console.warn("[NLS] close() 异常:", err);
      });
    });

    sr.on("changed", (msg: string) => {
      console.log("[NLS] 中间结果:", msg);
    });

    sr.on("completed", (msg: string) => {
      console.log("[NLS] 识别完成:", msg);
      // completed 的消息可能是 JSON 字符串，尝试解析
      try {
        const parsed = JSON.parse(msg);
        finalText = parsed.payload?.result || parsed.result || msg;
      } catch {
        finalText = msg;
      }
    });

    sr.on("failed", (msg: string) => {
      console.error("[NLS] 识别失败:", msg);
      reject(new Error(msg));
    });

    sr.on("closed", () => {
      console.log("[NLS] 连接关闭, finalText:", finalText);
      if (finalText) {
        resolve(finalText);
      } else {
        reject(new Error("未检测到语音内容"));
      }
    });

    sr.start(sr.defaultStartParams(), true, 6000).catch((err: unknown) => {
      console.error("[NLS] start() 失败:", err);
      reject(err);
    });
  });
}

// ===================== API Handler =====================

export async function POST(request: Request) {
  try {
    // 1. 检查凭据
    if (!(ALIYUN_AK_ID && ALIYUN_AK_SECRET)) {
      return NextResponse.json(
        {
          error:
            "未配置 ALIYUN_AK_ID / ALIYUN_AK_SECRET 环境变量。" +
            "请在 .env.local 中填入阿里云 AccessKey",
        },
        { status: 500 }
      );
    }

    // 2. 获取音频
    const arrayBuffer = await request.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      return NextResponse.json({ error: "未收到音频数据" }, { status: 400 });
    }

    const audioBuffer = Buffer.from(arrayBuffer);
    console.log(
      `[NLS] 收到音频: ${audioBuffer.length} bytes (${(audioBuffer.length / 1024).toFixed(1)} KB)`
    );

    // 3. 获取 Token
    const token = await getNlsToken();

    // 4. 调用识别
    const text = await recognizePcm(audioBuffer, token);

    console.log(`[NLS] 最终结果: "${text}"`);
    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[NLS] API 错误:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
