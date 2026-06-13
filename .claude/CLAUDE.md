# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun run dev       # Start dev server (Next.js dev)
bun run build     # Production build
bun run start     # Production start
bun run typeCheck # TypeScript type check (bun x tsc --noEmit)
bun run check     # Ultracite lint check (Biome)
bun run fix       # Ultracite auto-fix
bun x ultracite doctor  # Diagnose Ultracite setup
```

Post-write hooks in `.claude/settings.json` auto-run `bun run fix --skip=correctness/noUnusedImports` after Write/Edit.

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + TypeScript (strict) |
| Canvas | react-konva + konva |
| State | Zustand |
| UI | shadcn/ui + Tailwind CSS v4 |
| Voice | Web Speech API (SpeechRecognition) |
| Code Quality | Ultracite (Biome) + Lefthook pre-commit hook |
| Package Manager | Bun (bun.lock) |
| React Compiler | Enabled (`reactCompiler: true` in next.config.ts) |
| Path Alias | `@/` → `./src/*` |

## Architecture

### Data Flow (Speech to Canvas)

```
User Speech
  → Web Speech API (browser SpeechRecognition)
  → Recognition text
  → [PR5 — LLM] or [PR3/4 — Regex] instruction parser
  → JSON Instruction[] (DrawShape | SetStyle | CanvasControl)
  → [PR6] executeInstructions() in Zustand store
  → shapes[] update + history snapshot
  → react-konva Layer re-renders shapes
```

### Abstract Coordinate System (0–1000)

Drawings use an abstract 0–1000 space so LLMs don't need to know pixel dimensions. The store's `executeInstructions` maps abstract coords to actual canvas pixels at runtime via `abstractToPixel(value, canvasPixelSize) = Math.round((value / 1000) * canvasPixelSize)`.

Supported position types:
- **Named anchors** — 9-grid: `"top-left"`, `"center"`, `"bottom-right"`, etc. (see `ANCHOR_MAP` in `src/types/drawing.ts`)
- **Exact coordinates** — `{ x: 500, y: 500 }`
- **Relative** — `{ relativeTo: "last", dx: 150, dy: 0 }`

Size presets: `small` = 100, `medium` = 200 (default), `large` = 400.

### Instruction Type System (`src/types/drawing.ts`)

Three instruction actions:
- **`draw`** — shape kind (`rectangle` | `circle` | `ellipse` | `line` | `triangle`), location, size/color/stroke
- **`set-style`** — change `color`, `stroke-width`, or `fill` for subsequent draws
- **Canvas controls** — `clear`, `undo`, `redo`, `toggle-grid`

### State Management (`src/store/use-drawing-store.ts`)

Zustand store with snapshot-based undo/redo:
- `shapes: Shape[]` — current canvas shapes (Konva-ready objects)
- `history: Shape[][]` — full state snapshots, `historyIndex` tracks current position
- `commands: Command[]` — text log of voice commands for side panel
- `currentColor`, `currentStrokeWidth` — drawing context defaults
- `showGrid` — toggle coordinate grid overlay
- `executeInstructions(instructions: Instruction[])` — PR6 core entry point

### Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout: fonts, ThemeProvider (next-themes)
│   └── page.tsx            # Home page: header + canvas + sidebar + toolbar
├── components/
│   ├── drawing-canvas.tsx  # react-konva Stage + Layer (measures container, renders shapes)
│   ├── layout/
│   │   ├── header.tsx             # Logo + theme toggle
│   │   ├── bottom-toolbar.tsx     # Color presets, stroke slider, grid/undo/redo/clear
│   │   ├── command-history.tsx    # Right sidebar — logged voice commands
│   │   ├── coordinate-grid.tsx    # SVG overlay — abstract coord grid (100-unit intervals)
│   │   └── voice-wave-indicator.tsx  # Mic status with animated bars
│   └── ui/                 # shadcn/ui primitives (button, slider, card, switch, sonner)
├── store/
│   └── use-drawing-store.ts # Zustand store: shapes, history, commands, executeInstructions
├── lib/
│   └── utils.ts            # cn() — clsx + tailwind-merge
└── types/
    └── drawing.ts          # Instruction types, ANCHOR_MAP, SIZE_MAP
docs/
├── 技术方案.md             # Architecture design doc
├── 绘图指令体系.md          # JSON instruction protocol spec (A/B team contract)
├── 任务划分.md              # PR plan & team division
├── 项目要求.md              # Competition rules
└── 任务划分-队员A.md / 队员B.md  # Per-member task breakdowns
```

## PR Planning

The project is built incrementally via PRs. Current progress matches `docs/任务划分.md`:

| PR | What | Status |
|----|------|--------|
| PR0 | Project init | ❌ |
| PR1 | Mic + Web Speech | ❌ |
| PR2 | react-konva canvas | ❌ |
| PR3 | Basic shape regex | ❌ |
| PR4 | Style regex | ❌ |
| PR4.5 | shadcn/ui toolbar | ❌ |
| PR5 | LLM integration | ❌ |
| **PR6** | **JSON instruction executor + coordinate grid** | **Active (branch: `feat/b-canvas`)** |
| PR7 | Hybrid mode + fallback | ❌ |
| PR8 | Export + polish + demo | ❌ |

## Team Roles

- **Member A**: Speech interaction + LLM integration (Web Speech API, GPT-4o-mini calls, instruction routing)
- **Member B**: Drawing engine + UI (react-konva canvas, shadcn/ui components, Zustand state, coordinate grid)

The JSON instruction protocol in `src/types/drawing.ts` and `docs/绘图指令体系.md` is the A/B joint contract — LLM output format matches what `executeInstructions()` consumes.

## Key Caveats

- **Web Speech API** requires HTTPS or localhost (Chrome). No other browser is targeted.
- **No test framework** is set up yet — the project currently has no tests.
- `.env.local.example` exists but no `.env.local` is committed — LLM API key is optional (regex mode works without it).
- The Konva `Shape` type in the store is NOT the `Instruction` type — `executeInstructions` converts `Instruction[]` to Konva-friendly `Shape` objects.
