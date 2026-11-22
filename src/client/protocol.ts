/**
 * Browser-safe CodexHost Client Channel v1 protocol wrapper, Side Chat store HTTP client,
 * NDJSON event subscriber, snapshot turn/item normalizer, and bilingual error formatter.
 *
 * Keeps zero top-level browser global side-effects so bundled modules load cleanly
 * in isolated sandboxes and Node tests.
 */
import type {
  CreateSideChatRecordInput,
  SideChatRecord,
  SideChatThreadDeleteResponse,
  SideChatThreadPatchResponse,
  SideChatThreadsListResponse,
  SideChatThreadUpsertResponse,
  UpdateSideChatRecordPatch,
} from "../types.ts";
import { hasSideChatBoundary, stripSideChatBoundary } from "./boundary.ts";
import type { ClientChannelRespondPayload, ClientInteraction } from "./interactions.ts";

export const REASONING_TRANSCRIPT_COMMAND = "thinking";

export type SideChatLocale = "zh" | "en";

export interface ClientChannelCursor {
  readonly epoch: string;
  readonly sequence: number;
}

export type ClientChannelEvent =
  | {
      readonly type: "hello";
      readonly version: 1;
      readonly cursor: ClientChannelCursor;
      readonly reset: boolean;
    }
  | {
      readonly type: "changed";
      readonly cursor: ClientChannelCursor;
      readonly threadId: string;
      readonly method: string;
    }
  | {
      readonly type: "skills-changed";
      readonly cursor: ClientChannelCursor;
      readonly cwd?: string;
    }
  | {
      readonly type: "harness-inspection-changed";
      readonly cursor: ClientChannelCursor;
      readonly harnessId: string;
    }
  | {
      readonly type: "display-settings-changed";
      readonly cursor: ClientChannelCursor;
    }
  | {
      readonly type: "preferences-changed";
      readonly cursor: ClientChannelCursor;
      readonly revision: number;
    };

export interface RawChItem {
  readonly id: string;
  readonly type: string;
  readonly [key: string]: unknown;
}

export interface RawChFileOperation {
  readonly beforeItemId: string | null;
  readonly item: RawChItem;
}

export interface RawChTurn {
  readonly id: string;
  readonly status: string;
  readonly items: readonly RawChItem[];
  readonly codexhostFileOperations?: readonly RawChFileOperation[];
  readonly codexhostTurnOutcome?: {
    readonly status: "unknown";
    readonly reason: string;
  };
  readonly startedAt?: number | null;
  readonly completedAt?: number | null;
  readonly error?: { readonly message?: string } | null;
  readonly fingerprint?: string;
  readonly unchanged?: true;
  readonly [key: string]: unknown;
}

export interface RawChThread {
  readonly id: string;
  readonly cwd: string;
  readonly modelProvider: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly status: { readonly type: string; readonly [key: string]: unknown };
  readonly name?: string | null;
  readonly preview?: string;
  readonly turns: readonly RawChTurn[];
  readonly attachedToThreadId?: string;
  readonly ephemeral?: boolean;
  readonly nativeInteractionError?: string | null;
  readonly nativeSendError?: string | null;
  readonly [key: string]: unknown;
}

export interface ClientKnownTurn {
  readonly id: string;
  readonly fingerprint: string;
}

export interface ClientSnapshotOptions {
  readonly knownTurns?: readonly ClientKnownTurn[];
  readonly truncateToolOutput?: boolean;
}

export interface ClientThreadSnapshot {
  readonly cursor: ClientChannelCursor;
  readonly activeTurnId?: string | null;
  readonly command?: {
    readonly name: string;
    readonly turn: RawChTurn;
    readonly subsequentTurnId?: string;
  };
  readonly thread: RawChThread;
  readonly turnsPage: {
    readonly data: readonly RawChTurn[];
    readonly nextCursor: string | null;
  };
  readonly configuration: Record<string, unknown>;
  readonly queue?: {
    readonly items: readonly Record<string, unknown>[];
    readonly pausedReason: "interrupted" | "outcome-unknown" | "failed" | null;
  };
  readonly interactions: readonly ClientInteraction[];
}

export interface ThreadForkParams {
  readonly threadId: string;
  readonly attachToSource?: boolean;
  readonly ephemeral?: boolean;
  readonly excludeTurns?: boolean;
  readonly lastTurnId?: string;
  readonly beforeTurnId?: string;
}

