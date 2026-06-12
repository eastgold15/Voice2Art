# Git 工作流 & 提交规范

> 适用于两人协作的 AI 语音绘图工具项目

---

## 一、分支策略

```
main                    ← 受保护，只能通过 PR 合并
├── feat/a-*            ← 队员 A 的功能分支
├── feat/b-*            ← 队员 B 的功能分支
├── fix/*               ← 修复分支
└── docs/*              ← 文档分支
```

### 命名规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 功能开发 | `feat/<负责人>-<功能名>` | `feat/a-voice`, `feat/b-canvas` |
| Bug 修复 | `fix/<简短描述>` | `fix/clear-canvas-bug` |
| 文档更新 | `docs/<内容>` | `docs/git-workflow` |
| 实验性 | `experiment/<描述>` | `experiment/llm-prompt` |

### 基本原则

- **禁止直接 push main** — 所有变更通过 PR 合并
- 每人从最新的 `main` 切出自己分支
- 分支粒度 = 一个 PR = 一个功能
- 大功能拆多个小分支（如 `feat/a-voice-base` → `feat/a-llm-api`）

---

## 二、日常流程

```bash
# 1. 开始新功能前，同步 main
git checkout main
git pull

# 2. 切功能分支
git checkout -b feat/a-voice

# 3. 开发、分步提交（小步多次）
git add src/lib/voiceCommand.ts
git commit -m "feat: 添加 Web Speech API 基础封装"
git add src/lib/commandRouter.ts
git commit -m "feat: 添加指令路由（正则 + LLM 分发）"

# 4. 推送远程
git push origin feat/a-voice

# 5. 去 GitHub 创建 Pull Request →
#    base: main  ←  feat/a-voice
```

---

## 三、Commit 规范

### 格式

```
<type>: <一句话描述>
```

| Type | 什么时候用 |
|------|-----------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档变更 |
| `style` | 代码格式（空格、分号等，不影响逻辑） |
| `refactor` | 重构（不改功能不改 bug） |
| `perf` | 性能优化 |
| `test` | 添加或修改测试 |
| `chore` | 构建/依赖/工具链变更 |

### 示例

```
feat: 实现 Web Speech API 语音识别基础封装
feat: 添加正则匹配画直线/圆/矩形指令
fix: 清空画布后撤销恢复为空画布
docs: 更新技术方案文档 PR 状态
chore: 安装 react-konva 和 zustand
refactor: 提取颜色解析为独立函数
```

### 要求

- 用英文或中文均可，保持前后一致
- 描述用祈使句（"添加" 而不是 "添加了"）
- **不要把格式无关的改动混进同一个 commit**（比如修 bug 的同时改了代码格式）

---

## 四、PR 规范

> 比赛规则对 PR 有硬性要求，**直接照着做就能拿分**。

### 每个 PR 只做一件事

一个 PR 只实现或修改单一功能。大功能应拆分为多个独立 PR 分步提交。

### PR 模板

提交 PR 时，标题和描述按以下格式填写：

**标题格式：**

```
[PR-N] feat: 一句话说明新增/修改了什么
```

例：`[PR1] feat: 项目初始化 + Web Speech API 基础封装`

**描述模板：**

````markdown
## 功能描述

说明该功能的作用与使用方式。

## 实现思路

简要说明技术选型或核心实现逻辑。

## 测试方式

如何验证该功能正常运行。

## 对应 PR 计划

关联 docs/任务划分.md 中的 PR N
````

### 注意事项

- PR 合并后，main 分支必须保持**可运行状态**（评委随时 clone 都能跑起来）
- 如果 PR 引入了新依赖，务必在 README 或 PR 描述中列明
- 不要复用自己的旧代码而不注明来源

---

## 五、Code Review 规范

### 提 PR 的人

- PR 标题和描述写清楚（用上面的模板）
- PR 尽量小，方便对方 review
- PR 中 @ 对方请求 review

### Review 的人

- 检查逻辑是否正确
- 检查是否有多余代码（console.log 删干净）
- 确认 main 合并后能跑
- 至少 **1 人 approve** 后才能合并

### 合并方式

推荐 **Squash and merge**（把分支上的多个 commit 压成一个合并到 main），保持 main 历史干净：

```
原始分支：commit1 → commit2 → commit3
合并后：  "feat: 实现 Web Speech API 基础封装"  (单个 commit)
```

---

## 六、保护 main 分支（GitHub 设置）

两人都要设置一次。打开 GitHub 仓库：

1. **Settings** → **Branches** → **Add branch protection rule**
2. **Branch name pattern**：填 `main`
3. 勾选：
   ```
   ☑ Require a pull request before merging
      ☑ Require approvals (1)
   ☑ Require status checks to pass before merging
   ☑ Do not allow bypassing the above settings
   ```
4. **Save**

设置后 `git push origin main` 会被拒绝，只能通过 PR 合并。

> ⚠️ 记得先把对方加为仓库 Collaborator：Settings → Collaborators → Add people

---

## 七、图示：完整流程一览

```
                     main（受保护）
                       ▲
                       │ PR merge (squash)
                       │
       ┌───────────────┴───────────────┐
       │                               │
  feat/a-voice                    feat/b-canvas
       │                               │
  1. git checkout main             1. git checkout main
  2. git pull                      2. git pull
  3. git checkout -b feat/a-voice  3. git checkout -b feat/b-canvas
  4. 开发 + 多次 commit            4. 开发 + 多次 commit
  5. git push origin feat/a-voice  5. git push origin feat/b-canvas
  6. GitHub 提 PR                   6. GitHub 提 PR
  7. B review → approve             7. A review → approve
  8. Squash merge → main            8. Squash merge → main
```

---

## 八、常用命令速查

```bash
# 查看当前分支
git branch

# 查看所有分支（含远程）
git branch -a

# 切到已有分支
git checkout feat/a-voice

# 查看未提交的变更
git status

# 查看 commit 历史（一行模式）
git log --oneline --graph -10

# 撤销暂存区的文件
git restore --staged src/lib/xxx.ts

# 撤销未暂存的修改
git restore src/lib/xxx.ts

# 拉取远程并 rebase（保持历史线性）
git pull --rebase
```
