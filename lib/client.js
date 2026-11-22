window.__ModuleLoader__.load({ id: "codexhost-plugin-side-chat", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  BTW_TRIGGER_SOURCE_NAME: () => BTW_TRIGGER_SOURCE_NAME,
  ChChannelClient: () => ChChannelClient,
  ChEventsSubscriber: () => ChEventsSubscriber,
  ChevronIcon: () => ChevronIcon,
  InteractionCards: () => InteractionCards,
  MarkdownContent: () => MarkdownContent,
  PlusIcon: () => PlusIcon,
  REASONING_TRANSCRIPT_COMMAND: () => REASONING_TRANSCRIPT_COMMAND,
  RefreshIcon: () => RefreshIcon,
  SIDE_CHAT_BOUNDARY_BLOCK: () => SIDE_CHAT_BOUNDARY_BLOCK,
  SIDE_CHAT_BOUNDARY_END: () => SIDE_CHAT_BOUNDARY_END,
  SIDE_CHAT_BOUNDARY_START: () => SIDE_CHAT_BOUNDARY_START,
  SIDE_CHAT_CSS: () => SIDE_CHAT_CSS,
  SIDE_CHAT_EN: () => SIDE_CHAT_EN,
  SIDE_CHAT_LOCALE_NS: () => SIDE_CHAT_LOCALE_NS,
  SIDE_CHAT_SHORTCUT_DEFAULTS: () => SIDE_CHAT_SHORTCUT_DEFAULTS,
  SIDE_CHAT_SHORTCUT_ID: () => SIDE_CHAT_SHORTCUT_ID,
  SIDE_CHAT_STYLE_ID: () => SIDE_CHAT_STYLE_ID,
  SIDE_CHAT_TAB_KIND: () => SIDE_CHAT_TAB_KIND,
  SIDE_CHAT_ZH: () => SIDE_CHAT_ZH,
  SendIcon: () => SendIcon,
  SideChatController: () => SideChatController,
  SideChatGuide: () => SideChatGuide,
  SideChatGuideArtwork: () => SideChatGuideArtwork,
  SideChatIcon: () => SideChatIcon,
  SideChatPanelView: () => SideChatPanelView,
  SideChatRpcError: () => SideChatRpcError,
  SideChatStoreClient: () => SideChatStoreClient,
  SideChatTabBody: () => SideChatTabBody,
  SideChatTabManager: () => SideChatTabManager,
  SideChatTitle: () => SideChatTitle,
  StopIcon: () => StopIcon,
  ToolItemCard: () => ToolItemCard,
  TrashIcon: () => TrashIcon,
  apply: () => apply,
  buildInteractionResponseResult: () => buildInteractionResponseResult,
  buildRespondRequest: () => buildRespondRequest,
  createBtwInputTriggerSource: () => createBtwInputTriggerSource,
  createClientUserMessageId: () => createClientUserMessageId,
  createSideChatTranslator: () => createSideChatTranslator,
  deriveSideChatTitle: () => deriveSideChatTitle,
  ensureSideChatStyles: () => ensureSideChatStyles,
  formatApprovalActionLabels: () => formatApprovalActionLabels,
  formatSideChatError: () => formatSideChatError,
  hasSecretQuestion: () => hasSecretQuestion,
  hasSideChatBoundary: () => hasSideChatBoundary,
  inject: () => inject,
  injectSideChatBoundary: () => injectSideChatBoundary,
  interpolateCopy: () => interpolateCopy,
  isAttachToSourceUnsupportedError: () => isAttachToSourceUnsupportedError,
  matchesBtwQuery: () => matchesBtwQuery,
  name: () => name,
  normalizeLocale: () => normalizeLocale,
  normalizeSnapshot: () => normalizeSnapshot,
  normalizeTurn: () => normalizeTurn,
  notifyMainComposer: () => notifyMainComposer,
  openOrFocusSideChatTab: () => openOrFocusSideChatTab,
  parseBtwCommandLine: () => parseBtwCommandLine,
  parseSideChatTabParams: () => parseSideChatTabParams,
  registerBtwInputTrigger: () => registerBtwInputTrigger,
  resolveConversationItems: () => resolveConversationItems,
  resolveMainSessionFromSnapshot: () => resolveMainSessionFromSnapshot,
  resolveMainSessionRow: () => resolveMainSessionRow,
  stripSideChatBoundary: () => stripSideChatBoundary,
  stripSideChatBoundaryPrefix: () => stripSideChatBoundaryPrefix,
  wrapHostTranslator: () => wrapHostTranslator
});
module.exports = __toCommonJS(index_exports);

// src/client/icons.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function SideChatIcon({ size = 16, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3", y: "4", width: "18", height: "16", rx: "3" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M12 4v16" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15.2 10h2.8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M15.2 14h2" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.5 9.5h2.8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6.5 13.5h2" })
      ]
    }
  );
}
function SideChatGuideArtwork({ size = 26, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 28 28",
      fill: "none",
      className,
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "rect",
          {
            x: "3",
            y: "4.5",
            width: "22",
            height: "19",
            rx: "4",
            stroke: "currentColor",
            strokeWidth: "1.7"
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M14.5 4.5v19", stroke: "currentColor", strokeWidth: "1.5", opacity: "0.55" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "6", y: "9", width: "5.5", height: "2", rx: "1", fill: "currentColor", opacity: "0.55" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "6", y: "13", width: "4", height: "2", rx: "1", fill: "currentColor", opacity: "0.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "path",
          {
            d: "M17.2 10.5a2 2 0 0 1 2-2h2.2a2 2 0 0 1 2 2v3.6a2 2 0 0 1-2 2h-1.6l-1.8 1.6v-1.6h-.8a2 2 0 0 1-2-2v-3.6Z",
            fill: "currentColor"
          }
        )
      ]
    }
  );
}
function PlusIcon({ size = 14, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      className,
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 3.2v9.6M3.2 8h9.6" })
    }
  );
}
function TrashIcon({ size = 14, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2.8 4.4h10.4M6.2 4.4V3a.8.8 0 0 1 .8-.8h2a.8.8 0 0 1 .8.8v1.4" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M4.2 4.4l.7 8.4a1 1 0 0 0 1 .9h4.2a1 1 0 0 0 1-.9l.7-8.4" })
      ]
    }
  );
}
function RefreshIcon({ size = 14, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.6",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      "aria-hidden": "true",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M13 8a5 5 0 1 1-1.4-3.5L13 6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M13 3.2V6h-2.8" })
      ]
    }
  );
}
function ChevronIcon({
  size = 13,
  expanded = false,
  className
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.8",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      style: {
        transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
        transition: "transform 0.12s ease",
        flex: "none"
      },
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M6 3.5 10.5 8 6 12.5" })
    }
  );
}
function StopIcon({ size = 13, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "currentColor",
      className,
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("rect", { x: "3.5", y: "3.5", width: "9", height: "9", rx: "1.6" })
    }
  );
}
function SendIcon({ size = 13, className }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "1.7",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      className,
      "aria-hidden": "true",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M8 12.8V3.2M4 7.2 8 3.2l4 4" })
    }
  );
}

