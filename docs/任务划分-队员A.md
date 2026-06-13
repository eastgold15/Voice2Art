# 队员 A 任务清单

> 语音交互 + LLM 集成
> 按顺序一个个做，做完一个勾一个，提一次 PR

---

## 第一阶段：PR1 — 麦克风 + Web Speech API 基础封装

**依赖：** PR0（项目初始化）已完成
**目标：** 浏览器请求麦克风权限，说话能在 console 看到识别文本
**分支名：** `feat/a-voice`

### □ 1.1 创建语音识别服务

建文件 `src/lib/speech-recognition.ts`：

```typescript
// Web Speech API 基础封装
// 使用浏览器原生的 SpeechRecognition
// 封装 start / stop / onResult / onError

export type SpeechEvent = {
  type: 'interim' | 'final';
  text: string;
};

export type SpeechError = {
  message: string;
  error?: string; // SpeechRecognitionErrorCode
};

export interface SpeechService {
  start(): void;
  stop(): void;
  onResult: ((event: SpeechEvent) => void) | null;
  onError: ((error: SpeechError) => void) | null;
  onEnd: (() => void) | null;
  isListening: boolean;
}
```

实现要点：
- 检查 `window.SpeechRecognition` 或 `window.webkitSpeechRecognition`
- 设置 `continuous: true`、`interimResults: true`、`lang: 'zh-CN'`
- 识别文本变化时调用 `onResult`（interim 用于实时显示，final 用于最终结果）
- 识别出错时调用 `onError`（如无麦克风权限、网络错误）
- 识别结束时自动重启（保持持续监听）
- export 单例 `speechService`

验收：`speechService.start()` 后浏览器弹出麦克风权限，说话能在 console 看到识别文本

### □ 1.2 创建语音控制 Hook

建文件 `src/hooks/use-voice.ts`（如无 `hooks` 目录则创建）：

```typescript
'use client';
// 在 React 组件中连接 speechService 与 Zustand store
// 返回：{ isListening, startListening, stopListening, interimText, error }

export function useVoice() {
  // 监听 speechService 的 onResult 事件
  // 更新 store.isListening
  // final 结果先 console.log，后续 PR3 连接指令路由
  // interim 结果存本地 state（用于 StatusBar 实时显示）
  // error 时通过 sonner toast 提示
}
```

### □ 1.3 在 StatusBar 连接语音识别

已有 `src/components/layout/voice-wave-indicator.tsx`，当前只展示静态状态。

修改底部工具栏或新建语音控制区域，包含：
- 麦克风按钮（点击切换开始/停止监听）
- 实时识别文本显示区域（读取 `interimText`）

**⚠️ 注意：** 已有 BottomToolbar 中有 `VoiceWaveIndicator`，你可以：
1. 修改 `BottomToolbar` 增加"开始/停止" 按钮
2. 或创建一个独立的语音控制栏组件 `VoiceControlBar` 放在 Canvas 和底部工具栏之间

任选一种，保持与现有 UI 风格一致。

### □ 1.4 验证

1. `npm run dev` 启动
2. 点击麦克风按钮 → 浏览器弹出麦克风权限请求
3. 允许后，对着麦克风说"你好" → console 显示识别文本
4. 再次点击麦克风按钮 → 停止监听
5. 无麦克风或权限被拒 → Toast 提示

> 💡 提 PR 模板里勾选 `[PR1]`，标题 `[PR1] feat: 实现 Web Speech API 语音识别基础封装`

---

## 第二阶段：PR3 — 正则匹配基础图形指令

**依赖：** PR1 已合并到 main
**目标：** 语音说"画直线"后对应图形出现在画布
**分支名：** `feat/a-command-parser`

### □ 3.1 了解已定义的类型（队员 B 在 PR6 已创建）

**`src/types/drawing.ts` 已由队员 B 在 PR6 创建**，定义了完整的 JSON 指令类型体系。你不需要重新定义类型，直接 import 使用即可。

核心类型速览：

