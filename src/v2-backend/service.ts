/**
 * Business logic handlers for the manifestVersion 2 Side Chat Host backend.
 */
import {
  deriveSideChatTitle,
  injectSideChatBoundary,
  stripSideChatBoundary,
} from "../client/boundary.ts";
import {
  buildRespondRequest,
  type ClientInteraction,
  type SideChatInteractionAnswer,
} from "../client/interactions.ts";
import {
  createClientUserMessageId,
  isAttachToSourceUnsupportedError,
  type ClientThreadSnapshot,
  type HostAttachedThreadRow,
  type ThreadForkResponse,
  type ThreadListResponse,
  type TurnStartResponse,
} from "../client/protocol.ts";
import type { SideChatMode, SideChatRecord } from "../types.ts";
import { ClientChannelError, LocalClientChannelClient } from "./channel-client.ts";
import { errorReply, isPlainRecord, okReply, type StrictJsonObject } from "./json.ts";
import { normalizeV2Snapshot } from "./normalize.ts";
import { V2SideChatStore } from "./store.ts";

export interface MainThreadSummary {
  readonly threadId: string;
  readonly title: string;
  readonly preview: string;
  readonly cwd: string;
  readonly modelProvider: string;
  readonly statusType: string;
  readonly updatedAt: string;
  readonly createdAt: string;
}

export interface V2SideChatSummary {
  readonly threadId: string;
  readonly sourceThreadId: string;
  readonly mode: SideChatMode;
  readonly title: string;
  readonly preview: string;
  readonly boundaryConsumed: boolean;
  readonly source: "plugin" | "desktop" | "merged";
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly statusType: string;
}

function toIsoTimestamp(value: unknown, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return fallback;
}

function maxIsoTimestamp(a: string, b: string): string {
  return Date.parse(b) > Date.parse(a) ? b : a;
}

function compareSummaryDesc(
  a: { updatedAt: string; createdAt: string; threadId: string },
  b: { updatedAt: string; createdAt: string; threadId: string },
): number {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}

function extractErrorDetails(error: unknown): { code: number | string; message: string } {
  if (error instanceof ClientChannelError) {
    return { code: error.code, message: error.message };
  }
  if (isPlainRecord(error)) {
    const code =
      typeof error.code === "number" || typeof error.code === "string"
        ? error.code
        : "side-chat/error";
    const message =
      typeof error.message === "string" && error.message.trim().length > 0
        ? error.message
        : "Side Chat operation failed.";
    return { code, message };
  }
  if (error instanceof Error) {
    return { code: "side-chat/error", message: error.message };
  }
  return { code: "side-chat/error", message: String(error ?? "Side Chat operation failed.") };
}

function mapRawMainThread(raw: unknown): MainThreadSummary | undefined {
  if (!isPlainRecord(raw)) return undefined;
  const rawId =
    typeof raw.id === "string" && raw.id.trim().length > 0
      ? raw.id.trim()
      : typeof raw.threadId === "string" && raw.threadId.trim().length > 0
        ? raw.threadId.trim()
        : "";
  if (!rawId) return undefined;

  // Exclude attached side-chat child threads from main thread listings.
  if (typeof raw.attachedToThreadId === "string" && raw.attachedToThreadId.trim().length > 0) {
    return undefined;
  }

  const now = new Date().toISOString();
  const createdAt = toIsoTimestamp(raw.createdAt, now);
  const updatedAt = toIsoTimestamp(raw.updatedAt, createdAt);
  const preview = stripSideChatBoundary(typeof raw.preview === "string" ? raw.preview : "");
  const cleanName =
    typeof raw.name === "string"
      ? stripSideChatBoundary(raw.name).trim()
      : typeof raw.title === "string"
        ? stripSideChatBoundary(raw.title).trim()
        : "";
  const title = cleanName || deriveSideChatTitle(preview) || rawId;
  const statusObj = isPlainRecord(raw.status) ? raw.status : undefined;
  const statusType = typeof statusObj?.type === "string" ? statusObj.type : "idle";

  return {
    threadId: rawId,
    title,
    preview,
    cwd: typeof raw.cwd === "string" ? raw.cwd : "",
    modelProvider: typeof raw.modelProvider === "string" ? raw.modelProvider : "",
    statusType,
    updatedAt,
    createdAt,
  };
}