// src/client/boundary.ts
var SIDE_CHAT_BOUNDARY_START = "<!-- codexhost-side-chat:boundary:v1 -->";
var SIDE_CHAT_BOUNDARY_END = "<!-- /codexhost-side-chat:boundary:v1 -->";
var SIDE_CHAT_BOUNDARY_BLOCK = [
  SIDE_CHAT_BOUNDARY_START,
  "[Side Chat Read-Only Context Boundary]",
  "Everything prior to this message is inherited history from the main conversation for read-only reference only.",
  "You are answering a side question in an isolated Side Chat branch. Unless the user explicitly asks you to make changes here, DO NOT modify workspace files, execute mutating commands, or start background tasks. Focus strictly on answering the user's side question below.",
  SIDE_CHAT_BOUNDARY_END
].join("\n");
var NORMALIZED_BOUNDARY_BLOCK = SIDE_CHAT_BOUNDARY_BLOCK.replace(/\s+/gu, " ").trim();
var BOUNDARY_DETECT_PATTERN = /^\s*<!-- codexhost-side-chat:boundary:v1 -->[\s\S]*?<!-- \/codexhost-side-chat:boundary:v1 -->/u;
var BOUNDARY_STRIP_PATTERN = /^\s*<!-- codexhost-side-chat:boundary:v1 -->[\s\S]*?<!-- \/codexhost-side-chat:boundary:v1 -->(?:[ \t]*(?:\r?\n){1,2}|[ \t]+)?/u;
function hasSideChatBoundary(rawText) {
  return BOUNDARY_DETECT_PATTERN.test(rawText);
}
function injectSideChatBoundary(userText) {
  if (hasSideChatBoundary(userText)) return userText;
  return `${SIDE_CHAT_BOUNDARY_BLOCK}

${userText}`;
}
function stripSideChatBoundary(rawText) {
  if (!rawText) return "";
  if (BOUNDARY_DETECT_PATTERN.test(rawText)) {
    return rawText.replace(BOUNDARY_STRIP_PATTERN, "");
  }
  const trimmedStart = rawText.trimStart();
  if (trimmedStart.startsWith(SIDE_CHAT_BOUNDARY_START)) {
    const candidate = trimmedStart.replace(/(?:…|\.{3})\s*$/u, "").replace(/\s+/gu, " ").trim();
    if (NORMALIZED_BOUNDARY_BLOCK.startsWith(candidate)) {
      return "";
    }
  }
  return rawText;
}
var stripSideChatBoundaryPrefix = stripSideChatBoundary;
function deriveSideChatTitle(rawText, maxLength = 60) {
  const clean = stripSideChatBoundary(rawText).replace(/\s+/gu, " ").trim();
  if (!clean) return "";
  const chars = Array.from(clean);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}\u2026` : clean;
}

// src/client/protocol.ts
var REASONING_TRANSCRIPT_COMMAND = "thinking";
var SideChatRpcError = class extends Error {
  code;
  status;
  rpcMethod;
  constructor(code, message, options) {
    super(message, options?.cause !== void 0 ? { cause: options.cause } : void 0);
    this.name = "SideChatRpcError";
    this.code = code;
    if (options?.status !== void 0) this.status = options.status;
    if (options?.rpcMethod !== void 0) this.rpcMethod = options.rpcMethod;
  }
};
function normalizeLocale(locale) {
  if (!locale) return "en";
  return locale.toLowerCase().startsWith("zh") ? "zh" : "en";
}
function extractErrorCode(error) {
  if (error instanceof SideChatRpcError) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    const candidate = error.code;
    if (typeof candidate === "number" || typeof candidate === "string") return candidate;
  }
  return void 0;
}
function extractErrorStatus(error) {
  if (error instanceof SideChatRpcError) return error.status;
  if (error && typeof error === "object" && "status" in error) {
    const candidate = error.status;
    if (typeof candidate === "number") return candidate;
  }
  return void 0;
}
function extractErrorMessage(error) {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return typeof error === "string" ? error : String(error ?? "");
}
function isAttachToSourceUnsupportedError(error) {
  const code = extractErrorCode(error);
  if (code === -32602) return true;
  const message = extractErrorMessage(error);
  return /attachToSource|paginated parent|persistent parent|unknown field.*attachToSource/iu.test(
    message
  );
}
function formatSideChatError(error, localeInput) {
  const locale = normalizeLocale(localeInput);
  const code = extractErrorCode(error);
  const status = extractErrorStatus(error);
  const rawMessage = extractErrorMessage(error);
  if (code === "side-chat/draft-source" || /draft|sourceThreadId.*required|main conversation.*not.*created/iu.test(rawMessage)) {
    return locale === "zh" ? "\u5F53\u524D\u4E3B\u5BF9\u8BDD\u5C1A\u672A\u521B\u5EFA\u6216\u4ECD\u5904\u4E8E\u8349\u7A3F\u72B6\u6001\uFF0C\u8BF7\u5148\u5728\u4E3B\u5BF9\u8BDD\u4E2D\u53D1\u9001\u4E00\u6761\u6D88\u606F\u540E\u518D\u5F00\u542F\u4FA7\u8FB9\u804A\u5929\u3002" : "The main conversation is still a draft. Send a message in the main conversation before opening a Side Chat.";
  }
  if (code === -32072) {
    return locale === "zh" ? "\u5916\u90E8\u539F\u751F\u4F1A\u8BDD\u5F53\u524D\u6B63\u5FD9\uFF08\u53EF\u80FD\u6709\u6D3B\u52A8\u4EFB\u52A1\u6216\u5728\u53E6\u4E00\u5BA2\u6237\u7AEF\u6253\u5F00\uFF09\uFF0C\u8BF7\u7A0D\u5019\u5B8C\u6210\u540E\u91CD\u8BD5\u3002" : "The external native session is busy. Wait for its active operation to finish or close it in the other client, then retry.";
  }
  if (code === -32080) {
    return locale === "zh" ? "\u65E0\u6CD5\u5206\u53C9\u521B\u5EFA\u4FA7\u8FB9\u804A\u5929\uFF1A\u4E3B\u5BF9\u8BDD\u5F53\u524D\u8F6E\u6B21\u7F3A\u5C11\u53EF\u7528\u7684\u5206\u53C9\u68C0\u67E5\u70B9\uFF08\u5982\u521A\u7ECF\u8FC7\u63D2\u8BDD\u5F15\u5BFC\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u4E3B\u5BF9\u8BDD\u540E\u518D\u8BD5\uFF09\u3002" : "Cannot fork Side Chat: no fork checkpoint is available for the current turn (reopen the thread if the latest turn took steered input, then retry).";
  }
  if (code === -32079) {
    return locale === "zh" ? "\u8BE5\u4FA7\u8FB9\u4F1A\u8BDD\u5DF2\u5931\u6548\u6216\u5DF2\u88AB\u6E05\u7406\uFF08\u4E34\u65F6\u4FA7\u8FB9\u4F1A\u8BDD\u5728 Host \u91CD\u542F\u540E\u4E0D\u4F1A\u4FDD\u7559\uFF09\uFF0C\u8BF7\u65B0\u5EFA\u4E00\u4E2A\u4FA7\u8FB9\u804A\u5929\u3002" : "This Side Chat session is no longer available (ephemeral Side Chats are cleared after a Host restart). Please start a new Side Chat.";
  }
  if (code === -32076) {
    return locale === "zh" ? "\u5F53\u524D\u4E3B\u5BF9\u8BDD\u6240\u4F7F\u7528\u7684 Harness \u6682\u4E0D\u652F\u6301\u5206\u53C9\u521B\u5EFA\u4FA7\u8FB9\u804A\u5929\u3002" : "The Harness backing this conversation does not support forking Side Chats.";
  }
  if (code === -32090 || status === 503) {
    return locale === "zh" ? "CodexHost \u5BA2\u6237\u7AEF\u901A\u9053\u6682\u65F6\u4E0D\u53EF\u7528\u6216\u6B63\u5728\u91CD\u8FDE\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002" : "CodexHost client channel is temporarily unavailable or reconnecting. Please try again shortly.";
  }
  if (code === "auth/unauthorized" || status === 401) {
    return locale === "zh" ? "\u5F53\u524D\u672A\u767B\u5F55\u6216\u8BBF\u95EE\u51ED\u636E\u5DF2\u5931\u6548\uFF0C\u8BF7\u91CD\u65B0\u767B\u5F55\u540E\u91CD\u8BD5\u3002" : "Authentication is required or has expired. Please sign in and try again.";
  }
  if (code === "auth/forbidden" || code === "auth/cross-origin" || status === 403) {
    return locale === "zh" ? "\u8BBF\u95EE\u88AB\u62D2\u7EDD\uFF1A\u4FA7\u8FB9\u804A\u5929\u9700\u8981\u4E3B\u5BC6\u94A5\u5B8C\u6574\u6743\u9650\u4E14\u4EC5\u5141\u8BB8\u540C\u6E90\u64CD\u4F5C\u3002" : "Access denied. Side Chat requires primary full access and same-origin requests.";
  }
  if (rawMessage.trim().length > 0) {
    return rawMessage;
  }
  return locale === "zh" ? "\u4FA7\u8FB9\u804A\u5929\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002" : "Side Chat operation failed. Please try again.";
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function resolveConversationItems(turn) {
  if (turn.codexhostFileOperations === void 0) {
    return [...turn.items];
  }
  const before = /* @__PURE__ */ new Map();
  for (const operation of turn.codexhostFileOperations) {
    const group = before.get(operation.beforeItemId) ?? [];
    group.push(operation.item);
    before.set(operation.beforeItemId, group);
  }
  const items = [];
  for (const item of turn.items) {
    if (item.type === "fileChange") continue;
    items.push(...before.get(item.id) ?? [], item);
    before.delete(item.id);
  }
  for (const group of before.values()) {
    items.push(...group);
  }
  return items;
}
function normalizeFileChangeKind(value) {
  const kindType = typeof value === "string" ? value : isRecord(value) ? value.type : void 0;
  if (kindType === "add" || kindType === "create") return "add";
  if (kindType === "delete") return "delete";
  return "update";
}
function normalizeFileChanges(value) {
  if (!Array.isArray(value)) return [];
  const changes = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    changes.push({
      path: typeof entry.path === "string" ? entry.path : "",
      kind: normalizeFileChangeKind(entry.kind),
      unifiedDiff: typeof entry.diff === "string" ? entry.diff : typeof entry.unifiedDiff === "string" ? entry.unifiedDiff : ""
    });
  }
  return changes;
}
function extractMcpResultText(item) {
  if (isRecord(item.error) && typeof item.error.message === "string") {
    return item.error.message;
  }
  if (!isRecord(item.result) || !Array.isArray(item.result.content)) return "";
  return item.result.content.map(
    (block) => isRecord(block) && block.type === "text" && typeof block.text === "string" ? block.text : JSON.stringify(block)
  ).join("\n");
}
function extractDynamicToolOutput(item) {
  const source = item.result ?? item.contentItems;
  if (Array.isArray(source)) {
    const textParts = source.map(
      (entry) => isRecord(entry) && entry.type === "text" && typeof entry.text === "string" ? entry.text : JSON.stringify(entry)
    );
    return textParts.join("\n");
  }
  if (typeof source === "string") return source;
  if (source !== void 0) return JSON.stringify(source);
  return "";
}
function extractUserMessageText(item) {
  if (Array.isArray(item.content)) {
    return item.content.map((part) => {
      if (typeof part === "string") return part;
      if (isRecord(part) && part.type === "text" && typeof part.text === "string") {
        return part.text;
      }
      return "";
    }).filter((part) => part.length > 0).join("\n");
  }
  if (typeof item.text === "string") return item.text;
  return "";
}
function normalizeItemStatus(rawStatus, itemType, turnFinished) {
  if (rawStatus === "completed") return "succeeded";
  if (rawStatus === "failed") return "failed";
  if (rawStatus === "declined" || rawStatus === "interrupted") return "cancelled";
  if (rawStatus === "inProgress" || rawStatus === "running") return "running";
  if (itemType === "webSearch" || turnFinished) return "succeeded";
  return "running";
}
function normalizeItem(item, reasoningPreviewIds, turnFinished) {
  const id = item.id;
  switch (item.type) {
    case "userMessage": {
      const rawText = extractUserMessageText(item);
      const hadBoundaryPrefix = hasSideChatBoundary(rawText);
      return {
        kind: "userMessage",
        id,
        text: stripSideChatBoundary(rawText),
        hadBoundaryPrefix,
        ...typeof item.clientId === "string" ? { clientId: item.clientId } : {}
      };
    }
    case "agentMessage":
      return {
        kind: "agentMessage",
        id,
        text: String(item.codexhostNativeText ?? item.text ?? ""),
        ...typeof item.phase === "string" ? { phase: item.phase } : {}
      };
    case "reasoning": {
      const summary = Array.isArray(item.summary) ? item.summary.filter((entry) => typeof entry === "string") : [];
      const content = Array.isArray(item.content) ? item.content.filter((entry) => typeof entry === "string") : [];
      return {
        kind: "reasoning",
        id,
        summary,
        content,
        text: [...summary, ...content].join("\n")
      };
    }
    case "commandExecution":
      if (item.command === REASONING_TRANSCRIPT_COMMAND && reasoningPreviewIds.has(`${id}-summary`)) {
        return void 0;
      }
      return {
        kind: "commandExecution",
        id,
        command: String(item.command ?? ""),
        cwd: String(item.cwd ?? ""),
        output: String(item.aggregatedOutput ?? ""),
        exitCode: typeof item.exitCode === "number" ? item.exitCode : null,
        status: normalizeItemStatus(item.status, item.type, turnFinished)
      };
    case "fileChange":
      return {
        kind: "fileChange",
        id,
        changes: normalizeFileChanges(item.changes),
        status: normalizeItemStatus(item.status, item.type, turnFinished)
      };
    case "mcpToolCall":
      return {
        kind: "mcpToolCall",
        id,
        server: String(item.server ?? ""),
        tool: String(item.tool ?? ""),
        arguments: item.arguments ?? {},
        output: extractMcpResultText(item),
        ...isRecord(item.error) && typeof item.error.message === "string" ? { errorMessage: item.error.message } : {},
        status: normalizeItemStatus(item.status, item.type, turnFinished)
      };
    case "dynamicToolCall":
      return {
        kind: "dynamicToolCall",
        id,
        tool: String(item.tool ?? item.name ?? item.type),
        arguments: item.arguments ?? {},
        output: extractDynamicToolOutput(item),
        status: normalizeItemStatus(item.status, item.type, turnFinished)
      };
    case "webSearch":
      return {
        kind: "webSearch",
        id,
        query: String(item.query ?? ""),
        status: normalizeItemStatus(item.status, item.type, turnFinished)
      };
    case "contextCompaction":
      return {
        kind: "contextCompaction",
        id,
        status: normalizeItemStatus(item.status, item.type, turnFinished),
        ...isRecord(item.error) && typeof item.error.message === "string" ? { errorMessage: item.error.message } : {}
      };
    default:
      return void 0;
  }
}
function normalizeTurn(turn) {
  const isActive = turn.status === "inProgress" || turn.status === "running";
  const turnFinished = !isActive;
  let outcome;
  let unknownReason;
  if (isActive) {
    outcome = "active";
  } else if (turn.status === "completed" && turn.codexhostTurnOutcome?.status === "unknown") {
    outcome = "unknown";
    unknownReason = turn.codexhostTurnOutcome.reason;
  } else if (turn.status === "failed") {
    outcome = "failed";
  } else if (turn.status === "interrupted") {
    outcome = "cancelled";
  } else {
    outcome = "succeeded";
  }
  const orderedRawItems = resolveConversationItems(turn);
  const reasoningPreviewIds = new Set(
    orderedRawItems.filter((item) => item.type === "reasoning").map((item) => item.id)
  );
  const items = [];
  for (const rawItem of orderedRawItems) {
    const parsed = normalizeItem(rawItem, reasoningPreviewIds, turnFinished);
    if (parsed) items.push(parsed);
  }
  return {
    id: turn.id,
    status: turn.status,
    isActive,
    outcome,
    ...unknownReason !== void 0 ? { unknownReason } : {},
    ...typeof turn.error?.message === "string" ? { errorMessage: turn.error.message } : {},
    ...turn.startedAt !== void 0 ? { startedAt: turn.startedAt } : {},
    ...turn.completedAt !== void 0 ? { completedAt: turn.completedAt } : {},
    ...turn.fingerprint !== void 0 ? { fingerprint: turn.fingerprint } : {},
    items
  };
}
function normalizeSnapshot(snapshot) {
  const chronologicalTurns = [...snapshot.turnsPage.data].reverse().map(normalizeTurn);
  let fallbackActiveTurnId = null;
  for (let i = chronologicalTurns.length - 1; i >= 0; i -= 1) {
    if (chronologicalTurns[i]?.isActive) {
      fallbackActiveTurnId = chronologicalTurns[i].id;
      break;
    }
  }
  const activeTurnId = snapshot.activeTurnId ?? fallbackActiveTurnId;
  const statusType = snapshot.thread.status?.type ?? "idle";
  const isRunning = activeTurnId !== null || statusType === "active";
  const rawNativeError = snapshot.thread.nativeInteractionError ?? snapshot.thread.nativeSendError ?? null;
  return {
    threadId: snapshot.thread.id,
    epoch: snapshot.cursor.epoch,
    sequence: snapshot.cursor.sequence,
    title: typeof snapshot.thread.name === "string" && snapshot.thread.name.trim().length > 0 ? stripSideChatBoundary(snapshot.thread.name) : null,
    preview: stripSideChatBoundary(snapshot.thread.preview ?? ""),
    statusType,
    activeTurnId,
    isRunning,
    turns: chronologicalTurns,
    hasOlderTurns: snapshot.turnsPage.nextCursor !== null,
    nextTurnsCursor: snapshot.turnsPage.nextCursor,
    interactions: snapshot.interactions ?? [],
    nativeError: typeof rawNativeError === "string" ? rawNativeError : null
  };
}
function resolveFetch(customFetch) {
  if (customFetch) return customFetch;
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  throw new Error("No fetch implementation is available.");
}
function joinBaseUrl(baseUrl, path) {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/+$/u, "")}${path}`;
}
function createClientUserMessageId() {
  const randomUuid = typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `sidechat-${randomUuid}`;
}
async function parseJsonOrThrow(response, rpcMethod) {
  let payload;
  try {
    payload = await response.json();
  } catch (cause) {
    if (!response.ok) {
      throw new SideChatRpcError(
        response.status,
        `HTTP ${response.status} ${response.statusText}`.trim(),
        { status: response.status, ...rpcMethod ? { rpcMethod } : {}, cause }
      );
    }
    throw new SideChatRpcError("invalid-json", "Server returned an invalid JSON payload.", {
      status: response.status,
      ...rpcMethod ? { rpcMethod } : {},
      cause
    });
  }
  if (isRecord(payload) && isRecord(payload.error)) {
    const code = typeof payload.error.code === "number" || typeof payload.error.code === "string" ? payload.error.code : response.status || -32603;
    const message = typeof payload.error.message === "string" ? payload.error.message : `Request failed (${String(code)})`;
    throw new SideChatRpcError(code, message, {
      status: response.status,
      ...rpcMethod ? { rpcMethod } : {}
    });
  }
  if (!response.ok) {
    throw new SideChatRpcError(
      response.status,
      `HTTP ${response.status} ${response.statusText}`.trim(),
      { status: response.status, ...rpcMethod ? { rpcMethod } : {} }
    );
  }
  return payload;
}
var ChChannelClient = class {
  fetchImpl;
  baseUrl;
  constructor(options = {}) {
    this.fetchImpl = resolveFetch(options.fetch);
    this.baseUrl = options.baseUrl ?? "";
  }
  async rpc(method, params, options) {
    const response = await this.fetchImpl(joinBaseUrl(this.baseUrl, "/api/ch/v1/rpc"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method, params }),
      ...options?.signal ? { signal: options.signal } : {}
    });
    const parsed = await parseJsonOrThrow(response, method);
    return parsed.result;
  }
  async snapshot(threadId, options) {
    const body = { threadId };
    if (options?.knownTurns !== void 0) body.knownTurns = options.knownTurns;
    if (options?.truncateToolOutput !== void 0) {
      body.truncateToolOutput = options.truncateToolOutput;
    }
    const response = await this.fetchImpl(joinBaseUrl(this.baseUrl, "/api/ch/v1/snapshot"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      ...options?.signal ? { signal: options.signal } : {}
    });
    const parsed = await parseJsonOrThrow(
      response,
      "snapshot"
    );
    return parsed.result;
  }
  async respond(payload, options) {
    const response = await this.fetchImpl(joinBaseUrl(this.baseUrl, "/api/ch/v1/respond"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      ...options?.signal ? { signal: options.signal } : {}
    });
    const parsed = await parseJsonOrThrow(
      response,
      "respond"
    );
    return parsed.result;
  }
  forkThread(params) {
    return this.rpc("thread/fork", { ...params });
  }
  listAttachedThreads(sourceThreadId, options) {
    return this.rpc("thread/list", {
      attachedToThreadId: sourceThreadId,
      sortKey: "updated_at",
      sortDirection: "desc",
      limit: options?.limit ?? 100,
      ...options?.cursor ? { cursor: options.cursor } : {}
    });
  }
  listTurnsPage(threadId, cursor, limit = 5) {
    return this.rpc("thread/turns/list", {
      threadId,
      cursor,
      limit,
      sortDirection: "desc",
      itemsView: "full"
    });
  }
  startTurn(params) {
    return this.rpc("turn/start", {
      threadId: params.threadId,
      input: [{ type: "text", text: params.text }],
      clientUserMessageId: params.clientUserMessageId ?? createClientUserMessageId()
    });
  }
  interruptTurn(params) {
    return this.rpc("turn/interrupt", {
      threadId: params.threadId,
      turnId: params.turnId
    });
  }
  renameThread(params) {
    return this.rpc("thread/name/set", {
      threadId: params.threadId,
      name: params.name
    });
  }
  archiveThread(params) {
    return this.rpc("thread/archive", {
      threadId: params.threadId
    });
  }
};
var SideChatStoreClient = class {
  fetchImpl;
  baseUrl;
  constructor(options = {}) {
    this.fetchImpl = resolveFetch(options.fetch);
    this.baseUrl = options.baseUrl ?? "";
  }
  async list(sourceThreadId) {
    const query = sourceThreadId ? `?sourceThreadId=${encodeURIComponent(sourceThreadId)}` : "";
    const response = await this.fetchImpl(
      joinBaseUrl(this.baseUrl, `/codexhost-side-chat/threads${query}`),
      {
        method: "GET",
        credentials: "same-origin"
      }
    );
    const parsed = await parseJsonOrThrow(response);
    return [...parsed.threads];
  }
  async upsert(input) {
    const response = await this.fetchImpl(
      joinBaseUrl(this.baseUrl, "/codexhost-side-chat/threads"),
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input)
      }
    );
    return parseJsonOrThrow(response);
  }
  async patch(threadId, patch) {
    const response = await this.fetchImpl(
      joinBaseUrl(this.baseUrl, `/codexhost-side-chat/threads/${encodeURIComponent(threadId)}`),
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch)
      }
    );
    return parseJsonOrThrow(response);
  }
  async remove(threadId, sourceThreadId) {
    const query = sourceThreadId ? `?sourceThreadId=${encodeURIComponent(sourceThreadId)}` : "";
    const response = await this.fetchImpl(
      joinBaseUrl(
        this.baseUrl,
        `/codexhost-side-chat/threads/${encodeURIComponent(threadId)}${query}`
      ),
      {
        method: "DELETE",
        credentials: "same-origin"
      }
    );
    return parseJsonOrThrow(response);
  }
};
var ChEventsSubscriber = class {
  constructor(options) {
    this.options = options;
    this.fetchImpl = resolveFetch(options.fetch);
    this.baseUrl = options.baseUrl ?? "";
    this.reconnectBaseMs = Math.max(10, options.reconnectBaseMs ?? 500);
    this.reconnectMaxMs = Math.max(this.reconnectBaseMs, options.reconnectMaxMs ?? 5e3);
    this.backoffMs = this.reconnectBaseMs;
  }
  fetchImpl;
  baseUrl;
  reconnectBaseMs;
  reconnectMaxMs;
  running = false;
  abortController = null;
  reconnectTimer = null;
  backoffMs;
  cursor = null;
  online = false;
  get lastCursor() {
    return this.cursor;
  }
  start() {
    if (this.running) return;
    this.running = true;
    this.backoffMs = this.reconnectBaseMs;
    void this.connect();
  }
  stop() {
    if (!this.running) return;
    this.running = false;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.setOnline(false);
  }
  setOnline(next) {
    if (this.online === next) return;
    this.online = next;
    this.options.onConnectionChange?.(next);
  }
  buildEventsUrl() {
    const path = "/api/ch/v1/events";
    if (!this.cursor) return joinBaseUrl(this.baseUrl, path);
    const query = `?epoch=${encodeURIComponent(this.cursor.epoch)}&after=${this.cursor.sequence}`;
    return joinBaseUrl(this.baseUrl, `${path}${query}`);
  }
  scheduleReconnect() {
    if (!this.running || this.reconnectTimer !== null) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.reconnectMaxMs, this.backoffMs * 2);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.running) void this.connect();
    }, delay);
  }
  async connect() {
    if (!this.running) return;
    const controller = new AbortController();
    this.abortController = controller;
    let helloReplayTarget = null;
    try {
      const response = await this.fetchImpl(this.buildEventsUrl(), {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/x-ndjson" },
        signal: controller.signal
      });
      if (!response.ok || !response.body) {
        throw new SideChatRpcError(
          response.status || -32090,
          `Event stream unavailable (${response.status})`,
          { status: response.status }
        );
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        while (this.running && !controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newlineIndex = buffer.indexOf("\n");
          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (line.length > 0) {
              helloReplayTarget = this.handleLine(line, helloReplayTarget);
            }
            newlineIndex = buffer.indexOf("\n");
          }
        }
        const trailing = (buffer + decoder.decode()).trim();
        if (trailing.length > 0) {
          helloReplayTarget = this.handleLine(trailing, helloReplayTarget);
        }
        if (helloReplayTarget && (!this.cursor || this.cursor.epoch === helloReplayTarget.epoch && helloReplayTarget.sequence > this.cursor.sequence)) {
          this.cursor = helloReplayTarget;
        }
      } finally {
        await reader.cancel().catch(() => void 0);
      }
    } catch (error) {
      if (this.running && !controller.signal.aborted) {
        this.options.onError?.(error);
      }
    } finally {
      if (this.abortController === controller) {
        this.abortController = null;
      }
      this.setOnline(false);
      if (this.running) {
        this.scheduleReconnect();
      }
    }
  }
  handleLine(line, helloReplayTarget) {
    let parsed;
    try {
      parsed = JSON.parse(line);
    } catch {
      return helloReplayTarget;
    }
    if (!isRecord(parsed) || typeof parsed.type !== "string" || !isRecord(parsed.cursor)) {
      return helloReplayTarget;
    }
    const epoch = parsed.cursor.epoch;
    const sequence = parsed.cursor.sequence;
    if (typeof epoch !== "string" || typeof sequence !== "number") {
      return helloReplayTarget;
    }
    const event = parsed;
    if (event.type === "hello") {
      this.backoffMs = this.reconnectBaseMs;
      this.setOnline(true);
      if (event.reset || !this.cursor || this.cursor.epoch !== event.cursor.epoch) {
        this.cursor = event.cursor;
      }
      this.options.onEvent(event);
      return event.cursor;
    }
    this.cursor = event.cursor;
    this.options.onEvent(event);
    return helloReplayTarget;
  }
};

