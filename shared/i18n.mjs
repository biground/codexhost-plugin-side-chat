/**
 * Bilingual (`zh-CN` / `en`) localization dictionary and error formatter
 * shared across `page`, `widget`, and `web` surfaces.
 */

export const COPY_EN = {
  "app.title": "Side Chat",
  "app.subtitle": "Parallel read-only context branches",
  "status.online": "Host connected",
  "status.offline": "Host channel offline",
  "status.checking": "Checking connection…",
  "topbar.button": "Side Chat",
  "topbar.buttonTitle": "Open Side Chat floating drawer (/btw)",
  "widget.launcher": "Side Chat",
  "widget.launcherTitle": "Open Side Chat drawer (/btw)",
  "widget.close": "Close",
  "widget.mainThreadLabel": "Main thread",
  "widget.noMainThreads": "No active main thread",
  "widget.branchLabel": "Side branch",
  "page.allMainThreads": "All main threads",
  "page.mainThreadSelect": "Main conversation",
  "page.filter.all": "All",
  "page.filter.persistent": "Persistent",
  "page.filter.ephemeral": "Ephemeral",
  "page.settings.toggle": "Settings",
  "page.settings.title": "Side Chat Settings",
  "page.settings.saved": "Saved",
  "page.settings.saving": "Saving…",
  "page.settings.widgetPosition": "Widget Dock Position",
  "page.settings.widgetPositionDesc": "Choose which corner hosts the floating launcher and drawer.",
  "page.settings.posRight": "Bottom Right",
  "page.settings.posLeft": "Bottom Left",
  "page.settings.showFloatingLauncher": "Show Floating Launcher",
  "page.settings.showFloatingLauncherDesc":
    "Show the floating pill button in the main window corner.",
  "page.settings.enableWebBtwShortcut": "Enable Web /btw Shortcut",
  "page.settings.enableWebBtwShortcutDesc":
    "Intercept /btw and /btw <question> in the Web main composer.",
  "header.new": "New Branch",
  "header.newShort": "New",
  "header.newTitle": "Create a new side chat branch from the selected main thread",
  "header.refresh": "Refresh",
  "header.refreshTitle": "Refresh branches and snapshot",
  "header.archive": "Archive",
  "header.archiveTitle": "Archive and remove this side chat branch",
  "header.renameTitle": "Rename side chat branch",
  "header.untitled": "Untitled side chat",
  "header.desktopBadge": "Desktop",
  "header.branchCount": "{count} branches",
  "mode.persistent.badge": "Persistent",
  "mode.persistent.tooltip":
    "Persistent branch: saved with the main thread across restarts and synced with Codex Desktop.",
  "mode.persistent.subtitle": "Saved with main thread · synced with Desktop",
  "mode.ephemeral.badge": "Ephemeral",
  "mode.ephemeral.tooltip":
    "Ephemeral branch: automatically enabled when the main thread does not support persistent attachment; cleared after Host restart.",
  "mode.ephemeral.subtitle": "Auto-fallback runtime branch · cleared on Host restart",
  "empty.noMainTitle": "No main conversation selected",
  "empty.noMainBody":
    "Start or select a local CodexHost conversation first, then create a Side Chat branch here.",
  "empty.draftTitle": "Main conversation is still a draft",
  "empty.draftBody":
    "Send the first message in the main conversation to create it, then send your side question here.",
  "empty.noBranchesTitle": "Ready for side questions",
  "empty.noBranchesBody":
    "Ask a follow-up question below or click New Branch. Prior main-thread history is included read-only and will not pollute the main turn.",
  "empty.branchReadyTitle": "Side Chat branch ready",
  "empty.branchReadyBody":
    "Type a side question below. Inherited main-thread context stays strictly read-only.",
  "empty.offlineTitle": "CodexHost client channel offline",
  "empty.offlineBody":
    "Make sure CodexHost local service is running, then click Refresh to reconnect.",
  "stale.title": "This side chat is no longer active",
  "stale.body":
    "Ephemeral side chats are cleared when the Host restarts. Start a new branch to continue.",
  "stale.action": "Start New Branch",
  "turns.loading": "Loading conversation…",
  "turns.streaming": "Side Chat is responding…",
  "turns.failed": "Turn failed: {message}",
  "turns.cancelled": "Turn stopped.",
  "turns.unknownOutcome": "Turn outcome uncertain: {reason}",
  "message.user": "You",
  "message.assistant": "Side Chat",
  "code.copy": "Copy",
  "code.copied": "Copied",
  "tool.thinking": "Thinking",
  "tool.command": "Command",
  "tool.commandExit": "exit {code}",
  "tool.fileChange": "File changes ({count})",
  "tool.fileAdd": "Add",
  "tool.fileUpdate": "Update",
  "tool.fileDelete": "Delete",
  "tool.mcp": "MCP · {server}/{tool}",
  "tool.dynamic": "Tool · {tool}",
  "tool.webSearch": "Web search",
  "tool.compaction": "Context compacted",
  "tool.arguments": "Arguments",
  "tool.output": "Output",
  "tool.cwd": "Directory",
  "tool.status.running": "Running",
  "tool.status.succeeded": "Done",
  "tool.status.failed": "Failed",
  "tool.status.cancelled": "Cancelled",
  "interaction.approvalTitle": "Approval required",
  "interaction.questionTitle": "Input required",
  "interaction.optional": "Optional",
  "interaction.otherPlaceholder": "Or enter a custom answer…",
  "interaction.textPlaceholder": "Enter your answer…",
  "interaction.secretNote": "Sensitive input (masked — never echoed in plain text)",
  "interaction.submit": "Submit answer",
  "interaction.submitting": "Submitting…",
  "interaction.dismiss": "Dismiss",
  "interaction.requiredError": "Please answer all required questions before submitting.",
  "composer.placeholder": "Ask a side question… (Enter to send, Shift+Enter for newline)",
  "composer.placeholderNoMain": "Select a main conversation first…",
  "composer.send": "Send",
  "composer.sending": "Sending…",
  "composer.stop": "Stop",
  "composer.stopping": "Stopping…",
  "composer.creating": "Creating…",
  "composer.dismissError": "Dismiss",
};

