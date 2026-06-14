# 🎨 AI 语音绘图工具 — Voice2Art

> **题目二：纯语音控制的绘图工具** — 仅通过麦克风输入自然语言指令完成绘图创作
>
>  2026 七牛云 × XEngineer 暑期实训营 第四期

## 项目简介

用户对着麦克风说话，系统自动识别并绘制图形。支持从简单的"画一条红色直线"到复杂的"画一个红色大圆，然后在右边画一个蓝色方块"等自然语言指令。

**核心能力：**
- 🎤 **纯语音控制** — 无需鼠标或键盘，全程语音操作
- ⚡ **毫秒级响应** — 简单指令走正则快速路径，无需等待 LLM
- 🧠 **复杂指令理解** — LLM 流式解析，多步指令逐条 600ms 延迟绘制
- 🖼️ **实时画布** — react-konva 高性能渲染，所见即所得
- 🖊️ **画笔模式** — 用语音控制虚拟笔画曲线、手绘、写字
- 🧩 **智能定位** — AI 参考画布已有图形自动计算不重叠位置
- ↩️ **撤销/重做/清空** — 完整的历史管理 + 指令回放
- 📐 **坐标网格** — 辅助精准定位的参考网格
- 🌗 **亮色/暗色主题** — 一键切换
- 💾 **导出 PNG** — 一键保存作品



