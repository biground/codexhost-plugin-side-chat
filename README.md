# codexhost-plugin-side-chat

**Side Chat & `/btw` Quick Side-Question Extension for CodexHost (Desktop & Web)**  
**CodexHost 跨端侧边聊天（Side Chat）与 `/btw` 快捷旁路提问扩展（`manifestVersion: 2`）**

[English](#english) · [中文](#中文)

---

## English

### Overview

`codexhost-plugin-side-chat` (`v0.2.0`) is a unified **CodexHost `manifestVersion: 2` Host Extension** that brings isolated parallel side-question branching to **both CodexHost Desktop and CodexHost Web**:

- **Standalone Dual-Pane Workbench (`page`)**: Browse main conversations, filter side-chat branches (`All` / `Persistent` / `Ephemeral`), inspect collapsible reasoning & tool cards, answer inline approvals/questions, and configure settings.
- **Cross-Platform Floating Drawer (`widget`)**: Automatically mounted in a Shadow DOM container on both Desktop and Web main windows, with strict `pointer-events: none` click-through outside interactive surfaces.
- **Web Host Injection (`web`)**: Adds a topbar launcher button and intercepts `/btw` and `/btw <question>` in the Web main composer without leaking into the main conversation—even while the main turn is running.
- **Single-Instance Shared Backend (`backend`)**: Runs once inside the shared `codexhost Host` (`host-runtime`), discovers the active `client-hosts/host-*.json` channel, and keeps side-chat metadata synchronized across Desktop and Web.
- **Legacy Compatibility (`v0.1.0`)**: Prebuilt `lib/index.js` and `lib/client.js` Cordis/DSH Web entries remain intact for older `v0.1.0` setups.

### Key Features

- **Persistent-First + Seamless `-32602` Ephemeral Fallback**: Automatically attempts `thread/fork` with `attachToSource: true` so side chats stay interoperable with Codex Desktop. When the parent session does not support persistent attachment (`-32602`), it transparently falls back to `ephemeral: true`.
- **Permanent Mode Badges**: Every branch displays a permanent **`Persistent`** or **`Ephemeral`** badge with lifecycle tooltip in both the branch list and conversation header (no manual toggle).
- **Automatic Boundary Prompt Injection & Stripping**: New Web/Host side branches automatically inject the read-only boundary prompt on turn 1 and strip it cleanly from rendered user bubbles.
- **Full Interactive Controls**: Collapsible thinking/tool blocks, live **Stop** (`turn/interrupt`) while running, and inline **Approval** / **Question** response cards.

### Installation & Usage

#### 1. Install & Enable in CodexHost
- **Desktop**: Open **Settings → Extensions** (`设置 → 插件`), choose **Add / Import Extension**, and select `codexhost-side-chat.zip` (or enter the GitHub repository URL `https://github.com/biground/codexhost-plugin-side-chat` or local checkout path), then enable it.
- **Web**: Open the **Extensions** (`插件`) workspace (Extension Center), import `codexhost-side-chat.zip` (or enter `https://github.com/biground/codexhost-plugin-side-chat` / local path), and enable it.

#### 2. Open the Standalone Page, Floating Widget & `/btw`
- **Web Standalone Page**: Click **Extensions** (`插件`) in the primary navigation, then switch to the **Side Chat** (`侧边聊天`) tab in the top tab bar of the Extensions workspace.
- **Desktop Standalone Page**: Open **Settings → Extension Pages → Side Chat** (`设置 → 插件页面 → 侧边聊天`).
- **Floating Widget (`widget`)**: Appears automatically at the configured bottom corner (`bottom-right` or `bottom-left`) across Desktop and Web main windows.
- **Web `/btw` Quick Shortcut**:
  - Type `/btw` in the Web main composer to open the floating Side Chat drawer.
  - Type `/btw <question>` and press `Space` or `Enter` to immediately fork/open a side branch and send the question in parallel.

#### 3. Extension Settings (`settingsSchema`)
| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `widgetPosition` | `select` (`bottom-right` \| `bottom-left`) | `"bottom-right"` | Corner where the floating launcher pill and drawer dock. |
| `showFloatingLauncher` | `boolean` | `true` | Show the corner floating launcher pill (drawer can still be opened via Web topbar or `/btw` when hidden). |
| `enableWebBtwShortcut` | `boolean` | `true` | Intercept `/btw` and `/btw <question>` in the Web main composer. |

### Build, Package & Release

```bash
npm install
npm run typecheck
npm run build
npm run pack:zip
npm test
```

- `npm run build`: Builds `lib/index.js`, `lib/client.js`, and `backend/index.mjs`.
- `npm run pack:zip`: Creates a deterministic, standard 32-bit (non-ZIP64) archive at `release/codexhost-side-chat.zip` with `manifest.json` at the archive root (containing only `manifest.json`, `page/`, `widget/`, `web/`, `backend/`, `shared/`, `assets/icon.png`, `assets/preview.png`, `README.md`, and `LICENSE`).
- **GitHub Releases**: Tag a release (e.g., `v0.2.0`) and upload `release/codexhost-side-chat.zip` as a release asset.
- **Marketplace Submission (`codexhost-extensions-registry`)**: Submit a PR adding the entry (with `downloadUrl` pointing to the GitHub Release `codexhost-side-chat.zip` asset and its `sha256`) to `catalog.v2.json`.

---

## 中文

### 项目简介

`codexhost-plugin-side-chat`（`v0.2.0`）是基于 **CodexHost `manifestVersion: 2`** 的跨端统一 Host 扩展，在 **CodexHost Desktop 与 Web** 双端提供隔离的并行旁路提问能力：

- **独立双栏工作台（`page`）**：左栏按主会话与模式（全部 / 持久 / 临时）管理全部分支，右栏提供全屏问答、可折叠思考与工具卡片、一键停止、内联审批/提问与扩展设置。
- **跨端悬浮抽屉挂件（`widget`）**：在 Desktop 与 Web 主窗口通过 Shadow DOM 自动挂载，外层严格保持 `pointer-events: none` 点击透传，仅悬浮胶囊与抽屉面板响应交互。
- **Web 宿主注入（`web`）**：在 Web 顶栏挂载「侧边聊天」快捷入口，并在主会话输入框捕获 `/btw` 与 `/btw <问题>`，即使主会话正在执行也完整拦截、绝不漏入主对话。
- **共享 Host 单实例后端（`backend`）**：在共享 `codexhost Host`（`host-runtime`）中单实例常驻运行，自动发现本机 `client-hosts/host-*.json` 通道，在 Desktop 与 Web 间实时同步侧边会话。
- **v0.1.0 兼容保留**：继续保留预构建的 `lib/index.js` 与 `lib/client.js` 兼容入口。

### 核心特性

- **持久优先 + `-32602` 无感临时回退**：优先以 `attachToSource: true` 创建持久化侧边分支（与 Codex Desktop 互通）；当父会话不支持持久挂载返回 `-32602` 时自动无感回退为 `ephemeral: true` 临时分支。
- **常驻模式徽标**：分支列表与对话头部始终醒目展示 **`持久`** / **`临时`** 徽标及生命周期说明，不提供易误触的手动切换开关。
- **首轮边界提示词自动注入与剥离**：新建侧边分支首轮自动注入只读边界约束提示词，并在界面气泡展示中自动剥离前缀。
- **完整交互能力**：支持思考/工具调用折叠卡、运行中一键 **停止**、内联工具审批（`approval`）与用户提问（`question`）作答。

### 安装与使用

#### 1. 导入与启用插件
- **Desktop 端**：打开 **设置 → 插件**，点击导入/添加扩展，选择 `codexhost-side-chat.zip`（或输入 GitHub 仓库地址 `https://github.com/biground/codexhost-plugin-side-chat` / 本机目录）并启用。
- **Web 端**：进入左侧一级导航 **插件** 工作区（插件中心），导入 `codexhost-side-chat.zip`（或输入仓库地址 / 本机目录）并启用。

#### 2. 打开独立页面、悬浮挂件与 `/btw`
- **Web 打开独立页面**：点击左侧 **插件** 进入插件工作区后，在**工作区顶部的切页栏**切换到已启用的 **侧边聊天** 独立页面。
- **Desktop 打开独立页面**：进入 **设置 → 插件页面 → 侧边聊天** 打开独立工作台。
- **主窗口悬浮挂件（`widget`）**：启用后在 Desktop 与 Web 主窗口角落自动显示，点击悬浮胶囊即可展开侧滑抽屉。
- **Web 端 `/btw` 快捷指令**：
  - 在 Web 主输入框输入 `/btw`：立即展开侧边聊天抽屉并聚焦输入框。
  - 在 Web 主输入框输入 `/btw <问题>` 并按 `Space` 或 `Enter`：清空主输入框、不触发主会话发送，立即创建/定位侧边分支并并行发起提问。

#### 3. 设置项说明（`settingsSchema`）
| 键名 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `widgetPosition` | `select`（`bottom-right` \| `bottom-left`） | `"bottom-right"` | 悬浮唤醒胶囊与抽屉在主窗口中的停靠角落（右下角 / 左下角）。 |
| `showFloatingLauncher` | `boolean` | `true` | 是否在主窗口角落常驻显示悬浮唤醒按钮；关闭后仍可通过 Web 顶栏按钮或 `/btw` 展开抽屉。 |
| `enableWebBtwShortcut` | `boolean` | `true` | 是否在 Web 主会话输入框拦截 `/btw` 与 `/btw <问题>` 快捷指令。 |

### 构建、打包与发布

```bash
npm install
npm run typecheck
npm run build
npm run pack:zip
npm test
```

- `npm run build`：生成 `lib/index.js`、`lib/client.js` 与 `backend/index.mjs`。
- `npm run pack:zip`：在本地 `release/codexhost-side-chat.zip` 生成确定性标准 32 位（非 ZIP64）归档包，`manifest.json` 位于归档根目录，仅包含纯净 v2 运行所需文件。
- **GitHub Releases 发布**：创建版本 Tag（如 `v0.2.0`）并将 `release/codexhost-side-chat.zip` 上传为 Release 附件。
- **市场索引投稿（`codexhost-extensions-registry`）**：向市场仓库的 `catalog.v2.json` 提交 PR，填写指向 GitHub Release `codexhost-side-chat.zip` 的 `downloadUrl` 与对应 `sha256`。