// src/client/locales.ts
var SIDE_CHAT_LOCALE_NS = "codexhostSideChat";
var SIDE_CHAT_EN = {
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
  "slash.attachmentsUnsupported": "/btw does not support attachments. Remove attachments or send them in the main conversation.",
  "error.draftMainSession": "Send the first message in the main conversation to create the session, then start a side chat here.",
  "error.remoteHostUnsupported": "Side Chat is currently only supported for conversations running on the local Host.",
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
  "mode.ephemeral.subtitle": "Auto-fallback runtime ephemeral branch; cleared after Host restart",
  "empty.draftTitle": "Main conversation not created yet",
  "empty.draftBody": "Send the first message in the main conversation to create the session, then start a side chat here.",
  "empty.remoteTitle": "Local Host sessions only",
  "empty.remoteBody": "Side Chat is currently only supported for conversations running on the local Host.",
  "empty.welcomeTitle": "Side Chat",
  "empty.welcomeBody": "Fork a read-only context branch from the main conversation to ask follow-up questions in parallel \u2014 even while the main turn is running. You can also type /btw <question> in the main composer.",
  "empty.startButton": "New Side Chat",
  "empty.branchReadyTitle": "Side Chat branch ready",
  "empty.branchReadyBody": "Ask anything below. Prior main-thread context is included read-only and won't pollute the main conversation.",
  "stale.title": "This side chat is no longer active",
  "stale.body": "Ephemeral side chats are cleared when the Host restarts. Start a fresh side chat to continue.",
  "stale.action": "Start New Side Chat",
  "turns.loadOlder": "Load earlier turns",
  "turns.loadingOlder": "Loading earlier turns\u2026",
  "turns.loading": "Loading conversation\u2026",
  "turns.streaming": "Side Chat is responding\u2026",
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
  "tool.mcp": "MCP \xB7 {server}/{tool}",
  "tool.dynamic": "Tool \xB7 {tool}",
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
  "interaction.otherPlaceholder": "Or enter a custom answer\u2026",
  "interaction.textPlaceholder": "Enter your answer\u2026",
  "interaction.secretNote": "Sensitive input (masked)",
  "interaction.submit": "Submit answer",
  "interaction.submitting": "Submitting\u2026",
  "interaction.dismiss": "Dismiss",
  "interaction.requiredError": "Please answer all required questions before submitting.",
  "composer.placeholder": "Ask a side question\u2026 (Enter to send, Shift+Enter for newline)",
  "composer.placeholderDraft": "Send a message in the main conversation first\u2026",
  "composer.send": "Send",
  "composer.sending": "Sending\u2026",
  "composer.stop": "Stop",
  "composer.stopping": "Stopping\u2026",
  "composer.creating": "Creating branch\u2026",
  "composer.dismissError": "Dismiss"
};
var SIDE_CHAT_ZH = {
  "tab.title": "\u4FA7\u8FB9\u804A\u5929",
  "tab.renameAria": "\u91CD\u547D\u540D\u4FA7\u8FB9\u804A\u5929",
  "guide.title": "\u4FA7\u8FB9\u804A\u5929",
  "guide.description": "\u5728\u53F3\u4FA7\u680F\u5E76\u884C\u63D0\u51FA\u65C1\u8DEF\u95EE\u9898\uFF0C\u4E0D\u6C61\u67D3\u4E3B\u5BF9\u8BDD\u8F6E\u6B21",
  "shortcut.new": "\u65B0\u5EFA\u4FA7\u8FB9\u804A\u5929",
  "shortcut.noSession": "\u8BF7\u5148\u6253\u5F00\u4E00\u4E2A\u5BF9\u8BDD\uFF0C\u518D\u5F00\u542F\u4FA7\u8FB9\u804A\u5929\u3002",
  "slash.label": "\u4FA7\u8FB9\u804A\u5929 (/btw)",
  "slash.description": "\u6253\u5F00\u53F3\u4FA7\u680F\u4FA7\u8FB9\u804A\u5929\uFF0C\u6216\u76F4\u63A5\u53D1\u8D77\u65C1\u8DEF\u63D0\u95EE\u800C\u4E0D\u6C61\u67D3\u4E3B\u5BF9\u8BDD",
  "slash.hint": "[\u95EE\u9898\u5185\u5BB9]",
  "slash.claimHint": "\u8F93\u5165\u65C1\u8DEF\u95EE\u9898\u540E\u6309 Enter\uFF0C\u5C06\u76F4\u63A5\u5728\u53F3\u4FA7\u680F\u65B0\u5EFA\u4FA7\u8FB9\u804A\u5929\u5E76\u53D1\u9001",
  "slash.section": "\u4FA7\u8FB9\u804A\u5929",
  "slash.attachmentsUnsupported": "/btw \u6682\u4E0D\u652F\u6301\u643A\u5E26\u9644\u4EF6\uFF0C\u8BF7\u5148\u79FB\u9664\u9644\u4EF6\u6216\u5728\u4E3B\u5BF9\u8BDD\u4E2D\u53D1\u9001\u3002",
  "error.draftMainSession": "\u8BF7\u5148\u5728\u4E3B\u4F1A\u8BDD\u53D1\u9001\u9996\u6761\u6D88\u606F\u4EE5\u521B\u5EFA\u4F1A\u8BDD\uFF0C\u968F\u540E\u5373\u53EF\u5728\u6B64\u5F00\u542F\u65C1\u8DEF\u4FA7\u8FB9\u63D0\u95EE\u3002",
  "error.remoteHostUnsupported": "\u5F53\u524D\u4EC5\u652F\u6301\u672C\u673A Host \u4F1A\u8BDD\u5F00\u542F\u4FA7\u8FB9\u804A\u5929\u3002",
  "header.selectAria": "\u5207\u6362\u4FA7\u8FB9\u804A\u5929\u4F1A\u8BDD",
  "header.new": "\u65B0\u5EFA",
  "header.newTitle": "\u65B0\u5EFA\u4E00\u4E2A\u4FA7\u8FB9\u804A\u5929\u5206\u652F",
  "header.delete": "\u5F52\u6863",
  "header.deleteTitle": "\u5F52\u6863\u5E76\u79FB\u9664\u5F53\u524D\u4FA7\u8FB9\u804A\u5929",
  "header.refresh": "\u5237\u65B0",
  "header.refreshTitle": "\u5237\u65B0\u4FA7\u8FB9\u804A\u5929\u5217\u8868\u4E0E\u5BF9\u8BDD\u8BB0\u5F55",
  "header.desktopTag": "Desktop",
  "header.untitled": "\u672A\u547D\u540D\u4FA7\u8FB9\u804A\u5929",
  "header.noThreadsOption": "\u6682\u65E0\u4FA7\u8FB9\u804A\u5929",
  "mode.persistent.badge": "\u6301\u4E45",
  "mode.persistent.subtitle": "\u968F\u4E3B\u4F1A\u8BDD\u4FDD\u5B58\uFF0C\u4E0E Codex Desktop \u4E92\u901A",
  "mode.ephemeral.badge": "\u4E34\u65F6",
  "mode.ephemeral.subtitle": "\u5F53\u524D\u4F1A\u8BDD\u81EA\u52A8\u65E0\u611F\u56DE\u9000\u4E3A\u8FD0\u884C\u671F\u4E34\u65F6\u5206\u652F\uFF0C\u91CD\u542F Host \u540E\u6E05\u7406",
  "empty.draftTitle": "\u4E3B\u4F1A\u8BDD\u5C1A\u672A\u521B\u5EFA",
  "empty.draftBody": "\u8BF7\u5148\u5728\u4E3B\u4F1A\u8BDD\u53D1\u9001\u9996\u6761\u6D88\u606F\u4EE5\u521B\u5EFA\u4F1A\u8BDD\uFF0C\u968F\u540E\u5373\u53EF\u5728\u6B64\u5F00\u542F\u65C1\u8DEF\u4FA7\u8FB9\u63D0\u95EE\u3002",
  "empty.remoteTitle": "\u4EC5\u652F\u6301\u672C\u673A Host \u4F1A\u8BDD",
  "empty.remoteBody": "\u5F53\u524D\u4EC5\u652F\u6301\u672C\u673A Host \u4F1A\u8BDD\u5F00\u542F\u4FA7\u8FB9\u804A\u5929\u3002",
  "empty.welcomeTitle": "\u4FA7\u8FB9\u804A\u5929",
  "empty.welcomeBody": "\u57FA\u4E8E\u4E3B\u4F1A\u8BDD\u53EA\u8BFB\u4E0A\u4E0B\u6587\u5F00\u542F\u72EC\u7ACB\u65C1\u8DEF\u5206\u652F\uFF0C\u4E3B\u4F1A\u8BDD\u8FD0\u884C\u671F\u95F4\u4E5F\u53EF\u5E76\u884C\u63D0\u95EE\u3002\u4E5F\u53EF\u5728\u4E3B\u8F93\u5165\u6846\u76F4\u63A5\u8F93\u5165 /btw <\u95EE\u9898> \u5FEB\u6377\u76F4\u53D1\u3002",
  "empty.startButton": "\u65B0\u5EFA\u4FA7\u8FB9\u804A\u5929",
  "empty.branchReadyTitle": "\u4FA7\u8FB9\u804A\u5929\u5206\u652F\u5DF2\u5C31\u7EEA",
  "empty.branchReadyBody": "\u5728\u4E0B\u65B9\u8F93\u5165\u4F60\u7684\u65C1\u8DEF\u95EE\u9898\u3002\u4E3B\u4F1A\u8BDD\u5386\u53F2\u4EC5\u4F5C\u4E3A\u53EA\u8BFB\u53C2\u8003\uFF0C\u4E0D\u4F1A\u5E72\u6270\u4E3B\u5BF9\u8BDD\u8FDB\u7A0B\u3002",
  "stale.title": "\u8BE5\u4FA7\u8FB9\u804A\u5929\u5DF2\u5931\u6548",
  "stale.body": "\u4E34\u65F6\u4FA7\u8FB9\u5206\u652F\u4F1A\u5728 Host \u91CD\u542F\u540E\u6E05\u7406\uFF0C\u8BF7\u65B0\u5EFA\u4E00\u4E2A\u4FA7\u8FB9\u804A\u5929\u7EE7\u7EED\u63D0\u95EE\u3002",
  "stale.action": "\u65B0\u5EFA\u4FA7\u8FB9\u804A\u5929",
  "turns.loadOlder": "\u52A0\u8F7D\u66F4\u65E9\u5BF9\u8BDD",
  "turns.loadingOlder": "\u6B63\u5728\u52A0\u8F7D\u66F4\u65E9\u5BF9\u8BDD\u2026",
  "turns.loading": "\u6B63\u5728\u52A0\u8F7D\u5BF9\u8BDD\u5185\u5BB9\u2026",
  "turns.streaming": "\u4FA7\u8FB9\u804A\u5929\u6B63\u5728\u56DE\u590D\u2026",
  "turns.failed": "\u672C\u8F6E\u6267\u884C\u5931\u8D25\uFF1A{message}",
  "turns.cancelled": "\u672C\u8F6E\u5DF2\u505C\u6B62\u3002",
  "turns.unknownOutcome": "\u672C\u8F6E\u7ED3\u679C\u672A\u77E5\uFF1A{reason}",
  "message.user": "\u4F60",
  "message.assistant": "\u4FA7\u8FB9\u804A\u5929",
  "code.copy": "\u590D\u5236",
  "code.copied": "\u5DF2\u590D\u5236",
  "tool.thinking": "\u601D\u8003\u8FC7\u7A0B",
  "tool.command": "\u6267\u884C\u547D\u4EE4",
  "tool.commandExit": "\u9000\u51FA\u7801 {code}",
  "tool.fileChange": "\u6587\u4EF6\u53D8\u66F4\uFF08{count}\uFF09",
  "tool.fileAdd": "\u65B0\u589E",
  "tool.fileUpdate": "\u4FEE\u6539",
  "tool.fileDelete": "\u5220\u9664",
  "tool.mcp": "MCP \xB7 {server}/{tool}",
  "tool.dynamic": "\u5DE5\u5177 \xB7 {tool}",
  "tool.webSearch": "\u7F51\u9875\u641C\u7D22",
  "tool.compaction": "\u4E0A\u4E0B\u6587\u5DF2\u538B\u7F29",
  "tool.arguments": "\u53C2\u6570",
  "tool.output": "\u8F93\u51FA",
  "tool.cwd": "\u5DE5\u4F5C\u76EE\u5F55",
  "tool.status.running": "\u6267\u884C\u4E2D",
  "tool.status.succeeded": "\u5DF2\u5B8C\u6210",
  "tool.status.failed": "\u5931\u8D25",
  "tool.status.cancelled": "\u5DF2\u53D6\u6D88",
  "interaction.approvalTitle": "\u9700\u8981\u5BA1\u6279\u786E\u8BA4",
  "interaction.questionTitle": "\u9700\u8981\u8865\u5145\u4FE1\u606F",
  "interaction.optional": "\u53EF\u9009",
  "interaction.otherPlaceholder": "\u6216\u8F93\u5165\u5176\u4ED6\u81EA\u5B9A\u4E49\u56DE\u7B54\u2026",
  "interaction.textPlaceholder": "\u8BF7\u8F93\u5165\u4F60\u7684\u56DE\u7B54\u2026",
  "interaction.secretNote": "\u654F\u611F\u8F93\u5165\uFF08\u5DF2\u63A9\u7801\u4FDD\u62A4\uFF09",
  "interaction.submit": "\u63D0\u4EA4\u56DE\u7B54",
  "interaction.submitting": "\u63D0\u4EA4\u4E2D\u2026",
  "interaction.dismiss": "\u5173\u95ED",
  "interaction.requiredError": "\u8BF7\u5148\u5B8C\u6210\u6240\u6709\u5FC5\u586B\u95EE\u9898\u540E\u518D\u63D0\u4EA4\u3002",
  "composer.placeholder": "\u8F93\u5165\u65C1\u8DEF\u95EE\u9898\u2026\uFF08Enter \u53D1\u9001\uFF0CShift+Enter \u6362\u884C\uFF09",
  "composer.placeholderDraft": "\u8BF7\u5148\u5728\u4E3B\u4F1A\u8BDD\u53D1\u9001\u9996\u6761\u6D88\u606F\u2026",
  "composer.send": "\u53D1\u9001",
  "composer.sending": "\u53D1\u9001\u4E2D\u2026",
  "composer.stop": "\u505C\u6B62",
  "composer.stopping": "\u505C\u6B62\u4E2D\u2026",
  "composer.creating": "\u6B63\u5728\u521B\u5EFA\u5206\u652F\u2026",
  "composer.dismissError": "\u5173\u95ED"
};
function interpolateCopy(template, params) {
  if (!params) return template;
  return template.replace(
    /\{(\w+)\}/gu,
    (match, name2) => name2 in params ? String(params[name2]) : match
  );
}
function createSideChatTranslator(localeInput) {
  const locale = normalizeLocale(localeInput);
  const dict = locale === "zh" ? SIDE_CHAT_ZH : SIDE_CHAT_EN;
  return (key, params) => interpolateCopy(dict[key] ?? SIDE_CHAT_EN[key] ?? key, params);
}
function wrapHostTranslator(hostT, localeInput) {
  const resolveFallback = () => createSideChatTranslator(typeof localeInput === "function" ? localeInput() : localeInput);
  if (!hostT) return (key, params) => resolveFallback()(key, params);
  return (key, params) => {
    const resolved = hostT(key, params);
    return resolved === key ? resolveFallback()(key, params) : resolved;
  };
}

// src/client/session-source.ts
function resolveMainSessionRow(sessionId, row) {
  if (!row) {
    return { status: "draft", reason: "missing" };
  }
  if (row.blank === true) {
    return { status: "draft", reason: "blank" };
  }
  const hostId = row.projectionValues?.threadReference?.hostId;
  if (typeof hostId === "string" && hostId.trim().length > 0 && hostId.trim() !== "local") {
    return { status: "remote-unsupported", hostId: hostId.trim() };
  }
  const refThreadId = row.projectionValues?.threadReference?.threadId;
  const sourceThreadId = typeof refThreadId === "string" && refThreadId.trim().length > 0 ? refThreadId.trim() : sessionId;
  return {
    status: "ready",
    sourceThreadId,
    running: row.running === true
  };
}
function resolveMainSessionFromSnapshot(sessionId, snapshot) {
  return resolveMainSessionRow(sessionId, snapshot?.byId?.[sessionId]);
}

// src/client/btw-trigger.ts
var BTW_TRIGGER_SOURCE_NAME = "codexhost-side-chat";
var BTW_LINE_PATTERN = /^(\/btw)(?:\s+([\s\S]*))?$/iu;
var BTW_TOKEN_PATTERN = /^\/btw$/iu;
var BTW_SEARCH_KEYWORDS = [
  "btw",
  "side",
  "chat",
  "sidechat",
  "side-chat",
  "side chat",
  "\u4FA7\u8FB9",
  "\u4FA7\u8FB9\u804A\u5929",
  "\u65C1\u8DEF",
  "\u65C1\u8DEF\u63D0\u95EE"
];
function parseBtwCommandLine(line) {
  const trimmed = line.trim();
  const match = BTW_LINE_PATTERN.exec(trimmed);
  if (!match || !match[1]) return null;
  return {
    rawPrefix: match[1],
    args: (match[2] ?? "").trim()
  };
}
function matchesBtwQuery(rawQuery) {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (query.length === 0) return true;
  return BTW_SEARCH_KEYWORDS.some(
    (keyword) => keyword.includes(query) || query.includes(keyword)
  );
}
function notifyMainComposer(ctx, sessionId, level, text) {
  const scope = ctx.sessions.scope?.(sessionId);
  const conversation = scope?.get("conversation");
  conversation?.input.for(scope).notify(level, text);
}
function openOrFocusSideChatTab(ctx, manager, sessionId, options) {
  const focusNonce = manager.nextFocusNonce();
  const params = {
    focusComposer: true,
    focusNonce,
    ...options?.sideThreadId ? { sideThreadId: options.sideThreadId } : {}
  };
  if (!options?.createNewTab) {
    const existing = ctx.sidebarRight.tabsIn?.(sessionId)?.find((tab) => tab.kind === "sidechat");
    if (existing) {
      const mountedSession = ctx.sidebarRight.mounted?.getSnapshot();
      const canUseMountedControls = mountedSession === void 0 || mountedSession === sessionId;
      if (canUseMountedControls && ctx.sidebarRight.isExpanded && !ctx.sidebarRight.isExpanded()) {
        ctx.sidebarRight.toggleExpanded?.();
      }
      if (canUseMountedControls) {
        ctx.sidebarRight.focus?.(existing.id);
      } else if (ctx.sidebarRight.openTabIn) {
        ctx.sidebarRight.openTabIn(sessionId, "sidechat", { params });
      }
      manager.requestFocus(sessionId, existing.id);
      return;
    }
  }
  if (ctx.sidebarRight.openTabIn) {
    ctx.sidebarRight.openTabIn(sessionId, "sidechat", { params });
  } else {
    ctx.sidebarRight.openTab("sidechat", { params });
  }
  manager.requestFocus(sessionId);
}
function createBtwInputTriggerSource(ctx, manager, options = {}) {
  const getLocale = options.getLocale ?? (() => manager.getLocale());
  const translate = options.t ?? ((key, params) => createSideChatTranslator(getLocale())(key, params));
  const submitBtw = async (sessionId, args, attachments) => {
    if (Array.isArray(attachments) && attachments.length > 0) {
      return {
        kind: "error",
        text: translate("slash.attachmentsUnsupported")
      };
    }
    const resolution = resolveMainSessionFromSnapshot(
      sessionId,
      ctx.sessions.list.getSnapshot()
    );
    if (resolution.status === "draft") {
      return {
        kind: "error",
        text: translate("error.draftMainSession")
      };
    }
    if (resolution.status === "remote-unsupported") {
      return {
        kind: "error",
        text: translate("error.remoteHostUnsupported")
      };
    }
    const trimmedQuestion = args.trim();
    if (trimmedQuestion.length === 0) {
      openOrFocusSideChatTab(ctx, manager, sessionId);
      return { kind: "success" };
    }
    try {
      const created = await manager.createAndStartForBtw(
        resolution.sourceThreadId,
        trimmedQuestion
      );
      openOrFocusSideChatTab(ctx, manager, sessionId, {
        sideThreadId: created.thread.threadId,
        createNewTab: true
      });
      return { kind: "success" };
    } catch (error) {
      return {
        kind: "error",
        text: formatSideChatError(error, getLocale())
      };
    }
  };
  const makeClaim = (sessionId, token) => ({
    name: "btw",
    token,
    hint: translate("slash.claimHint"),
    submit: (args, _actx, attachments) => submitBtw(sessionId, args, attachments)
  });
  return {
    name: BTW_TRIGGER_SOURCE_NAME,
    trigger: "/",
    launcher: "command",
    order: 5,
    launcherOrder: 15,
    showGroupTitle: false,
    subscribeCandidates: (_session, listener) => ctx.sessions.list.subscribe(listener),
    async candidates(_session, req) {
      if (req.position !== "leading" && req.launcher !== "command") {
        return [];
      }
      if (!matchesBtwQuery(req.query)) {
        return [];
      }
      return [
        {
          name: "btw",
          label: translate("slash.label"),
          description: translate("slash.description"),
          hint: translate("slash.hint"),
          section: translate("slash.section"),
          icon: SideChatIcon
        }
      ];
    },
    onPick(pick) {
      const sessionId = pick.session.sessionId;
      const resolution = resolveMainSessionFromSnapshot(
        sessionId,
        ctx.sessions.list.getSnapshot()
      );
      if (resolution.status === "draft") {
        notifyMainComposer(ctx, sessionId, "error", translate("error.draftMainSession"));
        return "handled";
      }
      if (resolution.status === "remote-unsupported") {
        notifyMainComposer(
          ctx,
          sessionId,
          "error",
          translate("error.remoteHostUnsupported")
        );
        return "handled";
      }
      if (pick.span.start !== pick.span.end) {
        const scope = ctx.sessions.scope?.(sessionId);
        scope?.bail(scope, "slash/input-consume-token", {
          guard: { kind: "span", span: pick.span }
        });
      }
      openOrFocusSideChatTab(ctx, manager, sessionId);
      return "handled";
    },
    matchSpace(session, token) {
      const trimmed = token.trim();
      if (!BTW_TOKEN_PATTERN.test(trimmed)) {
        return void 0;
      }
      return {
        claim: makeClaim(session.sessionId, `${trimmed} `)
      };
    },
    async matchEnter(session, line, _signal, envelope) {
      const parsed = parseBtwCommandLine(line);
      if (!parsed) {
        return void 0;
      }
      if (envelope.attachments > 0) {
        throw new Error(translate("slash.attachmentsUnsupported"));
      }
      return {
        claim: makeClaim(session.sessionId, `${parsed.rawPrefix} `)
      };
    }
  };
}
function registerBtwInputTrigger(ctx, manager, options = {}) {
  return ctx.inputTriggers.registerSource(
    createBtwInputTriggerSource(ctx, manager, options)
  );
}

// src/client/SideChatGuide.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function SideChatGuide({
  title,
  description,
  kind,
  useTabInfo,
  useShortcuts
}) {
  const { tab } = useTabInfo();
  const shortcut = useShortcuts?.(
    (entries) => entries.find((entry) => entry.id === "sidechat.new")
  );
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
    "button",
    {
      type: "button",
      className: "csc-guide-entry",
      "data-sidebar-right-guide-entry": kind,
      "aria-label": description === void 0 ? title : `${title} ${description}`,
      "aria-keyshortcuts": shortcut?.aria,
      onClick: () => {
        tab.actions.openTab("sidechat", { replaceTab: true });
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "csc-guide-icon", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(SideChatGuideArtwork, { size: description === void 0 ? 22 : 26 }) }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { className: "csc-guide-text", children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "csc-guide-title", children: title }),
          description !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "csc-guide-desc", children: description })
        ] }),
        shortcut !== void 0 && shortcut.keys.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "csc-guide-keys", "aria-hidden": "true", children: shortcut.keys.map((keyLabel, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("kbd", { className: "csc-kbd", children: keyLabel }, `${keyLabel}-${index}`)) })
      ]
    }
  );
}

