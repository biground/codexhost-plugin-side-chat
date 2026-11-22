/**
 * Bilingual (zh / en) copy tables and namespace helpers for Side Chat UI & `/btw`.
 */
import type { ClientTranslateFn } from "../types.ts";
import { normalizeLocale, type SideChatLocale } from "./protocol.ts";

export const SIDE_CHAT_LOCALE_NS = "codexhostSideChat";

export const SIDE_CHAT_EN = {
  "tab.title": "Side Chat",
  "tab.renameAria": "Rename side chat",
  "guide.title": "Side Chat",
  "guide.description": "Ask side questions in parallel without polluting the main turn",
  "shortcut.new": "New Side Chat",
  "shortcut.noSession": "Open a conversation first to launch Side Chat.",
  "slash.label": "Side Chat (/btw)",
  "slash.description": "Open Side Chat or ask a quick side question without polluting the main turn",
  "slash.hint": "[question]",
  "slash.claimHint": "Type a side question and press Enter to ask in the right sidebar",
  "slash.section": "Side Chat",
  "slash.attachmentsUnsupported":
    "/btw does not support attachments. Remove attachments or send them in the main conversation.",
  "error.draftMainSession":
    "Send the first message in the main conversation to create the session, then start a side chat here.",
  "error.remoteHostUnsupported":
    "Side Chat is currently only supported for conversations running on the local Host.",
  "header.selectAria": "Switch side chat session",
  "header.new": "New",
  "header.newTitle": "Create a new side chat branch",
  "header.delete": "Archive",
  "header.deleteTitle": "Archive and remove current side chat",
  "header.refresh": "Refresh",
  "header.refreshTitle": "Refresh side chat list and messages",
  "header.desktopTag": "Desktop",
  "header.untitled": "Untitled side chat",
  "header.noThreadsOption": "No side chats yet",
  "mode.persistent.badge": "Persistent",
  "mode.persistent.subtitle": "Saved with the main thread and synced with Codex Desktop",
  "mode.ephemeral.badge": "Ephemeral",
  "mode.ephemeral.subtitle":
    "Auto-fallback runtime ephemeral branch; cleared after Host restart",
  "empty.draftTitle": "Main conversation not created yet",
  "empty.draftBody":
    "Send the first message in the main conversation to create the session, then start a side chat here.",
  "empty.remoteTitle": "Local Host sessions only",
  "empty.remoteBody":
    "Side Chat is currently only supported for conversations running on the local Host.",
  "empty.welcomeTitle": "Side Chat",
  "empty.welcomeBody":
    "Fork a read-only context branch from the main conversation to ask follow-up questions in parallel — even while the main turn is running. You can also type /btw <question> in the main composer.",
  "empty.startButton": "New Side Chat",
  "empty.branchReadyTitle": "Side Chat branch ready",
  "empty.branchReadyBody":
    "Ask anything below. Prior main-thread context is included read-only and won't pollute the main conversation.",
  "stale.title": "This side chat is no longer active",
  "stale.body":
    "Ephemeral side chats are cleared when the Host restarts. Start a fresh side chat to continue.",
  "stale.action": "Start New Side Chat",
  "turns.loadOlder": "Load earlier turns",
  "turns.loadingOlder": "Loading earlier turns…",
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
  "interaction.secretNote": "Sensitive input (masked)",
  "interaction.submit": "Submit answer",
  "interaction.submitting": "Submitting…",
  "interaction.dismiss": "Dismiss",
  "interaction.requiredError": "Please answer all required questions before submitting.",
  "composer.placeholder": "Ask a side question… (Enter to send, Shift+Enter for newline)",
  "composer.placeholderDraft": "Send a message in the main conversation first…",
  "composer.send": "Send",
  "composer.sending": "Sending…",
  "composer.stop": "Stop",
  "composer.stopping": "Stopping…",
  "composer.creating": "Creating branch…",
  "composer.dismissError": "Dismiss",
} as const;

export type SideChatLocaleKey = keyof typeof SIDE_CHAT_EN;

