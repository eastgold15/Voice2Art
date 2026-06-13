import type { DrawShape } from "@/types/drawing";

export async function parseWithLLM(text: string): Promise<DrawShape[] | null> {
  console.log(`[LLM] 发起请求 | 输入:"${text}"`);

  try {
    const res = await fetch("/api/parse-command", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    console.log(`[LLM] API 响应 status=${res.status}`);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error(`[LLM] API 错误 ${res.status}:`, errText.slice(0, 200));
      return null;
    }

    const data = (await res.json()) as {
      instructions?: DrawShape[];
      error?: string;
    };

    console.log(
      `[LLM] 解析结果 | instructions:${data.instructions?.length ?? 0}条 | error:${data.error || "无"}`
    );

    if (data.error || !data.instructions?.length) {
      return null;
    }

    return data.instructions;
  } catch (err) {
    console.error("[LLM] 网络异常:", err);
    return null;
  }
}