// src/client/SideChatPanel.tsx
var import_react4 = require("react");

// src/client/InteractionCards.tsx
var import_react = require("react");

// src/client/interactions.ts
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function isNativeApprovalRequest(pending) {
  const method = pending.request.method;
  return method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval";
}
function formatApprovalActionLabels(actions) {
  return actions.map(
    (action, index) => actions.filter((other) => other.label === action.label).length > 1 ? `${action.label} (${index + 1})` : action.label
  );
}
function hasSecretQuestion(pending) {
  if (pending.interaction.type !== "question") return false;
  return pending.interaction.questions.some(
    (question) => question.type === "text" && question.secret === true
  );
}
function buildInteractionResponseResult(pending, answer) {
  const interaction = pending.interaction;
  if (interaction.type === "approval") {
    const nativeApproval = isNativeApprovalRequest(pending);
    const isDismissed = answer === null || answer.kind === "approval" && (answer.dismiss === true || !answer.actionId);
    if (isDismissed) {
      if (nativeApproval) {
        const deny = interaction.actions.find((action2) => action2.id === "decline") ?? interaction.actions.find((action2) => action2.id === "cancel");
        if (!deny) {
          throw new Error("Choose one of the native approval actions");
        }
        return { decision: deny.id };
      }
      return { action: "decline" };
    }
    if (answer.kind !== "approval") {
      throw new Error("Expected an approval answer for an approval interaction");
    }
    const action = interaction.actions.find((candidate) => candidate.id === answer.actionId);
    if (!action) {
      throw new Error("Choose one of the native approval actions");
    }
    if (nativeApproval) {
      return { decision: action.id };
    }
    const params = asRecord(pending.request.params);
    const requestedSchema = asRecord(params.requestedSchema);
    if ("actionId" in asRecord(requestedSchema.properties)) {
      return { action: "accept", content: { actionId: action.id } };
    }
    if (action.effect === "deny") {
      return { action: "decline" };
    }
    if (action.effect === "allowOnce") {
      return { action: "accept", content: {} };
    }
    if (action.effect === "allowForSession" || action.effect === "allowAlways") {
      return {
        action: "accept",
        content: {},
        _meta: { persist: action.effect === "allowAlways" ? "always" : "session" }
      };
    }
    throw new Error("Host approval action is unsupported by this client version");
  }
  if (answer === null) {
    return { answers: {} };
  }
  if (answer.kind !== "question") {
    throw new Error("Expected a question answer for a question interaction");
  }
  const answers = {};
  for (const entry of answer.answers) {
    const question = interaction.questions.find((candidate) => candidate.id === entry.id);
    if (!question) {
      throw new Error("Unknown native question");
    }
    if (question.type === "choice" && entry.custom && !question.allowOther) {
      throw new Error("This native question only accepts its listed choices");
    }
    answers[entry.id] = {
      answers: [...entry.selected ?? [], ...entry.custom ? [entry.custom] : []]
    };
  }
  return { answers };
}
function buildRespondRequest(epoch, pending, answer) {
  return {
    epoch,
    threadId: pending.threadId,
    requestId: pending.requestId,
    result: buildInteractionResponseResult(pending, answer)
  };
}

// src/client/InteractionCards.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function formatApprovalSubject(subject) {
  if (subject === void 0 || subject === null) return null;
  if (typeof subject === "string") return subject.trim() || null;
  try {
    return JSON.stringify(subject, null, 2);
  } catch {
    return String(subject);
  }
}
function ApprovalInteractionCard({
  pending,
  busy,
  onRespond,
  t
}) {
  if (pending.interaction.type !== "approval") return null;
  const { title, description, subject, actions } = pending.interaction;
  const labels = formatApprovalActionLabels(actions);
  const subjectText = formatApprovalSubject(subject);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "section",
    {
      className: "csc-interaction-card",
      "data-csc-interaction": "approval",
      "data-csc-request-id": String(pending.requestId),
      "aria-label": title || t("interaction.approvalTitle"),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "csc-interaction-head", children: title || t("interaction.approvalTitle") }),
        description && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: "csc-interaction-desc", children: description }),
        subjectText && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("pre", { className: "csc-tool-pre", children: subjectText }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "csc-interaction-actions", children: actions.map((action, index) => {
          const isAllow = action.effect !== "deny";
          const btnClass = isAllow ? "csc-btn csc-btn-primary" : "csc-btn";
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: btnClass,
              disabled: busy,
              "data-csc-approval-action": action.id,
              onClick: () => {
                void onRespond(pending, { kind: "approval", actionId: action.id });
              },
              children: labels[index] ?? action.label
            },
            action.id
          );
        }) })
      ]
    }
  );
}
function QuestionInteractionCard({
  pending,
  busy,
  onRespond,
  t
}) {
  if (pending.interaction.type !== "question") return null;
  const { title, questions } = pending.interaction;
  const [drafts, setDrafts] = (0, import_react.useState)(() => {
    const initial = {};
    for (const question of questions) {
      initial[question.id] = { selected: [], custom: "" };
    }
    return initial;
  });
  const [validationError, setValidationError] = (0, import_react.useState)(null);
  const updateQuestion = (questionId, updater) => {
    setValidationError(null);
    setDrafts((prev) => {
      const current = prev[questionId] ?? { selected: [], custom: "" };
      return { ...prev, [questionId]: updater(current) };
    });
  };
  const handleChoiceToggle = (question, value) => {
    updateQuestion(question.id, (prev) => {
      if (question.multiple) {
        const exists = prev.selected.includes(value);
        return {
          ...prev,
          selected: exists ? prev.selected.filter((item) => item !== value) : [...prev.selected, value]
        };
      }
      return { ...prev, selected: [value] };
    });
  };
  const handleSubmit = () => {
    const answers = [];
    for (const question of questions) {
      const entry = drafts[question.id] ?? { selected: [], custom: "" };
      const custom = entry.custom.trim();
      const selected = entry.selected;
      const hasAnswer = question.type === "text" ? custom.length > 0 : selected.length > 0 || question.allowOther && custom.length > 0;
      if (!question.optional && !hasAnswer) {
        setValidationError(t("interaction.requiredError"));
        return;
      }
      if (question.type === "text") {
        answers.push({
          id: question.id,
          ...custom.length > 0 ? { custom } : {}
        });
      } else {
        answers.push({
          id: question.id,
          selected,
          ...question.allowOther && custom.length > 0 ? { custom } : {}
        });
      }
    }
    setValidationError(null);
    void onRespond(pending, { kind: "question", answers });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
    "section",
    {
      className: "csc-interaction-card",
      "data-csc-interaction": "question",
      "data-csc-request-id": String(pending.requestId),
      "aria-label": title || t("interaction.questionTitle"),
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "csc-interaction-head", children: title || t("interaction.questionTitle") }),
        questions.map((question) => {
          const entry = drafts[question.id] ?? { selected: [], custom: "" };
          return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(
            "div",
            {
              className: "csc-question-group",
              "data-csc-question-id": question.id,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "csc-question-prompt", children: [
                  question.prompt,
                  question.optional && /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { className: "csc-question-optional", children: [
                    "(",
                    t("interaction.optional"),
                    ")"
                  ] })
                ] }),
                question.type === "choice" ? /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "csc-option-list", children: question.options.map((option) => {
                    const checked = entry.selected.includes(option.value);
                    return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("label", { className: "csc-option", children: [
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                        "input",
                        {
                          type: question.multiple ? "checkbox" : "radio",
                          name: `csc-q-${String(pending.requestId)}-${question.id}`,
                          value: option.value,
                          checked,
                          disabled: busy,
                          onChange: () => handleChoiceToggle(question, option.value)
                        }
                      ),
                      /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { children: [
                        /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { children: option.label }),
                        option.description && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "csc-option-desc", children: option.description })
                      ] })
                    ] }, option.value);
                  }) }),
                  question.allowOther && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "input",
                    {
                      type: "text",
                      className: "csc-input",
                      disabled: busy,
                      value: entry.custom,
                      placeholder: t("interaction.otherPlaceholder"),
                      "data-csc-question-other": question.id,
                      onChange: (event) => {
                        const nextValue = event.target.value;
                        updateQuestion(question.id, (prev) => ({ ...prev, custom: nextValue }));
                      }
                    }
                  )
                ] }) : /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)(import_jsx_runtime3.Fragment, { children: [
                  /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
                    "input",
                    {
                      type: question.secret ? "password" : "text",
                      className: "csc-input",
                      disabled: busy,
                      value: entry.custom,
                      placeholder: t("interaction.textPlaceholder"),
                      "data-csc-question-text": question.id,
                      onChange: (event) => {
                        const nextValue = event.target.value;
                        updateQuestion(question.id, (prev) => ({ ...prev, custom: nextValue }));
                      }
                    }
                  ),
                  question.secret && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { className: "csc-option-desc", children: t("interaction.secretNote") })
                ] })
              ]
            },
            question.id
          );
        }),
        validationError && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "csc-alert csc-alert-error", style: { margin: 0 }, role: "alert", children: validationError }),
        /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("div", { className: "csc-interaction-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "csc-btn csc-btn-primary",
              disabled: busy,
              "data-csc-action": "submit-question",
              onClick: handleSubmit,
              children: busy ? t("interaction.submitting") : t("interaction.submit")
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
            "button",
            {
              type: "button",
              className: "csc-btn",
              disabled: busy,
              "data-csc-action": "dismiss-question",
              onClick: () => {
                void onRespond(pending, null);
              },
              children: t("interaction.dismiss")
            }
          )
        ] })
      ]
    }
  );
}
function InteractionCards({
  interactions,
  respondingRequestIds,
  onRespond,
  t
}) {
  if (interactions.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "csc-interactions", "data-csc-interactions": true, children: interactions.map((pending) => {
    const busy = respondingRequestIds.includes(pending.requestId);
    if (pending.interaction.type === "approval") {
      return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
        ApprovalInteractionCard,
        {
          pending,
          busy,
          onRespond,
          t
        },
        String(pending.requestId)
      );
    }
    return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
      QuestionInteractionCard,
      {
        pending,
        busy,
        onRespond,
        t
      },
      String(pending.requestId)
    );
  }) });
}

// src/client/MarkdownContent.tsx
var import_react2 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
var SAFE_URL_PATTERN = /^(?:https?:\/\/|mailto:)/iu;
function parseBlocks(markdown) {
  const lines = markdown.replace(/\r\n/gu, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.trim() === "") {
      i += 1;
      continue;
    }
    const fenceMatch = /^\s*```([^\s`]*)\s*$/u.exec(line);
    if (fenceMatch) {
      const language = fenceMatch[1] ?? "";
      const codeLines = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/u.test(lines[i] ?? "")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1;
      blocks.push({ kind: "code", language, code: codeLines.join("\n") });
      continue;
    }
    const headingMatch = /^(#{1,3})\s+(.*)$/u.exec(line);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1].length);
      blocks.push({ kind: "heading", level, text: headingMatch[2].trim() });
      i += 1;
      continue;
    }
    if (/^\s*>\s?/u.test(line)) {
      const quoteLines = [];
      while (i < lines.length && /^\s*>\s?/u.test(lines[i] ?? "")) {
        quoteLines.push((lines[i] ?? "").replace(/^\s*>\s?/u, ""));
        i += 1;
      }
      blocks.push({ kind: "blockquote", text: quoteLines.join("\n") });
      continue;
    }
    if (/^\s*[-*+]\s+/u.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*[-*+]\s+/u.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*+]\s+/u, ""));
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/u.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+\.\s+/u.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/u, ""));
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }
    const paraLines = [];
    while (i < lines.length && (lines[i] ?? "").trim() !== "" && !/^\s*```/u.test(lines[i] ?? "") && !/^#{1,3}\s+/u.test(lines[i] ?? "") && !/^\s*>\s?/u.test(lines[i] ?? "") && !/^\s*[-*+]\s+/u.test(lines[i] ?? "") && !/^\s*\d+\.\s+/u.test(lines[i] ?? "")) {
      paraLines.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: paraLines.join("\n") });
  }
  return blocks;
}
var INLINE_TOKEN_PATTERN = /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[([^\]\n]+)\]\(([^)\s]+)\))/gu;
function renderInline(text, keyPrefix) {
  const nodes = [];
  let cursor = 0;
  let tokenIndex = 0;
  INLINE_TOKEN_PATTERN.lastIndex = 0;
  let match = INLINE_TOKEN_PATTERN.exec(text);
  while (match !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${tokenIndex}`;
    tokenIndex += 1;
    if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("code", { className: "csc-md-inline-code", children: token.slice(1, -1) }, key)
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(/* @__PURE__ */ (0, import_jsx_runtime4.jsx)("strong", { children: token.slice(2, -2) }, key));
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(/* @__PURE__ */ (0, import_jsx_runtime4.jsx)("em", { children: token.slice(1, -1) }, key));
    } else if (match[2] !== void 0 && match[3] !== void 0) {
      const label = match[2];
      const href = match[3];
      if (SAFE_URL_PATTERN.test(href)) {
        nodes.push(
          /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
            "a",
            {
              className: "csc-md-link",
              href,
              target: "_blank",
              rel: "noopener noreferrer",
              children: label
            },
            key
          )
        );
      } else {
        nodes.push(label);
      }
    } else {
      nodes.push(token);
    }
    cursor = match.index + token.length;
    match = INLINE_TOKEN_PATTERN.exec(text);
  }
  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}
async function copyCodeToClipboard(code) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch {
    }
  }
  if (typeof document === "undefined" || !document.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return typeof document.execCommand === "function" ? document.execCommand("copy") : false;
  } finally {
    textarea.remove();
  }
}
function CodeBlockView({
  language,
  code,
  t
}) {
  const [copied, setCopied] = (0, import_react2.useState)(false);
  const handleCopy = () => {
    void copyCodeToClipboard(code).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "csc-code-block", "data-csc-code-block": true, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "csc-code-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { children: language || "code" }),
      /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
        "button",
        {
          type: "button",
          className: "csc-btn csc-btn-ghost",
          style: { height: 22, padding: "0 6px", fontSize: 11 },
          onClick: handleCopy,
          "data-csc-action": "copy-code",
          children: copied ? t("code.copied") : t("code.copy")
        }
      )
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("pre", { className: "csc-code-pre", children: /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("code", { children: code }) })
  ] });
}
function MarkdownContent({ text, t }) {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("div", { className: "csc-md", children: blocks.map((block, index) => {
    const key = `blk-${index}`;
    switch (block.kind) {
      case "code":
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(CodeBlockView, { language: block.language, code: block.code, t }, key);
      case "heading":
        if (block.level === 1) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h1", { children: renderInline(block.text, key) }, key);
        if (block.level === 2) return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h2", { children: renderInline(block.text, key) }, key);
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("h3", { children: renderInline(block.text, key) }, key);
      case "blockquote":
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("blockquote", { children: renderInline(block.text, key) }, key);
      case "ul":
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ul", { children: block.items.map((item, itemIdx) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { children: renderInline(item, `${key}-${itemIdx}`) }, `${key}-li-${itemIdx}`)) }, key);
      case "ol":
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("ol", { children: block.items.map((item, itemIdx) => /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("li", { children: renderInline(item, `${key}-${itemIdx}`) }, `${key}-li-${itemIdx}`)) }, key);
      case "paragraph":
        return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("p", { children: renderInline(block.text, key) }, key);
    }
  }) });
}

// src/client/ToolCards.tsx
var import_react3 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
function formatJsonPreview(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
function statusLabel(status, t) {
  switch (status) {
    case "running":
      return t("tool.status.running");
    case "succeeded":
      return t("tool.status.succeeded");
    case "failed":
      return t("tool.status.failed");
    case "cancelled":
      return t("tool.status.cancelled");
  }
}
function renderDiffLines(diff) {
  const lines = diff.split("\n");
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: lines.map((line, index) => {
    const className = line.startsWith("+") && !line.startsWith("+++") ? "csc-diff-line-add" : line.startsWith("-") && !line.startsWith("---") ? "csc-diff-line-del" : void 0;
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className, children: line }, index);
  }) });
}
function ToolItemCard({ item, t }) {
  const [expanded, setExpanded] = (0, import_react3.useState)(false);
  if (item.kind === "contextCompaction") {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-compaction", "data-csc-item": "contextCompaction", children: [
      t("tool.compaction"),
      item.errorMessage ? ` \xB7 ${item.errorMessage}` : ""
    ] });
  }
  if (item.kind === "reasoning") {
    const preview = (item.summary[0] ?? item.content[0] ?? "").trim();
    const headerTitle = preview ? `${t("tool.thinking")} \xB7 ${preview}` : t("tool.thinking");
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-card", "data-csc-item": "reasoning", "data-csc-collapsible": "true", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "button",
        {
          type: "button",
          className: "csc-tool-toggle",
          "aria-expanded": expanded,
          onClick: () => setExpanded((prev) => !prev),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronIcon, { expanded }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-tool-title", children: headerTitle })
          ]
        }
      ),
      expanded && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-body", "data-csc-collapsible-body": "true", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: item.text }) })
    ] });
  }
  if (item.kind === "commandExecution") {
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "div",
      {
        className: "csc-tool-card",
        "data-csc-item": "commandExecution",
        "data-csc-collapsible": "true",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
            "button",
            {
              type: "button",
              className: "csc-tool-toggle",
              "aria-expanded": expanded,
              onClick: () => setExpanded((prev) => !prev),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronIcon, { expanded }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-tool-title csc-tool-mono", children: item.command || t("tool.command") }),
                item.exitCode !== null && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-status-pill", "data-status": item.status, children: t("tool.commandExit", { code: item.exitCode }) }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-status-pill", "data-status": item.status, children: statusLabel(item.status, t) })
              ]
            }
          ),
          expanded && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-body", "data-csc-collapsible-body": "true", children: [
            item.cwd && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-label", children: t("tool.cwd") }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: item.cwd })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-label", children: t("tool.command") }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: item.command })
            ] }),
            item.output && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-label", children: t("tool.output") }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: item.output })
            ] })
          ] })
        ]
      }
    );
  }
  if (item.kind === "fileChange") {
    const firstPath = item.changes[0]?.path ?? "";
    const summaryLabel = firstPath ? `${t("tool.fileChange", { count: item.changes.length })} \xB7 ${firstPath}` : t("tool.fileChange", { count: item.changes.length });
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-card", "data-csc-item": "fileChange", "data-csc-collapsible": "true", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "button",
        {
          type: "button",
          className: "csc-tool-toggle",
          "aria-expanded": expanded,
          onClick: () => setExpanded((prev) => !prev),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronIcon, { expanded }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-tool-title csc-tool-mono", children: summaryLabel }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-status-pill", "data-status": item.status, children: statusLabel(item.status, t) })
          ]
        }
      ),
      expanded && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-body", "data-csc-collapsible-body": "true", children: item.changes.map((change, idx) => {
        const kindText = change.kind === "add" ? t("tool.fileAdd") : change.kind === "delete" ? t("tool.fileDelete") : t("tool.fileUpdate");
        return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-label", children: [
            "[",
            kindText,
            "] ",
            change.path
          ] }),
          change.unifiedDiff && renderDiffLines(change.unifiedDiff)
        ] }, `${change.path}-${idx}`);
      }) })
    ] });
  }
  if (item.kind === "mcpToolCall") {
    const label = t("tool.mcp", { server: item.server || "mcp", tool: item.tool });
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-card", "data-csc-item": "mcpToolCall", "data-csc-collapsible": "true", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
        "button",
        {
          type: "button",
          className: "csc-tool-toggle",
          "aria-expanded": expanded,
          onClick: () => setExpanded((prev) => !prev),
          children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronIcon, { expanded }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-tool-title csc-tool-mono", children: label }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-status-pill", "data-status": item.status, children: statusLabel(item.status, t) })
          ]
        }
      ),
      expanded && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-body", "data-csc-collapsible-body": "true", children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-label", children: t("tool.arguments") }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: formatJsonPreview(item.arguments) })
        ] }),
        (item.output || item.errorMessage) && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-label", children: t("tool.output") }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: item.errorMessage ?? item.output })
        ] })
      ] })
    ] });
  }
  if (item.kind === "dynamicToolCall") {
    const label = t("tool.dynamic", { tool: item.tool });
    return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "div",
      {
        className: "csc-tool-card",
        "data-csc-item": "dynamicToolCall",
        "data-csc-collapsible": "true",
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
            "button",
            {
              type: "button",
              className: "csc-tool-toggle",
              "aria-expanded": expanded,
              onClick: () => setExpanded((prev) => !prev),
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronIcon, { expanded }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-tool-title csc-tool-mono", children: label }),
                /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-status-pill", "data-status": item.status, children: statusLabel(item.status, t) })
              ]
            }
          ),
          expanded && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-body", "data-csc-collapsible-body": "true", children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-label", children: t("tool.arguments") }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: formatJsonPreview(item.arguments) })
            ] }),
            item.output && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-label", children: t("tool.output") }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: item.output })
            ] })
          ] })
        ]
      }
    );
  }
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "csc-tool-card", "data-csc-item": "webSearch", "data-csc-collapsible": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
      "button",
      {
        type: "button",
        className: "csc-tool-toggle",
        "aria-expanded": expanded,
        onClick: () => setExpanded((prev) => !prev),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(ChevronIcon, { expanded }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: "csc-tool-title", children: [
            t("tool.webSearch"),
            item.query ? ` \xB7 ${item.query}` : ""
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: "csc-status-pill", "data-status": item.status, children: statusLabel(item.status, t) })
        ]
      }
    ),
    expanded && item.query && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "csc-tool-body", "data-csc-collapsible-body": "true", children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("pre", { className: "csc-tool-pre", children: item.query }) })
  ] });
}