```typescript
// 坐标（抽象 0-1000）
export interface Position { x: number; y: number; }

// 位置指定（九宫格 | 坐标 | 相对定位）
export type Location =
  | "top-left" | "top-center" | "top-right"
  | "center-left" | "center" | "center-right"
  | "bottom-left" | "bottom-center" | "bottom-right"
  | Position
  | { relativeTo: "last"; dx: number; dy: number };

// 形状类型
export type ShapeKind = "rectangle" | "circle" | "line" | "ellipse" | "triangle";

// 尺寸
export type Size = "small" | "medium" | "large";

// ---- 三个核心指令类型（action 区分）----

// 画图形
export interface DrawShape {
  action: "draw";
  shape: ShapeKind;           // 必填
  at?: Location;              // 起点，默认居中
  to?: Location;              // 终点（仅 line）
  color?: string;             // 描边色
  fill?: string;              // 填充色
  size?: Size;                // 预设尺寸
  width?: number;             // 精确宽（覆盖 size）
  height?: number;            // 精确高（覆盖 size）
  radius?: number;            // circle 专用
  strokeWidth?: number;
}

// 改样式（不画图，改后续默认值）
export interface SetStyle {
  action: "set-style";
  style: "color" | "stroke-width" | "fill";
  value: string | number;
}

// 画布控制
export interface CanvasControl {
  action: "clear" | "undo" | "redo" | "toggle-grid";
}

// 顶层联合类型
export type Instruction = DrawShape | SetStyle | CanvasControl;

// 内置映射表
export const ANCHOR_MAP: Record<string, Position>; // 九宫格 → 坐标
export const SIZE_MAP: Record<Size, number>;        // small→100, medium→200, large→400
```

> ⚠️ 你的正则匹配器/LLM 解析器的输出应该是 `DrawShape[]`（画图形）、`SetStyle`（改样式）、`CanvasControl`（画布操作）这三种类型。

### □ 3.2 创建正则匹配器

建文件 `src/lib/regex-matcher.ts`：

```typescript
// 正则匹配规则
// 将语音文本 → DrawShape[] | SetStyle | CanvasControl

import type { DrawShape, SetStyle, CanvasControl, ShapeKind, Size } from '@/types/drawing';

export type RegexResult =
  | { type: 'draw'; instructions: DrawShape[]; rawText: string }
  | { type: 'style'; instruction: SetStyle; rawText: string }
  | { type: 'action'; instruction: CanvasControl; rawText: string };

// 正则规则（按优先级排序）：
// 1. 画圆形： /画(.*?)(大圆|小圆|圆|圈|圆形)/
//    → { action: "draw", shape: "circle", ... }
// 2. 画矩形： /画(.*?)(正方|长方|方框|矩形|方块)/
//    → { action: "draw", shape: "rectangle", ... }
// 3. 画直线： /画(.*?)(直线|线|线条)/
//    → { action: "draw", shape: "line", ... }
// 4. 画三角形： /画(.*?)(三角|三角形)/
//    → { action: "draw", shape: "triangle", ... }
// 5. 画椭圆： /画(.*?)(椭[圆]|椭圆)/
//    → { action: "draw", shape: "ellipse", ... }
// 6. 提取颜色： /(红|黄|蓝|绿|紫|黑|白|橙|粉|青|灰|棕)/
//    → 填入 color 字段
// 7. 提取尺寸： /(大|中|小)/
//    → 填入 size 字段（大→"large", 中→"medium", 小→"small"）
// 8. 位置关系： /(左边|右边|上面|下面|中间|中心)/
//    → 填入 at 字段（使用 Location 的九宫格值或相对定位）

export function matchCommand(text: string): RegexResult | null {
  // 遍历规则，第一个匹配的返回
  // 颜色映射：红→#EF4444, 蓝→#3B82F6, ...
  // 输出 DrawShape 对象，action 固定为 "draw"
}
```

