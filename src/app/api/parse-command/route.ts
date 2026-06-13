import { NextResponse } from "next/server";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_URL = "https://api.deepseek.com";

const SYSTEM_PROMPT = `你是一个语音绘图指令解析器。用户用中文语音描述绘图操作，你需要输出严格 JSON。

## 输出格式

{
  "instructions": [
    {
      "action": "draw",
      "shape": "circle" | "rectangle" | "line" | "ellipse" | "triangle",
      "at": "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" | {"x": 0-1000, "y": 0-1000} | {"relativeTo": "last", "dx": 0-1000, "dy": 0-1000},
      "to": 同上（仅 line 类型需要）,
      "color": "#EF4444",
      "fill": "#EF4444",
      "size": "small" | "medium" | "large",
      "width": 0-1000,
      "height": 0-1000,
      "radius": 0-1000,
      "strokeWidth": 0-100
    }
  ]
}

## 字段说明
- action: 固定 "draw"
- shape: 必填。circle=圆, rectangle=方/矩形, line=线/直线, ellipse=椭圆, triangle=三角
- at: 位置，未指定默认 "center" (x:500, y:500)
- color: 描边色（hex），未指定不填
- fill: 填充色（hex），未指定不填
- size: small=100, medium=200, large=400，未指定默认 medium
- strokeWidth: 线条粗细，未指定不填

## 颜色映射
红=#EF4444 黄=#EAB308 蓝=#3B82F6 绿=#22C55E 紫=#7C5CFC 黑=#000000
白=#FFFFFF 橙=#F97316 粉=#EC4899 青=#06B6D4 灰=#6B7280 棕=#92400E

## 关键规则
- 输出必须是合法 JSON，不要用 \`\`\`json 包裹，不要任何解释文字
- 多步指令按顺序放到 instructions 数组
- "画个圈"="画圆" → circle / "画方"="画块"="画矩形" → rectangle
- 位置用九宫格：左边=center-left, 右边=center-right, 上面=top-center, 下面=bottom-center, 左上=top-left, 右上=top-right, 左下=bottom-left, 右下=bottom-right
- "在xxx右边/左边" → 用 relativeTo
- 如果用户输入不是绘图指令，返回 {"error":"无法解析"}
- 如果指令不完整但有图形，尽可能补全默认值

## 示例

输入："画一个红色大圆"
输出：{"instructions":[{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"}]}

输入："在右边画一个蓝色小方块"
输出：{"instructions":[{"action":"draw","shape":"rectangle","color":"#3B82F6","size":"small","at":{"relativeTo":"last","dx":200,"dy":0}}]}

输入："画一个红色大圆，然后在它右边画一个蓝色方块"
输出：{"instructions":[{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"},{"action":"draw","shape":"rectangle","color":"#3B82F6","size":"medium","at":{"relativeTo":"last","dx":200,"dy":0}}]}

输入："画一条从上到下的绿色直线"
输出：{"instructions":[{"action":"draw","shape":"line","color":"#22C55E","at":"top-center","to":"bottom-center"}]}

输入："你好今天天气怎么样"
输出：{"error":"无法解析"}`;

export async function POST(request: Request) {
  if (!DEEPSEEK_API_KEY) {
    return NextResponse.json(
      { error: "未配置 DEEPSEEK_API_KEY" },
      { status: 500 }
    );
  }

  try {
    const { text } = (await request.json()) as { text: string };
    console.log(`[LLM API] 收到请求 | text:"${text}"`);

    const response = await fetch(DEEPSEEK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek-v4-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    // 读原始文本做详细日志
    const rawText = await response.text();
    console.log(
      `[LLM API] HTTP ${response.status} | body(${rawText.length} chars):`,
      rawText.slice(0, 800)
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `DeepSeek HTTP ${response.status}` },
        { status: 502 }
      );
    }

    // 解析 DeepSeek 外层 JSON
    let data: { choices?: { message?: { content?: string } }[] };
    try {
      data = JSON.parse(rawText);
    } catch {
      console.error("[LLM API] DeepSeek 外层不是 JSON:", rawText.slice(0, 500));
      return NextResponse.json(
        { error: "DeepSeek 返回非 JSON 格式" },
        { status: 502 }
      );
    }

    // 检查 choices
    if (!data.choices?.length) {
      console.error(
        "[LLM API] choices 为空:",
        JSON.stringify(data).slice(0, 500)
      );
      return NextResponse.json(
        { error: "DeepSeek 返回空 choices" },
        { status: 502 }
      );
    }

    const content = data.choices[0]?.message?.content?.trim() || "";
    if (!content) {
      console.error(
        "[LLM API] content 为空，完整 choice:",
        JSON.stringify(data.choices[0]).slice(0, 500)
      );
      return NextResponse.json(
        { error: "DeepSeek 返回空内容" },
        { status: 502 }
      );
    }

    // 清理 markdown 包裹
    let jsonStr = content;
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```\w*\n?/, "").replace(/\n?```$/, "");
    }

    // 解析内层 JSON
    let parsed: { instructions?: unknown[]; error?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error(
        "[LLM API] 内层 JSON 解析失败，原始内容:",
        content.slice(0, 500)
      );
      return NextResponse.json(
        { error: "DeepSeek 输出非 JSON" },
        { status: 502 }
      );
    }

    if (parsed.error) {
      console.log(`[LLM API] 模型判定无法解析: "${parsed.error}"`);
      return NextResponse.json({ error: parsed.error, instructions: [] });
    }

    if (!Array.isArray(parsed.instructions)) {
      console.error(
        "[LLM API] instructions 不是数组:",
        JSON.stringify(parsed).slice(0, 300)
      );
      return NextResponse.json({ error: "输出格式错误" }, { status: 502 });
    }

    console.log(`[LLM API] 成功返回 ${parsed.instructions.length} 条指令`);
    return NextResponse.json({ instructions: parsed.instructions });
  } catch (err) {
    console.error("[LLM API] 未捕获异常:", err);
    return NextResponse.json(
      { error: `服务异常: ${String(err)}`, instructions: [] },
      { status: 500 }
    );
  }
}
