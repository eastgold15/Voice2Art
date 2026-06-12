# 队员 B 任务清单

> 绘图引擎 + UI 界面
> 按顺序一个个做，做完一个勾一个，提一次 PR

---

## 第一阶段：PR2 — 搭建画布

**依赖：** PR0（项目初始化）已完成
**目标：** 能显示画布 + 手动塞假数据能看到图形
**分支名：** `feat/b-canvas`

### □ 2.1 创建 Zustand 基础 Store

建文件 `src/store/useDrawingStore.ts`：

```typescript
import { create } from 'zustand';

interface Shape {
  type: 'rect' | 'circle' | 'line';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  points?: number[];
  fill?: string;
  stroke: string;
  strokeWidth: number;
}

interface DrawingStore {
  shapes: Shape[];
  currentColor: string;
  currentStrokeWidth: number;
  isListening: boolean;
  theme: 'light' | 'dark';

  setColor: (color: string) => void;
  setStrokeWidth: (width: number) => void;
  addShape: (shape: Shape) => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  toggleTheme: () => void;
  setListening: (v: boolean) => void;
}

export const useDrawingStore = create<DrawingStore>((set, get) => ({
  shapes: [],
  currentColor: '#000000',
  currentStrokeWidth: 3,
  isListening: false,
  theme: 'light',

  setColor: (color) => set({ currentColor: color }),
  setStrokeWidth: (width) => set({ currentStrokeWidth: width }),
  addShape: (shape) => set((s) => ({ shapes: [...s.shapes, shape] })),
  clearCanvas: () => set({ shapes: [] }),
  undo: () => { /* 后续再补 */ },
  redo: () => { /* 后续再补 */ },
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  setListening: (v) => set({ isListening: v }),
}));
```

验收：在任意组件里 `useDrawingStore.getState().addShape({...})` 能调用不报错。

### □ 2.2 创建画布组件

建文件 `src/components/DrawingCanvas.tsx`：

```tsx
'use client';
import { Stage, Layer, Rect, Circle, Line } from 'react-konva';
import { useDrawingStore } from '@/store/useDrawingStore';

export default function DrawingCanvas() {
  const shapes = useDrawingStore((s) => s.shapes);

  return (
    <Stage width={800} height={600} className="rounded border">
      <Layer>
        {shapes.map((shape, i) => {
          if (shape.type === 'rect')  return <Rect   key={i} {...shape} />;
          if (shape.type === 'circle') return <Circle key={i} {...shape} />;
          if (shape.type === 'line')  return <Line   key={i} {...shape} />;
          return null;
        })}
      </Layer>
    </Stage>
  );
}
```

### □ 2.3 在页面展示画布

改 `src/app/page.tsx`：引入 DrawingCanvas，在页面渲染。

先不搞复杂 UI，保证能跑：

```tsx
import DrawingCanvas from '@/components/DrawingCanvas';

export default function Home() {
  return (
    <main className="min-h-screen p-4">
      <h1 className="text-xl font-bold">Voice2Art</h1>
      <DrawingCanvas />
    </main>
  );
}
```

### □ 2.4 验证：手动塞假数据

在浏览器 DevTools Console 里跑：

```js
// 如果 store 没暴露，先在 page.tsx 加一行
// (window as any).store = useDrawingStore;
// 然后刷新，在 console 输入：
store.getState().addShape({ type: 'rect', x: 100, y: 100, width: 80, height: 60, fill: 'red', stroke: 'red', strokeWidth: 3 })
store.getState().addShape({ type: 'circle', x: 300, y: 200, radius: 50, fill: 'blue', stroke: 'blue', strokeWidth: 3 })
```

画布上出现红色矩形和蓝色圆形 → **PR2 完成，提 PR**

> 💡 提 PR 模板里勾选 `[PR2]`，标题 `[PR2] feat: 搭建 react-konva 画布 + Zustand 基础 store`

---

## 第二阶段：PR4（协作部分）+ PR4.5 — UI 界面

**依赖：** PR2 已合并到 main
**目标：** 工具栏 + 状态栏 + 指令历史面板 + 主题切换
**分支名：** `feat/b-toolbar`

### □ 4.1 更新 Zustand Store — 补充 A 需要的 Action

在 `useDrawingStore` 里补上：

```typescript
// 已存在：currentColor, currentStrokeWidth, addShape, clearCanvas
// 确认以下方法都实现好了：

// 撤销：保存 shapes 快照到 history 数组
history: Shape[][];
historyIndex: number;
undo: () => void;  // historyIndex--，恢复对应快照
redo: () => void;  // historyIndex++，恢复对应快照

// 指令日志
commandLog: string[];
recordCommand: (cmd: string) => void;
```

> 这块 A 也会用到，确保两人协作时接口一致。具体 undo/redo 实现参考上面 `docs/技术方案.md` 四节。

### □ 4.2 构建工具栏组件

建文件 `src/components/Toolbar.tsx`：

包含：
- 颜色选择器（预设色块 + 自定义输入）
- 粗细滑块（shadcn/ui Slider）
- 清空按钮（shadcn/ui Button）
- 撤销 / 重做按钮
- 导出 PNG 按钮
- 主题切换开关（shadcn/ui Switch）

每个按钮都调用 `useDrawingStore` 的对应 action。

### □ 4.3 构建指令历史面板

建文件 `src/components/CommandHistory.tsx`：

从 `useDrawingStore` 读取 `commandLog`，右侧列表展示，点击某条可以重新执行（后期配合 A 的 PR7）。

