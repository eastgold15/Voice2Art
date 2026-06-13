import type { CanvasControl, DrawShape, SetStyle } from "@/types/drawing";
import { matchCommand } from "./regex-matcher";
// import { parseWithLLM } from "./llm-parser";  // PR5 再启用

export type RouteResult =
  | { type: "draw"; instructions: DrawShape[]; rawText: string }
  | { type: "style"; instruction: SetStyle; rawText: string }
  | { type: "action"; instruction: CanvasControl; rawText: string };

export function routeCommand(text: string): RouteResult | null {
  const result = matchCommand(text);
  if (result) {
    return result;
  }

  // PR5: 正则匹配失败 → LLM
  // const llmResult = await parseWithLLM(text);
  // if (llmResult && llmResult.length > 0) {
  //   return { type: "draw", instructions: llmResult, rawText: text };
  // }

  return null;
}
