import type {
  CanvasControl,
  DrawShape,
  Instruction,
  PenInstruction,
  SetStyle,
} from "@/types/drawing";
import { parseWithLLM, parseWithLLMStream } from "./llm-parser";
import { matchCommand } from "./regex-matcher";

export type RouteResult =
  | { type: "draw"; instructions: DrawShape[]; rawText: string }
  | { type: "style"; instruction: SetStyle; rawText: string }
  | { type: "action"; instruction: CanvasControl; rawText: string };

/**
 * 非流式路由（保留兼容 batch 场景）
 */
export async function routeCommand(text: string): Promise<RouteResult | null> {
  // ① 正则
  const regexResult = matchCommand(text);
  if (regexResult) {
    console.log(`[Router] 走正则路径 → type=${regexResult.type}`);
    return regexResult;
  }

  // ② LLM
  console.log(`[Router] 正则未命中，尝试 LLM… | 输入:"${text}"`);
  try {
    const llmResult = await parseWithLLM(text);
    if (llmResult && llmResult.length > 0) {
      console.log(`[Router] LLM 返回 ${llmResult.length} 条指令`);
      return { type: "draw", instructions: llmResult, rawText: text };
    }
  } catch (err) {
    console.error("[Router] LLM 异常:", err);
  }

  console.log("[Router] 最终失败 ❌");
  return null;
}

/**
 * 流式路由：每条指令立即回调 onDraw，实现逐条绘制
 * 返回 true 表示至少解析出一条指令
 */
export async function routeCommandStream(
  text: string,
  onDraw: (instruction: DrawShape) => void,
  onStyle?: (instruction: SetStyle) => void,
  onAction?: (instruction: CanvasControl) => void,
  onPen?: (instruction: PenInstruction) => void,
  onLlmStart?: () => void,
  onLlmEnd?: () => void
): Promise<boolean> {
  // ① 正则（毫秒级）
  const regexResult = matchCommand(text);
  if (regexResult) {
    console.log(`[Router] 正则 → type=${regexResult.type}`);
    if (regexResult.type === "draw") {
      for (const ins of regexResult.instructions) onDraw(ins);
    } else if (regexResult.type === "style") {
      onStyle?.(regexResult.instruction);
    } else if (regexResult.type === "action") {
      onAction?.(regexResult.instruction);
    }
    return true;
  }

  // ② LLM 流式
  console.log(`[Router] 正则未命中，启动 LLM 流式… | 输入:"${text}"`);
  onLlmStart?.();
  try {
    return await parseWithLLMStream(text, (instruction: Instruction) => {
      if (instruction.action === "draw") {
        onDraw(instruction);
      } else if (instruction.action === "set-style") {
        onStyle?.(instruction);
      } else if (
        ["clear", "undo", "redo", "toggle-grid"].includes(instruction.action)
      ) {
        onAction?.(instruction as CanvasControl);
      } else if (instruction.action === "pen") {
        onPen?.(instruction);
      }
    });
  } finally {
    onLlmEnd?.();
  }
}