颜色映射表：
```typescript
const COLOR_MAP: Record<string, string> = {
  '红': '#EF4444', '黄': '#EAB308', '蓝': '#3B82F6',
  '绿': '#22C55E', '紫': '#7C5CFC', '黑': '#000000',
  '白': '#FFFFFF', '橙': '#F97316', '粉': '#EC4899',
  '青': '#06B6D4', '灰': '#6B7280', '棕': '#92400E',
};
```

### □ 3.3 创建指令路由器

建文件 `src/lib/command-router.ts`：

```typescript
// 指令路由：先走正则 → 匹配失败再走 LLM（PR5 实现）
// 当前阶段仅实现正则路径

import { matchCommand } from './regex-matcher';
import type { DrawShape, SetStyle, CanvasControl } from '@/types/drawing';
// import { parseWithLLM } from './llm-parser';  // PR5 再解开

export type RouteResult =
  | { type: 'draw'; instructions: DrawShape[]; rawText: string }
  | { type: 'style'; instruction: SetStyle; rawText: string }
  | { type: 'action'; instruction: CanvasControl; rawText: string };

export function routeCommand(text: string): RouteResult | null {
  const result = matchCommand(text);
  if (!result) return null;
  return result;
  // 后续 PR5 在 matchCommand 返回 null 时走 LLM
}
```

### □ 3.4 在 use-voice Hook 集成指令路由

修改 `src/hooks/use-voice.ts`：

当收到 `final` 识别结果时：
1. 调用 `routeCommand(text)`
2. 如果有匹配 → 按类型分发处理（draw / style / action）
3. 如果无匹配 → 用 sonner Toast 提示"无法识别的指令，请重说"

```typescript
// 伪代码
if (event.type === 'final') {
  const result = routeCommand(event.text);
  if (result) {
    const store = useDrawingStore.getState();
    store.recordCommand(event.text);
    switch (result.type) {
      case 'draw':
        for (const shape of result.instructions) {
          store.addShape(shape); // shape 本身就是 DrawShape，store 直接消费
        }
        break;
      case 'style':
        store.applyStyle(result.instruction); // SetStyle
        break;
      case 'action':
        store.executeAction(result.instruction); // CanvasControl
        break;
    }
  } else {
    toast.error('无法识别的指令，请尝试说"画红色大圆"');
  }
}
```

### □ 3.5 验证

1. 说"画圆" → 画布上出现一个黑色圆形（默认颜色）
2. 说"画红色直线" → 画布上出现红色直线
3. 说"画方块" → 画布上出现矩形
4. 说"画个蓝色的圈" → 画布上出现蓝色圆形
5. 说"你好" → Toast 提示无法识别

> 💡 提 PR 标题：`[PR3] feat: 实现正则匹配基础图形指令`

---

## 第三阶段：PR4 — 样式指令（正则匹配）

**依赖：** PR3 已合并到 main
**目标：** 语音说"红色"后后续图形变红，说"清空"画布清空
**分支名：** `feat/a-style-commands`（或合并到 PR3 分支一起提）

### □ 4.1 扩展 regex-matcher，增加样式/动作指令

在 `regex-matcher.ts` 中追加规则，输出 `SetStyle` 或 `CanvasControl`：

**颜色切换（不画图，只改 currentColor）→ SetStyle：**
```
/^(?:改成?|用|换[成]?)?(红|黄|蓝|绿|紫|黑|白|橙|粉|青|灰|棕)(?:色|颜色)?$/
```
→ 返回 `{ type: 'style', instruction: { action: "set-style", style: "color", value: "#EF4444" } }`

**粗细切换 → SetStyle：**
```
/粗细?(\d{1,2})/
/笔画?粗细?(\d{1,2})/
/线条?粗细?(\d{1,2})/
```
→ 返回 `{ type: 'style', instruction: { action: "set-style", style: "stroke-width", value: 5 } }`

**填充色切换 → SetStyle：**
```
/填充(红|黄|蓝|绿|紫|黑|白|橙|粉|青|灰|棕)/
```
→ 返回 `{ type: 'style', instruction: { action: "set-style", style: "fill", value: "#EF4444" } }`