export interface ThreadForkResponse {
  readonly thread: {
    readonly id: string;
    readonly [key: string]: unknown;
  };
  readonly [key: string]: unknown;
}

export interface HostAttachedThreadRow {
  readonly id: string;
  readonly attachedToThreadId?: string;
  readonly name?: string | null;
  readonly preview?: string;
  readonly createdAt?: number | string;
  readonly updatedAt?: number | string;
  readonly status?: { readonly type: string };
  readonly turns?: readonly unknown[];
  readonly ephemeral?: boolean;
  readonly [key: string]: unknown;
}

export interface ThreadListResponse {
  readonly data: readonly HostAttachedThreadRow[];
  readonly nextCursor?: string | null;
}

export interface TurnStartResponse {
  readonly turn?: { readonly id?: string };
  readonly [key: string]: unknown;
}

export interface TurnsPageResponse {
  readonly data: readonly RawChTurn[];
  readonly nextCursor: string | null;
}

// ---------------------------------------------------------------------------
// Normalized UI-friendly snapshot models
// ---------------------------------------------------------------------------

export type SideChatItemStatus = "running" | "succeeded" | "failed" | "cancelled";

export type SideChatTurnOutcome = "active" | "succeeded" | "failed" | "cancelled" | "unknown";

export interface SideChatFileChange {
  readonly path: string;
  readonly kind: "add" | "update" | "delete";
  readonly unifiedDiff: string;
}

export type SideChatMessageItem =
  | {
      readonly kind: "userMessage";
      readonly id: string;
      readonly text: string;
      readonly hadBoundaryPrefix: boolean;
      readonly clientId?: string;
    }
  | {
      readonly kind: "agentMessage";
      readonly id: string;
      readonly text: string;
      readonly phase?: string;
    }
  | {
      readonly kind: "reasoning";
      readonly id: string;
      readonly summary: readonly string[];
      readonly content: readonly string[];
      readonly text: string;
    }
  | {
      readonly kind: "commandExecution";
      readonly id: string;
      readonly command: string;
      readonly cwd: string;
      readonly output: string;
      readonly exitCode: number | null;
      readonly status: SideChatItemStatus;
    }
  | {
      readonly kind: "fileChange";
      readonly id: string;
      readonly changes: readonly SideChatFileChange[];
      readonly status: SideChatItemStatus;
    }
  | {
      readonly kind: "mcpToolCall";
      readonly id: string;
      readonly server: string;
      readonly tool: string;
      readonly arguments: unknown;
      readonly output: string;
      readonly errorMessage?: string;
      readonly status: SideChatItemStatus;
    }
  | {
      readonly kind: "dynamicToolCall";
      readonly id: string;
      readonly tool: string;
      readonly arguments: unknown;
      readonly output: string;
      readonly status: SideChatItemStatus;
    }
  | {
      readonly kind: "webSearch";
      readonly id: string;
      readonly query: string;
      readonly status: SideChatItemStatus;
    }
  | {
      readonly kind: "contextCompaction";
      readonly id: string;
      readonly status: SideChatItemStatus;
      readonly errorMessage?: string;
    };

export interface NormalizedSideChatTurn {
  readonly id: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly outcome: SideChatTurnOutcome;
  readonly unknownReason?: string;
  readonly errorMessage?: string;
  readonly startedAt?: number | null;
  readonly completedAt?: number | null;
  readonly fingerprint?: string;
  readonly items: readonly SideChatMessageItem[];
}

export interface NormalizedSideChatSnapshot {
  readonly threadId: string;
  readonly epoch: string;
  readonly sequence: number;
  readonly title: string | null;
  readonly preview: string;
  readonly statusType: string;
  readonly activeTurnId: string | null;
  readonly isRunning: boolean;
  readonly turns: readonly NormalizedSideChatTurn[];
  readonly hasOlderTurns: boolean;
  readonly nextTurnsCursor: string | null;
  readonly interactions: readonly ClientInteraction[];
  readonly nativeError: string | null;
}

// ---------------------------------------------------------------------------
// Errors & bilingual error formatter
// ---------------------------------------------------------------------------

export class SideChatRpcError extends Error {
  readonly code: number | string;
  readonly status?: number;
  readonly rpcMethod?: string;