// src/client/SideChatPanel.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function parseSideChatTabParams(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw;
  return {
    ...typeof record.sideThreadId === "string" && record.sideThreadId.trim().length > 0 ? { sideThreadId: record.sideThreadId.trim() } : {},
    ...record.focusComposer === true ? { focusComposer: true } : {},
    ...typeof record.focusNonce === "number" ? { focusNonce: record.focusNonce } : {}
  };
}
function formatThreadOptionLabel(item, t) {
  const baseTitle = item.title.trim() || item.preview.trim() || t("header.untitled");
  const modeLabel = item.mode === "persistent" ? t("mode.persistent.badge") : t("mode.ephemeral.badge");
  const desktopSuffix = item.source === "desktop" ? ` \xB7 ${t("header.desktopTag")}` : "";
  return `[${modeLabel}] ${baseTitle}${desktopSuffix}`;
}
function SideChatPanelView({
  controller,
  resolution,
  t: providedT,
  locale,
  focusNonce = 0,
  visible = true,
  onThreadsMutated
}) {
  const t = providedT ?? createSideChatTranslator(locale);
  const state = (0, import_react4.useSyncExternalStore)(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot
  );
  const [draft, setDraft] = (0, import_react4.useState)("");
  const composerRef = (0, import_react4.useRef)(null);
  const bodyRef = (0, import_react4.useRef)(null);
  const lastFocusNonce = (0, import_react4.useRef)(0);
  const activeSession = state.activeSession;
  const activeMode = activeSession?.mode ?? (state.activeThreadId ? state.threads.find((item) => item.threadId === state.activeThreadId)?.mode ?? null : null);
  (0, import_react4.useEffect)(() => {
    if (!visible || focusNonce <= lastFocusNonce.current) return;
    lastFocusNonce.current = focusNonce;
    composerRef.current?.focus();
  }, [focusNonce, visible]);
  const turnCount = activeSession?.turns.length ?? 0;
  const lastTurnItemCount = activeSession?.turns[turnCount - 1]?.items.length ?? 0;
  (0, import_react4.useEffect)(() => {
    const el = bodyRef.current;
    if (!el || typeof el.scrollTop !== "number") return;
    el.scrollTop = el.scrollHeight;
  }, [turnCount, lastTurnItemCount, activeSession?.isRunning]);
  const isReady = resolution.status === "ready";
  const sourceThreadId = isReady ? resolution.sourceThreadId : null;
  const isRunning = activeSession?.isRunning === true;
  const canSend = isReady && !state.sending && !state.creating && !isRunning && !activeSession?.stale && draft.trim().length > 0;
  const handleCreateNew = () => {
    if (!sourceThreadId || state.creating) return;
    void controller.createSideChat(sourceThreadId, { select: true }).then(() => {
      onThreadsMutated?.(sourceThreadId);
      composerRef.current?.focus();
    }).catch(() => void 0);
  };
  const handleDeleteActive = () => {
    if (!state.activeThreadId || !sourceThreadId) return;
    const targetId = state.activeThreadId;
    void controller.deleteThread(targetId).then(() => {
      onThreadsMutated?.(sourceThreadId);
    }).catch(() => void 0);
  };
  const handleRefresh = () => {
    if (!sourceThreadId) return;
    void controller.refreshThreads(sourceThreadId).catch(() => void 0);
    if (state.activeThreadId) {
      void controller.refreshSnapshot(state.activeThreadId).catch(() => void 0);
    }
  };
  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !sourceThreadId || state.sending || state.creating || isRunning || activeSession?.stale) {
      return;
    }
    const previousDraft = draft;
    setDraft("");
    try {
      if (state.activeThreadId) {
        await controller.sendMessage(state.activeThreadId, text);
      } else {
        await controller.askInNewSideChat(sourceThreadId, text);
        onThreadsMutated?.(sourceThreadId);
      }
    } catch {
      setDraft((current) => current === "" ? previousDraft : current);
    }
  };
  const handleInterrupt = () => {
    if (!state.activeThreadId || state.interrupting) return;
    void controller.interrupt(state.activeThreadId).catch(() => void 0);
  };
  const handleRespond = (pending, answer) => {
    if (!state.activeThreadId) return;
    void controller.respondToInteraction(state.activeThreadId, pending, answer).catch(() => void 0);
  };
  const handleComposerKeyDown = (event) => {
    const native = event.nativeEvent;
    const isComposing = Boolean(native?.isComposing || event.keyCode === 229 || native?.keyCode === 229);
    if (isComposing) return;
    if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      void handleSend();
    }
  };
  const modeBadgeLabel = activeMode === "persistent" ? t("mode.persistent.badge") : activeMode === "ephemeral" ? t("mode.ephemeral.badge") : null;
  const modeSubtitle = activeMode === "persistent" ? t("mode.persistent.subtitle") : activeMode === "ephemeral" ? t("mode.ephemeral.subtitle") : null;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
    "section",
    {
      className: "csc-panel",
      "data-codexhost-side-chat-panel": true,
      "data-csc-source-status": resolution.status,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { className: "csc-header", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-header-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "select",
              {
                className: "csc-select",
                "aria-label": t("header.selectAria"),
                "data-csc-thread-select": true,
                disabled: !isReady || state.threads.length === 0,
                value: state.activeThreadId ?? "",
                onChange: (event) => {
                  const nextId = event.target.value;
                  if (nextId) {
                    void controller.selectThread(nextId).catch(() => void 0);
                  }
                },
                children: state.threads.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "", children: t("header.noThreadsOption") }) : state.threads.map((item) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: item.threadId, children: formatThreadOptionLabel(item, t) }, item.threadId))
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "button",
              {
                type: "button",
                className: "csc-btn",
                disabled: !isReady || state.creating,
                title: t("header.newTitle"),
                "data-csc-action": "new",
                onClick: handleCreateNew,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PlusIcon, { size: 13 }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t("header.new") })
                ]
              }
            ),
            state.activeThreadId && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "button",
              {
                type: "button",
                className: "csc-btn csc-btn-icon",
                disabled: !isReady,
                title: t("header.deleteTitle"),
                "aria-label": t("header.delete"),
                "data-csc-action": "delete",
                onClick: handleDeleteActive,
                children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(TrashIcon, { size: 13 })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
              "button",
              {
                type: "button",
                className: "csc-btn csc-btn-icon",
                disabled: !isReady || state.loadingThreads,
                title: t("header.refreshTitle"),
                "aria-label": t("header.refresh"),
                "data-csc-action": "refresh",
                onClick: handleRefresh,
                children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(RefreshIcon, { size: 13 })
              }
            )
          ] }),
          activeMode && modeBadgeLabel && modeSubtitle && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              className: "csc-mode-bar",
              "data-csc-mode": activeMode,
              title: modeSubtitle,
              role: "status",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { className: "csc-mode-badge", "data-csc-mode-badge": activeMode, children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "csc-mode-dot", "aria-hidden": "true" }),
                  modeBadgeLabel
                ] }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "csc-mode-subtitle", "data-csc-mode-subtitle": true, children: modeSubtitle })
              ]
            }
          )
        ] }),
        state.error && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-alert csc-alert-error", role: "alert", "data-csc-error": true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: state.error.message }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-alert-actions", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "button",
            {
              type: "button",
              className: "csc-btn csc-btn-ghost",
              style: { height: 22, padding: "0 6px", fontSize: 11 },
              onClick: () => controller.clearError(),
              children: t("composer.dismissError")
            }
          ) })
        ] }),
        activeSession?.nativeError && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-alert csc-alert-error", role: "alert", "data-csc-native-error": true, children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: activeSession.nativeError }) }),
        activeSession?.stale && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-alert csc-alert-warn", role: "status", "data-csc-stale": true, children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("strong", { children: t("stale.title") }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { children: t("stale.body") })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-alert-actions", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "button",
            {
              type: "button",
              className: "csc-btn csc-btn-primary",
              style: { height: 26, fontSize: 11 },
              disabled: state.creating,
              "data-csc-action": "stale-new",
              onClick: handleCreateNew,
              children: t("stale.action")
            }
          ) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-body", ref: bodyRef, "data-csc-messages": true, children: resolution.status === "draft" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-empty", "data-csc-empty": "draft", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-empty-icon", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(SideChatIcon, { size: 28 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "csc-empty-title", children: t("empty.draftTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "csc-empty-body", children: t("empty.draftBody") })
        ] }) : resolution.status === "remote-unsupported" ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-empty", "data-csc-empty": "remote", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-empty-icon", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(SideChatIcon, { size: 28 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "csc-empty-title", children: t("empty.remoteTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "csc-empty-body", children: t("empty.remoteBody") })
        ] }) : !activeSession ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-empty", "data-csc-empty": "welcome", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-empty-icon", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(SideChatIcon, { size: 28 }) }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "csc-empty-title", children: t("empty.welcomeTitle") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "csc-empty-body", children: t("empty.welcomeBody") }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "button",
            {
              type: "button",
              className: "csc-btn csc-btn-primary",
              disabled: state.creating,
              "data-csc-action": "start",
              onClick: handleCreateNew,
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(PlusIcon, { size: 13 }),
                /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: state.creating ? t("composer.creating") : t("empty.startButton") })
              ]
            }
          )
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(import_jsx_runtime6.Fragment, { children: [
          activeSession.hasOlderTurns && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "button",
            {
              type: "button",
              className: "csc-btn csc-load-older",
              disabled: activeSession.loadingOlder,
              "data-csc-action": "load-older",
              onClick: () => {
                void controller.loadOlderTurns(activeSession.threadId).catch(() => void 0);
              },
              children: activeSession.loadingOlder ? t("turns.loadingOlder") : t("turns.loadOlder")
            }
          ),
          activeSession.loading && activeSession.turns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-empty", "data-csc-empty": "loading", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "csc-empty-body", children: t("turns.loading") }) }) : activeSession.turns.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-empty", "data-csc-empty": "branch-ready", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("h3", { className: "csc-empty-title", children: t("empty.branchReadyTitle") }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "csc-empty-body", children: t("empty.branchReadyBody") })
          ] }) : activeSession.turns.map((turn) => /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
            "div",
            {
              className: "csc-turn",
              "data-csc-turn-id": turn.id,
              "data-csc-turn-outcome": turn.outcome,
              children: [
                turn.items.map((item) => {
                  if (item.kind === "userMessage") {
                    const cleanText = stripSideChatBoundary(item.text);
                    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                      "div",
                      {
                        className: "csc-msg csc-msg-user",
                        "data-csc-item": "userMessage",
                        children: cleanText
                      },
                      item.id
                    );
                  }
                  if (item.kind === "agentMessage") {
                    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                      "div",
                      {
                        className: "csc-msg csc-msg-assistant",
                        "data-csc-item": "agentMessage",
                        children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(MarkdownContent, { text: item.text, t })
                      },
                      item.id
                    );
                  }
                  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(ToolItemCard, { item, t }, item.id);
                }),
                turn.outcome === "failed" && turn.errorMessage && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-alert csc-alert-error", style: { margin: 0 }, role: "alert", children: t("turns.failed", { message: turn.errorMessage }) }),
                turn.outcome === "cancelled" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-turn-status", children: t("turns.cancelled") }),
                turn.outcome === "unknown" && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "csc-turn-status", children: t("turns.unknownOutcome", { reason: turn.unknownReason ?? "unknown" }) })
              ]
            },
            turn.id
          )),
          isRunning && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-streaming", "data-csc-streaming": true, children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "csc-pulse-dot", "aria-hidden": "true" }),
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: t("turns.streaming") })
          ] })
        ] }) }),
        activeSession && activeSession.interactions.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          InteractionCards,
          {
            interactions: activeSession.interactions,
            respondingRequestIds: state.respondingRequestIds,
            onRespond: handleRespond,
            t
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("footer", { className: "csc-composer", children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
            "textarea",
            {
              ref: composerRef,
              className: "csc-textarea",
              value: draft,
              disabled: !isReady || activeSession?.stale === true,
              placeholder: isReady ? t("composer.placeholder") : t("composer.placeholderDraft"),
              "data-csc-composer": true,
              onChange: (event) => setDraft(event.target.value),
              onKeyDown: handleComposerKeyDown
            }
          ),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "csc-composer-footer", children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "csc-composer-hint", children: state.creating ? t("composer.creating") : state.sending ? t("composer.sending") : "" }),
            isRunning ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "button",
              {
                type: "button",
                className: "csc-btn csc-btn-danger",
                disabled: state.interrupting,
                "data-csc-action": "stop",
                onClick: handleInterrupt,
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(StopIcon, { size: 12 }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: state.interrupting ? t("composer.stopping") : t("composer.stop") })
                ]
              }
            ) : /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)(
              "button",
              {
                type: "button",
                className: "csc-btn csc-btn-primary",
                disabled: !canSend,
                "data-csc-action": "send",
                onClick: () => {
                  void handleSend();
                },
                children: [
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(SendIcon, { size: 12 }),
                  /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { children: state.sending ? t("composer.sending") : t("composer.send") })
                ]
              }
            )
          ] })
        ] })
      ]
    }
  );
}
function SideChatTabBody({
  sessionId,
  useTabInfo,
  useMainSession,
  useFocusNonce,
  manager,
  getLocale,
  t: hostT
}) {
  const { tab } = useTabInfo();
  const resolution = useMainSession((value) => value);
  const managerFocusNonce = useFocusNonce(tab.id, (value) => value ?? 0);
  const navParams = parseSideChatTabParams(tab.navigation.params);
  const controller = manager.controllerForTab(sessionId, tab.id, {
    ...navParams.sideThreadId ? { sideThreadId: navParams.sideThreadId } : {}
  });
  const t = wrapHostTranslator(hostT, getLocale());
  const effectiveFocusNonce = Math.max(
    managerFocusNonce,
    navParams.focusNonce ?? (navParams.focusComposer ? tab.navigation.revision + 1 : 0)
  );
  const readySourceId = resolution.status === "ready" ? resolution.sourceThreadId : null;
  (0, import_react4.useEffect)(() => {
    if (!readySourceId) {
      void controller.setSourceThread(null);
      return;
    }
    const snap = controller.getSnapshot();
    if (navParams.sideThreadId) {
      if (snap.activeThreadId === navParams.sideThreadId) {
        void controller.refreshThreads(readySourceId).catch(() => void 0);
        return;
      }
      void controller.setSourceThread(readySourceId, { autoSelectFirst: false }).then(() => controller.selectThread(navParams.sideThreadId)).catch(() => void 0);
      return;
    }
    if (snap.sourceThreadId !== readySourceId) {
      void controller.setSourceThread(readySourceId, { autoSelectFirst: true }).catch(() => void 0);
    }
  }, [controller, readySourceId, navParams.sideThreadId, tab.navigation.revision]);
  (0, import_react4.useEffect)(
    () => tab.actions.bindCommands({
      refresh: () => {
        if (!readySourceId) return;
        void controller.refreshThreads(readySourceId).catch(() => void 0);
        const activeId = controller.getSnapshot().activeThreadId;
        if (activeId) {
          void controller.refreshSnapshot(activeId).catch(() => void 0);
        }
      }
    }),
    [tab.actions, controller, readySourceId]
  );
  (0, import_react4.useEffect)(() => {
    const onAbort = () => {
      manager.releaseTab(sessionId, tab.id);
    };
    if (tab.signal.aborted) {
      onAbort();
      return;
    }
    tab.signal.addEventListener("abort", onAbort, { once: true });
    return () => {
      tab.signal.removeEventListener("abort", onAbort);
    };
  }, [manager, sessionId, tab.id, tab.signal]);
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    SideChatPanelView,
    {
      controller,
      resolution,
      t,
      locale: getLocale(),
      focusNonce: effectiveFocusNonce,
      visible: tab.visible,
      onThreadsMutated: (sourceId) => {
        manager.notifySiblingsChanged(sourceId, controller);
      }
    }
  );
}

// src/client/SideChatTitle.tsx
var import_react5 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
function SideChatTitle({
  useTabInfo,
  useSideChatTitle,
  renameTab,
  getLocale,
  t: hostT
}) {
  const { tab } = useTabInfo();
  const titleState = useSideChatTitle(tab.id, (value) => value);
  const t = wrapHostTranslator(hostT, getLocale());
  const displayTitle = titleState?.title || tab.title || t("tab.title");
  const mode = titleState?.mode ?? null;
  const [editing, setEditing] = (0, import_react5.useState)(false);
  const inputRef = (0, import_react5.useRef)(null);
  const labelRef = (0, import_react5.useRef)(null);
  const cancelledRef = (0, import_react5.useRef)(false);
  (0, import_react5.useEffect)(() => {
    if (editing || !titleState?.threadId) return;
    const chip = labelRef.current?.closest?.("[data-dockkit-tab], [data-dockkit-float-grip]");
    if (!chip) return;
    const onDblClick = (event) => {
      event.stopPropagation();
      cancelledRef.current = false;
      setEditing(true);
    };
    chip.addEventListener("dblclick", onDblClick);
    return () => {
      chip.removeEventListener("dblclick", onDblClick);
    };
  }, [editing, titleState?.threadId]);
  (0, import_react5.useEffect)(() => {
    if (!editing) return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [editing]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "csc-tab-title-wrap", children: [
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(SideChatIcon, { size: 14 }),
    editing ? /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      "input",
      {
        ref: inputRef,
        className: "csc-tab-title-input",
        defaultValue: displayTitle,
        maxLength: 120,
        "aria-label": t("tab.renameAria"),
        onPointerDown: (event) => event.stopPropagation(),
        onClick: (event) => event.stopPropagation(),
        onDoubleClick: (event) => event.stopPropagation(),
        onBlur: (event) => {
          setEditing(false);
          const next = event.currentTarget.value.trim();
          if (!cancelledRef.current && next !== "" && next !== displayTitle) {
            void renameTab(tab.id, next).catch(() => void 0);
          }
        },
        onKeyDown: (event) => {
          event.stopPropagation();
          const native = event.nativeEvent;
          if (native?.isComposing || event.keyCode === 229 || native?.keyCode === 229) return;
          if (event.key === "Escape") {
            cancelledRef.current = true;
            event.currentTarget.blur();
          } else if (event.key === "Enter") {
            event.currentTarget.blur();
          }
        }
      }
    ) : /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("span", { ref: labelRef, className: "csc-tab-title-text", children: displayTitle }),
    mode && /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
      "span",
      {
        className: "csc-tab-mode-dot",
        "data-csc-mode": mode,
        title: t(mode === "persistent" ? "mode.persistent.badge" : "mode.ephemeral.badge"),
        "aria-hidden": "true"
      }
    )
  ] });
}

