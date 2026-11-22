# codexhost-plugin-side-chat

**Side Chat & `/btw` Quick Side-Question Extension for CodexHost Web**  
**CodexHost Web 侧边聊天面板与 `/btw` 快捷旁路提问扩展**

[English](#english) · [中文](#中文)

---

## English

### Overview

`codexhost-plugin-side-chat` adds a dedicated **Side Chat** tab to the CodexHost Web right sidebar and a `/btw` quick side-question trigger to the main composer. It lets you branch off a side conversation from the active local main thread—even while the main thread is running—without polluting the main conversation turn.

### Key Features

- **Persistent-First + Seamless Ephemeral Fallback + Permanent Mode Badge**
  - Automatically prefers `thread/fork` with `attachToSource: true` so Web side chats stay interoperable with **Codex Desktop** side chats.
  - When the backend or session state does not support persistent branching, it transparently falls back to `ephemeral: true` without interrupting the user.
  - A permanent **`Persistent`** / **`Ephemeral`** mode badge is always displayed in the panel header (no manual mode toggle).
- **`/btw` Quick Trigger & Direct Send**
  - Type `/btw` in the main composer (or pick it from the `/` / `+` launcher) to open or focus the Side Chat tab.
  - Type `/btw <question>` and press `Space` or `Enter` to fork/open a side branch and send the question directly—even while the main session is running, without leaking into the main turn.
- **Full Interactive Side-Chat Experience**
  - Real-time NDJSON snapshot streaming (`session/snapshot`).
  - Automatic first-turn read-only boundary prompt injection on new Web side-chat branches (with clean stripping in the UI bubble).
  - Collapsible thinking blocks and tool-call cards.
  - Inline **Stop** control while running, plus inline tool **approval** (`approval`) and **user question** (`question`) interaction cards.
  - Multi-branch side-chat switcher (including Desktop-created side chats) and archive/delete support.
  - Keyboard shortcut: `Ctrl+Alt+Shift+B` (Windows/Linux) / `⌘⌥⇧B` (macOS). *(Uses 3 modifiers to satisfy CodexHost Web's conflict-free shortcut policy and avoid colliding with left/right sidebar toggles.)*

### Installation

This repository ships prebuilt `lib/index.js` and `lib/client.js` bundles, so **no build step or install script is required** when installing into CodexHost Web.

1. Open **CodexHost Web**.
2. Go to **Settings → UI Extensions → Add Extension** (`设置 → 界面扩展 → 添加扩展`).
3. Enter the repository URL or local directory path:
   - GitHub: `https://github.com/biground/codexhost-plugin-side-chat`
   - Local checkout: `/path/to/codexhost-plugin-side-chat`
4. Enable the extension for the `web` target.

### Development, Build & Test

```bash
npm install
npm run typecheck
npm run build
npm test
```

- `npm run build` runs `build.mjs` (via `esbuild`) to produce:
  - `lib/index.js` — Node ESM host Cordis plugin mounting `/codexhost-side-chat/*` routes backed by `<dataDirectory>/side-chat-store.json`.
  - `lib/client.js` — Browser module registered via `window.__ModuleLoader__.load(...)`.
- `npm test` runs all unit, UI, protocol, `/btw` trigger, and real `codex-host` integration tests.

### Architecture & Security

- **Host Routes (`/codexhost-side-chat/*`)**:
  - `GET /codexhost-side-chat/threads?sourceThreadId=...`
  - `POST /codexhost-side-chat/threads`
  - `PATCH /codexhost-side-chat/threads/:threadId`
  - `DELETE /codexhost-side-chat/threads/:threadId`
- **Authorization**:
  - When `authEnabled === true`, requires `scope === "full"` primary access (`401` when unauthenticated, `403` when scoped).
  - When `--no-auth`, enforces same-origin checks on mutating requests (`403` on cross-origin writes).

---

## 中文

### 项目简介

`codexhost-plugin-side-chat` 是面向 **CodexHost Web** 的右侧栏**侧边聊天（Side Chat）**与主输入框 **`/btw` 快捷旁路提问**扩展。你可以在主会话运行过程中随时开启或直发旁路提问，在不污染主对话轮次的前提下完成上下文分支探索。

### 核心亮点

- **持久优先 + 无感临时回退 + 顶部常驻模式徽标**
  - 自动优先使用 `attachToSource: true` 发起持久化分支，与 **Codex Desktop** 侧边聊天无缝互通。
  - 当后端或当前会话不支持持久分支时，自动无感回退为 `ephemeral: true` 临时分支。
  - 面板顶部常驻显示 **`持久`** / **`临时`** 模式徽标，不提供易误触的手动模式切换开关。
- **主输入框 `/btw` 快捷唤起与带参直发**
  - 在主输入框输入 `/btw` 或通过 `/`、`+` 启动菜单选择，即可秒开或聚焦侧边聊天标签页。
  - 输入 `/btw <问题>` 并按 `Space` 或 `Enter`，即使主会话正在运行也可直接分叉并发送问题，绝不泄漏到主对话轮次。
- **完整交互能力**
  - 基于 NDJSON 的实时流式快照渲染（`session/snapshot`）。
  - Web 新建侧边分支首轮自动注入只读边界提示，并在气泡展示中自动剥离前缀。
  - 支持思考过程与工具调用折叠卡、运行中一键 **停止**、内联工具审批（`approval`）与用户提问（`question`）作答。
  - 支持多侧边会话切换（含 Desktop 创建的侧边会话）与归档删除。
  - 快捷键：`Ctrl+Alt+Shift+B`（Windows/Linux）/ `⌘⌥⇧B`（macOS）。*（采用三修饰键以符合 CodexHost Web 快捷键安全策略，避免与左右侧栏开关冲突。）*

### 安装方式

本仓库已内置预构建的 `lib/index.js` 与 `lib/client.js`，在 CodexHost Web 中安装**无需执行任何构建脚本**：

1. 打开 **CodexHost Web**。
2. 进入 **设置 → 界面扩展 → 添加扩展**。
3. 输入仓库地址或本地目录绝对路径：
   - GitHub：`https://github.com/biground/codexhost-plugin-side-chat`
   - 本地路径：`D:/WorkSpace/Everything/codexhost-plugin-side-chat`（或对应系统绝对路径）
4. 确认启用 `web` 目标即可使用。

### 开发、构建与测试

```bash
npm install
npm run typecheck
npm run build
npm test
```

- `npm run build` 通过 `build.mjs`（`esbuild`）生成：
  - `lib/index.js`：Node ESM 宿主 Cordis 插件，挂载 `/codexhost-side-chat/*` 路由并将映射持久化至 `<dataDirectory>/side-chat-store.json`。
  - `lib/client.js`：通过 `window.__ModuleLoader__.load(...)` 注册的浏览器端模块。
- `npm test` 运行脚手架、服务端存储、客户端协议控制器、右侧栏 UI、`/btw` 触发器以及 `codex-host` 宿主真实装配集成测试。

### 路由与权限说明

- **服务端接口（`/codexhost-side-chat/*`）**：
  - `GET /codexhost-side-chat/threads?sourceThreadId=...`
  - `POST /codexhost-side-chat/threads`
  - `PATCH /codexhost-side-chat/threads/:threadId`
  - `DELETE /codexhost-side-chat/threads/:threadId`
- **鉴权策略**：
  - 开启鉴权（`authEnabled === true`）时仅允许 `scope === "full"` 主访问令牌（未认证返回 `401`，受限令牌返回 `403`）。
  - `--no-auth` 模式下对写操作强制校验同源 `Origin`，跨源写请求返回 `403`。