export const COPY_ZH = {
  "app.title": "侧边聊天",
  "app.subtitle": "基于主会话只读上下文的并行旁路分支",
  "status.online": "Host 已连接",
  "status.offline": "Host 通道离线",
  "status.checking": "正在检测通道…",
  "topbar.button": "侧边聊天",
  "topbar.buttonTitle": "打开侧边聊天悬浮抽屉（/btw）",
  "widget.launcher": "侧边聊天",
  "widget.launcherTitle": "打开侧边聊天抽屉（/btw）",
  "widget.close": "收起",
  "widget.mainThreadLabel": "主会话",
  "widget.noMainThreads": "暂无可用主会话",
  "widget.branchLabel": "侧边分支",
  "page.allMainThreads": "全部主会话",
  "page.mainThreadSelect": "所属主会话",
  "page.filter.all": "全部",
  "page.filter.persistent": "持久",
  "page.filter.ephemeral": "临时",
  "page.settings.toggle": "设置",
  "page.settings.title": "侧边聊天设置",
  "page.settings.saved": "已保存",
  "page.settings.saving": "保存中…",
  "page.settings.widgetPosition": "悬浮挂件停靠位置",
  "page.settings.widgetPositionDesc": "选择主窗口悬浮唤醒胶囊与抽屉面板停靠的角落。",
  "page.settings.posRight": "右下角",
  "page.settings.posLeft": "左下角",
  "page.settings.showFloatingLauncher": "常驻显示悬浮唤醒按钮",
  "page.settings.showFloatingLauncherDesc":
    "是否在主窗口角落常驻显示侧边聊天悬浮胶囊（关闭后仍可用顶栏按钮或 /btw 展开）。",
  "page.settings.enableWebBtwShortcut": "启用 Web 端 /btw 快捷提问",
  "page.settings.enableWebBtwShortcutDesc":
    "在 Web 主输入框拦截 /btw 与 /btw <问题> 直接发起侧边聊天。",
  "header.new": "新建侧边分支",
  "header.newShort": "新建",
  "header.newTitle": "基于当前主会话新建一个侧边聊天分支",
  "header.refresh": "刷新",
  "header.refreshTitle": "刷新侧边会话列表与当前快照",
  "header.archive": "归档",
  "header.archiveTitle": "归档并移除当前侧边聊天分支",
  "header.renameTitle": "重命名侧边聊天",
  "header.untitled": "未命名侧边聊天",
  "header.desktopBadge": "Desktop",
  "header.branchCount": "{count} 个分支",
  "mode.persistent.badge": "持久",
  "mode.persistent.tooltip":
    "持久分支：随主会话跨重启保留，并与 Codex Desktop 无缝互通。",
  "mode.persistent.subtitle": "随主会话保存 · 与 Desktop 互通",
  "mode.ephemeral.badge": "临时",
  "mode.ephemeral.tooltip":
    "临时分支：当前主会话不支持持久挂载时自动无感启用，Host 进程退出后清理。",
  "mode.ephemeral.subtitle": "自动回退运行期分支 · Host 重启后清理",
  "empty.noMainTitle": "尚未选择主会话",
  "empty.noMainBody": "请先在 CodexHost 中打开或选择一个本地主会话，即可在此发起侧边聊天。",
  "empty.draftTitle": "主会话尚未创建（草稿态）",
  "empty.draftBody":
    "当前主会话仍处于空白草稿态，请先在主对话中发送首条消息，随后即可发送下方已保留的旁路问题。",
  "empty.noBranchesTitle": "随时开启旁路提问",
  "empty.noBranchesBody":
    "直接在下方输入问题或点击「新建侧边分支」。主会话历史仅作为只读上下文引用，绝不干扰主对话轮次。",
  "empty.branchReadyTitle": "侧边聊天分支已就绪",
  "empty.branchReadyBody": "在下方输入你的旁路问题，主会话历史仅作只读参考。",
  "empty.offlineTitle": "CodexHost 客户端通道离线",
  "empty.offlineBody": "请确认本机 CodexHost 服务已启动，随后点击刷新重新连接。",
  "stale.title": "该侧边聊天已失效",
  "stale.body": "临时侧边分支会在 Host 重启后清理，请新建一个侧边分支继续提问。",
  "stale.action": "新建侧边分支",
  "turns.loading": "正在加载对话内容…",
  "turns.streaming": "侧边聊天正在回复…",
  "turns.failed": "本轮执行失败：{message}",
  "turns.cancelled": "本轮已停止。",
  "turns.unknownOutcome": "本轮结果未知：{reason}",
  "message.user": "你",
  "message.assistant": "侧边聊天",
  "code.copy": "复制",
  "code.copied": "已复制",
  "tool.thinking": "思考过程",
  "tool.command": "执行命令",
  "tool.commandExit": "退出码 {code}",
  "tool.fileChange": "文件变更（{count}）",
  "tool.fileAdd": "新增",
  "tool.fileUpdate": "修改",
  "tool.fileDelete": "删除",
  "tool.mcp": "MCP · {server}/{tool}",
  "tool.dynamic": "工具 · {tool}",
  "tool.webSearch": "网页搜索",
  "tool.compaction": "上下文已压缩",
  "tool.arguments": "参数",
  "tool.output": "输出",
  "tool.cwd": "工作目录",
  "tool.status.running": "执行中",
  "tool.status.succeeded": "已完成",
  "tool.status.failed": "失败",
  "tool.status.cancelled": "已取消",
  "interaction.approvalTitle": "需要审批确认",
  "interaction.questionTitle": "需要补充信息",
  "interaction.optional": "可选",
  "interaction.otherPlaceholder": "或输入其他自定义回答…",
  "interaction.textPlaceholder": "请输入你的回答…",
  "interaction.secretNote": "敏感输入（已掩码保护，不会明文回显）",
  "interaction.submit": "提交回答",
  "interaction.submitting": "提交中…",
  "interaction.dismiss": "忽略",
  "interaction.requiredError": "请先完成所有必填问题后再提交。",
  "composer.placeholder": "输入旁路问题…（Enter 发送，Shift+Enter 换行）",
  "composer.placeholderNoMain": "请先选择主会话…",
  "composer.send": "发送",
  "composer.sending": "发送中…",
  "composer.stop": "停止",
  "composer.stopping": "停止中…",
  "composer.creating": "正在创建…",
  "composer.dismissError": "关闭",
};