function mergeThreadsForSource(
  sourceThreadId: string,
  localRecords: readonly SideChatRecord[],
  attachedRows: readonly HostAttachedThreadRow[],
): V2SideChatSummary[] {
  const nowIso = new Date().toISOString();
  const localMap = new Map(localRecords.map((record) => [record.threadId, record]));
  const seen = new Set<string>();
  const results: V2SideChatSummary[] = [];

  for (const row of attachedRows) {
    if (!row || typeof row.id !== "string" || !row.id.trim()) continue;
    const threadId = row.id.trim();
    seen.add(threadId);
    const local = localMap.get(threadId);
    const cleanPreview = stripSideChatBoundary(typeof row.preview === "string" ? row.preview : "");
    const cleanName = typeof row.name === "string" ? stripSideChatBoundary(row.name).trim() : "";
    const hasHistory =
      cleanPreview.length > 0 || (Array.isArray(row.turns) && row.turns.length > 0);
    const hostCreated = toIsoTimestamp(row.createdAt, local?.createdAt ?? nowIso);
    const hostUpdated = toIsoTimestamp(row.updatedAt, local?.updatedAt ?? hostCreated);
    const statusType =
      row.status && typeof row.status.type === "string" ? row.status.type : "idle";

    if (local) {
      const cleanLocalTitle = stripSideChatBoundary(local.title).trim();
      results.push({
        threadId,
        sourceThreadId,
        mode: "persistent",
        title: cleanLocalTitle || cleanName || deriveSideChatTitle(cleanPreview),
        preview: cleanPreview,
        boundaryConsumed: local.boundaryConsumed || hasHistory,
        source: "merged",
        createdAt: local.createdAt,
        updatedAt: maxIsoTimestamp(local.updatedAt, hostUpdated),
        statusType,
      });
    } else {
      results.push({
        threadId,
        sourceThreadId,
        mode: "persistent",
        title: cleanName || deriveSideChatTitle(cleanPreview),
        preview: cleanPreview,
        boundaryConsumed: hasHistory,
        source: "desktop",
        createdAt: hostCreated,
        updatedAt: hostUpdated,
        statusType,
      });
    }
  }

  for (const local of localRecords) {
    if (seen.has(local.threadId)) continue;
    results.push({
      threadId: local.threadId,
      sourceThreadId: local.sourceThreadId,
      mode: local.mode,
      title: stripSideChatBoundary(local.title).trim(),
      preview: "",
      boundaryConsumed: local.boundaryConsumed,
      source: "plugin",
      createdAt: local.createdAt,
      updatedAt: local.updatedAt,
      statusType: "idle",
    });
  }

  return results.sort(compareSummaryDesc);
}

function asDistinctForkId(result: ThreadForkResponse, sourceThreadId: string): string {
  const id = result?.thread?.id;
  if (typeof id !== "string" || !id.trim() || id.trim() === sourceThreadId) {
    throw new ClientChannelError(
      "side-chat/fork-unconfirmed",
      "CodexHost did not confirm a distinct Side Chat thread ID.",
    );
  }
  return id.trim();
}

const MAIN_THREADS_CACHE_TTL_MS = 1_500;
const CATALOG_PRIMARY_TIMEOUT_MS = 4_200;
const CATALOG_FALLBACK_TIMEOUT_MS = 2_000;
const ATTACHED_LIST_TIMEOUT_MS = 1_800;
const GLOBAL_ATTACHED_DEADLINE_MS = 2_500;

export class SideChatV2BackendService {
  readonly store: V2SideChatStore;
  readonly channel: LocalClientChannelClient;
  readonly extensionId: string;
  private inFlightMainThreads: Promise<MainThreadSummary[]> | null = null;
  private cachedMainThreads: { threads: MainThreadSummary[]; fetchedAt: number } | null = null;

  constructor(options: {
    readonly extensionId: string;
    readonly dataDir: string;
    readonly channelDir?: string;
  }) {
    this.extensionId = options.extensionId;
    this.store = new V2SideChatStore(options.dataDir);
    this.channel = new LocalClientChannelClient(options.dataDir, options.channelDir);
  }

  dispose(): void {
    this.inFlightMainThreads = null;
    this.cachedMainThreads = null;
    this.channel.dispose();
  }

  private invalidateMainThreadsCache(): void {
    this.cachedMainThreads = null;
  }

