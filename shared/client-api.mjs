/**
 * Browser-safe RPC wrapper around `api.backend.invoke(...)` and `api.storage`,
 * plus Desktop / Web / Tauri Desktop Shell active main-thread detection helpers.
 *
 * Uses zero external dependencies and only relative `.mjs` static imports so it
 * links cleanly under Desktop's `@rollup/browser` and Web's native ESM loader.
 */

export const OPEN_EVENT_NAME = "codexhost-side-chat:open";

export const DEFAULT_SETTINGS = Object.freeze({
  widgetPosition: "bottom-right",
  showFloatingLauncher: true,
  enableWebBtwShortcut: true,
});

export class SideChatClientError extends Error {
  constructor(code, message, extra = {}) {
    super(message || "Side Chat backend error");
    this.name = "SideChatClientError";
    this.code = code ?? "side-chat/error";
    if (extra && typeof extra === "object") {
      if ("thread" in extra) this.thread = extra.thread;
      if ("mode" in extra) this.mode = extra.mode;
    }
  }
}

export function normalizeSettings(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const widgetPosition =
    src.widgetPosition === "bottom-left" ? "bottom-left" : "bottom-right";
  const showFloatingLauncher =
    typeof src.showFloatingLauncher === "boolean"
      ? src.showFloatingLauncher
      : DEFAULT_SETTINGS.showFloatingLauncher;
  const enableWebBtwShortcut =
    typeof src.enableWebBtwShortcut === "boolean"
      ? src.enableWebBtwShortcut
      : DEFAULT_SETTINGS.enableWebBtwShortcut;
  return {
    widgetPosition,
    showFloatingLauncher,
    enableWebBtwShortcut,
  };
}