// src/client/styles.ts
var SIDE_CHAT_STYLE_ID = "codexhost-plugin-side-chat-styles";
var SIDE_CHAT_CSS = `
.csc-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, #111827);
  background: var(--dsw-alias-bg-layer-1, transparent);
  font-size: 13px;
  line-height: 1.5;
}

.csc-panel *, .csc-panel *::before, .csc-panel *::after {
  box-sizing: border-box;
}

/* Header toolbar */
.csc-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.2));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.04));
  flex: none;
}

.csc-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.csc-select {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-md, 7px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.csc-select:focus-visible {
  border-color: #3b82f6;
}

.csc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-md, 7px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex: none;
  transition: background 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;
}

.csc-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12));
}

.csc-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.csc-btn-icon {
  padding: 0 7px;
}

.csc-btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.csc-btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.csc-btn-danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.csc-btn-danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.csc-btn-ghost {
  border-color: transparent;
  background: transparent;
}

/* Permanent mode badge bar (persistent = emerald, ephemeral = amber; NO toggle) */
.csc-mode-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border-radius: var(--dsw-radius-md, 8px);
  font-size: 11px;
  line-height: 1.4;
  min-width: 0;
}

.csc-mode-bar[data-csc-mode="persistent"] {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.32);
  color: #047857;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="persistent"] {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(52, 211, 153, 0.34);
  color: #6ee7b7;
}

.csc-mode-bar[data-csc-mode="ephemeral"] {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.36);
  color: #b45309;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="ephemeral"] {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(251, 191, 36, 0.38);
  color: #fcd34d;
}

.csc-mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  flex: none;
}

.csc-mode-bar[data-csc-mode="persistent"] .csc-mode-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #065f46;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="persistent"] .csc-mode-badge {
  background: rgba(16, 185, 129, 0.26);
  color: #a7f3d0;
}

.csc-mode-bar[data-csc-mode="ephemeral"] .csc-mode-badge {
  background: rgba(245, 158, 11, 0.24);
  color: #92400e;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="ephemeral"] .csc-mode-badge {
  background: rgba(245, 158, 11, 0.28);
  color: #fde68a;
}

.csc-mode-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

.csc-mode-subtitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.92;
}

/* Alerts */
.csc-alert {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 12px 0;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-md, 8px);
  font-size: 12px;
  line-height: 1.45;
  flex: none;
}

.csc-alert-error {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.28);
}

body[data-ds-dark-theme] .csc-alert-error {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(248, 113, 113, 0.34);
}

.csc-alert-warn {
  color: #92400e;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.32);
}

body[data-ds-dark-theme] .csc-alert-warn {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(251, 191, 36, 0.36);
}

.csc-alert-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

/* Messages scroll viewport */
.csc-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.csc-empty {
  margin: auto;
  max-width: 320px;
  padding: 20px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border-radius: var(--dsw-radius-lg, 12px);
  border: 1px dashed var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.04));
}

.csc-empty-icon {
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-empty-body {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-load-older {
  align-self: center;
}

/* Turn items */
.csc-turn {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.csc-msg {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.csc-msg-user {
  align-self: flex-end;
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 12px 12px 4px 12px;
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(37, 99, 235, 0.22);
  color: var(--dsw-alias-label-primary, inherit);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

body[data-ds-dark-theme] .csc-msg-user {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.3);
}

.csc-msg-assistant {
  align-self: stretch;
  padding: 2px 2px;
  color: var(--dsw-alias-label-primary, inherit);
  overflow-wrap: anywhere;
}

/* Safe Markdown styles */
.csc-md {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.csc-md p {
  margin: 0;
  white-space: pre-wrap;
}

.csc-md h1, .csc-md h2, .csc-md h3 {
  margin: 4px 0 0;
  font-weight: 600;
  line-height: 1.35;
}

.csc-md h1 { font-size: 15px; }
.csc-md h2 { font-size: 14px; }
.csc-md h3 { font-size: 13px; }

.csc-md ul, .csc-md ol {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.csc-md blockquote {
  margin: 0;
  padding: 4px 10px;
  border-left: 3px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.38));
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-md-inline-code {
  padding: 1px 5px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  background: rgba(128, 128, 128, 0.14);
}

.csc-md-link {
  color: #2563eb;
  text-decoration: underline;
  word-break: break-all;
}

body[data-ds-dark-theme] .csc-md-link {
  color: #60a5fa;
}

.csc-code-block {
  border-radius: var(--dsw-radius-md, 8px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.24));
  background: var(--dsw-alias-bg-layer-2, rgba(15, 23, 42, 0.05));
  overflow: hidden;
}

body[data-ds-dark-theme] .csc-code-block {
  background: rgba(0, 0, 0, 0.28);
}

.csc-code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.18));
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-code-pre {
  margin: 0;
  padding: 8px 10px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre;
}

/* Collapsible reasoning & tool cards */
.csc-tool-card {
  border-radius: var(--dsw-radius-md, 8px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.22));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.05));
  overflow: hidden;
}

.csc-tool-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #4b5563);
  font-size: 12px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.csc-tool-toggle:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08));
}

.csc-tool-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-tool-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
}

.csc-status-pill {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 999px;
  flex: none;
  font-weight: 500;
}

.csc-status-pill[data-status="running"] {
  background: rgba(59, 130, 246, 0.16);
  color: #2563eb;
}

.csc-status-pill[data-status="succeeded"] {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.csc-status-pill[data-status="failed"] {
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}

.csc-status-pill[data-status="cancelled"] {
  background: rgba(107, 114, 128, 0.18);
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-tool-body {
  padding: 8px 10px;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.16));
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.csc-tool-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-tool-pre {
  margin: 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  line-height: 1.45;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.csc-diff-line-add {
  color: #16a34a;
}

.csc-diff-line-del {
  color: #dc2626;
}

body[data-ds-dark-theme] .csc-diff-line-add {
  color: #4ade80;
}

body[data-ds-dark-theme] .csc-diff-line-del {
  color: #f87171;
}

.csc-compaction {
  text-align: center;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  padding: 2px 0;
}

.csc-turn-status {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.08);
}

.csc-streaming {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  padding: 2px 4px;
}

.csc-pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b82f6;
  animation: csc-pulse 1.2s ease-in-out infinite;
}

@keyframes csc-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* Inline interaction cards (approval & question) */
.csc-interactions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 0;
  flex: none;
  max-height: 46%;
  overflow-y: auto;
}

.csc-interaction-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--dsw-radius-lg, 10px);
  border: 1px solid rgba(59, 130, 246, 0.36);
  background: rgba(59, 130, 246, 0.06);
}

body[data-ds-dark-theme] .csc-interaction-card {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(96, 165, 250, 0.38);
}

.csc-interaction-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-interaction-desc {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #4b5563);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.csc-interaction-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.csc-question-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.csc-question-prompt {
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-question-optional {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-option-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.csc-option {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.24));
  background: var(--dsw-alias-bg-layer-1, transparent);
  cursor: pointer;
  font-size: 12px;
}

.csc-option:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08));
}

.csc-option input {
  margin-top: 2px;
  flex: none;
}

.csc-option-desc {
  display: block;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-input {
  width: 100%;
  padding: 6px 9px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.csc-input:focus-visible {
  border-color: #3b82f6;
}

/* Composer */
.csc-composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.2));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.03));
  flex: none;
}

.csc-textarea {
  width: 100%;
  min-height: 60px;
  max-height: 180px;
  resize: vertical;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-md, 8px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 13px;
  line-height: 1.45;
  font-family: inherit;
  outline: none;
}

.csc-textarea:focus-visible {
  border-color: #3b82f6;
}

.csc-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.csc-composer-hint {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Guide entry card (mirrors host GuideBody capsule) */
.csc-guide-entry {
  display: flex;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
  width: 100%;
  min-height: 56px;
  padding: 14px 20px;
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  text-align: left;
  background: var(--dsw-alias-bg-layer-1, transparent);
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.26));
  border-radius: var(--dsl-guide-entry-radius, var(--dsw-radius-xl, 12px));
  cursor: pointer;
}

.csc-guide-entry:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08));
}

.csc-guide-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-guide-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.csc-guide-title {
  overflow: hidden;
  font-size: 14px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.csc-guide-desc {
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.csc-guide-keys {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
}

.csc-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.08));
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 10px;
  font-family: inherit;
  line-height: 1;
}

/* Tab chip title */
.csc-tab-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.csc-tab-title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.csc-tab-title-input {
  width: 120px;
  min-width: 48px;
  max-width: 100%;
  padding: 0 4px;
  color: inherit;
  font: inherit;
  background: var(--dsw-alias-bg-l1, transparent);
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.35));
  border-radius: var(--dsw-radius-sm, 4px);
  outline: none;
}

.csc-tab-mode-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.csc-tab-mode-dot[data-csc-mode="persistent"] {
  background: #10b981;
}

.csc-tab-mode-dot[data-csc-mode="ephemeral"] {
  background: #f59e0b;
}
`;
function ensureSideChatStyles(pluginName = "codexhost-plugin-side-chat") {
  if (typeof document === "undefined" || !document.head) {
    return () => {
    };
  }
  const existing = document.getElementById(SIDE_CHAT_STYLE_ID);
  if (existing) {
    return () => {
    };
  }
  const tag = document.createElement("style");
  tag.id = SIDE_CHAT_STYLE_ID;
  tag.dataset.plugin = pluginName;
  tag.textContent = SIDE_CHAT_CSS;
  document.head.appendChild(tag);
  return () => {
    tag.remove();
  };
}