**清空画布 → CanvasControl：**
```
/清空|清除|删除所有|全部删掉|清屏/
```
→ 返回 `{ type: 'action', instruction: { action: "clear" } }`

**撤销 → CanvasControl：**
```
/撤销|回退|上一步|取消/
```
→ 返回 `{ type: 'action', instruction: { action: "undo" } }`

**重做 → CanvasControl：**
```
/重做|恢复|下一步/
```
→ 返回 `{ type: 'action', instruction: { action: "redo" } }`

### □ 4.2 扩展路由以支持样式/动作指令

修改 `command-router.ts`，对三种 result.type 分别透传：

```typescript
export function routeCommand(text: string): RouteResult | null {
  const result = matchCommand(text);
  if (!result) return null;

  switch (result.type) {
    case 'draw':
      return { type: 'draw', instructions: result.instructions, rawText: text };
    case 'style':
      return { type: 'style', instruction: result.instruction, rawText: text };
    case 'action':
      return { type: 'action', instruction: result.instruction, rawText: text };
  }
}
```

### □ 4.3 在 Hook 中处理样式/动作指令

修改 `use-voice.ts`，根据路由结果类型分发：

```typescript
const result = routeCommand(event.text);
if (!result) { toast.error('无法识别'); return; }

store.recordCommand(event.text);

switch (result.type) {
  case 'draw':
    for (const shape of result.instructions) {
      store.addShape(shape);
    }
    break;
  case 'style':
    // result.instruction 是 SetStyle，直接交给 store
    store.applyStyle(result.instruction);
    break;
  case 'action':
    // result.instruction 是 CanvasControl，直接交给 store
    store.executeAction(result.instruction);
    break;
}
```

### □ 4.4 验证

1. 先说"红色" → 工具栏颜色选中红色（SetStyle: style="color"）
2. "画圆" → 出现红色圆形
3. "粗细5" → 工具栏粗细滑块变到 5（SetStyle: style="stroke-width"）
4. "画直线" → 出现粗细为 5 的红色直线（currentColor + currentStrokeWidth 都被 SetStyle 改过）
5. "清空" → 画布清空（CanvasControl: action="clear"）
6. "画矩形" → 画一个矩形
7. "撤销" → 矩形消失（CanvasControl: action="undo"）

> 💡 提 PR 标题：`[PR4] feat: 实现正则匹配样式指令（颜色/粗细/清空/撤销/重做）`

---

## 第四阶段：PR5 — 🧠 LLM 集成

**依赖：** PR3 已合并到 main
**目标：** 说"画一个红色大圆，在右边画蓝色方块"，系统调用 LLM 返回正确 JSON
**分支名：** `feat/a-llm`

### □ 5.1 创建 LLM 解析器

建文件 `src/lib/llm-parser.ts`：

```typescript
// LLM 解析器：将自然语言指令 → DrawShape[]
// 调用 Vercel Serverless Function

import type { DrawShape } from '@/types/drawing';

export async function parseWithLLM(text: string): Promise<DrawShape[] | null> {
  try {
    const response = await fetch('/api/parse-command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.instructions as DrawShape[];
  } catch (err) {
    console.error('LLM parse error:', err);
    return null;
  }
}
```

### □ 5.2 创建 API Route

建文件 `src/app/api/parse-command/route.ts`：

```typescript
// Vercel Serverless Function
// POST /api/parse-command
// Body: { text: string }
// Response: { instructions: DrawShape[] }

import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `你是一个语音绘图指令解析器。
用户通过语音描述绘图操作，你需要将其解析为 JSON 指令数组。

JSON Schema（DrawShape）:
{
  "action": "draw",
  "shape": "rectangle" | "circle" | "line" | "ellipse" | "triangle",
  "at"?: "top-left" | "top-center" | "top-right" | "center-left" | "center" | "center-right" | "bottom-left" | "bottom-center" | "bottom-right" | { "x": number, "y": number } | { "relativeTo": "last", "dx": number, "dy": number },
  "to"?: 同上（仅 line 使用，指定终点位置）,
  "color"?: "hex颜色值，如 #EF4444",
  "fill"?: "hex颜色值",
  "size"?: "small" | "medium" | "large",
  "width"?: number,
  "height"?: number,
  "radius"?: number（仅 circle）,
  "strokeWidth"?: number
}