  constructor(
    code: number | string,
    message: string,
    options?: { status?: number; rpcMethod?: string; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "SideChatRpcError";
    this.code = code;
    if (options?.status !== undefined) this.status = options.status;
    if (options?.rpcMethod !== undefined) this.rpcMethod = options.rpcMethod;
  }
}

export function normalizeLocale(locale?: string): SideChatLocale {
  if (!locale) return "en";
  return locale.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function extractErrorCode(error: unknown): number | string | undefined {
  if (error instanceof SideChatRpcError) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    const candidate = (error as { code?: unknown }).code;
    if (typeof candidate === "number" || typeof candidate === "string") return candidate;
  }
  return undefined;
}

function extractErrorStatus(error: unknown): number | undefined {
  if (error instanceof SideChatRpcError) return error.status;
  if (error && typeof error === "object" && "status" in error) {
    const candidate = (error as { status?: unknown }).status;
    if (typeof candidate === "number") return candidate;
  }
  return undefined;
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return typeof error === "string" ? error : String(error ?? "");
}

/**
 * Returns true ONLY when a persistent `attachToSource: true` fork failed due to
 * `-32602` / invalid attachToSource parent constraints, indicating a seamless
 * fallback to `ephemeral: true` should be attempted.
 */
export function isAttachToSourceUnsupportedError(error: unknown): boolean {
  const code = extractErrorCode(error);
  if (code === -32602) return true;
  const message = extractErrorMessage(error);
  return /attachToSource|paginated parent|persistent parent|unknown field.*attachToSource/iu.test(
    message,
  );
}

/**
 * Formats Side Chat protocol / transport errors into clear Chinese or English messages.
 */
export function formatSideChatError(error: unknown, localeInput?: SideChatLocale | string): string {
  const locale = normalizeLocale(localeInput);
  const code = extractErrorCode(error);
  const status = extractErrorStatus(error);
  const rawMessage = extractErrorMessage(error);

  if (
    code === "side-chat/draft-source" ||
    /draft|sourceThreadId.*required|main conversation.*not.*created/iu.test(rawMessage)
  ) {
    return locale === "zh"
      ? "当前主对话尚未创建或仍处于草稿状态，请先在主对话中发送一条消息后再开启侧边聊天。"
      : "The main conversation is still a draft. Send a message in the main conversation before opening a Side Chat.";
  }

  if (code === -32072) {
    return locale === "zh"
      ? "外部原生会话当前正忙（可能有活动任务或在另一客户端打开），请稍候完成后重试。"
      : "The external native session is busy. Wait for its active operation to finish or close it in the other client, then retry.";
  }

  if (code === -32080) {
    return locale === "zh"
      ? "无法分叉创建侧边聊天：主对话当前轮次缺少可用的分叉检查点（如刚经过插话引导，请重新打开主对话后再试）。"
      : "Cannot fork Side Chat: no fork checkpoint is available for the current turn (reopen the thread if the latest turn took steered input, then retry).";
  }

  if (code === -32079) {
    return locale === "zh"
      ? "该侧边会话已失效或已被清理（临时侧边会话在 Host 重启后不会保留），请新建一个侧边聊天。"
      : "This Side Chat session is no longer available (ephemeral Side Chats are cleared after a Host restart). Please start a new Side Chat.";
  }

  if (code === -32076) {
    return locale === "zh"
      ? "当前主对话所使用的 Harness 暂不支持分叉创建侧边聊天。"
      : "The Harness backing this conversation does not support forking Side Chats.";
  }

  if (code === -32090 || status === 503) {
    return locale === "zh"
      ? "CodexHost 客户端通道暂时不可用或正在重连，请稍后重试。"
      : "CodexHost client channel is temporarily unavailable or reconnecting. Please try again shortly.";
  }

  if (code === "auth/unauthorized" || status === 401) {
    return locale === "zh"
      ? "当前未登录或访问凭据已失效，请重新登录后重试。"
      : "Authentication is required or has expired. Please sign in and try again.";
  }

  if (code === "auth/forbidden" || code === "auth/cross-origin" || status === 403) {
    return locale === "zh"
      ? "访问被拒绝：侧边聊天需要主密钥完整权限且仅允许同源操作。"
      : "Access denied. Side Chat requires primary full access and same-origin requests.";
  }

  if (rawMessage.trim().length > 0) {
    return rawMessage;
  }

  return locale === "zh"
    ? "侧边聊天操作失败，请稍后重试。"
    : "Side Chat operation failed. Please try again.";
}

// ---------------------------------------------------------------------------
// Snapshot normalization (chronological flip + item extraction)
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Resolves original per-operation file changes (`codexhostFileOperations`) into their
 * anchored transcript positions, replacing the cumulative Desktop `fileChange` card.
 * Mirrors `packages/web-server/src/ch-file-operations.ts`.
 */
export function resolveConversationItems(turn: RawChTurn): RawChItem[] {
  if (turn.codexhostFileOperations === undefined) {
    return [...turn.items];
  }
  const before = new Map<string | null, RawChItem[]>();
  for (const operation of turn.codexhostFileOperations) {
    const group = before.get(operation.beforeItemId) ?? [];
    group.push(operation.item);
    before.set(operation.beforeItemId, group);
  }
  const items: RawChItem[] = [];
  for (const item of turn.items) {
    if (item.type === "fileChange") continue;
    items.push(...(before.get(item.id) ?? []), item);
    before.delete(item.id);
  }
  for (const group of before.values()) {
    items.push(...group);
  }
  return items;
}

function normalizeFileChangeKind(value: unknown): SideChatFileChange["kind"] {
  const kindType = typeof value === "string" ? value : isRecord(value) ? value.type : undefined;
  if (kindType === "add" || kindType === "create") return "add";
  if (kindType === "delete") return "delete";
  return "update";
}

function normalizeFileChanges(value: unknown): SideChatFileChange[] {
  if (!Array.isArray(value)) return [];
  const changes: SideChatFileChange[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) continue;
    changes.push({
      path: typeof entry.path === "string" ? entry.path : "",
      kind: normalizeFileChangeKind(entry.kind),
      unifiedDiff:
        typeof entry.diff === "string"
          ? entry.diff
          : typeof entry.unifiedDiff === "string"
            ? entry.unifiedDiff
            : "",
    });
  }
  return changes;
}