### □ 4.4 构建状态栏

建文件 `src/components/StatusBar.tsx`：

显示：
- 麦克风状态（监听中 / 休眠）— 读 `isListening`
- 当前识别文本 — 先留空，等 A 的 PR1 联通

### □ 4.5 布局整合 + 主题切换

改 `src/app/page.tsx` 布局：

```
┌─────────────────────────────────────────┐
│  Title + 主题切换                         │
├─────────────────────┬───────────────────┤
│                     │  指令历史面板       │
│   DrawingCanvas     │                   │
│                     │                   │
├─────────────────────┴───────────────────┤
│  状态栏 + 工具栏                         │
└─────────────────────────────────────────┘
```

主题切换：在根布局或 page.tsx 里监听 `theme` 状态，动态切换 `<html class="dark">`。

验收：界面漂亮，工具栏按钮操作画布正常，主题切换顺滑。

> 💡 提 PR 标题：`[PR4.5] feat: 集成 shadcn/ui 工具栏 + 主题切换 + 撤销/重做`

---

## 第三阶段：PR6 — JSON 指令执行器

**依赖：** PR5（A 的 LLM 集成）已完成
**目标：** 接收 A 发来的 JSON 指令数组，按顺序绘制
**分支名：** `feat/b-executor`

### □ 6.1 定义 DrawInstruction 类型

建文件 `src/types/drawing.ts`：

```typescript
export interface DrawInstruction {
  type: 'rect' | 'circle' | 'line';
  color?: string;
  strokeWidth?: number;
  size?: 'small' | 'medium' | 'large';
  position?: { x: number; y: number } | 'center' | 'leftOfPrevious' | 'rightOfPrevious';
}
```

> ⚠️ 跟 A 确认这个类型一致，一人定义另一人引用。

### □ 6.2 实现 executeInstructions

在 `useDrawingStore` 里添加 `executeInstructions` 方法：

```typescript
executeInstructions: (instructions: DrawInstruction[]) => {
  const shapes: Shape[] = [];
  let lastPos = { x: 400, y: 300 }; // 画布中心

  for (const ins of instructions) {
    const color = ins.color || get().currentColor;
    const sw = ins.strokeWidth || get().currentStrokeWidth;

    // 尺寸映射
    const sizes = { small: 30, medium: 60, large: 100 };
    const size = sizes[ins.size || 'medium'];

    // 位置计算
    let x = lastPos.x, y = lastPos.y;
    if (typeof ins.position === 'string') {
      if (ins.position === 'center') { x = 400; y = 300; }
      else if (ins.position === 'leftOfPrevious') x = lastPos.x - size - 20;
      else if (ins.position === 'rightOfPrevious') x = lastPos.x + size + 20;
    } else if (ins.position) {
      x = ins.position.x; y = ins.position.y;
    }

    // 创建图形
    if (ins.type === 'rect') {
      shapes.push({ type: 'rect', x, y, width: size, height: size, fill: color, stroke: color, strokeWidth: sw });
    } else if (ins.type === 'circle') {
      shapes.push({ type: 'circle', x, y, radius: size / 2, fill: color, stroke: color, strokeWidth: sw });
    } else if (ins.type === 'line') {
      shapes.push({ type: 'line', points: [x, y, x + size, y + size / 2], stroke: color, strokeWidth: sw });
    }

    lastPos = { x, y };
  }

  set({ shapes: [...get().shapes, ...shapes] });
}
```

### □ 6.3 验证

在 DevTools Console 里测：

```js
store.getState().executeInstructions([
  { type: 'circle', color: '#FF0000', size: 'large', position: 'center' },
  { type: 'rect', color: '#0000FF', size: 'small', position: 'rightOfPrevious' },
])
```

画布上出现一个红色大圆 + 右边一个蓝色小方块 → 通过

> 💡 提 PR 标题：`[PR6] feat: 实现 JSON 指令多步执行器`

---

## 第四阶段：PR8（你的部分）— 导出 + 打磨

**依赖：** PR6 已合并
**目标：** 收尾功能 + 协助演示
**分支名：** `feat/b-polish`

### □ 8.1 导出 PNG

在工具栏的"导出"按钮里加逻辑：

```typescript
const stageRef = useRef<Konva.Stage>(null);

const handleExport = () => {
  const uri = stageRef.current?.toDataURL();
  const link = document.createElement('a');
  link.download = 'my-drawing.png';
  link.href = uri!;
  link.click();
};
```

需要把 `stageRef` 传给 DrawingCanvas 组件。

### □ 8.2 配合 A 做 demo 视频

录几条典型指令的操作：
1. "画一条红色直线"
2. "清空画布，画一个蓝色大圆"
3. "撤销"
4. "切换暗色主题"
5. "导出 PNG"

---

## 总结：你的提 PR 节奏

| 顺序 | 分支名 | 做什么 | 大概文件 |
|------|--------|--------|---------|
| ① | `feat/b-canvas` | 画布 + store | store, components/DrawingCanvas, page.tsx |
| ② | `feat/b-toolbar` | 工具栏 + 主题 + 布局 | components/Toolbar, CommandHistory, StatusBar |
| ③ | `feat/b-executor` | JSON 指令执行 | types/drawing.ts, store (executeInstructions) |
| ④ | `feat/b-polish` | 导出 + 配合 demo | 修改 DrawingCanvas 加导出功能 |

> 每完成一个 PR，去 GitHub 提 PR → 等 A review → squash merge → 切回 main 拉最新 → 切下一个分支