注意事项：
- 坐标系为抽象 0-1000，居中为 { "x": 500, "y": 500 }
- "画个圈"、"画圆" → shape: "circle"
- "画方"、"画矩形"、"画方块" → shape: "rectangle"
- "直线"、"画线" → shape: "line"
- "三角" → shape: "triangle"
- "椭圆" → shape: "ellipse"
- 颜色映射：红→#EF4444, 蓝→#3B82F6, 绿→#22C55E, 黄→#EAB308, 紫→#7C5CFC, 黑→#000000, 白→#FFFFFF, 橙→#F97316, 粉→#EC4899, 青→#06B6D4, 灰→#6B7280, 棕→#92400E
- 颜色未指定则不填 color 字段（前端用默认值）
- 多步指令返回数组（按顺序执行）
- 如果指令无法解析，返回 { "error": "无法解析" }
- 只返回 JSON，不要多余文字

示例：
输入："画一个红色大圆"
输出：{"instructions":[{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"}]}

输入："在右边画一个蓝色小方块"
输出：{"instructions":[{"action":"draw","shape":"rectangle","color":"#3B82F6","size":"small","at":{"relativeTo":"last","dx":150,"dy":0}}]}

输入："画一个红色大圆，然后在它右边画一个蓝色方块"
输出：{"instructions":[{"action":"draw","shape":"circle","color":"#EF4444","size":"large","at":"center"},{"action":"draw","shape":"rectangle","color":"#3B82F6","size":"medium","at":{"relativeTo":"last","dx":200,"dy":0}}]}`;

export async function POST(request: Request) {
  const { text } = await request.json();

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: text },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'LLM API error' }, { status: 502 });
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  try {
    const parsed = JSON.parse(content || '{}');
    return NextResponse.json({ instructions: parsed.instructions || [] });
  } catch {
    return NextResponse.json({ error: '解析失败' }, { status: 422 });
  }
}
```

### □ 5.3 添加环境变量

创建 `.env.local`（不要提交到 git）：

```
OPENAI_API_KEY=sk-your-key-here
```

更新 `.env.example` 或 `.env.local.example`（可以提交）：

```
# OpenAI API Key — 用于 LLM 解析复杂语音指令
# 获取地址：https://platform.openai.com/api-keys
OPENAI_API_KEY=
```

### □ 5.4 更新 command-router 启用 LLM 路径

取消 `llm-parser` 的注释，在正则匹配失败时调用 LLM：

```typescript
import type { DrawShape, SetStyle, CanvasControl } from '@/types/drawing';

export async function routeCommand(text: string): Promise<RouteResult | null> {
  // 1. 先尝试正则（快速路径，含样式/动作指令）
  const regexResult = matchCommand(text);
  if (regexResult) {
    return regexResult;
  }

  // 2. 正则匹配失败 → LLM（仅处理复杂画图形表达）
  try {
    const llmResult = await parseWithLLM(text);
    if (llmResult && llmResult.length > 0) {
      return { type: 'draw', instructions: llmResult, rawText: text };
    }
  } catch {
    // LLM 失败，静默降级
  }

  return null;
}
```

### □ 5.5 验证

> 需要先配置 `OPENAI_API_KEY`

1. 说"画一个红色大圆，在右边画蓝色小方块" → 画布依次出现两个图形
2. 说"在圆的左边画一条黄色直线" → 直线出现在圆形左侧
3. 说"画三个绿色的中等大小的正方形排成一行" → 看到三个矩形
4. 说"你好今天天气怎么样" → LLM 返回无法解析 → Toast 提示

> 💡 提 PR 标题：`[PR5] feat: 集成 GPT-4o-mini 实现自然语言 → DrawShape JSON 指令`

---

## 第五阶段：PR7 — 混合模式 + 错误降级 + Toast + 指令回放

**依赖：** PR5（LLM）+ PR4.5（UI 界面）均已合并
**目标：** 简单指令走正则（毫秒），复杂指令走 LLM，无法识别时 Toast，指令历史可点击回放
**分支名：** `feat/a-hybrid`

### □ 7.1 完善混合路由策略

在 `command-router.ts` 中明确三层策略：

```
语音文本
  │
  ├─ ① 正则匹配（毫秒级）
  │   ├─ 基础图形 → DrawShape[]
  │   ├─ 样式指令 → SetStyle
  │   └─ 动作指令 → CanvasControl
  │
  ├─ ② LLM 解析（1-2 秒）— 仅对未匹配的复杂画图指令
  │   └─ DrawShape[]
  │
  └─ ③ 都失败 → Toast "无法识别，
                     请尝试说"画红色大圆"或"在右边画一个蓝色方块""
```

关键：样式/动作指令走正则（需要即时反馈），**不走 LLM**。LLM 仅处理"画图形"类复杂表达。

### □ 7.2 指令历史记录

检查 store 中是否已有 `addCommand` / `recordCommand` 方法。

确保：
- 每次语音指令执行（无论正则还是 LLM）都调用 `recordCommand(text)`
- CommandHistory 组件已展示列表（已有）
- 每条指令显示时间、图形数量（已有）

### □ 7.3 指令历史点击回放

在 `CommandHistory` 组件的"回放"按钮上绑定点击事件：

```typescript
// 在 CommandHistory 组件中，回放按钮点击时重新解析并执行
const handleReplay = async (cmdText: string) => {
  // 重新走一遍指令路由流程
  const result = await routeCommand(cmdText);
  if (!result) return;

  const store = useDrawingStore.getState();
  switch (result.type) {
    case 'draw':
      for (const shape of result.instructions) {
        store.addShape(shape);
      }
      break;
    case 'style':
      store.applyStyle(result.instruction);
      break;
    case 'action':
      store.executeAction(result.instruction);
      break;
  }
};
```

### □ 7.4 Toast 错误提示

已安装 `sonner`（package.json 中有 `sonner: "^2.0.7"`），用 `toast.error()` / `toast.info()`

确保 root layout 已配 `Toaster` 组件，如没有则添加：

```tsx
// src/app/layout.tsx
import { Toaster } from 'sonner';

// 在 <body> 内添加
<Toaster position="top-center" richColors />
```

### □ 7.5 验证

1. "画直线" → 毫秒级响应（正则）
2. "画一个紫色大圆，然后在它下面画两个黄色小方块" → LLM 处理（1-2秒）
3. "红色" → 毫秒级响应（正则，SetStyle）
4. "清空" → 毫秒级响应（CanvasControl）
5. 说无意义的话 → Toast 提示
6. 断开网络说复杂指令 → LLM 失败但正则仍然可用
7. 点击指令历史的回放按钮 → 图形重新绘制
8. 所有指令出现在右侧历史面板

> 💡 提 PR 标题：`[PR7] feat: 实现混合模式（正则+LLM）+ 错误降级 + 指令回放`

---

## 第六阶段：PR8（你的部分）— 设计文档 + 协作打磨

**依赖：** 所有前置 PR 已合并
**目标：** 更新设计文档 + 整理 README + 协助演示
**分支名：** `feat/a-polish`

### □ 8.1 更新设计文档

根据比赛要求，更新 `docs/技术方案.md`，补充：

1. **计划支持的指令清单**（在设计文档中已有的基础上细化）
2. **实际完成的指令清单**（按 PR 汇总）
3. **未完成部分的原因说明**（如有）

格式参考：

```markdown
### 指令支持清单

| 指令类型 | 示例 | 支持情况 | 实现方式 |
|----------|------|----------|----------|
| 画圆形 | "画圆"、"画个圈" → DrawShape(action="draw", shape="circle") | ✅ | 正则 |
| 画矩形 | "画方块"、"画矩形" → DrawShape(action="draw", shape="rectangle") | ✅ | 正则 |
| 画直线 | "画直线" → DrawShape(action="draw", shape="line") | ✅ | 正则 |
| 画三角形 | "画三角" → DrawShape(action="draw", shape="triangle") | ✅ | 正则 |
| 画椭圆 | "画椭圆" → DrawShape(action="draw", shape="ellipse") | ✅ | 正则 |
| 改颜色 | "红色"、"改成蓝色" → SetStyle(style="color") | ✅ | 正则 |
| 改粗细 | "粗细5" → SetStyle(style="stroke-width") | ✅ | 正则 |
| 改填充 | "填充红色" → SetStyle(style="fill") | ✅ | 正则 |
| 清空 | "清空"、"删除所有" → CanvasControl(action="clear") | ✅ | 正则 |
| 撤销 | "撤销"、"回退" → CanvasControl(action="undo") | ✅ | 正则 |
| 重做 | "重做"、"恢复" → CanvasControl(action="redo") | ✅ | 正则 |
| 组合指令 | "画红色大圆，右边画蓝色方块" → DrawShape[] | ✅ | LLM |
| 语义容错 | "画个圈"、"弄个方块" → DrawShape[] | ✅ | LLM |
| 指令回放 | 点击历史记录重新执行 | ✅ | 路由 |
| 导出 PNG | 点击导出按钮 | ❌ | 队员 B 负责 |
```

### □ 8.2 协助录制 Demo 视频

建议 Demo 视频涵盖：
1. 点击麦克风开始监听
2. 说基础指令："画红色直线"、"画蓝色大圆"
3. 说样式指令："粗细10"、"绿色"
4. 说组合指令："画一个红色大圆，然后在右边画三个蓝色小方块"
5. 说"清空"后重画
6. 演示撤销/重做
7. 演示指令历史回放（点击右侧面板的回放按钮）
8. 演示错误降级（说无意义的话 → Toast 提示）

---

## 总结：你的提 PR 节奏

| 顺序 | 分支名 | 做什么 | 主要文件 |
|------|--------|--------|---------|
| ① | `feat/a-voice` | Web Speech API 封装 + Hook | lib/speech-recognition, hooks/use-voice |
| ② | `feat/a-command-parser` | 正则匹配基础图形/样式指令（输出 DrawShape / SetStyle / CanvasControl） | lib/regex-matcher, lib/command-router |
| ③ | `feat/a-llm` | LLM 集成（输出 DrawShape[]） | lib/llm-parser, app/api/parse-command/route.ts, .env.local |
| ④ | `feat/a-hybrid` | 混合模式 + 回放 + 降级 | 修改 command-router + CommandHistory + 加 Toaster |
| ⑤ | `feat/a-polish` | 设计文档 + Demo 协助 | docs/技术方案.md, readme.md |

> **重要提示：**
> 1. 每完成一个阶段，去 GitHub 提 PR → 等 B review → squash merge → 切回 main 拉最新 → 切下一个分支
> 2. PR3 和 PR4 可以合并到一个分支一次提 PR（都是正则匹配），也可以分开提（粒度更细）
> 3. **类型文件 `src/types/drawing.ts` 已由队员 B 在 PR6 创建**，你只需要 import 使用，不要重复定义。核心类型：
>    - `DrawShape` — 画图形（action: "draw"）
>    - `SetStyle` — 改样式（action: "set-style"）
>    - `CanvasControl` — 画布操作（action: "clear" | "undo" | "redo" | "toggle-grid"）
>    - `Location` — 位置（九宫格 / 坐标 / 相对定位）
> 4. LLM 相关代码不要暴露 API Key：API 调用放在 Serverless Function 中，前端只调用 `/api/parse-command`
> 5. 正则匹配器输出的对象必须直接符合 `DrawShape` / `SetStyle` / `CanvasControl` 接口，这样 store 可以直接消费，不需要中间转换层