// src/client/controller.ts
var DEFAULT_DEBOUNCE_MS = 90;
var MAX_KNOWN_TURNS = 16;
function toIsoTimestamp(value, fallback) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    const ms = value > 1e12 ? value : value * 1e3;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return fallback;
}
function compareSummaryDesc(a, b) {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}
function maxIsoTimestamp(a, b) {
  return Date.parse(b) > Date.parse(a) ? b : a;
}
function makeErrorInfo(error, locale) {
  const code = error instanceof SideChatRpcError ? error.code : error && typeof error === "object" && "code" in error && (typeof error.code === "number" || typeof error.code === "string") ? error.code : "side-chat/error";
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return {
    code,
    message: formatSideChatError(error, locale),
    rawMessage
  };
}
function createInitialState() {
  return {
    sourceThreadId: null,
    threads: [],
    activeThreadId: null,
    activeSession: null,
    connected: false,
    loadingThreads: false,
    creating: false,
    sending: false,
    interrupting: false,
    respondingRequestIds: [],
    error: null
  };
}
var SideChatController = class {
  channel;
  store;
  events;
  debounceMs;
  autoConnectEvents;
  locale;
  state = createInitialState();
  listeners = /* @__PURE__ */ new Set();
  disposed = false;
  listGeneration = 0;
  // Debounced snapshot reconciliation state
  snapshotTimer = null;
  snapshotInFlight = false;
  snapshotDirty = false;
  listRefreshTimer = null;
  // Cached completed raw turns per threadId for `knownTurns` snapshot compaction
  cachedCompletedTurns = /* @__PURE__ */ new Map();
  cachedEpochs = /* @__PURE__ */ new Map();
  prependedOlderTurns = /* @__PURE__ */ new Map();
  constructor(options = {}) {
    const httpOpts = {
      ...options.fetch ? { fetch: options.fetch } : {},
      ...options.baseUrl !== void 0 ? { baseUrl: options.baseUrl } : {}
    };
    this.channel = options.channel ?? new ChChannelClient(httpOpts);
    this.store = options.store ?? new SideChatStoreClient(httpOpts);
    this.debounceMs = Math.max(10, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    this.autoConnectEvents = options.autoConnectEvents ?? true;
    this.locale = normalizeLocale(options.locale);
    this.events = options.events ?? new ChEventsSubscriber({
      ...httpOpts,
      onEvent: (event) => this.handleChannelEvent(event),
      onConnectionChange: (online) => this.handleConnectionChange(online)
    });
  }
  // -------------------------------------------------------------------------
  // React useSyncExternalStore API
  // -------------------------------------------------------------------------
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  getSnapshot = () => this.state;
  // -------------------------------------------------------------------------
  // Lifecycle & configuration
  // -------------------------------------------------------------------------
  setLocale(locale) {
    this.locale = normalizeLocale(locale);
  }
  connectEvents() {
    if (this.disposed) return;
    this.events.start();
  }
  disconnectEvents() {
    this.events.stop();
  }
  clearError() {
    if (this.state.error !== null) {
      this.setState({ error: null });
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.clearTimers();
    this.events.stop();
    this.listeners.clear();
    this.cachedCompletedTurns.clear();
    this.cachedEpochs.clear();
    this.prependedOlderTurns.clear();
  }
  // -------------------------------------------------------------------------
  // Source thread switching & merged Desktop/Web thread discovery
  // -------------------------------------------------------------------------
  async setSourceThread(sourceThreadId, options) {
    const normalized = sourceThreadId?.trim() || null;
    if (normalized === this.state.sourceThreadId && normalized === null) return;
    const sourceChanged = normalized !== this.state.sourceThreadId;
    if (sourceChanged) {
      this.clearSnapshotTimer();
      this.snapshotDirty = false;
      this.setState({
        sourceThreadId: normalized,
        threads: [],
        activeThreadId: null,
        activeSession: null,
        error: null
      });
    }
    if (!normalized) return;
    if (this.autoConnectEvents) {
      this.events.start();
    }
    const merged = await this.refreshThreads(normalized);
    if (this.disposed || this.state.sourceThreadId !== normalized) return;
    const autoSelect = options?.autoSelectFirst ?? true;
    if (autoSelect && !this.state.activeThreadId && merged.length > 0) {
      await this.selectThread(merged[0].threadId);
    }
  }
  async refreshThreads(sourceThreadId) {
    const targetSource = sourceThreadId?.trim() || this.state.sourceThreadId;
    if (!targetSource) return [];
    const generation = ++this.listGeneration;
    this.setState({ loadingThreads: true });
    const [pluginOutcome, desktopOutcome] = await Promise.allSettled([
      this.store.list(targetSource),
      this.channel.listAttachedThreads(targetSource)
    ]);
    if (this.disposed || generation !== this.listGeneration) {
      return [...this.state.threads];
    }
    if (pluginOutcome.status === "rejected" && desktopOutcome.status === "rejected") {
      const error = pluginOutcome.reason ?? desktopOutcome.reason;
      this.setState({
        loadingThreads: false,
        error: makeErrorInfo(error, this.locale)
      });
      throw error;
    }
    const pluginRecords = pluginOutcome.status === "fulfilled" ? pluginOutcome.value : [];
    const attachedRows = desktopOutcome.status === "fulfilled" ? desktopOutcome.value.data : [];
    const merged = this.mergeDiscoveredThreads(targetSource, pluginRecords, attachedRows);
    let nextActiveSession = this.state.activeSession;
    if (nextActiveSession) {
      const matched = merged.find((item) => item.threadId === nextActiveSession.threadId);
      if (matched) {
        nextActiveSession = {
          ...nextActiveSession,
          mode: matched.mode,
          title: matched.title || nextActiveSession.title,
          boundaryConsumed: nextActiveSession.boundaryConsumed || matched.boundaryConsumed
        };
      }
    }
    this.setState({
      threads: merged,
      activeSession: nextActiveSession,
      loadingThreads: false
    });
    return merged;
  }
  mergeDiscoveredThreads(sourceThreadId, pluginRecords, attachedRows) {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const pluginMap = new Map(pluginRecords.map((record) => [record.threadId, record]));
    const seenIds = /* @__PURE__ */ new Set();
    const results = [];
    for (const row of attachedRows) {
      if (!row || typeof row.id !== "string" || row.id.trim().length === 0) continue;
      const threadId = row.id;
      seenIds.add(threadId);
      const plugin = pluginMap.get(threadId);
      const cleanPreview = stripSideChatBoundary(row.preview ?? "");
      const cleanName = typeof row.name === "string" ? stripSideChatBoundary(row.name).trim() : "";
      const hasExistingHistory = cleanPreview.length > 0 || Array.isArray(row.turns) && row.turns.length > 0;
      const hostCreatedAt = toIsoTimestamp(row.createdAt, plugin?.createdAt ?? nowIso);
      const hostUpdatedAt = toIsoTimestamp(row.updatedAt, plugin?.updatedAt ?? hostCreatedAt);
      if (plugin) {
        const cleanPluginTitle = stripSideChatBoundary(plugin.title).trim();
        results.push({
          threadId,
          sourceThreadId,
          mode: "persistent",
          title: cleanPluginTitle || cleanName || deriveSideChatTitle(cleanPreview),
          preview: cleanPreview,
          boundaryConsumed: plugin.boundaryConsumed || hasExistingHistory,
          source: "merged",
          createdAt: plugin.createdAt,
          updatedAt: maxIsoTimestamp(plugin.updatedAt, hostUpdatedAt),
          statusType: row.status?.type ?? "idle"
        });
      } else {
        results.push({
          threadId,
          sourceThreadId,
          mode: "persistent",
          title: cleanName || deriveSideChatTitle(cleanPreview),
          preview: cleanPreview,
          boundaryConsumed: hasExistingHistory,
          source: "desktop",
          createdAt: hostCreatedAt,
          updatedAt: hostUpdatedAt,
          statusType: row.status?.type ?? "idle"
        });
      }
    }
    for (const plugin of pluginRecords) {
      if (seenIds.has(plugin.threadId)) continue;
      const cleanTitle = stripSideChatBoundary(plugin.title).trim();
      results.push({
        threadId: plugin.threadId,
        sourceThreadId: plugin.sourceThreadId,
        mode: plugin.mode,
        title: cleanTitle,
        preview: "",
        boundaryConsumed: plugin.boundaryConsumed,
        source: "plugin",
        createdAt: plugin.createdAt,
        updatedAt: plugin.updatedAt,
        statusType: "idle"
      });
    }
    return results.sort(compareSummaryDesc);
  }
  // -------------------------------------------------------------------------
  // Side Chat creation: Persistent-first + seamless -32602 ephemeral fallback
  // -------------------------------------------------------------------------
  async createSideChat(sourceThreadId, options) {
    const targetSource = sourceThreadId?.trim() || this.state.sourceThreadId?.trim() || "";
    if (!targetSource) {
      const draftErr = new SideChatRpcError(
        "side-chat/draft-source",
        "The main conversation is still a draft and has no threadId."
      );
      this.setState({ error: makeErrorInfo(draftErr, this.locale) });
      throw draftErr;
    }
    this.setState({ creating: true, error: null });
    let createdThreadId;
    let mode;
    try {
      try {
        const persistentResult = await this.channel.forkThread({
          threadId: targetSource,
          attachToSource: true,
          excludeTurns: true
        });
        createdThreadId = this.extractDistinctForkThreadId(persistentResult, targetSource);
        mode = "persistent";
      } catch (firstError) {
        if (!isAttachToSourceUnsupportedError(firstError)) {
          throw firstError;
        }
        const ephemeralResult = await this.channel.forkThread({
          threadId: targetSource,
          ephemeral: true,
          excludeTurns: true
        });
        createdThreadId = this.extractDistinctForkThreadId(ephemeralResult, targetSource);
        mode = "ephemeral";
      }
      const cleanTitle = options?.title ? deriveSideChatTitle(options.title) : "";
      const saved = await this.store.upsert({
        threadId: createdThreadId,
        sourceThreadId: targetSource,
        mode,
        title: cleanTitle,
        boundaryConsumed: false
      });
      const summary = {
        threadId: saved.thread.threadId,
        sourceThreadId: saved.thread.sourceThreadId,
        mode: saved.thread.mode,
        title: stripSideChatBoundary(saved.thread.title),
        preview: "",
        boundaryConsumed: saved.thread.boundaryConsumed,
        source: "plugin",
        createdAt: saved.thread.createdAt,
        updatedAt: saved.thread.updatedAt,
        statusType: "idle"
      };
      const nextThreads = [
        summary,
        ...this.state.threads.filter(
          (item) => item.sourceThreadId === targetSource && item.threadId !== summary.threadId
        )
      ].sort(compareSummaryDesc);
      const shouldSelect = options?.select !== false;
      const nextSession = shouldSelect ? {
        threadId: summary.threadId,
        mode: summary.mode,
        title: summary.title,
        boundaryConsumed: summary.boundaryConsumed,
        turns: [],
        hasOlderTurns: false,
        nextTurnsCursor: null,
        activeTurnId: null,
        isRunning: false,
        interactions: [],
        epoch: null,
        nativeError: null,
        loaded: true,
        loading: false,
        loadingOlder: false,
        stale: false
      } : this.state.activeSession;
      this.setState({
        sourceThreadId: targetSource,
        threads: nextThreads,
        activeThreadId: shouldSelect ? summary.threadId : this.state.activeThreadId,
        activeSession: nextSession,
        creating: false,
        error: null
      });
      if (this.autoConnectEvents) {
        this.events.start();
      }
      if (shouldSelect && !options?.skipInitialSnapshot) {
        await this.refreshSnapshot(summary.threadId).catch(() => void 0);
      }
      return summary;
    } catch (error) {
      this.setState({
        creating: false,
        error: makeErrorInfo(error, this.locale)
      });
      throw error;
    }
  }
  extractDistinctForkThreadId(result, sourceThreadId) {
    const id = result?.thread?.id;
    if (typeof id !== "string" || !id.trim() || id === sourceThreadId) {
      throw new SideChatRpcError(
        "side-chat/fork-unconfirmed",
        "CodexHost did not confirm a distinct Side Chat thread ID."
      );
    }
    return id.trim();
  }
  // -------------------------------------------------------------------------
  // Thread selection, deletion, renaming
  // -------------------------------------------------------------------------
  async selectThread(threadId) {
    this.clearSnapshotTimer();
    this.snapshotDirty = false;
    if (!threadId) {
      this.setState({ activeThreadId: null, activeSession: null });
      return;
    }
    const summary = this.state.threads.find((item) => item.threadId === threadId);
    const prevSession = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
    this.setState({
      activeThreadId: threadId,
      activeSession: {
        threadId,
        mode: summary?.mode ?? prevSession?.mode ?? "persistent",
        title: summary?.title ?? prevSession?.title ?? "",
        boundaryConsumed: summary?.boundaryConsumed ?? prevSession?.boundaryConsumed ?? false,
        turns: prevSession?.turns ?? [],
        hasOlderTurns: prevSession?.hasOlderTurns ?? false,
        nextTurnsCursor: prevSession?.nextTurnsCursor ?? null,
        activeTurnId: prevSession?.activeTurnId ?? null,
        isRunning: prevSession?.isRunning ?? false,
        interactions: prevSession?.interactions ?? [],
        epoch: prevSession?.epoch ?? null,
        nativeError: prevSession?.nativeError ?? null,
        loaded: prevSession?.loaded ?? false,
        loading: true,
        loadingOlder: false,
        stale: false
      },
      error: null
    });
    await this.refreshSnapshot(threadId);
  }
  async renameThread(threadId, rawTitle) {
    const cleanTitle = deriveSideChatTitle(rawTitle, 200);
    if (!cleanTitle) return;
    const summary = this.state.threads.find((item) => item.threadId === threadId);
    try {
      await this.store.patch(threadId, { title: cleanTitle });
    } catch (error) {
      if (error instanceof SideChatRpcError && error.status === 404 && summary) {
        await this.store.upsert({
          threadId,
          sourceThreadId: summary.sourceThreadId,
          mode: summary.mode,
          title: cleanTitle,
          boundaryConsumed: summary.boundaryConsumed
        });
      } else {
        throw error;
      }
    }
    if (summary?.mode === "persistent") {
      await this.channel.renameThread({ threadId, name: cleanTitle }).catch(() => void 0);
    }
    this.updateLocalThreadSummary(threadId, {
      title: cleanTitle,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async deleteThread(threadId) {
    const sourceThreadId = this.state.sourceThreadId ?? void 0;
    const summary = this.state.threads.find((item) => item.threadId === threadId);
    const mode = summary?.mode ?? (this.state.activeSession?.threadId === threadId ? this.state.activeSession.mode : void 0);
    if (mode === "persistent") {
      try {
        await this.channel.archiveThread({ threadId });
      } catch (error) {
        const ignorableMissing = error instanceof SideChatRpcError && (error.code === -32079 || error.code === -32600 || error.status === 404);
        if (!ignorableMissing) {
          this.setState({ error: makeErrorInfo(error, this.locale) });
          throw error;
        }
      }
    }
    try {
      await this.store.remove(threadId, sourceThreadId);
    } catch (error) {
      if (!(error instanceof SideChatRpcError && error.status === 404)) {
        this.setState({ error: makeErrorInfo(error, this.locale) });
        throw error;
      }
    }
    this.cachedCompletedTurns.delete(threadId);
    this.cachedEpochs.delete(threadId);
    this.prependedOlderTurns.delete(threadId);
    const remaining = this.state.threads.filter((item) => item.threadId !== threadId);
    const deletedWasActive = this.state.activeThreadId === threadId;
    this.setState({
      threads: remaining,
      ...deletedWasActive ? {
        activeThreadId: remaining[0]?.threadId ?? null,
        activeSession: null
      } : {}
    });
    if (deletedWasActive && remaining[0]) {
      await this.selectThread(remaining[0].threadId);
    }
  }
  // -------------------------------------------------------------------------
  // Messaging: first-turn boundary injection & /btw one-step ask
  // -------------------------------------------------------------------------
  async askInNewSideChat(sourceThreadId, questionText) {
    const trimmed = questionText.trim();
    if (!trimmed) {
      throw new SideChatRpcError("side-chat/empty-message", "Question text cannot be empty.");
    }
    const created = await this.createSideChat(sourceThreadId, {
      title: deriveSideChatTitle(trimmed),
      select: true,
      skipInitialSnapshot: true
    });
    await this.sendMessage(created.threadId, questionText);
    const updated = this.state.threads.find((item) => item.threadId === created.threadId) ?? created;
    return { thread: updated, mode: updated.mode };
  }
  async sendMessage(threadId, rawUserText) {
    if (!rawUserText.trim()) {
      throw new SideChatRpcError("side-chat/empty-message", "Message text cannot be empty.");
    }
    let summary = this.state.threads.find((item) => item.threadId === threadId);
    let session = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
    let boundaryConsumed = Boolean(summary?.boundaryConsumed) || Boolean(session?.boundaryConsumed) || Boolean(session?.loaded && session.turns.length > 0);
    if (!boundaryConsumed && summary?.source === "desktop" && (!session || !session.loaded)) {
      await this.refreshSnapshot(threadId).catch(() => void 0);
      summary = this.state.threads.find((item) => item.threadId === threadId);
      session = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
      boundaryConsumed = Boolean(summary?.boundaryConsumed) || Boolean(session?.boundaryConsumed) || Boolean(session?.loaded && session.turns.length > 0);
    }
    const shouldInjectBoundary = !boundaryConsumed;
    const wireText = shouldInjectBoundary ? injectSideChatBoundary(rawUserText) : rawUserText;
    const clientUserMessageId = createClientUserMessageId();
    this.setState({ sending: true, error: null });
    try {
      await this.channel.startTurn({
        threadId,
        text: wireText,
        clientUserMessageId
      });
    } catch (error) {
      this.setState({
        sending: false,
        error: makeErrorInfo(error, this.locale)
      });
      throw error;
    }
    const needsTitle = !summary?.title || summary.title.trim().length === 0;
    const derivedTitle = needsTitle ? deriveSideChatTitle(rawUserText) : summary?.title ?? "";
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    this.updateLocalThreadSummary(threadId, {
      boundaryConsumed: true,
      ...needsTitle && derivedTitle ? { title: derivedTitle } : {},
      preview: summary?.preview || deriveSideChatTitle(rawUserText, 120),
      updatedAt: nowIso
    });
    this.setState({ sending: false });
    await this.persistTurnMetadataBestEffort(threadId, summary, derivedTitle, needsTitle);
    await this.refreshSnapshot(threadId).catch(() => void 0);
  }
  async persistTurnMetadataBestEffort(threadId, summary, title, needsTitle) {
    try {
      await this.store.patch(threadId, {
        boundaryConsumed: true,
        ...needsTitle && title ? { title } : {}
      });
    } catch (error) {
      if (error instanceof SideChatRpcError && error.status === 404 && summary) {
        await this.store.upsert({
          threadId,
          sourceThreadId: summary.sourceThreadId,
          mode: summary.mode,
          title,
          boundaryConsumed: true
        }).catch(() => void 0);
      }
    }
  }
  // -------------------------------------------------------------------------
  // Snapshot reconciliation, older turn paging, interrupt, and interactions
  // -------------------------------------------------------------------------
  async refreshSnapshot(threadIdInput) {
    const threadId = threadIdInput ?? this.state.activeThreadId;
    if (!threadId || this.disposed) return;
    this.snapshotDirty = false;
    this.snapshotInFlight = true;
    try {
      const resolvedSnapshot = await this.fetchResolvedSnapshot(threadId);
      if (this.disposed) return;
      const normalized = normalizeSnapshot(resolvedSnapshot);
      const olderTurns = this.prependedOlderTurns.get(threadId) ?? [];
      const recentIds = new Set(normalized.turns.map((turn) => turn.id));
      const combinedTurns = [
        ...olderTurns.filter((turn) => !recentIds.has(turn.id)),
        ...normalized.turns
      ];
      const summary = this.state.threads.find((item) => item.threadId === threadId);
      const boundaryConsumed = Boolean(summary?.boundaryConsumed) || Boolean(
        this.state.activeSession?.threadId === threadId && this.state.activeSession.boundaryConsumed
      ) || combinedTurns.length > 0;
      const resolvedTitle = summary?.title || normalized.title || deriveSideChatTitle(normalized.preview) || this.deriveTitleFromTurns(combinedTurns);
      if (summary) {
        const shouldBumpBoundary = !summary.boundaryConsumed && boundaryConsumed;
        const shouldSetTitle = !summary.title && resolvedTitle.length > 0;
        if (shouldBumpBoundary || shouldSetTitle || normalized.statusType !== summary.statusType) {
          this.updateLocalThreadSummary(threadId, {
            boundaryConsumed,
            ...shouldSetTitle ? { title: resolvedTitle } : {},
            ...normalized.preview ? { preview: normalized.preview } : {},
            statusType: normalized.statusType
          });
        }
      }
      if (this.state.activeThreadId === threadId) {
        const existingSession = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
        this.setState({
          activeSession: {
            threadId,
            mode: summary?.mode ?? existingSession?.mode ?? "persistent",
            title: resolvedTitle,
            boundaryConsumed,
            turns: combinedTurns,
            hasOlderTurns: olderTurns.length > 0 ? Boolean(existingSession?.hasOlderTurns) : normalized.hasOlderTurns,
            nextTurnsCursor: olderTurns.length > 0 ? existingSession?.nextTurnsCursor ?? normalized.nextTurnsCursor : normalized.nextTurnsCursor,
            activeTurnId: normalized.activeTurnId,
            isRunning: normalized.isRunning,
            interactions: normalized.interactions,
            epoch: normalized.epoch,
            nativeError: normalized.nativeError,
            loaded: true,
            loading: false,
            loadingOlder: existingSession?.loadingOlder ?? false,
            stale: false
          }
        });
      }
    } catch (error) {
      if (this.disposed) return;
      const isExpired = error instanceof SideChatRpcError && error.code === -32079;
      const existing = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
      this.setState({
        error: makeErrorInfo(error, this.locale),
        ...existing ? {
          activeSession: {
            ...existing,
            loading: false,
            ...isExpired ? { stale: true, isRunning: false, activeTurnId: null } : {}
          }
        } : {}
      });
    } finally {
      this.snapshotInFlight = false;
      if (!this.disposed && this.snapshotDirty && this.state.activeThreadId === threadId) {
        this.scheduleSnapshotRefresh(threadId);
      }
    }
  }
  async fetchResolvedSnapshot(threadId) {
    const cachedMap = this.cachedCompletedTurns.get(threadId) ?? /* @__PURE__ */ new Map();
    const knownTurns = [...cachedMap.values()].slice(-MAX_KNOWN_TURNS).flatMap(
      (turn) => turn.fingerprint ? [{ id: turn.id, fingerprint: turn.fingerprint }] : []
    );
    let snapshot = await this.channel.snapshot(threadId, { knownTurns });
    const prevEpoch = this.cachedEpochs.get(threadId);
    if (prevEpoch && prevEpoch !== snapshot.cursor.epoch) {
      cachedMap.clear();
      this.prependedOlderTurns.delete(threadId);
    }
    const hasUnresolvedPlaceholder = (candidate) => candidate.turnsPage.data.some(
      (turn) => turn.unchanged && cachedMap.get(turn.id)?.fingerprint !== turn.fingerprint
    );
    if (hasUnresolvedPlaceholder(snapshot)) {
      snapshot = await this.channel.snapshot(threadId, { knownTurns: [] });
      if (snapshot.turnsPage.data.some((turn) => turn.unchanged)) {
        throw new SideChatRpcError(
          "host/history-invalid",
          "Host returned an unchanged placeholder that was not requested."
        );
      }
    }
    const resolvedData = snapshot.turnsPage.data.map((turn) => {
      if (turn.unchanged) {
        return cachedMap.get(turn.id);
      }
      if (turn.fingerprint && turn.status !== "inProgress" && turn.status !== "running") {
        cachedMap.set(turn.id, turn);
      }
      return turn;
    });
    this.cachedCompletedTurns.set(threadId, cachedMap);
    this.cachedEpochs.set(threadId, snapshot.cursor.epoch);
    return {
      ...snapshot,
      turnsPage: {
        ...snapshot.turnsPage,
        data: resolvedData
      }
    };
  }
  async loadOlderTurns(threadIdInput) {
    const threadId = threadIdInput ?? this.state.activeThreadId;
    const session = this.state.activeSession;
    if (!threadId || !session || session.threadId !== threadId || !session.nextTurnsCursor || session.loadingOlder) {
      return;
    }
    this.setState({
      activeSession: { ...session, loadingOlder: true }
    });
    try {
      const page = await this.channel.listTurnsPage(threadId, session.nextTurnsCursor, 5);
      if (this.disposed || this.state.activeThreadId !== threadId) return;
      const olderNormalized = [...page.data].reverse().map(normalizeTurn);
      const existingOlder = this.prependedOlderTurns.get(threadId) ?? [];
      const existingIds = new Set(existingOlder.map((t) => t.id));
      const mergedOlder = [
        ...olderNormalized.filter((t) => !existingIds.has(t.id)),
        ...existingOlder
      ];
      this.prependedOlderTurns.set(threadId, mergedOlder);
      const currentSession = this.state.activeSession;
      if (currentSession && currentSession.threadId === threadId) {
        const currentIds = new Set(currentSession.turns.map((t) => t.id));
        const prepended = olderNormalized.filter((t) => !currentIds.has(t.id));
        this.setState({
          activeSession: {
            ...currentSession,
            turns: [...prepended, ...currentSession.turns],
            hasOlderTurns: page.nextCursor !== null,
            nextTurnsCursor: page.nextCursor,
            loadingOlder: false
          }
        });
      }
    } catch (error) {
      if (this.disposed) return;
      const currentSession = this.state.activeSession;
      this.setState({
        error: makeErrorInfo(error, this.locale),
        ...currentSession && currentSession.threadId === threadId ? { activeSession: { ...currentSession, loadingOlder: false } } : {}
      });
      throw error;
    }
  }
  resolveActiveTurnId(session) {
    if (!session) return null;
    if (session.activeTurnId) return session.activeTurnId;
    for (let i = session.turns.length - 1; i >= 0; i -= 1) {
      if (session.turns[i]?.isActive) return session.turns[i].id;
    }
    return null;
  }
  async interrupt(threadIdInput) {
    const threadId = threadIdInput ?? this.state.activeThreadId;
    if (!threadId) return;
    let session = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
    let turnId = this.resolveActiveTurnId(session);
    if (!turnId && session?.isRunning) {
      await this.refreshSnapshot(threadId).catch(() => void 0);
      session = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
      turnId = this.resolveActiveTurnId(session);
    }
    if (!turnId) return;
    this.setState({ interrupting: true, error: null });
    try {
      await this.channel.interruptTurn({ threadId, turnId });
    } catch (error) {
      this.setState({
        interrupting: false,
        error: makeErrorInfo(error, this.locale)
      });
      throw error;
    }
    this.setState({ interrupting: false });
    await this.refreshSnapshot(threadId).catch(() => void 0);
  }
  async respondToInteraction(threadId, interaction, answer) {
    const session = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
    const epoch = session?.epoch ?? this.cachedEpochs.get(threadId);
    if (!epoch) {
      const err = new SideChatRpcError(
        "side-chat/missing-epoch",
        "Cannot respond to interaction without an active snapshot epoch."
      );
      this.setState({ error: makeErrorInfo(err, this.locale) });
      throw err;
    }
    if (this.state.respondingRequestIds.includes(interaction.requestId)) {
      return;
    }
    const payload = buildRespondRequest(epoch, interaction, answer);
    this.setState({
      respondingRequestIds: [...this.state.respondingRequestIds, interaction.requestId],
      error: null
    });
    try {
      await this.channel.respond(payload);
    } catch (error) {
      this.setState({
        respondingRequestIds: this.state.respondingRequestIds.filter(
          (id) => id !== interaction.requestId
        ),
        error: makeErrorInfo(error, this.locale)
      });
      await this.refreshSnapshot(threadId).catch(() => void 0);
      throw error;
    }
    this.setState({
      respondingRequestIds: this.state.respondingRequestIds.filter(
        (id) => id !== interaction.requestId
      )
    });
    await this.refreshSnapshot(threadId).catch(() => void 0);
  }
  // -------------------------------------------------------------------------
  // Real-time NDJSON event handling & debounced scheduling
  // -------------------------------------------------------------------------
  handleConnectionChange(online) {
    if (this.disposed) return;
    if (this.state.connected !== online) {
      this.setState({ connected: online });
    }
  }
  handleChannelEvent(event) {
    if (this.disposed) return;
    if (event.type === "hello") {
      if (event.reset) {
        this.forgetKnownTurns();
      }
      if (this.state.activeThreadId) {
        this.scheduleSnapshotRefresh(this.state.activeThreadId);
      }
      if (event.reset && this.state.sourceThreadId) {
        this.scheduleThreadsRefresh();
      }
      return;
    }
    if (event.type === "changed") {
      if (this.state.activeThreadId && event.threadId === this.state.activeThreadId) {
        this.scheduleSnapshotRefresh(event.threadId);
      }
      if (this.state.sourceThreadId && (event.method.startsWith("thread/") || event.method === "turn/completed" && this.state.threads.some((item) => item.threadId === event.threadId))) {
        this.scheduleThreadsRefresh();
      }
    }
  }
  forgetKnownTurns() {
    this.cachedCompletedTurns.clear();
    this.cachedEpochs.clear();
  }
  scheduleSnapshotRefresh(threadId) {
    if (this.disposed || this.state.activeThreadId !== threadId) return;
    this.snapshotDirty = true;
    if (this.snapshotInFlight || this.snapshotTimer !== null) return;
    this.snapshotTimer = setTimeout(() => {
      this.snapshotTimer = null;
      if (!this.disposed && this.state.activeThreadId === threadId) {
        void this.refreshSnapshot(threadId);
      }
    }, this.debounceMs);
  }
  scheduleThreadsRefresh() {
    if (this.disposed || !this.state.sourceThreadId || this.listRefreshTimer !== null) return;
    this.listRefreshTimer = setTimeout(() => {
      this.listRefreshTimer = null;
      if (!this.disposed && this.state.sourceThreadId) {
        void this.refreshThreads(this.state.sourceThreadId).catch(() => void 0);
      }
    }, this.debounceMs);
  }
  clearSnapshotTimer() {
    if (this.snapshotTimer !== null) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }
  clearTimers() {
    this.clearSnapshotTimer();
    if (this.listRefreshTimer !== null) {
      clearTimeout(this.listRefreshTimer);
      this.listRefreshTimer = null;
    }
  }
  // -------------------------------------------------------------------------
  // State mutation helpers
  // -------------------------------------------------------------------------
  deriveTitleFromTurns(turns) {
    for (const turn of turns) {
      for (const item of turn.items) {
        if (item.kind === "userMessage" && item.text.trim().length > 0) {
          return deriveSideChatTitle(item.text);
        }
      }
    }
    return "";
  }
  updateLocalThreadSummary(threadId, patch) {
    let changed = false;
    const nextThreads = this.state.threads.map((item) => {
      if (item.threadId !== threadId) return item;
      changed = true;
      return { ...item, ...patch };
    });
    const nextActiveSession = this.state.activeSession && this.state.activeSession.threadId === threadId ? {
      ...this.state.activeSession,
      ...patch.title !== void 0 ? { title: patch.title } : {},
      ...patch.mode !== void 0 ? { mode: patch.mode } : {},
      ...patch.boundaryConsumed !== void 0 ? { boundaryConsumed: patch.boundaryConsumed } : {}
    } : this.state.activeSession;
    if (changed || nextActiveSession !== this.state.activeSession) {
      this.setState({
        threads: changed ? nextThreads.sort(compareSummaryDesc) : this.state.threads,
        activeSession: nextActiveSession
      });
    }
  }
  setState(patch) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener();
    }
  }
};

// src/client/tab-manager.ts
var EMPTY_TITLE_SNAPSHOT = Object.freeze({
  threadId: null,
  title: "",
  mode: null,
  isRunning: false
});
function tabKey(sessionId, tabId) {
  return `${sessionId}\0${tabId}`;
}
var SideChatTabManager = class {
  constructor(options = {}) {
    this.options = options;
    this.locale = normalizeLocale(options.locale);
  }
  controllers = /* @__PURE__ */ new Map();
  controllerUnsubs = /* @__PURE__ */ new Map();
  pendingByThreadId = /* @__PURE__ */ new Map();
  titleSnapshots = /* @__PURE__ */ new Map();
  titleListeners = /* @__PURE__ */ new Map();
  focusSeq = 0;
  sessionFocusNonces = /* @__PURE__ */ new Map();
  tabFocusNonces = /* @__PURE__ */ new Map();
  focusListeners = /* @__PURE__ */ new Map();
  locale;
  disposed = false;
  buildController() {
    const controllerOptions = {
      ...this.options.fetch ? { fetch: this.options.fetch } : {},
      ...this.options.baseUrl !== void 0 ? { baseUrl: this.options.baseUrl } : {},
      ...this.options.debounceMs !== void 0 ? { debounceMs: this.options.debounceMs } : {},
      ...this.options.autoConnectEvents !== void 0 ? { autoConnectEvents: this.options.autoConnectEvents } : {},
      locale: this.locale
    };
    return this.options.createController ? this.options.createController(controllerOptions) : new SideChatController(controllerOptions);
  }
  setLocale(localeInput) {
    this.locale = normalizeLocale(localeInput);
    for (const controller of this.controllers.values()) {
      controller.setLocale(this.locale);
    }
    for (const controller of this.pendingByThreadId.values()) {
      controller.setLocale(this.locale);
    }
  }
  getLocale() {
    return this.locale;
  }
  nextFocusNonce() {
    this.focusSeq += 1;
    return this.focusSeq;
  }
  /**
   * Returns the controller bound to `(sessionId, tabId)`, adopting a pre-created
   * `/btw` controller when `options.sideThreadId` matches one in flight.
   */
  controllerForTab(sessionId, tabId, options) {
    const key = tabKey(sessionId, tabId);
    const existing = this.controllers.get(key);
    if (existing) {
      return existing;
    }
    let controller;
    if (options?.sideThreadId) {
      controller = this.pendingByThreadId.get(options.sideThreadId);
      if (controller) {
        this.pendingByThreadId.delete(options.sideThreadId);
      }
    }
    if (!controller) {
      controller = this.buildController();
    }
    this.controllers.set(key, controller);
    this.updateTitleSnapshot(key, controller);
    const unsub = controller.subscribe(() => {
      this.updateTitleSnapshot(key, controller);
    });
    this.controllerUnsubs.set(key, unsub);
    this.notifyTitleListeners(key);
    return controller;
  }
  getTabController(sessionId, tabId) {
    return this.controllers.get(tabKey(sessionId, tabId));
  }
  /**
   * Creates a new Side Chat branch for `/btw <question>`, registers it for seamless tab
   * adoption, notifies sibling tabs, and dispatches the first turn with boundary injection.
   *
   * If `createSideChat` (fork or metadata persistence) fails, the temporary controller is
   * disposed and the error propagates so the main composer can retain the user's draft.
   */
  async createAndStartForBtw(sourceThreadId, questionText) {
    const trimmed = questionText.trim();
    const controller = this.buildController();
    let created;
    try {
      created = await controller.createSideChat(sourceThreadId, {
        title: deriveSideChatTitle(trimmed),
        select: true,
        skipInitialSnapshot: true
      });
    } catch (error) {
      controller.dispose();
      throw error;
    }
    this.pendingByThreadId.set(created.threadId, controller);
    this.notifySiblingsChanged(sourceThreadId, controller);
    const sendPromise = controller.sendMessage(created.threadId, trimmed).then(() => {
      this.notifySiblingsChanged(sourceThreadId, controller);
    }).catch(() => {
    });
    return {
      thread: created,
      mode: created.mode,
      controller,
      sendPromise
    };
  }
  /**
   * Notifies sibling tab controllers showing the same `sourceThreadId` to refresh their
   * thread list so newly created, renamed, or deleted side chats stay in sync.
   */
  notifySiblingsChanged(sourceThreadId, origin) {
    if (!sourceThreadId || this.disposed) return;
    for (const controller of this.controllers.values()) {
      if (controller === origin) continue;
      if (controller.getSnapshot().sourceThreadId === sourceThreadId) {
        void controller.refreshThreads(sourceThreadId).catch(() => void 0);
      }
    }
  }
  /**
   * Requests composer focus inside a specific `(sessionId, tabId)` or any visible
   * side chat tab belonging to `sessionId`.
   */
  requestFocus(sessionId, tabId) {
    const nonce = this.nextFocusNonce();
    if (tabId) {
      const key = tabKey(sessionId, tabId);
      this.tabFocusNonces.set(key, nonce);
      this.emitFocusKey(key);
    } else {
      this.sessionFocusNonces.set(sessionId, nonce);
      for (const key of this.focusListeners.keys()) {
        if (key.startsWith(`${sessionId}\0`)) {
          this.emitFocusKey(key);
        }
      }
    }
    return nonce;
  }
  focusObservableForTab(sessionId, tabId) {
    const key = tabKey(sessionId, tabId);
    return {
      getSnapshot: () => Math.max(
        this.sessionFocusNonces.get(sessionId) ?? 0,
        this.tabFocusNonces.get(key) ?? 0
      ),
      subscribe: (listener) => {
        let listeners = this.focusListeners.get(key);
        if (!listeners) {
          listeners = /* @__PURE__ */ new Set();
          this.focusListeners.set(key, listeners);
        }
        listeners.add(listener);
        return () => {
          listeners?.delete(listener);
          if (listeners && listeners.size === 0) {
            this.focusListeners.delete(key);
          }
        };
      }
    };
  }
  titleObservableForTab(sessionId, tabId) {
    const key = tabKey(sessionId, tabId);
    return {
      getSnapshot: () => this.titleSnapshots.get(key) ?? EMPTY_TITLE_SNAPSHOT,
      subscribe: (listener) => {
        let listeners = this.titleListeners.get(key);
        if (!listeners) {
          listeners = /* @__PURE__ */ new Set();
          this.titleListeners.set(key, listeners);
        }
        listeners.add(listener);
        return () => {
          listeners?.delete(listener);
          if (listeners && listeners.size === 0) {
            this.titleListeners.delete(key);
          }
        };
      }
    };
  }
  async renameActiveInTab(sessionId, tabId, nextTitle) {
    const controller = this.controllers.get(tabKey(sessionId, tabId));
    if (!controller) return;
    const snap = controller.getSnapshot();
    const targetId = snap.activeThreadId;
    if (!targetId) return;
    await controller.renameThread(targetId, nextTitle);
    this.notifySiblingsChanged(snap.sourceThreadId, controller);
  }
  releaseTab(sessionId, tabId) {
    const key = tabKey(sessionId, tabId);
    const unsub = this.controllerUnsubs.get(key);
    if (unsub) {
      unsub();
      this.controllerUnsubs.delete(key);
    }
    const controller = this.controllers.get(key);
    if (controller) {
      this.controllers.delete(key);
      controller.dispose();
    }
    this.titleSnapshots.delete(key);
    this.tabFocusNonces.delete(key);
    this.notifyTitleListeners(key);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const unsub of this.controllerUnsubs.values()) {
      unsub();
    }
    this.controllerUnsubs.clear();
    for (const controller of this.controllers.values()) {
      controller.dispose();
    }
    this.controllers.clear();
    for (const controller of this.pendingByThreadId.values()) {
      controller.dispose();
    }
    this.pendingByThreadId.clear();
    this.titleSnapshots.clear();
    this.titleListeners.clear();
    this.focusListeners.clear();
    this.sessionFocusNonces.clear();
    this.tabFocusNonces.clear();
  }
  emitFocusKey(key) {
    const listeners = this.focusListeners.get(key);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener();
    }
  }
  updateTitleSnapshot(key, controller) {
    const state = controller.getSnapshot();
    const active = state.activeSession;
    const summary = state.activeThreadId ? state.threads.find((item) => item.threadId === state.activeThreadId) : void 0;
    const next = {
      threadId: active?.threadId ?? state.activeThreadId,
      title: active?.title || summary?.title || "",
      mode: active?.mode ?? summary?.mode ?? null,
      isRunning: active?.isRunning ?? false
    };
    const prev = this.titleSnapshots.get(key);
    if (prev && prev.threadId === next.threadId && prev.title === next.title && prev.mode === next.mode && prev.isRunning === next.isRunning) {
      return;
    }
    this.titleSnapshots.set(key, Object.freeze(next));
    this.notifyTitleListeners(key);
  }
  notifyTitleListeners(key) {
    const listeners = this.titleListeners.get(key);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener();
    }
  }
};

