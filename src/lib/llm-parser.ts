import type { DrawShape } from "@/types/drawing";

/**
 * 非流式版本（保留兼容）
 */
export async function parseWithLLM(text: string): Promise<DrawShape[] | null> {
  const results: DrawShape[] = [];
  const ok = await parseWithLLMStream(text, (ins) => {
    results.push(ins);
  });
  return ok && results.length > 0 ? results : null;
}

/**
 * 流式版本：每收到一条指令立即回调 onInstruction，实现逐条画图
 * 返回 true 表示至少解析出一条有效指令
 */
export async function parseWithLLMStream(
  text: string,
  onInstruction: (instruction: DrawShape) => void
): Promise<boolean> {
  console.log(`[LLM Stream] 发起流式请求 | text:"${text}"`);

  let res: Response;
  try {
    res = await fetch("/api/parse-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (err) {
    console.error("[LLM Stream] 网络异常:", err);
    return false;
  }

  if (!(res.ok && res.body)) {
    console.error("[LLM Stream] HTTP", res.status);
    return false;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let hasResult = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // 按行解析 SSE
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // 最后一行可能不完整，留到下次

    for (const raw of lines) {
      if (!raw.startsWith("data: ")) continue;
      const data = raw.slice(6).trim();

      if (data === "[DONE]") {
        console.log("[LLM Stream] 流结束");
        return hasResult;
      }

      if (!data) continue;

      try {
        const parsed = JSON.parse(data) as Record<string, unknown>;
        if (parsed.error) {
          console.log(`[LLM Stream] 模型拒绝: "${parsed.error}"`);
          return false;
        }
        if (parsed.action === "draw") {
          console.log(`[LLM Stream] 收到指令 → ${data.slice(0, 100)}`);
          onInstruction(parsed as unknown as DrawShape);
          hasResult = true;
        }
      } catch {
        console.warn("[LLM Stream] 跳过非 JSON 行:", data.slice(0, 80));
      }
    }
  }

  return hasResult;
}