function extractMcpResultText(item: RawChItem): string {
  if (isRecord(item.error) && typeof item.error.message === "string") {
    return item.error.message;
  }
  if (!isRecord(item.result) || !Array.isArray(item.result.content)) return "";
  return item.result.content
    .map((block) =>
      isRecord(block) && block.type === "text" && typeof block.text === "string"
        ? block.text
        : JSON.stringify(block),
    )
    .join("\n");
}

function extractDynamicToolOutput(item: RawChItem): string {
  const source = item.result ?? item.contentItems;
  if (Array.isArray(source)) {
    const textParts = source.map((entry) =>
      isRecord(entry) && entry.type === "text" && typeof entry.text === "string"
        ? entry.text
        : JSON.stringify(entry),
    );
    return textParts.join("\n");
  }
  if (typeof source === "string") return source;
  if (source !== undefined) return JSON.stringify(source);
  return "";
}

function extractUserMessageText(item: RawChItem): string {
  if (Array.isArray(item.content)) {
    return item.content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part) && part.type === "text" && typeof part.text === "string") {
          return part.text;
        }
        return "";
      })
      .filter((part) => part.length > 0)
      .join("\n");
  }
  if (typeof item.text === "string") return item.text;
  return "";
}

function normalizeItemStatus(
  rawStatus: unknown,
  itemType: string,
  turnFinished: boolean,
): SideChatItemStatus {
  if (rawStatus === "completed") return "succeeded";
  if (rawStatus === "failed") return "failed";
  if (rawStatus === "declined" || rawStatus === "interrupted") return "cancelled";
  if (rawStatus === "inProgress" || rawStatus === "running") return "running";
  if (itemType === "webSearch" || turnFinished) return "succeeded";
  return "running";
}