export function normalizeLocale(locale) {
  if (typeof locale !== "string" || !locale.trim()) return "en";
  return locale.toLowerCase().startsWith("zh") ? "zh-CN" : "en";
}

export function createTranslator(locale) {
  const normalized = normalizeLocale(locale);
  const dict = normalized === "zh-CN" ? COPY_ZH : COPY_EN;
  return (key, params) => {
    const template = dict[key] ?? COPY_EN[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/gu, (match, name) =>
      name in params ? String(params[name]) : match,
    );
  };
}

export function formatSideChatError(error, locale) {
  const isZh = normalizeLocale(locale) === "zh-CN";
  const code =
    error && typeof error === "object" && "code" in error ? error.code : undefined;
  const rawMessage =
    error instanceof Error
      ? error.message
      : error && typeof error === "object" && typeof error.message === "string"
        ? error.message
        : typeof error === "string"
          ? error
          : "";

  if (
    code === "side-chat/draft-source" ||
    /draft|sourceThreadId.*required|main conversation.*not.*created/iu.test(rawMessage)
  ) {
    return isZh
      ? "当前主对话尚未创建或仍处于草稿状态，请先在主对话中发送一条消息后再开启侧边聊天。"
      : "The main conversation is still a draft. Send a message in the main conversation before starting a Side Chat.";
  }

  if (code === "side-chat/channel-offline" || code === -32090) {
    return isZh
      ? "CodexHost 本机客户端通道暂时离线或正在重连，请确认服务运行后点击刷新重试。"
      : "CodexHost local client channel is offline or reconnecting. Ensure the Host is running and retry.";
  }

  if (code === -32072) {
    return isZh
      ? "外部原生会话当前正忙（可能有活动任务或在另一客户端打开），请稍候完成后重试。"
      : "The external native session is busy. Wait for its active operation to finish or close it in the other client, then retry.";
  }

  if (code === -32080) {
    return isZh
      ? "无法分叉创建侧边聊天：主对话当前轮次缺少可用的分叉检查点，请重新打开主对话后再试。"
      : "Cannot fork Side Chat: no fork checkpoint is available for the current turn. Reopen the main thread and retry.";
  }

  if (code === -32079) {
    return isZh
      ? "该侧边会话已失效或已被清理（临时分支在 Host 重启后不会保留），请新建一个侧边分支。"
      : "This Side Chat session is no longer available (ephemeral branches are cleared after a Host restart). Start a new branch.";
  }

  if (code === -32076) {
    return isZh
      ? "当前主对话所使用的 Harness 暂不支持分叉创建侧边聊天。"
      : "The Harness backing this conversation does not support forking Side Chats.";
  }

  if (rawMessage.trim()) {
    return rawMessage.trim();
  }

  return isZh
    ? "侧边聊天操作失败，请稍后重试。"
    : "Side Chat operation failed. Please try again.";
}