export async function readExtensionSettings(api) {
  try {
    const raw = await api.storage.get();
    return normalizeSettings(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function writeExtensionSettings(api, patch) {
  const current = await readExtensionSettings(api);
  const next = normalizeSettings({ ...current, ...(patch ?? {}) });
  const saved = await api.storage.set(next);
  return normalizeSettings(saved);
}

export function createSideChatClient(api) {
  async function invoke(method, params) {
    let reply;
    try {
      reply = await api.backend.invoke(method, params ?? {});
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause ?? "Backend error");
      throw new SideChatClientError("side-chat/backend-error", message);
    }

    if (reply && typeof reply === "object" && reply.ok === false && reply.error) {
      throw new SideChatClientError(
        reply.error.code ?? "side-chat/error",
        reply.error.message ?? "Side Chat backend error",
        reply,
      );
    }

    return reply;
  }

  return {
    ping: () => invoke("ping", {}),
    status: () => invoke("status", {}),
    listMainThreads: () => invoke("listMainThreads", {}),
    listSideChats: (params = {}) => invoke("listSideChats", params),
    createSideChat: (params) => invoke("createSideChat", params),
    readSnapshot: (threadId, options = {}) =>
      invoke("readSnapshot", { threadId, ...options }),
    startTurn: (threadId, text) => invoke("startTurn", { threadId, text }),
    interruptTurn: (threadId, turnId = null) =>
      invoke("interruptTurn", turnId ? { threadId, turnId } : { threadId }),
    respondInteraction: (params) => invoke("respondInteraction", params),
    renameSideChat: (threadId, title, sourceThreadId) =>
      invoke("renameSideChat", {
        threadId,
        title,
        ...(sourceThreadId ? { sourceThreadId } : {}),
      }),
    archiveSideChat: (threadId, sourceThreadId) =>
      invoke("archiveSideChat", {
        threadId,
        ...(sourceThreadId ? { sourceThreadId } : {}),
      }),
  };
}

/**
 * Extracts a CodexHost Web session ID from `Rows.tsx` `data-row-key` values:
 * - `session:<id>`, `recent:<id>`, `pinned:<id>`
 * - `linked:<workspaceId>:<id>` (codexhost 0.25+ cross-workspace tree rows)
 */
export function parseSessionIdFromRowKey(rawRowKey) {
  if (typeof rawRowKey !== "string") return null;
  const trimmed = rawRowKey.trim();
  if (!trimmed) return null;

  for (const prefix of ["session:", "recent:", "pinned:"]) {
    if (trimmed.startsWith(prefix)) {
      const id = trimmed.slice(prefix.length).trim();
      return id.length > 0 ? id : null;
    }
  }

  if (trimmed.startsWith("linked:")) {
    const rest = trimmed.slice("linked:".length);
    const sepIndex = rest.indexOf(":");
    if (sepIndex !== -1) {
      const id = rest.slice(sepIndex + 1).trim();
      return id.length > 0 ? id : null;
    }
  }

  return null;
}

/**
 * Inspects browser URL, Official Codex Desktop probe API, and CodexHost Web / 0.25+
 * DOM attributes to infer the currently viewed main thread ID or blank draft state.
 */
export function detectCurrentWebThreadContext(
  win = globalThis.window,
  doc = globalThis.document,
  hostTarget = "web",
) {
  const result = { threadId: null, isDraft: false };

  // 1. Official Codex Desktop renderer probe API (`__codexhostRendererBindingProbeV1`)
  if (hostTarget === "desktop" && win && typeof win === "object") {
    try {
      const probe = win.__codexhostRendererBindingProbeV1;
      const probedId =
        probe && typeof probe.currentThreadId === "function" ? probe.currentThreadId() : null;
      if (typeof probedId === "string" && probedId.trim().length > 0) {
        result.threadId = probedId.trim();
        return result;
      }
    } catch {
      // Ignore probe errors and fall back to URL/DOM inspection.
    }
  }

  if (!win || !win.location) return result;

  // 2. Explicit URL query/path/hash inspection
  try {
    const url = new URL(win.location.href);
    const paramCandidate =
      url.searchParams.get("session") ||
      url.searchParams.get("sessionId") ||
      url.searchParams.get("thread") ||
      url.searchParams.get("threadId");
    if (paramCandidate && paramCandidate.trim()) {
      result.threadId = paramCandidate.trim();
      return result;
    }

    if (url.searchParams.get("draft") === "1" || url.searchParams.get("draft") === "true") {
      result.isDraft = true;
    }

    const pathMatch =
      /(?:^|\/)(?:threads?|sessions?|local|chat|c)\/([A-Za-z0-9_.:-]+)/u.exec(url.pathname) ||
      /(?:^|\/)(?:threads?|sessions?|local)\/([A-Za-z0-9_.:-]+)/u.exec(
        url.hash.replace(/^#/u, ""),
      );
    if (pathMatch && pathMatch[1] && !/^(?:new|draft)$/iu.test(pathMatch[1])) {
      result.threadId = decodeURIComponent(pathMatch[1]);
      return result;
    }
    if (/(?:^|\/)(?:new|draft)(?:\/|$)/iu.test(url.pathname)) {
      result.isDraft = true;
    }
  } catch {
    // Non-standard URL (e.g. Desktop app://) — continue to DOM inspection.
  }

  // 3. DOM inspection (supports explicit data-thread-id markers AND codexhost 0.25+ Rows.tsx / ConversationMainPanel.tsx)
  if (doc && typeof doc.querySelector === "function") {
    const selectors = [
      "[data-cx-region='conversation'][data-thread-id]",
      "[data-cx-region='conversation'][data-session-id]",
      "[data-cx-active-thread-id]",
      "[data-cx-thread-id]",
      "[data-cx-session-id]",
      "[aria-current='page'][data-thread-id]",
      "[aria-current='page'][data-session-id]",
      "[data-active='true'][data-thread-id]",
      "[data-active='true'][data-session-id]",
    ];
    for (const selector of selectors) {
      const node = doc.querySelector(selector);
      if (!node) continue;
      const blank =
        node.getAttribute("data-session-blank") === "true" ||
        node.getAttribute("data-draft") === "true";
      if (blank) {
        result.isDraft = true;
        return result;
      }
      const value =
        node.getAttribute("data-cx-active-thread-id") ||
        node.getAttribute("data-cx-thread-id") ||
        node.getAttribute("data-thread-id") ||
        node.getAttribute("data-cx-session-id") ||
        node.getAttribute("data-session-id");
      if (value && value.trim()) {
        result.threadId = value.trim();
        return result;
      }
    }

    const blankMarker = doc.querySelector(
      "[data-cx-region='conversation'][data-session-blank='true'], [data-cx-region='conversation'][data-draft='true']",
    );
    if (blankMarker) {
      result.isDraft = true;
      return result;
    }

    // CodexHost Web & 0.25+ Tauri Desktop Shell: ConversationMainPanel `data-phase` + Sidebar `data-row-key`
    const convRegion = doc.querySelector("[data-cx-region='conversation']");
    const convPhase = convRegion ? convRegion.getAttribute("data-phase") : null;
    if (convPhase === "hero") {
      result.isDraft = true;
      return result;
    }

    const activeRow =
      doc.querySelector("[role='treeitem'][aria-current='page'][data-row-key]") ||
      doc.querySelector("[role='treeitem'][aria-selected='true'][data-row-key]");
    if (activeRow) {
      const parsedId = parseSessionIdFromRowKey(activeRow.getAttribute("data-row-key"));
      if (parsedId) {
        result.threadId = parsedId;
        return result;
      }
    }
  }

  return result;
}

/**
 * Matches a candidate detected thread ID against the known local main threads list.
 */
export function resolveActiveMainThreadId(mainThreads, detectedContext, currentSelection) {
  const list = Array.isArray(mainThreads) ? mainThreads : [];
  if (detectedContext?.threadId) {
    const candidate = detectedContext.threadId;
    const direct = list.find((item) => item.threadId === candidate);
    if (direct) return direct.threadId;
    // Skip remote SSH session IDs (e.g. `ssh:<conn>:<id>`) that do not belong to local Host channel.
    const looksRemoteScoped = candidate.includes(":");
    if (!looksRemoteScoped) {
      return candidate;
    }
  }
  if (detectedContext?.isDraft) {
    return null;
  }
  if (currentSelection && list.some((item) => item.threadId === currentSelection)) {
    return currentSelection;
  }
  return list[0]?.threadId ?? null;
}

export function formatApprovalActionLabels(actions) {
  const list = Array.isArray(actions) ? actions : [];
  return list.map((action, index) =>
    list.filter((other) => other.label === action.label).length > 1
      ? `${action.label} (${index + 1})`
      : action.label,
  );
}