  ping(): StrictJsonObject {
    return okReply({
      extensionId: this.extensionId,
      timestamp: new Date().toISOString(),
    });
  }

  async status(): Promise<StrictJsonObject> {
    const probe = await this.channel.probeStatus();
    return okReply({
      connected: probe.connected,
      channelDir: probe.channelDir,
      pid: probe.pid,
      port: probe.port,
      epoch: probe.epoch,
      storedCount: this.store.count(),
      error: probe.error,
    });
  }

  private extractCatalogRows(payload: unknown): {
    rows: unknown[];
    nextLiveCursor: string | null;
  } {
    if (!isPlainRecord(payload)) {
      return { rows: [], nextLiveCursor: null };
    }
    const rows = Array.isArray(payload.threads)
      ? payload.threads
      : Array.isArray(payload.data)
        ? payload.data
        : [];
    const cursorObj = isPlainRecord(payload.officialCursor) ? payload.officialCursor : undefined;
    const nextLiveCursor =
      typeof cursorObj?.live === "string" && cursorObj.live.trim().length > 0
        ? cursorObj.live
        : null;
    return { rows, nextLiveCursor };
  }

  private async fetchMainThreadsUncached(): Promise<MainThreadSummary[]> {
    const knownSideChatIds = new Set(this.store.list().map((record) => record.threadId));
    const rawRows: unknown[] = [];
    const startedAt = Date.now();

    try {
      const firstCatalog = await this.channel.rpc<unknown>(
        "codexhost/thread/catalog/read",
        { includeArchived: false },
        { timeoutMs: CATALOG_PRIMARY_TIMEOUT_MS },
      );
      const firstPage = this.extractCatalogRows(firstCatalog);
      rawRows.push(...firstPage.rows);

      // Fetch up to 2 additional official pages only when fast, keeping well inside 10s IPC budget.
      let nextLive = firstPage.nextLiveCursor;
      let extraPages = 0;
      while (nextLive && extraPages < 2 && Date.now() - startedAt < 1_500) {
        extraPages++;
        const remainingMs = Math.max(800, CATALOG_PRIMARY_TIMEOUT_MS - (Date.now() - startedAt));
        try {
          const nextCatalog = await this.channel.rpc<unknown>(
            "codexhost/thread/catalog/read",
            {
              includeArchived: false,
              officialCursor: { live: nextLive },
            },
            { timeoutMs: remainingMs },
          );
          const page = this.extractCatalogRows(nextCatalog);
          rawRows.push(...page.rows);
          nextLive = page.nextLiveCursor;
        } catch {
          break;
        }
      }
    } catch (primaryError) {
      if (
        primaryError instanceof ClientChannelError &&
        primaryError.code === "side-chat/channel-offline"
      ) {
        throw primaryError;
      }

      const isMethodMissing =
        primaryError instanceof ClientChannelError && primaryError.code === -32601;

      let recovered = false;
      if (!isMethodMissing) {
        // In codexhost 0.25+, stock Codex starts lazily (`deferStart: true`) or may be unavailable/
        // unauthenticated while External Harnesses (Antigravity, Claude Code, DeepSeek, etc.) work.
        // Passing `officialCursor: { live: null }` short-circuits `prepareOfficial()` in
        // `packages/host-runtime/src/thread-catalog.ts` and returns all local External Threads immediately!
        try {
          const externalOnlyCatalog = await this.channel.rpc<unknown>(
            "codexhost/thread/catalog/read",
            {
              includeArchived: false,
              officialCursor: { live: null },
            },
            { timeoutMs: CATALOG_FALLBACK_TIMEOUT_MS },
          );
          const extPage = this.extractCatalogRows(externalOnlyCatalog);
          rawRows.push(...extPage.rows);
          recovered = true;
        } catch (extError) {
          if (
            extError instanceof ClientChannelError &&
            extError.code === "side-chat/channel-offline"
          ) {
            throw extError;
          }
        }
      }

      if (!recovered) {
        const listed = await this.channel.rpc<unknown>(
          "thread/list",
          {
            archived: false,
            sortKey: "updated_at",
            sortDirection: "desc",
            limit: 100,
          },
          { timeoutMs: CATALOG_FALLBACK_TIMEOUT_MS },
        );
        if (isPlainRecord(listed) && Array.isArray(listed.data)) {
          rawRows.push(...listed.data);
        } else if (isPlainRecord(listed) && Array.isArray(listed.threads)) {
          rawRows.push(...listed.threads);
        }
      }
    }

    const deduped = new Map<string, MainThreadSummary>();
    for (const row of rawRows) {
      const mapped = mapRawMainThread(row);
      if (!mapped) continue;
      if (knownSideChatIds.has(mapped.threadId)) continue;
      if (!deduped.has(mapped.threadId)) {
        deduped.set(mapped.threadId, mapped);
      }
    }
    return [...deduped.values()].sort(compareSummaryDesc);
  }