function normalizeItem(
  item: RawChItem,
  reasoningPreviewIds: ReadonlySet<string>,
  turnFinished: boolean,
): SideChatMessageItem | undefined {
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
        ...(typeof item.clientId === "string" ? { clientId: item.clientId } : {}),
      };
    }
    case "agentMessage":
      return {
        kind: "agentMessage",
        id,
        text: String(item.codexhostNativeText ?? item.text ?? ""),
        ...(typeof item.phase === "string" ? { phase: item.phase } : {}),
      };
    case "reasoning": {
      const summary = Array.isArray(item.summary)
        ? item.summary.filter((entry): entry is string => typeof entry === "string")
        : [];
      const content = Array.isArray(item.content)
        ? item.content.filter((entry): entry is string => typeof entry === "string")
        : [];
      return {
        kind: "reasoning",
        id,
        summary,
        content,
        text: [...summary, ...content].join("\n"),
      };
    }
    case "commandExecution":
      // Filter the paired Desktop `thinking` pseudo-command twin while preserving
      // genuine commands literally named `thinking`.
      if (
        item.command === REASONING_TRANSCRIPT_COMMAND &&
        reasoningPreviewIds.has(`${id}-summary`)
      ) {
        return undefined;
      }
      return {
        kind: "commandExecution",
        id,
        command: String(item.command ?? ""),
        cwd: String(item.cwd ?? ""),
        output: String(item.aggregatedOutput ?? ""),
        exitCode: typeof item.exitCode === "number" ? item.exitCode : null,
        status: normalizeItemStatus(item.status, item.type, turnFinished),
      };
    case "fileChange":
      return {
        kind: "fileChange",
        id,
        changes: normalizeFileChanges(item.changes),
        status: normalizeItemStatus(item.status, item.type, turnFinished),
      };
    case "mcpToolCall":
      return {
        kind: "mcpToolCall",
        id,
        server: String(item.server ?? ""),
        tool: String(item.tool ?? ""),
        arguments: item.arguments ?? {},
        output: extractMcpResultText(item),
        ...(isRecord(item.error) && typeof item.error.message === "string"
          ? { errorMessage: item.error.message }
          : {}),
        status: normalizeItemStatus(item.status, item.type, turnFinished),
      };
    case "dynamicToolCall":
      return {
        kind: "dynamicToolCall",
        id,
        tool: String(item.tool ?? item.name ?? item.type),
        arguments: item.arguments ?? {},
        output: extractDynamicToolOutput(item),
        status: normalizeItemStatus(item.status, item.type, turnFinished),
      };
    case "webSearch":
      return {
        kind: "webSearch",
        id,
        query: String(item.query ?? ""),
        status: normalizeItemStatus(item.status, item.type, turnFinished),
      };
    case "contextCompaction":
      return {
        kind: "contextCompaction",
        id,
        status: normalizeItemStatus(item.status, item.type, turnFinished),
        ...(isRecord(item.error) && typeof item.error.message === "string"
          ? { errorMessage: item.error.message }
          : {}),
      };
    default:
      return undefined;
  }
}

export function normalizeTurn(turn: RawChTurn): NormalizedSideChatTurn {
  const isActive = turn.status === "inProgress" || turn.status === "running";
  const turnFinished = !isActive;

  let outcome: SideChatTurnOutcome;
  let unknownReason: string | undefined;
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
    orderedRawItems.filter((item) => item.type === "reasoning").map((item) => item.id),
  );

  const items: SideChatMessageItem[] = [];
  for (const rawItem of orderedRawItems) {
    const parsed = normalizeItem(rawItem, reasoningPreviewIds, turnFinished);
    if (parsed) items.push(parsed);
  }

  return {
    id: turn.id,
    status: turn.status,
    isActive,
    outcome,
    ...(unknownReason !== undefined ? { unknownReason } : {}),
    ...(typeof turn.error?.message === "string" ? { errorMessage: turn.error.message } : {}),
    ...(turn.startedAt !== undefined ? { startedAt: turn.startedAt } : {}),
    ...(turn.completedAt !== undefined ? { completedAt: turn.completedAt } : {}),
    ...(turn.fingerprint !== undefined ? { fingerprint: turn.fingerprint } : {}),
    items,
  };
}

/**
 * Normalizes a `/api/ch/v1/snapshot` payload into chronological (oldest -> newest) order
 * with boundary-stripped user prompts and structured tool/reasoning items.
 */
