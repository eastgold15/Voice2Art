# 🎨 AI 语音绘图工具

> 题目二：纯语音控制的绘图工具 — 仅通过麦克风输入自然语言指令完成绘图创作

## 项目简介

用户对着麦克风说话，系统自动识别并绘制图形。支持从简单的"画一条红色直线"到复杂的"画一个红色大圆，然后在右边画一个蓝色方块"等自然语言指令。

**核心能力：**
- 🎤 语音输入，无需鼠标或键盘
- 🤖 正则 + LLM 混合解析：简单指令毫秒级响应，复杂指令 AI 理解
- 🖼️ 实时 Canvas 绘图展示
- ↩️ 撤销 / 重做 / 清空
- 🌗 亮色 / 暗色主题切换
- 💾 导出为 PNG 图片

## 技术栈

| 层次 | 选型 |
|------|------|
| 框架 | Next.js 15 (App Router) + TypeScript |
| 语音识别 | Web Speech API (SpeechRecognition) |
| 绘图引擎 | react-konva + konva |
| 状态管理 | Zustand |
| UI 组件 | shadcn/ui + Tailwind CSS |
| 指令解析 | 正则匹配 + GPT-4o-mini (Vercel Serverless) |
| 代码规范 | Ultracite (Biome) |

详细技术方案见 [`docs/技术方案.md`](docs/技术方案.md)。

## 快速开始

```bash
# 克隆仓库
git clone <repo-url>
cd Voice2Art

# 安装依赖
npm install

# 配置 LLM API Key（可选，不配置则仅正则模式可用）
cp .env.local.example .env.local
# 在 .env.local 中填入 OPENAI_API_KEY

# 启动开发服务器
npm run dev
```

在 Chrome 浏览器中访问 `http://localhost:3000`，允许麦克风权限，开始语音绘图。

> **提示**：Web Speech API 需要 HTTPS 或 localhost 环境。本地开发使用 `localhost` 即可。

## 团队分工

- **队员 A**：语音交互 + LLM 集成（Web Speech API、LLM API 调用、指令路由）
- **队员 B**：绘图引擎 + UI 界面（react-konva 画布、shadcn/ui 工具栏、Zustand 状态）

详细 PR 计划见 [`docs/任务划分.md`](docs/任务划分.md)。

## PR 进度

| PR | 内容 | 状态 |
|----|------|------|
| PR0 | 项目初始化 | ❌ |
| PR1 | 麦克风 + Web Speech 基础 | ❌ |
| PR2 | react-konva 画布 | ❌ |
| PR3 | 基础图形指令（正则） | ❌ |
| PR4 | 样式指令（正则） | ❌ |
| PR4.5 | shadcn/ui 工具栏 | ❌ |
| PR5 | LLM 集成（复杂指令） | ❌ |
| PR6 | JSON 指令执行器 | ❌ |
| PR7 | 混合模式 + 错误降级 | ❌ |
| PR8 | 导出 + 打磨 + 演示 | ❌ |

## 设计文档

比赛要求的设计文档即为 [`docs/技术方案.md`](docs/技术方案.md)，其中包含计划支持的指令清单，开发完成后将补充实际完成清单与未完成原因。

## 演示视频

<!-- TODO: 完成后在此粘贴 B站/云盘链接 -->

## 项目结构

```
Voice2Art/
├── docs/
│   ├── 项目要求.md       # 比赛官方规则
│   ├── 技术方案.md       # 技术方案 & 设计文档
│   └── 任务划分.md       # 开发计划 & 分工
├── src/
│   ├── app/              # Next.js App Router 页面
│   ├── components/       # React 组件
│   ├── store/            # Zustand 状态管理
│   ├── lib/              # 工具函数（指令解析器、API 调用等）
│   └── types/            # TypeScript 类型定义
├── public/               # 静态资源
├── .env.local.example    # 环境变量模板
├── README.md
└── package.json
```