  private async fetchMainThreadsRaw(): Promise<MainThreadSummary[]> {
    if (
      this.cachedMainThreads &&
      Date.now() - this.cachedMainThreads.fetchedAt < MAIN_THREADS_CACHE_TTL_MS
    ) {
      return this.cachedMainThreads.threads;
    }
    if (this.inFlightMainThreads) {
      return this.inFlightMainThreads;
    }
    const pending = this.fetchMainThreadsUncached()
      .then((threads) => {
        this.cachedMainThreads = { threads, fetchedAt: Date.now() };
        return threads;
      })
      .finally(() => {
        if (this.inFlightMainThreads === pending) {
          this.inFlightMainThreads = null;
        }
      });
    this.inFlightMainThreads = pending;
    return pending;
  }

  async listMainThreads(): Promise<StrictJsonObject> {
    try {
      const threads = await this.fetchMainThreadsRaw();
      return okReply({ threads, channelConnected: true });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message, { threads: [], channelConnected: false });
    }
  }

  private async listAttachedForSource(
    sourceThreadId: string,
    timeoutMs = ATTACHED_LIST_TIMEOUT_MS,
  ): Promise<{
    rows: HostAttachedThreadRow[];
    connected: boolean;
  }> {
    try {
      const res = await this.channel.rpc<ThreadListResponse>(
        "thread/list",
        {
          attachedToThreadId: sourceThreadId,
          sortKey: "updated_at",
          sortDirection: "desc",
          limit: 100,
        },
        { timeoutMs },
      );
      const rows =
        isPlainRecord(res) && Array.isArray(res.data) ? (res.data as HostAttachedThreadRow[]) : [];
      return { rows, connected: true };
    } catch {
      return { rows: [], connected: false };
    }
  }

  async listSideChats(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const sourceThreadId =
      typeof params.sourceThreadId === "string" && params.sourceThreadId.trim().length > 0
        ? params.sourceThreadId.trim()
        : undefined;
    const modeFilter =
      params.mode === "persistent" || params.mode === "ephemeral" ? params.mode : undefined;

    if (sourceThreadId) {
      const local = this.store.list(sourceThreadId);
      const { rows, connected } = await this.listAttachedForSource(sourceThreadId);
      let merged = mergeThreadsForSource(sourceThreadId, local, rows);
      if (modeFilter) {
        merged = merged.filter((item) => item.mode === modeFilter);
      }
      return okReply({ threads: merged, channelConnected: connected });
    }

    // Global listing for the standalone Workbench page (strictly bounded under 10s IPC limit).
    const allLocal = this.store.list();
    const sourceIds = new Set<string>(allLocal.map((record) => record.sourceThreadId));
    let channelConnected = false;

    try {
      const mainThreads = await this.fetchMainThreadsRaw();
      channelConnected = true;
      for (const main of mainThreads.slice(0, 8)) {
        sourceIds.add(main.threadId);
      }
    } catch {
      channelConnected = false;
    }

    const bySourceLocal = new Map<string, SideChatRecord[]>();
    for (const record of allLocal) {
      const bucket = bySourceLocal.get(record.sourceThreadId) ?? [];
      bucket.push(record);
      bySourceLocal.set(record.sourceThreadId, bucket);
    }

    const sourceList = [...sourceIds].slice(0, 12);
    const attachedBySource = new Map<string, HostAttachedThreadRow[]>();
    if (sourceList.length > 0) {
      const queries = Promise.all(
        sourceList.map(async (sid) => {
          const res = await this.listAttachedForSource(sid, ATTACHED_LIST_TIMEOUT_MS);
          if (res.connected) channelConnected = true;
          attachedBySource.set(sid, res.rows);
        }),
      );
      let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        queries,
        new Promise<void>((resolveDeadline) => {
          deadlineTimer = setTimeout(resolveDeadline, GLOBAL_ATTACHED_DEADLINE_MS);
          deadlineTimer.unref?.();
        }),
      ]);
      if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
    }

    const combinedMap = new Map<string, V2SideChatSummary>();
    for (const sid of sourceIds) {
      const merged = mergeThreadsForSource(
        sid,
        bySourceLocal.get(sid) ?? [],
        attachedBySource.get(sid) ?? [],
      );
      for (const item of merged) {
        combinedMap.set(item.threadId, item);
      }
    }

    let threads = [...combinedMap.values()].sort(compareSummaryDesc);
    if (modeFilter) {
      threads = threads.filter((item) => item.mode === modeFilter);
    }

    return okReply({ threads, channelConnected });
  }

  async createSideChat(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const sourceThreadId =
      typeof params.sourceThreadId === "string" ? params.sourceThreadId.trim() : "";
    if (!sourceThreadId) {
      return errorReply(
        "side-chat/draft-source",
        "The main conversation is still a draft and has no threadId.",
      );
    }

    const requestedTitle = typeof params.title === "string" ? params.title.trim() : "";
    const question = typeof params.question === "string" ? params.question.trim() : "";

    let createdThreadId: string;
    let mode: SideChatMode;

    try {
      // Persistent-first: ALWAYS attempt attachToSource first (no manual toggle).
      try {
        const persistentRes = await this.channel.rpc<ThreadForkResponse>("thread/fork", {
          threadId: sourceThreadId,
          attachToSource: true,
          excludeTurns: true,
        });
        createdThreadId = asDistinctForkId(persistentRes, sourceThreadId);
        mode = "persistent";
      } catch (firstError) {
        if (!isAttachToSourceUnsupportedError(firstError)) {
          throw firstError;
        }
        // Seamless -32602 fallback to runtime ephemeral fork.
        const ephemeralRes = await this.channel.rpc<ThreadForkResponse>("thread/fork", {
          threadId: sourceThreadId,
          ephemeral: true,
          excludeTurns: true,
        });
        createdThreadId = asDistinctForkId(ephemeralRes, sourceThreadId);
        mode = "ephemeral";
      }
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }

    const initialTitle = deriveSideChatTitle(requestedTitle || question);
    let saved = this.store.upsert({
      threadId: createdThreadId,
      sourceThreadId,
      mode,
      title: initialTitle,
      boundaryConsumed: false,
    });
    this.invalidateMainThreadsCache();

    if (question.length > 0) {
      const wireText = injectSideChatBoundary(question);
      const clientUserMessageId = createClientUserMessageId();
      try {
        await this.channel.rpc<TurnStartResponse>(
          "turn/start",
          {
            threadId: createdThreadId,
            input: [{ type: "text", text: wireText }],
            clientUserMessageId,
          },
          { allowRescanRetry: false },
        );
        saved =
          this.store.update(createdThreadId, {
            boundaryConsumed: true,
            title: saved.title || deriveSideChatTitle(question),
          }) ?? saved;
      } catch (error) {
        const { code, message } = extractErrorDetails(error);
        const partialSummary: V2SideChatSummary = {
          threadId: saved.threadId,
          sourceThreadId: saved.sourceThreadId,
          mode: saved.mode,
          title: saved.title,
          preview: "",
          boundaryConsumed: saved.boundaryConsumed,
          source: "plugin",
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
          statusType: "idle",
        };
        return errorReply(code, message, { thread: partialSummary, mode });
      }
    }

    const summary: V2SideChatSummary = {
      threadId: saved.threadId,
      sourceThreadId: saved.sourceThreadId,
      mode: saved.mode,
      title: stripSideChatBoundary(saved.title),
      preview: question ? deriveSideChatTitle(question, 120) : "",
      boundaryConsumed: saved.boundaryConsumed,
      source: "plugin",
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      statusType: question ? "active" : "idle",
    };

    return okReply({ thread: summary, mode });
  }

  async readSnapshot(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }

    const truncateToolOutput =
      typeof params.truncateToolOutput === "boolean" ? params.truncateToolOutput : true;

    try {
      const rawSnapshot = await this.channel.snapshot<ClientThreadSnapshot>(threadId, {
        truncateToolOutput,
      });
      const normalized = normalizeV2Snapshot(rawSnapshot);

      const hasTurns = normalized.turns.length > 0;
      const firstUserText = normalized.turns
        .flatMap((turn) => turn.items)
        .find((item) => item.kind === "userMessage")?.text;
      const derivedTitle =
        normalized.title ||
        deriveSideChatTitle(firstUserText ?? normalized.preview ?? "");

      let local = this.store.get(threadId);
      if (local) {
        const patchTitle = !local.title && derivedTitle ? derivedTitle : undefined;
        const patchBoundary = !local.boundaryConsumed && hasTurns ? true : undefined;
        if (patchTitle !== undefined || patchBoundary !== undefined) {
          local =
            this.store.update(threadId, {
              ...(patchTitle !== undefined ? { title: patchTitle } : {}),
              ...(patchBoundary !== undefined ? { boundaryConsumed: patchBoundary } : {}),
            }) ?? local;
        }
      }

      const resolvedMode: SideChatMode =
        local?.mode ??
        (normalized.ephemeral === true ? "ephemeral" : "persistent");

      return okReply({
        snapshot: normalized,
        mode: resolvedMode,
        thread: local ?? {
          threadId,
          sourceThreadId: normalized.attachedToThreadId ?? "",
          mode: resolvedMode,
          title: derivedTitle,
          boundaryConsumed: hasTurns,
          createdAt: toIsoTimestamp(rawSnapshot.thread?.createdAt, new Date().toISOString()),
          updatedAt: toIsoTimestamp(rawSnapshot.thread?.updatedAt, new Date().toISOString()),
        },
      });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }
  }

  async startTurn(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    const text = typeof params.text === "string" ? params.text : "";

    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }
    if (!text.trim()) {
      return errorReply("side-chat/empty-message", "Message text cannot be empty.");
    }

    let local = this.store.get(threadId);
    let boundaryConsumed = Boolean(local?.boundaryConsumed);
    let discoveredSourceThreadId = local?.sourceThreadId ?? "";
    let discoveredMode: SideChatMode = local?.mode ?? "persistent";

    // For unknown (e.g. Desktop-created) side chats or unconsumed records, inspect snapshot
    // once to avoid injecting the boundary block into a thread that already has history.
    if (!boundaryConsumed && !local) {
      try {
        const rawSnapshot = await this.channel.snapshot<ClientThreadSnapshot>(threadId, {
          truncateToolOutput: true,
        });
        const normalized = normalizeV2Snapshot(rawSnapshot);
        if (normalized.turns.length > 0) {
          boundaryConsumed = true;
        }
        if (normalized.attachedToThreadId) {
          discoveredSourceThreadId = normalized.attachedToThreadId;
        }
        if (normalized.ephemeral === true) {
          discoveredMode = "ephemeral";
        }
      } catch {
        // Proceed with boundary injection if initial snapshot read was unavailable.
      }
    }

    const shouldInjectBoundary = !boundaryConsumed;
    const wireText = shouldInjectBoundary ? injectSideChatBoundary(text) : text;
    const clientUserMessageId = createClientUserMessageId();

    try {
      // Strictly one submission; NEVER auto-retry on unknown timeout outcomes.
      const res = await this.channel.rpc<TurnStartResponse>(
        "turn/start",
        {
          threadId,
          input: [{ type: "text", text: wireText }],
          clientUserMessageId,
        },
        { allowRescanRetry: false },
      );

      const derivedTitle = deriveSideChatTitle(text);
      if (local) {
        local =
          this.store.update(threadId, {
            boundaryConsumed: true,
            ...(!local.title && derivedTitle ? { title: derivedTitle } : {}),
          }) ?? local;
      } else if (discoveredSourceThreadId) {
        local = this.store.upsert({
          threadId,
          sourceThreadId: discoveredSourceThreadId,
          mode: discoveredMode,
          title: derivedTitle,
          boundaryConsumed: true,
        });
      }

      return okReply({
        threadId,
        turnId: typeof res?.turn?.id === "string" ? res.turn.id : null,
        boundaryInjected: shouldInjectBoundary,
        thread: local ?? null,
      });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }
  }

  async interruptTurn(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }

    let turnId =
      typeof params.turnId === "string" && params.turnId.trim().length > 0
        ? params.turnId.trim()
        : null;

    if (!turnId) {
      try {
        const rawSnapshot = await this.channel.snapshot<ClientThreadSnapshot>(threadId, {
          truncateToolOutput: true,
        });
        const normalized = normalizeV2Snapshot(rawSnapshot);
        turnId = normalized.activeTurnId;
      } catch (error) {
        const { code, message } = extractErrorDetails(error);
        return errorReply(code, message);
      }
    }

    if (!turnId) {
      return okReply({ threadId, turnId: null, interrupted: false });
    }

    try {
      await this.channel.rpc("turn/interrupt", { threadId, turnId });
      return okReply({ threadId, turnId, interrupted: true });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }
  }

  async respondInteraction(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    const requestId = params.requestId;

    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }
    if (typeof requestId !== "string" && typeof requestId !== "number") {
      return errorReply("side-chat/invalid", "requestId must be a string or integer.");
    }

    let epoch = typeof params.epoch === "string" && params.epoch.trim().length > 0 ? params.epoch.trim() : "";
    let pending: ClientInteraction | undefined =
      isPlainRecord(params.interaction) &&
      "kind" in params.interaction &&
      "interaction" in params.interaction &&
      "request" in params.interaction
        ? (params.interaction as unknown as ClientInteraction)
        : undefined;

    if (!pending || !epoch) {
      try {
        const rawSnapshot = await this.channel.snapshot<ClientThreadSnapshot>(threadId, {
          truncateToolOutput: true,
        });
        if (!epoch) {
          epoch = rawSnapshot.cursor?.epoch ?? "";
        }
        if (!pending && Array.isArray(rawSnapshot.interactions)) {
          pending = rawSnapshot.interactions.find(
            (item) => String(item.requestId) === String(requestId),
          );
        }
      } catch (error) {
        const { code, message } = extractErrorDetails(error);
        return errorReply(code, message);
      }
    }

    if (!epoch) {
      return errorReply("side-chat/invalid", "Unable to resolve current Host epoch for response.");
    }
    if (!pending) {
      return errorReply("side-chat/not-found", "Pending interaction was not found or already resolved.");
    }

    try {
      const answer =
        params.answer === undefined || params.answer === null
          ? null
          : (params.answer as SideChatInteractionAnswer);
      const respondPayload = buildRespondRequest(epoch, pending, answer);
      const res = await this.channel.respond(respondPayload);
      return okReply({
        threadId,
        requestId,
        resolved: Boolean(res?.resolved ?? true),
      });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }
  }

  async renameSideChat(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    const rawTitle = typeof params.title === "string" ? params.title : "";
    const sourceThreadId =
      typeof params.sourceThreadId === "string" ? params.sourceThreadId.trim() : "";

    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }
    const cleanTitle = deriveSideChatTitle(rawTitle, 200);
    if (!cleanTitle) {
      return errorReply("side-chat/invalid", "title cannot be empty.");
    }

    let updated = this.store.update(threadId, { title: cleanTitle });
    if (!updated && sourceThreadId) {
      updated = this.store.upsert({
        threadId,
        sourceThreadId,
        mode: "persistent",
        title: cleanTitle,
        boundaryConsumed: false,
      });
    }

    const mode = updated?.mode ?? "persistent";
    if (mode === "persistent") {
      await this.channel.rpc("thread/name/set", { threadId, name: cleanTitle }).catch(() => undefined);
    }

    return okReply({
      thread: updated ?? {
        threadId,
        sourceThreadId,
        mode,
        title: cleanTitle,
      },
    });
  }

  async archiveSideChat(rawParams: unknown): Promise<StrictJsonObject> {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    const sourceThreadId =
      typeof params.sourceThreadId === "string" && params.sourceThreadId.trim().length > 0
        ? params.sourceThreadId.trim()
        : undefined;

    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }

    const existing = this.store.get(threadId);
    const mode: SideChatMode = existing?.mode ?? "persistent";

    if (mode === "persistent") {
      try {
        await this.channel.rpc("thread/archive", { threadId });
      } catch (error) {
        const ignorableMissing =
          error instanceof ClientChannelError &&
          (error.code === -32079 || error.code === -32600 || error.status === 404);
        if (!ignorableMissing) {
          const { code, message } = extractErrorDetails(error);
          return errorReply(code, message);
        }
      }
    }

    const removed = this.store.remove(threadId, sourceThreadId);
    this.invalidateMainThreadsCache();
    return okReply({
      threadId,
      mode,
      archived: true,
      removed,
    });
  }
}