export function normalizeSnapshot(snapshot: ClientThreadSnapshot): NormalizedSideChatSnapshot {
  // Host returns turns newest-first (`desc`); reverse to oldest-first (`asc`) for UI rendering.
  const chronologicalTurns = [...snapshot.turnsPage.data].reverse().map(normalizeTurn);

  let fallbackActiveTurnId: string | null = null;
  for (let i = chronologicalTurns.length - 1; i >= 0; i -= 1) {
    if (chronologicalTurns[i]?.isActive) {
      fallbackActiveTurnId = chronologicalTurns[i]!.id;
      break;
    }
  }
  const activeTurnId = snapshot.activeTurnId ?? fallbackActiveTurnId;

  const statusType = snapshot.thread.status?.type ?? "idle";
  const isRunning = activeTurnId !== null || statusType === "active";

  const rawNativeError =
    snapshot.thread.nativeInteractionError ?? snapshot.thread.nativeSendError ?? null;

  return {
    threadId: snapshot.thread.id,
    epoch: snapshot.cursor.epoch,
    sequence: snapshot.cursor.sequence,
    title:
      typeof snapshot.thread.name === "string" && snapshot.thread.name.trim().length > 0
        ? stripSideChatBoundary(snapshot.thread.name)
        : null,
    preview: stripSideChatBoundary(snapshot.thread.preview ?? ""),
    statusType,
    activeTurnId,
    isRunning,
    turns: chronologicalTurns,
    hasOlderTurns: snapshot.turnsPage.nextCursor !== null,
    nextTurnsCursor: snapshot.turnsPage.nextCursor,
    interactions: snapshot.interactions ?? [],
    nativeError: typeof rawNativeError === "string" ? rawNativeError : null,
  };
}

// ---------------------------------------------------------------------------
// HTTP helpers & client classes
// ---------------------------------------------------------------------------

export interface HttpClientOptions {
  readonly fetch?: typeof fetch;
  readonly baseUrl?: string;
}

function resolveFetch(customFetch?: typeof fetch): typeof fetch {
  if (customFetch) return customFetch;
  if (typeof globalThis.fetch === "function") return globalThis.fetch.bind(globalThis);
  throw new Error("No fetch implementation is available.");
}

function joinBaseUrl(baseUrl: string | undefined, path: string): string {
  if (!baseUrl) return path;
  return `${baseUrl.replace(/\/+$/u, "")}${path}`;
}

export function createClientUserMessageId(): string {
  const randomUuid =
    typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function"
      ? globalThis.crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `sidechat-${randomUuid}`;
}

async function parseJsonOrThrow<T>(
  response: Response,
  rpcMethod?: string,
): Promise<T> {
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (cause) {
    if (!response.ok) {
      throw new SideChatRpcError(
        response.status,
        `HTTP ${response.status} ${response.statusText}`.trim(),
        { status: response.status, ...(rpcMethod ? { rpcMethod } : {}), cause },
      );
    }
    throw new SideChatRpcError("invalid-json", "Server returned an invalid JSON payload.", {
      status: response.status,
      ...(rpcMethod ? { rpcMethod } : {}),
      cause,
    });
  }

  if (isRecord(payload) && isRecord(payload.error)) {
    const code =
      typeof payload.error.code === "number" || typeof payload.error.code === "string"
        ? payload.error.code
        : response.status || -32603;
    const message =
      typeof payload.error.message === "string"
        ? payload.error.message
        : `Request failed (${String(code)})`;
    throw new SideChatRpcError(code, message, {
      status: response.status,
      ...(rpcMethod ? { rpcMethod } : {}),
    });
  }

  if (!response.ok) {
    throw new SideChatRpcError(
      response.status,
      `HTTP ${response.status} ${response.statusText}`.trim(),
      { status: response.status, ...(rpcMethod ? { rpcMethod } : {}) },
    );
  }

  return payload as T;
}

/**
 * Browser client for `/api/ch/v1/*` gateway endpoints.
 * Never auto-retries mutating RPCs after unknown network outcomes.
 */
