# 队员 A 任务清单

> 语音交互 + LLM 集成
> 按顺序一个个做，做完一个勾一个，提一次 PR

---

## 第一阶段：PR1 — 麦克风 + 语音识别基础封装 ✅

**依赖：** PR0（项目初始化）已完成
**目标：** 浏览器请求麦克风权限，说话能实时看到识别文本
**分支名：** `feat/a-voice`（已提交 PR）
**实际实现：** 阿里云 NLS SpeechTranscriber 实时转写（优于原计划 Web Speech API，因为 Google 服务国内不可用）

### ☑ 1.1 创建语音识别服务

建文件 `src/lib/speech-recognition.ts`：
- AudioWorkletNode 独立线程采集 PCM 16kHz → WebSocket 阿里云 NLS SpeechTranscriber
- 封装 start / stop / onResult / onError
- `enable_voice_detection` 800ms 静音自动断句
- 实时 interim 结果 → UI 显示，final 结果 → 路由执行

### ☑ 1.2 创建语音控制 Hook

建文件 `src/hooks/use-voice.ts`：
- 连接 SpeechService 与 Zustand store
- interim 结果存本地 state → UI 实时显示
- final 结果 → routeCommand → store.executeInstructions
- error → sonner toast 提示

### ☑ 1.3 在 BottomToolbar 连接语音识别

`src/components/layout/voice-wave-indicator.tsx`：
- 麦克风按钮（点击切换开始/停止监听）
- 实时 interim 文字展示
- 错误状态显示（红色文字）

### ☑ 1.4 验证 ✅

1. ✅ 点击麦克风 → 浏览器弹出权限 → 允许
2. ✅ 说"你好你好你好" → UI 实时显示 interim 文字
3. ✅ 800ms 静音 → SentenceEnd → 拿到 final 文字 → 执行指令
4. ✅ 再次点击麦克风按钮 → 停止监听
5. ✅ 连续开关不会 IDLE_TIMEOUT
6. ✅ Token 自动生成 + 缓存，AudioWorkletNode PCM 16kHz 采集

> ✅ 已提交 PR `feat/a-voice` → main（合并 PR1+PR3+PR4）

---

## 第二阶段：PR3 — 正则匹配基础图形指令 ✅

**依赖：** PR1 已合并到 main
**目标：** 语音说"画红色大圆"后对应图形出现在画布
**分支名：** `feat/a-voice`（与 PR1 合并提交）

### ☑ 3.1 了解已定义的类型

`src/types/drawing.ts` 由队员 B 创建，使用 DrawShape / SetStyle / CanvasControl 等类型。

### ☑ 3.2 创建正则匹配器

建文件 `src/lib/regex-matcher.ts`：
- 5 种图形：circle / rectangle / line / triangle / ellipse
- 颜色/尺寸/位置提取
- 12 色映射表（红→#EF4444 等）
- 九宫格位置映射（左边→center-left 等）

### ☑ 3.3 创建指令路由器

建文件 `src/lib/command-router.ts`：
- 先走正则 → 匹配失败返回 null（后续 PR5 走 LLM 降级）

### ☑ 3.4 在 use-voice Hook 集成指令路由

在 `use-voice.ts` 的 final 回调中：
- 调用 `routeCommand(text)`
- draw → store.executeInstructions
- style → store.executeInstructions([SetStyle])
- action → store.executeInstructions([CanvasControl])
- 无匹配 → toast.error

### ☑ 3.5 验证 ⚠️

> 代码完成，待完整端到端测试（等待 PR 合并后验证画布联动）

---

## 第三阶段：PR4 — 样式指令（正则匹配）✅

**目标：** 语音说"红色"后后续图形变红，说"清空"画布清空
**分支名：** `feat/a-voice`（与 PR1+PR3 合并提交）

### ☑ 4.1 扩展 regex-matcher，增加样式/动作指令

- SetStyle: 颜色切换、粗细切换、填充色
- CanvasControl: 清空、撤销、重做

### ☑ 4.2 扩展路由以支持样式/动作指令

command-router 透传三种 result.type（draw / style / action）

### ☑ 4.3 在 Hook 中处理样式/动作指令

use-voice 中 switch (result.type) 分发到 store.executeInstructions

### ☑ 4.4 验证 ⚠️

> 代码完成，待完整端到端测试

---

## ⏭ 下一步：PR5 — 🧠 LLM 集成

**依赖：** PR1+PR3+PR4 已合并到 main
**目标：** 说"画一个红色大圆，在右边画蓝色方块"，系统调用 LLM 返回正确 JSON
**分支名：** `feat/a-llm`

### □ 5.1 创建 LLM 解析器

建文件 `src/lib/llm-parser.ts`：调用 `/api/parse-command`，返回 `DrawShape[]`

### □ 5.2 创建 API Route

建文件 `src/app/api/parse-command/route.ts`：
- POST 接收 `{ text: string }`
- System Prompt 定义完整的 DrawShape JSON Schema
- 调用 GPT-4o-mini（或国产模型如 DeepSeek / 通义千问）
- 返回 `{ instructions: DrawShape[] }`

### □ 5.3 添加环境变量

`.env.local` 添加 `OPENAI_API_KEY`（或 `DEEPSEEK_API_KEY` 等）

### □ 5.4 更新 command-router 启用 LLM 路径

正则匹配失败时 → `await parseWithLLM(text)` → 返回 LLM 解析结果

### □ 5.5 验证

1. "画一个红色大圆，在右边画蓝色小方块" → 两个图形
2. "你好今天天气怎么样" → LLM 返回无法解析 → Toast

> 💡 如果 OpenAI API 不可用，可改用国产模型：DeepSeek（便宜）、通义千问（阿里云生态，可能有免费额度）

---

## 第四阶段：PR7 — 混合模式 + 错误降级 + Toast + 指令回放

**依赖：** PR5 已合并
**分支名：** `feat/a-hybrid`

### □ 7.1 完善混合路由策略

三层策略：正则（毫秒） → LLM（1-2s） → Toast 降级

### □ 7.2 指令历史记录

store.addCommand → CommandHistory 组件展示

### □ 7.3 指令历史点击回放

CommandHistory 回放按钮 → 重新 routeCommand → 执行

### □ 7.4 Toast 错误提示

sonner Toaster 已在布局中配置

### □ 7.5 验证

---

## 第五阶段：PR8 — 设计文档 + 协作打磨

**依赖：** 所有前置 PR 已合并
**分支名：** `feat/a-polish`

### □ 8.1 更新设计文档
### □ 8.2 协助录制 Demo 视频

---

## 总结

| 顺序 | 状态 | 分支名 | 内容 |
|------|------|--------|------|
| ① | ✅ 已提 PR | `feat/a-voice` | 阿里云 NLS 实时语音识别 + 正则匹配 + 样式/动作指令 |
| ② | ⏭ 下一步 | `feat/a-llm` | LLM 集成（GPT-4o-mini 或国产模型） |
| ③ | ⏳ 待做 | `feat/a-hybrid` | 混合模式 + 回放 + 降级 |
| ④ | ⏳ 待做 | `feat/a-polish` | 设计文档 + Demo |
