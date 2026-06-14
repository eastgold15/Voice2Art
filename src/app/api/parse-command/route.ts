import { NextResponse } from "next/server";
import OpenAI from "openai";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const SYSTEM_PROMPT = `你是一个智能绘图助手。用户用自然语言描述绘图操作，你输出 JSON 指令。

## 坐标系
- 抽象坐标系 0-1000（不是像素），每个形状的 \`at\` 指定其**中心点**
- Y 轴向下为正：上方数值小，下方数值大
- 常见锚点：top-left(100,100) top-center(500,100) center(500,500) bottom-center(500,900) center-right(900,500)

## 尺寸与空间
- small = 100 抽象单位，medium = 200（默认），large = 400
- "半宽/半高"：small=50, medium=100, large=200
- 两个形状之间的距离至少为各自的半宽/半高之和，才能不重叠

## 输出格式
每行一个 JSON 对象，多步指令多行输出。不要 \`\`\`，不要 markdown，不要外层数组。

{"action":"draw","shape":"circle","at":{"x":500,"y":500},"size":"medium","color":"#EF4444"}

## 动作类型
- \`draw\` — 画形状。字段：shape, at（必填，建议用{x,y}精确坐标）, size, color, fill, strokeWidth
- \`set-style\` — 改样式。字段：style("color"|"stroke-width"|"fill"), value
- \`clear\` — 清空画布 / \`undo\` — 撤销 / \`redo\` — 重做

## 颜色映射
红=#EF4444 橙=#F97316 黄=#EAB308 绿=#22C55E 蓝=#3B82F6 紫=#7C5CFC 粉=#EC4899 青=#06B6D4 黑=#000000 白=#FFFFFF 灰=#6B7280 棕=#92400E

## 关键规则
1. 【必须参考当前画布】画布上已有图形会以"当前画布"形式给出，新图形不能与它们重叠
2. 【必须计算位置】使用 \`at: {x,y}\` 精确定位，根据已有图形和自身尺寸计算合适坐标
3. 【不重叠原则】两个图形之间的间距至少为 半宽之和（水平）或 半高之和（垂直）
4. 如果跟绘图完全无关，输出: {"error":"无法解析"}

位置计算示例：
- 画布有一个 #1 圆形 中心=(500,500) 半径=100
- 用户说"在它的右边画一个蓝色正方形"（默认 medium=200）
- 计算：圆形右边缘=600，正方形半宽=100，正方形中心 x = 600+100+间距50 = 750
- 所以: {"action":"draw","shape":"rectangle","at":{"x":750,"y":500},"color":"#3B82F6"}

- 画布有一个 #1 矩形 中心=(500,500) 宽=200 高=200
- 用户说"在它上面画一个红色小圆"（small=100）
- 计算：矩形上边缘=400，小圆半高=50，小圆中心 y = 400-50-间距50 = 300
- 所以: {"action":"draw","shape":"circle","at":{"x":500,"y":300},"size":"small","color":"#EF4444"}`;

export async function POST(request: Request) {
  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "未配置 DEEPSEEK_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const { text, canvas } = (await request.json()) as {
      text: string;
      canvas?: { shapeDescriptions?: string[] };
    };
    console.log(`[LLM API] 流式请求 | text:"${text}"`);

    // 构建含画布上下文的用户消息
    let userContent = "当前画布：\n";
    if (canvas?.shapeDescriptions && canvas.shapeDescriptions.length > 0) {
      userContent += canvas.shapeDescriptions.join("\n");
    } else {
      userContent += "（空）";
    }
    userContent += `\n\n用户说：${text}`;

    const stream = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
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
