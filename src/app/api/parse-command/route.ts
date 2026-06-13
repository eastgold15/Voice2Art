import { NextResponse } from "next/server";
import OpenAI from "openai";

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";

const openai = new OpenAI({
  apiKey: DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

const SYSTEM_PROMPT = `你是一个语音绘图指令解析器。将用户的中文语音指令解析为JSON格式。

## 核心规则
1. 只输出标准JSON，不要有任何额外文字
2. 必须包含 "instructions" 数组
3. 每个指令必须包含 "action" 和 "shape"
4. 识别不了的内容直接忽略，不要猜测

## JSON Schema
{
  "instructions": [
    {
      "action": "draw",           // 必填，固定值
      "shape": string,            // 必填: circle, rectangle, line, ellipse, triangle
      "at": string | object,      // 位置，默认 "center"
      "to": string | object,      // 仅line类型需要，终点位置
      "color": string,            // 描边色，hex格式
      "fill": string,             // 填充色，hex格式  
      "size": string,             // small/medium/large，默认 medium
      "width": number,            // 0-1000
      "height": number,           // 0-1000
      "radius": number,           // 0-1000，仅circle
      "strokeWidth": number       // 0-100
    }
  ]
}

## 位置格式（优先级从高到低）

// 1. 相对位置（用于多指令）
{"relativeTo": "last", "dx": 200, "dy": 0}

// 2. 绝对坐标
{"x": 500, "y": 500}

// 3. 预设位置（字符串）
"top-left", "top-center", "top-right",
"center-left", "center", "center-right", 
"bottom-left", "bottom-center", "bottom-right"

## 颜色映射表（严格使用）
红色 → "#EF4444"
黄色 → "#EAB308"  
蓝色 → "#3B82F6"
绿色 → "#22C55E"
紫色 → "#8B5CF6"
黑色 → "#000000"
白色 → "#FFFFFF"
橙色 → "#F97316"
粉色 → "#EC4899"
青色 → "#06B6D4"
灰色 → "#6B7280"
棕色 → "#92400E"

## 尺寸映射
small → 半径/边长 100px
medium → 半径/边长 200px  
large → 半径/边长 400px

## 位置关键词映射
左边 → "center-left"
右边 → "center-right"
上边/顶部 → "top-center"
下边/底部 → "bottom-center"
左上 → "top-left"
右上 → "top-right"
左下 → "bottom-left"
右下 → "bottom-right"
中间/中心 → "center"

## 示例

用户: "画一个红色的大圆"
输出: {"instructions":[{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"}]}

用户: "画个蓝色小方框在右边"
输出: {"instructions":[{"action":"draw","shape":"rectangle","color":"#3B82F6","size":"small","at":"center-right"}]}

用户: "先画个绿色的圆，然后在它右边画个黄色的方框"
输出: {"instructions":[{"action":"draw","shape":"circle","color":"#22C55E","size":"medium","at":"center"},{"action":"draw","shape":"rectangle","color":"#EAB308","size":"medium","at":{"relativeTo":"last","dx":250,"dy":0}}]}

用户: "从上到下画一条绿色直线"
输出: {"instructions":[{"action":"draw","shape":"line","color":"#22C55E","at":"top-center","to":"bottom-center"}]}

用户: "在左上角画个紫色三角形"
输出: {"instructions":[{"action":"draw","shape":"triangle","color":"#8B5CF6","size":"medium","at":"top-left"}]}

## 特殊处理
- 没指定颜色 → 不输出color字段
- 没指定位置 → 使用 "center"
- 没指定大小 → 使用 "medium"  
- 多个动作 → 拆分成多个指令，使用relativeTo建立关联
- line类型必须有at和to
- circle优先使用radius，如果没指定就用size
`;

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

    const completion = await openai.chat.completions.create({
      model: "deepseek-v4-flash",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1024,
      stream: false,
    });

    const content = completion.choices[0]?.message?.content?.trim() || "";
    console.log(
      `[LLM API] content(${content.length} chars):`,
      content.slice(0, 500)
    );

    if (!content) {
      console.error(
        "[LLM API] DeepSeek 返回空 content（已知 JSON Output 偶发问题）"
      );
      return NextResponse.json(
        { error: "模型返回空，请重试", instructions: [] },
        { status: 502 }
      );
    }

    // response_format: json_object 保证输出是合法 JSON
    const parsed = JSON.parse(content) as {
      instructions?: unknown[];
      error?: string;
    };

    if (parsed.error) {
      console.log(`[LLM API] 模型判定不可解析: "${parsed.error}"`);
      return NextResponse.json({ error: parsed.error, instructions: [] });
    }

    if (!Array.isArray(parsed.instructions)) {
      console.error(
        "[LLM API] instructions 非数组:",
        JSON.stringify(parsed).slice(0, 200)
      );
      return NextResponse.json({ error: "输出格式错误" }, { status: 502 });
    }

    console.log(`[LLM API] 成功，${parsed.instructions.length} 条指令`);
    return NextResponse.json({ instructions: parsed.instructions });
  } catch (err) {
    console.error("[LLM API] 异常:", err);
    return NextResponse.json(
      { error: `服务异常: ${String(err)}`, instructions: [] },
      { status: 500 }
    );
  }
}