export class ChChannelClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: HttpClientOptions = {}) {
    this.fetchImpl = resolveFetch(options.fetch);
    this.baseUrl = options.baseUrl ?? "";
  }

  async rpc<T = unknown>(
    method: string,
    params: Record<string, unknown>,
    options?: { signal?: AbortSignal },
  ): Promise<T> {
    const response = await this.fetchImpl(joinBaseUrl(this.baseUrl, "/api/ch/v1/rpc"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method, params }),
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    const parsed = await parseJsonOrThrow<{ result: T }>(response, method);
    return parsed.result;
  }

  async snapshot(
    threadId: string,
    options?: ClientSnapshotOptions & { signal?: AbortSignal },
  ): Promise<ClientThreadSnapshot> {
    const body: Record<string, unknown> = { threadId };
    if (options?.knownTurns !== undefined) body.knownTurns = options.knownTurns;
    if (options?.truncateToolOutput !== undefined) {
      body.truncateToolOutput = options.truncateToolOutput;
    }
    const response = await this.fetchImpl(joinBaseUrl(this.baseUrl, "/api/ch/v1/snapshot"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    const parsed = await parseJsonOrThrow<{ result: ClientThreadSnapshot }>(
      response,
      "snapshot",
    );
    return parsed.result;
  }

  async respond(
    payload: ClientChannelRespondPayload,
    options?: { signal?: AbortSignal },
  ): Promise<{ resolved?: boolean }> {
    const response = await this.fetchImpl(joinBaseUrl(this.baseUrl, "/api/ch/v1/respond"), {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      ...(options?.signal ? { signal: options.signal } : {}),
    });
    const parsed = await parseJsonOrThrow<{ result: { resolved?: boolean } }>(
      response,
      "respond",
    );
    return parsed.result;
  }

  forkThread(params: ThreadForkParams): Promise<ThreadForkResponse> {
    return this.rpc<ThreadForkResponse>("thread/fork", { ...params });
  }

  listAttachedThreads(
    sourceThreadId: string,
    options?: { limit?: number; cursor?: string | null },
  ): Promise<ThreadListResponse> {
    return this.rpc<ThreadListResponse>("thread/list", {
      attachedToThreadId: sourceThreadId,
      sortKey: "updated_at",
      sortDirection: "desc",
      limit: options?.limit ?? 100,
      ...(options?.cursor ? { cursor: options.cursor } : {}),
    });
  }

  listTurnsPage(
    threadId: string,
    cursor: string | null,
    limit = 5,
  ): Promise<TurnsPageResponse> {
    return this.rpc<TurnsPageResponse>("thread/turns/list", {
      threadId,
      cursor,
      limit,
      sortDirection: "desc",
      itemsView: "full",
    });
  }

  startTurn(params: {
    readonly threadId: string;
    readonly text: string;
    readonly clientUserMessageId?: string;
  }): Promise<TurnStartResponse> {
    return this.rpc<TurnStartResponse>("turn/start", {
      threadId: params.threadId,
      input: [{ type: "text", text: params.text }],
      clientUserMessageId: params.clientUserMessageId ?? createClientUserMessageId(),
    });
  }

  interruptTurn(params: { readonly threadId: string; readonly turnId: string }): Promise<unknown> {
    return this.rpc("turn/interrupt", {
      threadId: params.threadId,
      turnId: params.turnId,
    });
  }

  renameThread(params: { readonly threadId: string; readonly name: string }): Promise<unknown> {
    return this.rpc("thread/name/set", {
      threadId: params.threadId,
      name: params.name,
    });
  }

  archiveThread(params: { readonly threadId: string }): Promise<unknown> {
    return this.rpc("thread/archive", {
      threadId: params.threadId,
    });
  }
}

/**
 * Browser client for `/codexhost-side-chat/*` persistence endpoints.
 */
export class SideChatStoreClient {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;

  constructor(options: HttpClientOptions = {}) {
    this.fetchImpl = resolveFetch(options.fetch);
    this.baseUrl = options.baseUrl ?? "";
  }

  async list(sourceThreadId?: string): Promise<SideChatRecord[]> {
    const query = sourceThreadId
      ? `?sourceThreadId=${encodeURIComponent(sourceThreadId)}`
      : "";
    const response = await this.fetchImpl(
      joinBaseUrl(this.baseUrl, `/codexhost-side-chat/threads${query}`),
      {
        method: "GET",
        credentials: "same-origin",
      },
    );
    const parsed = await parseJsonOrThrow<SideChatThreadsListResponse>(response);
    return [...parsed.threads];
  }

  async upsert(input: CreateSideChatRecordInput): Promise<SideChatThreadUpsertResponse> {
    const response = await this.fetchImpl(
      joinBaseUrl(this.baseUrl, "/codexhost-side-chat/threads"),
      {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      },
    );
    return parseJsonOrThrow<SideChatThreadUpsertResponse>(response);
  }

  async patch(
    threadId: string,
    patch: UpdateSideChatRecordPatch,
  ): Promise<SideChatThreadPatchResponse> {
    const response = await this.fetchImpl(
      joinBaseUrl(this.baseUrl, `/codexhost-side-chat/threads/${encodeURIComponent(threadId)}`),
      {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    return parseJsonOrThrow<SideChatThreadPatchResponse>(response);
  }

  async remove(
    threadId: string,
    sourceThreadId?: string,
  ): Promise<SideChatThreadDeleteResponse> {
    const query = sourceThreadId
      ? `?sourceThreadId=${encodeURIComponent(sourceThreadId)}`
      : "";
    const response = await this.fetchImpl(
      joinBaseUrl(
        this.baseUrl,
        `/codexhost-side-chat/threads/${encodeURIComponent(threadId)}${query}`,
      ),
      {
        method: "DELETE",
        credentials: "same-origin",
      },
    );
    return parseJsonOrThrow<SideChatThreadDeleteResponse>(response);
  }
}

// ---------------------------------------------------------------------------
// NDJSON Client Channel Events Subscriber
// ---------------------------------------------------------------------------

export interface ChEventsSubscriberOptions extends HttpClientOptions {
  readonly onEvent: (event: ClientChannelEvent) => void;
  readonly onConnectionChange?: (online: boolean) => void;
  readonly onError?: (error: unknown) => void;
  readonly reconnectBaseMs?: number;
  readonly reconnectMaxMs?: number;
}

/**
 * Consumes `GET /api/ch/v1/events` NDJSON invalidation streams with cursor tracking,
 * empty-line heartbeat filtering, and cancellable exponential-backoff reconnection.
 */
export class ChEventsSubscriber {
  private readonly fetchImpl: typeof fetch;
  private readonly baseUrl: string;
  private readonly reconnectBaseMs: number;
  private readonly reconnectMaxMs: number;
  private running = false;
  private abortController: AbortController | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs: number;
  private cursor: ClientChannelCursor | null = null;
  private online = false;

  constructor(private readonly options: ChEventsSubscriberOptions) {
    this.fetchImpl = resolveFetch(options.fetch);
    this.baseUrl = options.baseUrl ?? "";
    this.reconnectBaseMs = Math.max(10, options.reconnectBaseMs ?? 500);
    this.reconnectMaxMs = Math.max(this.reconnectBaseMs, options.reconnectMaxMs ?? 5_000);
    this.backoffMs = this.reconnectBaseMs;
  }

  get lastCursor(): ClientChannelCursor | null {
    return this.cursor;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.backoffMs = this.reconnectBaseMs;
    void this.connect();
  }

  stop(): void {
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

  private setOnline(next: boolean): void {
    if (this.online === next) return;
    this.online = next;
    this.options.onConnectionChange?.(next);
  }

  private buildEventsUrl(): string {
    const path = "/api/ch/v1/events";
    if (!this.cursor) return joinBaseUrl(this.baseUrl, path);
    const query = `?epoch=${encodeURIComponent(this.cursor.epoch)}&after=${this.cursor.sequence}`;
    return joinBaseUrl(this.baseUrl, `${path}${query}`);
  }

  private scheduleReconnect(): void {
    if (!this.running || this.reconnectTimer !== null) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.reconnectMaxMs, this.backoffMs * 2);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.running) void this.connect();
    }, delay);
  }

  private async connect(): Promise<void> {
    if (!this.running) return;
    const controller = new AbortController();
    this.abortController = controller;
    let helloReplayTarget: ClientChannelCursor | null = null;

    try {
      const response = await this.fetchImpl(this.buildEventsUrl(), {
        method: "GET",
        credentials: "same-origin",
        headers: { accept: "application/x-ndjson" },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new SideChatRpcError(
          response.status || -32090,
          `Event stream unavailable (${response.status})`,
          { status: response.status },
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
        // Stream ended cleanly after replay; advance cursor up to hello's replay high-water mark.
        if (
          helloReplayTarget &&
          (!this.cursor ||
            (this.cursor.epoch === helloReplayTarget.epoch &&
              helloReplayTarget.sequence > this.cursor.sequence))
        ) {
          this.cursor = helloReplayTarget;
        }
      } finally {
        await reader.cancel().catch(() => undefined);
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

  private handleLine(
    line: string,
    helloReplayTarget: ClientChannelCursor | null,
  ): ClientChannelCursor | null {
    let parsed: unknown;
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

    const event = parsed as unknown as ClientChannelEvent;
    if (event.type === "hello") {
      this.backoffMs = this.reconnectBaseMs;
      this.setOnline(true);
      // Do not overwrite an older in-window cursor before replayed events arrive;
      // update immediately on reset or epoch change, otherwise record replay ceiling.
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
}
