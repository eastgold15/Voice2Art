import type { CanvasControl, DrawShape, SetStyle } from "@/types/drawing";
import { parseWithLLM } from "./llm-parser";
import { matchCommand } from "./regex-matcher";

export type RouteResult =
  | { type: "draw"; instructions: DrawShape[]; rawText: string }
  | { type: "style"; instruction: SetStyle; rawText: string }
  | { type: "action"; instruction: CanvasControl; rawText: string };

export async function routeCommand(text: string): Promise<RouteResult | null> {
  // ① 正则匹配（毫秒级）— 基础图形 + 样式 + 动作
  const regexResult = matchCommand(text);
  if (regexResult) {
    console.log(`[Router] 走正则路径 → type=${regexResult.type}`);
    return regexResult;
  }

  // ② 正则失败 → LLM（DeepSeek）处理复杂自然语言
  console.log(`[Router] 正则未命中，尝试 LLM… | 输入:"${text}"`);
  try {
    const llmResult = await parseWithLLM(text);
    if (llmResult && llmResult.length > 0) {
      console.log(
        `[Router] LLM 返回 ${llmResult.length} 条指令:`,
        JSON.stringify(llmResult).slice(0, 300)
      );
      return { type: "draw", instructions: llmResult, rawText: text };
    }
    console.log("[Router] LLM 返回空/null");
  } catch (err) {
    console.error("[Router] LLM 异常:", err);
  }

  // ③ 都失败
  console.log(`[Router] 最终失败 ❌ | 输入:"${text}" — 正则和 LLM 都无法解析`);
  return null;
}
