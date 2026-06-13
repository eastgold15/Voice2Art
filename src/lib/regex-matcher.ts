import type {
  CanvasControl,
  DrawShape,
  Location,
  SetStyle,
  ShapeKind,
  Size,
} from "@/types/drawing";

// ===================== 映射表 =====================

const COLOR_MAP: Record<string, string> = {
  红: "#EF4444",
  黄: "#EAB308",
  蓝: "#3B82F6",
  绿: "#22C55E",
  紫: "#7C5CFC",
  黑: "#000000",
  白: "#FFFFFF",
  橙: "#F97316",
  粉: "#EC4899",
  青: "#06B6D4",
  灰: "#6B7280",
  棕: "#92400E",
};

const SIZE_MAP_REGEX: Record<string, Size> = {
  大: "large",
  中: "medium",
  小: "small",
};

const _SHAPE_MAP: Record<string, ShapeKind> = {
  圆: "circle",
  圈: "circle",
  圆形: "circle",
  大圆: "circle",
  小圆: "circle",
  正方: "rectangle",
  长方: "rectangle",
  方框: "rectangle",
  矩形: "rectangle",
  方块: "rectangle",
  直线: "line",
  线: "line",
  线条: "line",
  三角: "triangle",
  三角形: "triangle",
  // 椭圆用独立正则匹配
};

const POSITION_MAP: Record<string, Location> = {
  左边: "center-left",
  右边: "center-right",
  上面: "top-center",
  下面: "bottom-center",
  中间: "center",
  中心: "center",
  左上: "top-left",
  右上: "top-right",
  左下: "bottom-left",
  右下: "bottom-right",
};

// ===================== 结果类型 =====================

export type RegexResult =
  | { type: "draw"; instructions: DrawShape[]; rawText: string }
  | { type: "style"; instruction: SetStyle; rawText: string }
  | { type: "action"; instruction: CanvasControl; rawText: string };

// ===================== 工具函数 =====================

function extractColor(text: string): string | undefined {
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    if (text.includes(name)) {
      return hex;
    }
  }
  return;
}

function extractSize(text: string): Size | undefined {
  for (const [name, size] of Object.entries(SIZE_MAP_REGEX)) {
    if (text.includes(name)) {
      return size;
    }
  }
  return;
}

function extractPosition(text: string): Location | undefined {
  for (const [name, loc] of Object.entries(POSITION_MAP)) {
    if (text.includes(name)) {
      return loc;
    }
  }
  return;
}

function extractStrokeWidth(text: string): number | undefined {
  const m = text.match(/粗细?s?(\d{1,2})/);
  if (m) {
    return Number.parseInt(m[1], 10);
  }
  return;
}

// ===================== 正则规则 =====================

interface Rule {
  handler: (text: string, match: RegExpMatchArray) => RegexResult | null;
  pattern: RegExp;
}