// src/client/index.tsx
var name = "codexhost-plugin-side-chat";
var inject = [
  "slots",
  "locale",
  "sidebarRight",
  "sidebarRightTabs",
  "shortcuts",
  "sessions",
  "commandUi",
  "inputTriggers"
];
var SIDE_CHAT_TAB_KIND = "sidechat";
var SIDE_CHAT_SHORTCUT_ID = "sidechat.new";
var SIDE_CHAT_SHORTCUT_DEFAULTS = {
  "desktop:macos": { code: "KeyB", modifiers: ["primary", "alt", "shift"] },
  "desktop:windows": { code: "KeyB", modifiers: ["primary", "alt", "shift"] },
  "desktop:linux": { code: "KeyB", modifiers: ["primary", "alt", "shift"] },
  "web:macos": { code: "KeyB", modifiers: ["primary", "alt", "shift"] },
  "web:windows": { code: "KeyB", modifiers: ["primary", "alt", "shift"] }
};
function readActiveLocale(ctx) {
  const active = ctx.locale.getLocale?.().active ?? ctx.locale.getSnapshot?.().active ?? (typeof document !== "undefined" ? document.documentElement?.lang : void 0);
  return normalizeLocale(active);
}
function createMainSessionObservable(ctx, sessionId) {
  let cached = resolveMainSessionFromSnapshot(
    sessionId,
    ctx.sessions.list.getSnapshot()
  );
  const compute = () => {
    const next = resolveMainSessionFromSnapshot(
      sessionId,
      ctx.sessions.list.getSnapshot()
    );
    if (cached.status === next.status && (cached.status !== "ready" || next.status === "ready" && cached.sourceThreadId === next.sourceThreadId && cached.running === next.running) && (cached.status !== "draft" || next.status === "draft" && cached.reason === next.reason) && (cached.status !== "remote-unsupported" || next.status === "remote-unsupported" && cached.hostId === next.hostId)) {
      return cached;
    }
    cached = next;
    return cached;
  };
  return {
    getSnapshot: () => compute(),
    subscribe: (listener) => ctx.sessions.list.subscribe(() => {
      const before = cached;
      const after = compute();
      if (after !== before) {
        listener();
      }
    })
  };
}
function apply(ctx) {
  const pluginId = name;
  const manager = new SideChatTabManager({
    locale: readActiveLocale(ctx)
  });
  ctx.effect(() => ensureSideChatStyles(pluginId), `${pluginId}: styles`);
  ctx.effect(
    () => ctx.locale.register(SIDE_CHAT_LOCALE_NS, { zh: SIDE_CHAT_ZH, en: SIDE_CHAT_EN }),
    `${pluginId}: locale`
  );
  const hostT = ctx.locale.bind(SIDE_CHAT_LOCALE_NS);
  const t = wrapHostTranslator(hostT, () => readActiveLocale(ctx));
  ctx.effect(() => {
    const syncLocale = () => {
      manager.setLocale(readActiveLocale(ctx));
    };
    const offSub = ctx.locale.subscribe?.(syncLocale);
    const offEvent = ctx.on?.("locale/change", syncLocale);
    syncLocale();
    return () => {
      offSub?.();
      offEvent?.();
    };
  }, `${pluginId}: locale sync`);
  ctx.effect(
    () => () => {
      manager.dispose();
    },
    `${pluginId}: lifetime`
  );
  ctx.effect(
    () => ctx.shortcuts.register({
      id: SIDE_CHAT_SHORTCUT_ID,
      label: () => t("shortcut.new"),
      aliases: ["side chat", "new side chat", "btw"],
      defaults: SIDE_CHAT_SHORTCUT_DEFAULTS,
      regions: ["page", "editable", "terminal"],
      modals: [],
      resolve: ({ target: element }) => {
        const target = ctx.sidebarRight.commandTarget?.(element);
        if (target === void 0) {
          return { status: "blocked", reason: t("shortcut.noSession") };
        }
        return {
          status: "handled",
          run: () => {
            if (ctx.sidebarRight.openTabFromTarget) {
              ctx.sidebarRight.openTabFromTarget(SIDE_CHAT_TAB_KIND, target);
            } else if (ctx.sidebarRight.openTabIn) {
              ctx.sidebarRight.openTabIn(target.sessionId, SIDE_CHAT_TAB_KIND, {
                params: { focusComposer: true, focusNonce: manager.nextFocusNonce() }
              });
            } else {
              ctx.sidebarRight.openTab(SIDE_CHAT_TAB_KIND, {
                params: { focusComposer: true, focusNonce: manager.nextFocusNonce() }
              });
            }
            manager.requestFocus(target.sessionId);
          }
        };
      }
    }),
    `${pluginId}: shortcut`
  );
  ctx.effect(
    () => ctx.sidebarRightTabs.register({
      id: pluginId,
      kind: SIDE_CHAT_TAB_KIND,
      multiple: true,
      keepMounted: true,
      priority: "extension",
      title: () => t("tab.title"),
      guide: [
        {
          id: "new",
          commandId: SIDE_CHAT_SHORTCUT_ID,
          order: 25,
          title: () => t("guide.title"),
          description: () => t("guide.description"),
          icon: SideChatGuideArtwork
        }
      ]
    }),
    `${pluginId}: tab type`
  );
  if (ctx.sidebarRight.registerCloseHandler) {
    ctx.effect(
      () => ctx.sidebarRight.registerCloseHandler(SIDE_CHAT_TAB_KIND, (sessionId, tab) => {
        manager.releaseTab(sessionId, tab.id);
      }),
      `${pluginId}: close handler`
    );
  }
  ctx.effect(
    () => ctx.slots.inject(
      "sidebar.right.tab.guide.entry",
      () => ctx.slots.register(
        {
          name: "sidebar.right.tab.guide.entry",
          key: pluginId,
          locale: SIDE_CHAT_LOCALE_NS,
          inject: () => ({
            hooks: { shortcuts: ctx.shortcuts.catalog }
          })
        },
        SideChatGuide
      )
    ),
    `${pluginId}: guide slot`
  );
  ctx.effect(
    () => ctx.slots.inject(
      "sidebar.right.pane.tab",
      () => ctx.slots.register(
        {
          name: "sidebar.right.pane.tab",
          key: pluginId,
          locale: SIDE_CHAT_LOCALE_NS,
          inject: (sessionId) => ({
            manager,
            getLocale: () => readActiveLocale(ctx),
            hooks: {
              mainSession: createMainSessionObservable(ctx, sessionId)
            },
            keyedHooks: {
              focusNonce: (tabId) => manager.focusObservableForTab(sessionId, tabId)
            }
          })
        },
        SideChatTabBody
      )
    ),
    `${pluginId}: body slot`
  );
  ctx.effect(
    () => ctx.slots.inject(
      "sidebar.right.pane.tab.title",
      () => ctx.slots.register(
        {
          name: "sidebar.right.pane.tab.title",
          key: pluginId,
          locale: SIDE_CHAT_LOCALE_NS,
          inject: (sessionId) => ({
            getLocale: () => readActiveLocale(ctx),
            renameTab: (tabId, nextTitle) => manager.renameActiveInTab(sessionId, tabId, nextTitle),
            keyedHooks: {
              sideChatTitle: (tabId) => manager.titleObservableForTab(sessionId, tabId)
            }
          })
        },
        SideChatTitle
      )
    ),
    `${pluginId}: title slot`
  );
  ctx.effect(
    () => registerBtwInputTrigger(ctx, manager, {
      t,
      getLocale: () => readActiveLocale(ctx)
    }),
    `${pluginId}: /btw trigger`
  );
}
return module.exports; } });
