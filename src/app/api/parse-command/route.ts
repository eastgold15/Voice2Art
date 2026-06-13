import { NextResponse } from "next/server";
import OpenAI from "openai";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const SYSTEM_PROMPT = `你是一个语音绘图指令解析器。用户用中文描述绘图操作，请逐条解析为 JSON 指令。

## 输出格式（JSONL — 每行一个 JSON 对象，不要外层数组）

{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"}
{"action":"draw","shape":"rectangle","color":"#3B82F6","size":"medium","at":{"relativeTo":"last","dx":200,"dy":0}}

## 字段说明
- action: 固定 "draw"
- shape: "circle"(圆) | "rectangle"(方/矩形) | "line"(线/直线) | "ellipse"(椭圆) | "triangle"(三角)
- at: 位置，默认 "center"。可选 "top-left"|"top-center"|"top-right"|"center-left"|"center"|"center-right"|"bottom-left"|"bottom-right"|{"x":0-1000,"y":0-1000}|{"relativeTo":"last","dx":n,"dy":n}
- to: 终点（仅 line），格式同 at
- color: 描边色(hex)，可选
- fill: 填充色(hex)，可选
- size: "small"(100) | "medium"(200) | "large"(400)，默认 "medium"
- strokeWidth: 粗细，可选

## 颜色
红=#EF4444 黄=#EAB308 蓝=#3B82F6 绿=#22C55E 紫=#7C5CFC 黑=#000000 白=#FFFFFF 橙=#F97316 粉=#EC4899 青=#06B6D4 灰=#6B7280 棕=#92400E

## 位置
左边=center-left 右边=center-right 上面=top-center 下面=bottom-center 左上=top-left 右上=top-right 左下=bottom-left 右下=bottom-right

## 关键规则
- 每行一个 JSON 对象，多步指令多行输出
- 不要用 \`\`\` 包裹，不要 markdown，不要逗号分隔，不要外层数组
- "画个圈"="画圆" → circle / "画方"="画矩形" → rectangle
- 不是绘图指令 → 输出一行: {"error":"无法解析"}

## 示例

用户: "画一个红色大圆"
输出:
{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"}

用户: "画一个红色大圆然后在右边画蓝色方块"
输出:
{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"}
{"action":"draw","shape":"rectangle","color":"#3B82F6","size":"medium","at":{"relativeTo":"last","dx":200,"dy":0}}

用户: "画一条从上到下的绿色直线"
输出:
{"action":"draw","shape":"line","color":"#22C55E","at":"top-center","to":"bottom-center"}

用户: "你好今天天气怎么样"
输出:
{"error":"无法解析"}`;

export async function POST(request: Request) {
  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "未配置 DEEPSEEK_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const { text } = (await request.json()) as { text: string };
    console.log(`[LLM API] 流式请求 | text:"${text}"`);

    const stream = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      temperature: 0.1,
      max_tokens: 1024,
      stream: true,
    });

    // SSE 流式响应
    const encoder = new TextEncoder();
    let buffer = "";

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const delta = chunk.choices?.[0]?.delta?.content || "";
          if (!delta) continue;

          buffer += delta;

          // 按行分割发送 SSE 事件
          let nl = buffer.indexOf("\n");
          while (nl !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);

            if (line) {
              console.log(`[LLM API] SSE → ${line.slice(0, 120)}`);
              controller.enqueue(encoder.encode(`data: ${line}\n\n`));
            }
            nl = buffer.indexOf("\n");
          }
        }

        // 最后一行（可能没有换行结尾）
        const last = buffer.trim();
        if (last) {
          console.log(`[LLM API] SSE → ${last.slice(0, 120)}`);
          controller.enqueue(encoder.encode(`data: ${last}\n\n`));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
        console.log("[LLM API] 流式结束");
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[LLM API] 异常:", err);
    return NextResponse.json(
      { error: `服务异常: ${String(err)}`, instructions: [] },
      { status: 500 }
    );
  }
}