const rules: Rule[] = [
  // --- 画图形 ---

  // 椭圆（必须在"圆"之前，避免"椭圆"被"圆"匹配）
  {
    pattern: /画(?:.*?)(椭圆)/,
    handler: (text) => ({
      type: "draw",
      instructions: [
        {
          action: "draw",
          shape: "ellipse",
          color: extractColor(text),
          size: extractSize(text),
          at: extractPosition(text),
        },
      ],
      rawText: text,
    }),
  },
  // 圆形
  {
    pattern: /画(?:.*?)(大圆|小圆|圆|圈|圆形)/,
    handler: (text) => ({
      type: "draw",
      instructions: [
        {
          action: "draw",
          shape: "circle",
          color: extractColor(text),
          size: extractSize(text),
          at: extractPosition(text),
        },
      ],
      rawText: text,
    }),
  },
  // 矩形
  {
    pattern: /画(?:.*?)(正方|长方|方框|矩形|方块)/,
    handler: (text) => ({
      type: "draw",
      instructions: [
        {
          action: "draw",
          shape: "rectangle",
          color: extractColor(text),
          size: extractSize(text),
          at: extractPosition(text),
        },
      ],
      rawText: text,
    }),
  },
  // 三角形
  {
    pattern: /画(?:.*?)(三角|三角形)/,
    handler: (text) => ({
      type: "draw",
      instructions: [
        {
          action: "draw",
          shape: "triangle",
          color: extractColor(text),
          size: extractSize(text),
          at: extractPosition(text),
        },
      ],
      rawText: text,
    }),
  },
  // 直线
  {
    pattern: /画(?:.*?)(直线|线|线条)/,
    handler: (text) => ({
      type: "draw",
      instructions: [
        {
          action: "draw",
          shape: "line",
          color: extractColor(text),
          size: extractSize(text),
          at: extractPosition(text),
        },
      ],
      rawText: text,
    }),
  },

  // --- 样式指令（不画图，只改当前样式）---

  // 填充色
  {
    pattern: /填充(红|黄|蓝|绿|紫|黑|白|橙|粉|青|灰|棕)/,
    handler: (text, match) => ({
      type: "style",
      instruction: {
        action: "set-style",
        style: "fill",
        value: COLOR_MAP[match[1]] ?? "#000000",
      },
      rawText: text,
    }),
  },
  // 颜色切换
  {
    pattern:
      /^(?:改成?|用|换成?)?(红|黄|蓝|绿|紫|黑|白|橙|粉|青|灰|棕)(?:色|颜色)?$/,
    handler: (text, match) => ({
      type: "style",
      instruction: {
        action: "set-style",
        style: "color",
        value: COLOR_MAP[match[1]] ?? "#000000",
      },
      rawText: text,
    }),
  },
  // 粗细切换
  {
    pattern: /(?:笔画|线条)?粗细s?(\d{1,2})/,
    handler: (text, match) => {
      const sw = extractStrokeWidth(text);
      if (sw === undefined) {
        return null;
      }
      return {
        type: "style",
        instruction: {
          action: "set-style",
          style: "stroke-width",
          value: sw,
        },
        rawText: text,
      };
    },
  },

  // --- 画布控制 ---

  // 清空
  {
    pattern: /清空|清除|删除所有|全部删掉|清屏/,
    handler: (text) => ({
      type: "action",
      instruction: { action: "clear" },
      rawText: text,
    }),
  },
  // 撤销
  {
    pattern: /撤销|回退|上一步|取消/,
    handler: (text) => ({
      type: "action",
      instruction: { action: "undo" },
      rawText: text,
    }),
  },
  // 重做
  {
    pattern: /重做|恢复|下一步/,
    handler: (text) => ({
      type: "action",
      instruction: { action: "redo" },
      rawText: text,
    }),
  },
];

// ===================== 主入口 =====================

// 所有图形关键词（用于多步检测）
const ALL_SHAPE_KEYS =
  /大圆|小圆|圆|圈|圆形|正方|长方|方框|矩形|方块|直线|线|线条|三角|三角形|椭圆/g;

export function matchCommand(text: string): RegexResult | null {
  const cleaned = text.trim();

  // 预检：画图类指令含多步特征 → 跳过正则交给 LLM
  // 样式（"红色"）和动作（"清空"）不走预检
  if (/^画/.test(cleaned)) {
    const shapeHits = [...cleaned.matchAll(ALL_SHAPE_KEYS)].length;
    const drawHits = (cleaned.match(/画/g) || []).length;
    if (drawHits >= 2 || shapeHits >= 2) {
      console.log(
        `[Router] 多步画图 ⏩ | draw:${drawHits} shape:${shapeHits} → 降级 LLM`
      );
      return null;
    }
  }

  for (const rule of rules) {
    const match = cleaned.match(rule.pattern);
    if (match?.[0]) {
      const result = rule.handler(cleaned, match);
      console.log(
        `[Router] 正则匹配 ✅ | 输入:"${cleaned}" | 规则:${rule.pattern.source.slice(0, 50)} | 类型:${result.type}`
      );
      return result;
    }
  }

  console.log(`[Router] 正则未匹配 ❌ | 输入:"${cleaned}" → 降级到 LLM`);
  return null;
}