export const SIDE_CHAT_ZH: Record<SideChatLocaleKey, string> = {
  "tab.title": "侧边聊天",
  "tab.renameAria": "重命名侧边聊天",
  "guide.title": "侧边聊天",
  "guide.description": "在右侧栏并行提出旁路问题，不污染主对话轮次",
  "shortcut.new": "新建侧边聊天",
  "shortcut.noSession": "请先打开一个对话，再开启侧边聊天。",
  "slash.label": "侧边聊天 (/btw)",
  "slash.description": "打开右侧栏侧边聊天，或直接发起旁路提问而不污染主对话",
  "slash.hint": "[问题内容]",
  "slash.claimHint": "输入旁路问题后按 Enter，将直接在右侧栏新建侧边聊天并发送",
  "slash.section": "侧边聊天",
  "slash.attachmentsUnsupported":
    "/btw 暂不支持携带附件，请先移除附件或在主对话中发送。",
  "error.draftMainSession":
    "请先在主会话发送首条消息以创建会话，随后即可在此开启旁路侧边提问。",
  "error.remoteHostUnsupported": "当前仅支持本机 Host 会话开启侧边聊天。",
  "header.selectAria": "切换侧边聊天会话",
  "header.new": "新建",
  "header.newTitle": "新建一个侧边聊天分支",
  "header.delete": "归档",
  "header.deleteTitle": "归档并移除当前侧边聊天",
  "header.refresh": "刷新",
  "header.refreshTitle": "刷新侧边聊天列表与对话记录",
  "header.desktopTag": "Desktop",
  "header.untitled": "未命名侧边聊天",
  "header.noThreadsOption": "暂无侧边聊天",
  "mode.persistent.badge": "持久",
  "mode.persistent.subtitle": "随主会话保存，与 Codex Desktop 互通",
  "mode.ephemeral.badge": "临时",
  "mode.ephemeral.subtitle": "当前会话自动无感回退为运行期临时分支，重启 Host 后清理",
  "empty.draftTitle": "主会话尚未创建",
  "empty.draftBody":
    "请先在主会话发送首条消息以创建会话，随后即可在此开启旁路侧边提问。",
  "empty.remoteTitle": "仅支持本机 Host 会话",
  "empty.remoteBody": "当前仅支持本机 Host 会话开启侧边聊天。",
  "empty.welcomeTitle": "侧边聊天",
  "empty.welcomeBody":
    "基于主会话只读上下文开启独立旁路分支，主会话运行期间也可并行提问。也可在主输入框直接输入 /btw <问题> 快捷直发。",
  "empty.startButton": "新建侧边聊天",
  "empty.branchReadyTitle": "侧边聊天分支已就绪",
  "empty.branchReadyBody":
    "在下方输入你的旁路问题。主会话历史仅作为只读参考，不会干扰主对话进程。",
  "stale.title": "该侧边聊天已失效",
  "stale.body": "临时侧边分支会在 Host 重启后清理，请新建一个侧边聊天继续提问。",
  "stale.action": "新建侧边聊天",
  "turns.loadOlder": "加载更早对话",
  "turns.loadingOlder": "正在加载更早对话…",
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
  "interaction.secretNote": "敏感输入（已掩码保护）",
  "interaction.submit": "提交回答",
  "interaction.submitting": "提交中…",
  "interaction.dismiss": "关闭",
  "interaction.requiredError": "请先完成所有必填问题后再提交。",
  "composer.placeholder": "输入旁路问题…（Enter 发送，Shift+Enter 换行）",
  "composer.placeholderDraft": "请先在主会话发送首条消息…",
  "composer.send": "发送",
  "composer.sending": "发送中…",
  "composer.stop": "停止",
  "composer.stopping": "停止中…",
  "composer.creating": "正在创建分支…",
  "composer.dismissError": "关闭",
};

export type SideChatTranslate = (
  key: SideChatLocaleKey,
  params?: Record<string, string | number>,
) => string;

export function interpolateCopy(
  template: string,
  params?: Record<string, string | number>,
): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/gu, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

/**
 * Creates a standalone translator backed directly by the built-in zh/en tables.
 * Used as fallback or in unit tests without a host LocaleRuntime.
 */
export function createSideChatTranslator(localeInput?: SideChatLocale | string): SideChatTranslate {
  const locale = normalizeLocale(localeInput);
  const dict = locale === "zh" ? SIDE_CHAT_ZH : SIDE_CHAT_EN;
  return (key, params) => interpolateCopy(dict[key] ?? SIDE_CHAT_EN[key] ?? key, params);
}

/**
 * Wraps a host `t(key, params)` function so missing keys fall back to the built-in copy.
 */
export function wrapHostTranslator(
  hostT: ClientTranslateFn | undefined,
  localeInput?: SideChatLocale | string | (() => SideChatLocale | string),
): SideChatTranslate {
  const resolveFallback = (): SideChatTranslate =>
    createSideChatTranslator(typeof localeInput === "function" ? localeInput() : localeInput);
  if (!hostT) return (key, params) => resolveFallback()(key, params);
  return (key, params) => {
    const resolved = hostT(key, params);
    return resolved === key ? resolveFallback()(key, params) : resolved;
  };
}