### 👉 点击按钮直接看在线效果
[![Vercel Demo](https://vercel.com/button)](https://voice2-art.vercel.app/)

## [技术方案](./docs/技术方案.md)

## 技术栈

| 层次 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router) + TypeScript (strict) |
| 画布引擎 | react-konva + konva |
| 语音识别 | Web Speech API (SpeechRecognition) |
| 指令解析 | 正则匹配 + DeepSeek API (LLM 流式) |
| 状态管理 | Zustand（快照式撤销/重做） |
| UI 组件 | shadcn/ui + Tailwind CSS v4 |
| 代码规范 | Ultracite (Biome) + Lefthook |
| 包管理器 | Bun |

详细技术方案见 [`docs/技术方案.md`](docs/技术方案.md)。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/eastgold15/Voice2Art.git
cd Voice2Art

# 安装依赖
bun install

# 配置 LLM API Key（可选，不配置则仅正则模式可用）
cp .env.local.example .env.local
# 在 .env.local 中填入 DEEPSEEK_API_KEY

# 启动开发服务器
bun run dev
```

在 Chrome 浏览器中访问 `http://localhost:3000`，允许麦克风权限，开始语音绘图。

> **提示**：Web Speech API 需要 HTTPS 或 localhost 环境。本地开发使用 `localhost` 即可。

## 支持的语音指令

### 画图形

| 指令示例 | 效果 |
|----------|------|
| "画一个圆" / "画个圈" | 居中画圆 |
| "画一个红色大圆" | 指定颜色 + 尺寸的圆 |
| "画一个方块" / "画矩形" | 画矩形 |
| "画一条直线" / "画线" | 画线段 |
| "画一个三角形" | 画三角形 |
| "画一个椭圆" | 画椭圆 |
| "在左上角画一个蓝色小方块" | 指定位置 + 颜色 + 尺寸 |

### 样式控制

| 指令示例 | 效果 |
|----------|------|
| "红色" / "换成蓝色" | 切换当前画笔颜色 |
| "填充红色" | 设置填充色 |
| "粗细5" / "线条粗细3" | 调整笔画粗细 |

### 画布控制

| 指令示例 | 效果 |
|----------|------|
| "清空" / "清屏" | 清空所有图形 |
| "撤销" / "回退" | 撤销上一步 |
| "重做" / "恢复" | 重做已撤销的操作 |

### 复杂指令（LLM 路径）

| 指令示例 | 效果 |
|----------|------|
| "画一个红色大圆，然后在右边画一个蓝色方块" | 多步指令依次绘制 |
| "在中间画一个黄色的大圆当脸，上面两个小圆当眼睛" | 复杂构图 |
| "画一棵树" | 抽象概念 → LLM 拆解为多步指令 |

### 画笔模式（手绘曲线）

| 指令示例 | 效果 |
|----------|------|
| "画一条波浪线从左边到右边" | 控制笔画连续曲线 |
| "在圆上面画一个笑脸" | 形状 + 画笔混合绘制 |
| "画一个猪头" | draw 画脸部 + pen 画嘴巴混合 |

> 画笔模式与形状模式可混合使用：规则图形用 draw（圆/矩形），细节曲线用 pen（笑嘴/胡须/头发）。

## 系统架构

```
用户语音
    │
    ▼
┌─────────────────┐
│  Web Speech API  │   浏览器原生语音识别
│  (SpeechRecog.)  │
└────────┬────────┘
         │ 识别文本
         ▼
┌─────────────────┐
│  指令路由器      │   先正则 → 未命中 → LLM
│  (CommandRouter) │
└────┬──────┬──────┘
     │      │
     ▼      ▼
┌────────┐ ┌──────────────────────────────────┐
│ 正则   │ │ DeepSeek LLM 流式解析               │
│ 匹配器  │ │ → 获取画布上下文 getCanvasContext() │
│ (毫秒) │ │ → 画布状态 + 用户指令 → JSON 指令   │
└────┬───┘ └──────────┬───────────────────────┘
     │                │
     └───────┬────────┘
             ▼ draw / pen / set-style 指令
┌───────────────────────┐
│  Zustand Store         │   executeInstructions()
│  (use-drawing-store)   │   → draw: 生成 Shape
│                        │   → pen: 控制画笔落笔/移动/抬笔
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│  react-konva 画布      │   自动重绘（Line tension 平滑曲线）
└───────────────────────┘
```

### 抽象坐标系（核心设计）

绘图使用 **0–1000 抽象坐标系**，LLM 只需要在 0–1000 范围内输出坐标，实际像素由执行器按画布尺寸等比缩放：

- **九宫格锚点**：`top-left`、`center`、`bottom-right` 等 9 个命名位置
- **精确坐标**：`{ x: 500, y: 500 }`
- **相对定位**：`{ relativeTo: "last", dx: 150, dy: 0 }`

详见 [`docs/绘图指令体系.md`](docs/绘图指令体系.md)。

## PR 进度

| PR | 内容 | 负责人 | 状态 |
|----|------|--------|:----:|
| PR0 | 项目初始化：Next.js + TypeScript + Tailwind + Ultracite + shadcn/ui | A+B | ✅ |
| PR1 | 麦克风 + Web Speech API 基础封装 | A | ✅ |
| PR2 | react-konva 画布搭建 + Zustand shapes 渲染 | B | ✅ |
| PR3 | 基础图形正则匹配（画圆/矩形/线/三角/椭圆） | A+B | ✅ |
| PR4 | 样式指令正则（颜色/粗细/填充/清空/撤销/重做） | A+B | ✅ |
| PR4.5 | shadcn/ui 工具栏 + 主题切换 + 指令历史面板 | B | ✅ |
| PR5 | LLM 集成（DeepSeek 流式 API + 自然语言 → JSON） | A | ✅ |
| PR6 | `executeInstructions()` + 坐标网格 + 相对定位 | B | ✅ |
| PR7 | 混合模式：正则优先 + LLM 降级 + Toast 错误提示 | A+B | ✅ |
| PR8 | 导出 PNG + 设计文档 + README + Demo 视频 | A+B | ✅ |
| PR9 | 画布上下文 + 画笔模式 + 指令回放 + 提示词重构 | A+B | ✅ |

## 团队分工

- **队员 A** — 语音交互 + LLM 集成（Web Speech API、DeepSeek API 调用、指令路由、正则规则）
- **队员 B** — 绘图引擎 + UI 界面（react-konva 画布、shadcn/ui 工具栏、Zustand 状态、JSON 指令执行器、导出）

详细开发计划见 [`docs/任务划分.md`](docs/任务划分.md)。

## 设计文档

比赛要求的额外交付物 — 设计文档，位于 [`docs/技术方案.md`](docs/技术方案.md)，包含：
1. ✅ 计划支持的指令能力清单
2. ✅ 最终实现的功能清单
3. ✅ 未完成部分及原因说明

## 项目结构

```
Voice2Art/
├── docs/
│   ├── 项目要求.md           # 比赛官方规则
│   ├── 技术方案.md           # 技术方案 & 设计文档
│   ├── 任务划分.md           # 开发计划 & 分工
│   └── 绘图指令体系.md       # JSON 指令协议规范（A/B 协作契约）
├── src/
│   ├── app/
│   │   ├── api/parse-command/route.ts  # LLM 流式 API 端点
│   │   ├── layout.tsx                   # 根布局（字体、主题）
│   │   └── page.tsx                     # 首页
│   ├── components/
│   │   ├── drawing-canvas.tsx           # react-konva 画布
│   │   ├── layout/
│   │   │   ├── header.tsx              # 顶部导航
│   │   │   ├── bottom-toolbar.tsx      # 底部工具栏
│   │   │   ├── command-history.tsx     # 指令历史侧栏
│   │   │   ├── coordinate-grid.tsx     # 坐标网格叠层
│   │   │   └── voice-wave-indicator.tsx # 麦克风状态指示
│   │   └── ui/                         # shadcn/ui 组件
│   ├── hooks/
│   │   └── use-voice.ts                # 语音 Hook（集成路由）
│   ├── lib/
│   │   ├── command-router.ts           # 混合路由（正则→LLM）
│   │   ├── llm-parser.ts               # LLM API 调用封装
│   │   ├── regex-matcher.ts            # 正则指令匹配器
│   │   ├── speech-recognition.ts       # Web Speech API 封装
│   │   └── utils.ts                    # 工具函数
│   ├── store/
│   │   └── use-drawing-store.ts        # Zustand 全局状态
│   └── types/
│       └── drawing.ts                  # 指令类型定义 & 常量
├── .claude/
│   └── CLAUDE.md                       # Claude Code 项目指引
├── .env.local.example                   # 环境变量模板
├── .github/
│   └── PULL_REQUEST_TEMPLATE/          # PR 模板
└── package.json
```

## 演示视频


[【七牛云 × XEngineer 暑期实训营 第四期】](https://www.bilibili.com/video/BV1TKJN6VEZH/?share_source=copy_web&vd_source=0165475704680e0396bc51d6d4855807)
## 许可证

本项目仅用于七牛云 2026 校园招聘黑客马拉松参赛，代码仅供参考学习。
