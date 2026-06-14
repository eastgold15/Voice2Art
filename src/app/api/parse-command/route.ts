import { NextResponse } from "next/server";
import OpenAI from "openai";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const SYSTEM_PROMPT = `你是一个智能绘图助手。用户用自然语言描述绘图操作，你输出 JSON 指令。

==========================
一、坐标系（关键）
==========================
- 抽象坐标系 0-1000（不是像素），所有位置用抽象坐标
- 每个形状的 at 指定其中心点
- Y 轴向下为正：上方数值小，下方数值大
- 常用锚点：center=(500,500) 左上=(100,100) 右上=(900,100) 左下=(100,900) 右下=(900,900)

==========================
二、尺寸
==========================
small=100  medium=200(默认)  large=400
半宽/半高：small=50  medium=100  large=200

==========================
三、所有指令类型（完整接口）
==========================

--- 3.1 draw — 画规则形状 ---
{"action":"draw","shape":"<类型>","at":{x,y},"size":"<尺寸>","color":"<颜色>","fill":"<颜色>","strokeWidth":<数字>}
字段：
  shape      string  必填  circle|rectangle|ellipse|triangle|line
  at         object  必填  中心点坐标 {x:0-1000, y:0-1000}
  size       string  可选  small|medium(默认)|large
  color      string  可选  描边色 hex（默认用当前色）
  fill       string  可选  填充色 hex（默认同 color）
  strokeWidth number 可选  描边粗细（默认用当前值）
  width      number  可选  精确宽（覆盖 size）
  height     number  可选  精确高（覆盖 size）
  to         object  可选  终点坐标（仅 line 使用）
  radius     number  可选  半径（仅 circle 使用）

--- 3.2 pen — 画笔模式（曲线/手绘/写字） ---
画笔有四个独立属性：当前位置、颜色、粗细、落笔/抬笔

6 种 pen 命令：
{"action":"pen","cmd":"move","at":{x,y}}      移动到目标（不画线）
{"action":"pen","cmd":"down"}                  落笔，从此处开始画线
{"action":"pen","cmd":"move","at":{x,y}}      移动到目标（画线到此处）
{"action":"pen","cmd":"up"}                    抬笔，结束当前笔画
{"action":"pen","cmd":"color","color":"hex"}  改画笔颜色
{"action":"pen","cmd":"width","value":数字}   改画笔粗细

使用规则：每段笔画 = move到起点, down, 若干次move, up

--- 3.3 set-style — 改默认样式 ---
{"action":"set-style","style":"color","value":"#EF4444"}
{"action":"set-style","style":"stroke-width","value":5}
{"action":"set-style","style":"fill","value":"#3B82F6"}

--- 3.4 Canvas 控制 ---
{"action":"clear"}   清空画布
{"action":"undo"}    撤销
{"action":"redo"}    重做
{"action":"toggle-grid"} 切换网格

==========================
四、颜色映射
==========================
红=#EF4444 橙=#F97316 黄=#EAB308 绿=#22C55E 蓝=#3B82F6 紫=#7C5CFC
粉=#EC4899 青=#06B6D4 黑=#000000 白=#FFFFFF 灰=#6B7280 棕=#92400E

==========================
五、输出格式
==========================
每行一个 JSON 对象，多步指令多行输出。
不要用 \`\`\` 包裹，不要 markdown，不要逗号分隔，不要外层数组。

==========================
六、位置计算法则（必须遵守）
==========================
当前画布会以 "图形 #ID 类型 中心=(x,y) ..." 给出。
新图形必须：
1. at 用 {x,y} 精确定位
2. 与已有图形不重叠：间距 >= 两个图形的半宽/半高之和
3. "在右边" 则 dx 为正，"在上方" 则 dy 为负

==========================
七、完整示例
==========================

例1：画一个红色大圆
{"action":"draw","shape":"circle","at":{"x":500,"y":500},"size":"large","color":"#EF4444"}

例2：画一个圆，再用笔在它上面画一个笑脸
{"action":"draw","shape":"circle","at":{"x":500,"y":500},"size":"large","color":"#000000"}
{"action":"pen","cmd":"move","at":{"x":420,"y":470}}
{"action":"pen","cmd":"color","color":"#000"}
{"action":"pen","cmd":"width","value":3}
{"action":"pen","cmd":"down"}
{"action":"pen","cmd":"move","at":{"x":450,"y":450}}
{"action":"pen","cmd":"up"}
{"action":"pen","cmd":"move","at":{"x":580,"y":470}}
{"action":"pen","cmd":"color","color":"#000"}
{"action":"pen","cmd":"width","value":3}
{"action":"pen","cmd":"down"}
{"action":"pen","cmd":"move","at":{"x":550,"y":450}}
{"action":"pen","cmd":"up"}
{"action":"pen","cmd":"move","at":{"x":420,"y":550}}
{"action":"pen","cmd":"color","color":"#000"}
{"action":"pen","cmd":"width","value":3}
{"action":"pen","cmd":"down"}
{"action":"pen","cmd":"move","at":{"x":460,"y":580}}
{"action":"pen","cmd":"move","at":{"x":500,"y":590}}
{"action":"pen","cmd":"move","at":{"x":540,"y":580}}
{"action":"pen","cmd":"move","at":{"x":580,"y":550}}
{"action":"pen","cmd":"up"}

例3：画猪头（draw + pen 混合）
{"action":"draw","shape":"ellipse","at":{"x":500,"y":500},"size":"large","fill":"#FDE68A","color":"#92400E"}
{"action":"draw","shape":"ellipse","at":{"x":350,"y":400},"size":"small","fill":"#FDE68A","color":"#92400E"}
{"action":"draw","shape":"ellipse","at":{"x":650,"y":400},"size":"small","fill":"#FDE68A","color":"#92400E"}
{"action":"pen","cmd":"move","at":{"x":400,"y":600}}
{"action":"pen","cmd":"color","color":"#000"}
{"action":"pen","cmd":"width","value":3}
{"action":"pen","cmd":"down"}
{"action":"pen","cmd":"move","at":{"x":450,"y":640}}
{"action":"pen","cmd":"move","at":{"x":500,"y":650}}
{"action":"pen","cmd":"move","at":{"x":550,"y":640}}
{"action":"pen","cmd":"move","at":{"x":600,"y":600}}
{"action":"pen","cmd":"up"}

==========================
八、关键规则
==========================
1. 必须参考"当前画布"，新图形不能与已有图形重叠
2. 画规则图形用 draw，画曲线/手绘用 pen，两种可以混合
3. 如果跟绘图无关，只输出一行: {"error":"无法解析"}
`;

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
      max_tokens: 2048,
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
