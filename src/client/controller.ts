/**
 * Framework-agnostic reactive Side Chat state controller.
 *
 * Designed for direct binding with React `useSyncExternalStore(controller.subscribe, controller.getSnapshot)`
 * with zero DOM coupling.
 */
import type { SideChatMode, SideChatRecord } from "../types.ts";
import {
  deriveSideChatTitle,
  injectSideChatBoundary,
  stripSideChatBoundary,
} from "./boundary.ts";
import {
  buildRespondRequest,
  type ClientInteraction,
  type SideChatInteractionAnswer,
} from "./interactions.ts";
import {
  ChChannelClient,
  ChEventsSubscriber,
  SideChatRpcError,
  SideChatStoreClient,
  createClientUserMessageId,
  formatSideChatError,
  isAttachToSourceUnsupportedError,
  normalizeLocale,
  normalizeSnapshot,
  normalizeTurn,
  type ClientChannelEvent,
  type ClientKnownTurn,
  type ClientThreadSnapshot,
  type HostAttachedThreadRow,
  type NormalizedSideChatTurn,
  type RawChTurn,
  type SideChatLocale,
} from "./protocol.ts";

const DEFAULT_DEBOUNCE_MS = 90;
const MAX_KNOWN_TURNS = 16;

export interface SideChatErrorInfo {
  readonly code: number | string;
  readonly message: string;
  readonly rawMessage: string;
}

export interface SideChatThreadSummary {
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

export interface SideChatActiveSessionState {
  readonly threadId: string;
  readonly mode: SideChatMode;
  readonly title: string;
  readonly boundaryConsumed: boolean;
  readonly turns: readonly NormalizedSideChatTurn[];
  readonly hasOlderTurns: boolean;
  readonly nextTurnsCursor: string | null;
  readonly activeTurnId: string | null;
  readonly isRunning: boolean;
  readonly interactions: readonly ClientInteraction[];
  readonly epoch: string | null;
  readonly nativeError: string | null;
  readonly loaded: boolean;
  readonly loading: boolean;
  readonly loadingOlder: boolean;
  readonly stale: boolean;
}

export interface SideChatControllerState {
  readonly sourceThreadId: string | null;
  readonly threads: readonly SideChatThreadSummary[];
  readonly activeThreadId: string | null;
  readonly activeSession: SideChatActiveSessionState | null;
  readonly connected: boolean;
  readonly loadingThreads: boolean;
  readonly creating: boolean;
  readonly sending: boolean;
  readonly interrupting: boolean;
  readonly respondingRequestIds: readonly (string | number)[];
  readonly error: SideChatErrorInfo | null;
}

export interface SideChatControllerOptions {
  readonly channel?: ChChannelClient;
  readonly store?: SideChatStoreClient;
  readonly events?: ChEventsSubscriber;
  readonly fetch?: typeof fetch;
  readonly baseUrl?: string;
  readonly locale?: SideChatLocale | string;
  readonly debounceMs?: number;
  readonly autoConnectEvents?: boolean;
}

export interface CreateSideChatOptions {
  readonly title?: string;
  readonly select?: boolean;
  readonly skipInitialSnapshot?: boolean;
}

export interface AskInNewSideChatResult {
  readonly thread: SideChatThreadSummary;
  readonly mode: SideChatMode;
}

function toIsoTimestamp(value: number | string | undefined, fallback: string): string {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    // Host thread timestamps are Unix seconds; guard against millisecond timestamps too.
    const ms = value > 1e12 ? value : value * 1000;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return fallback;
}

function compareSummaryDesc(a: SideChatThreadSummary, b: SideChatThreadSummary): number {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}

function maxIsoTimestamp(a: string, b: string): string {
  return Date.parse(b) > Date.parse(a) ? b : a;
}

function makeErrorInfo(error: unknown, locale: SideChatLocale): SideChatErrorInfo {
  const code =
    error instanceof SideChatRpcError
      ? error.code
      : error && typeof error === "object" && "code" in error &&
          (typeof (error as { code?: unknown }).code === "number" ||
            typeof (error as { code?: unknown }).code === "string")
        ? (error as { code: number | string }).code
        : "side-chat/error";
  const rawMessage = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return {
    code,
    message: formatSideChatError(error, locale),
    rawMessage,
  };
}

function createInitialState(): SideChatControllerState {
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
    error: null,
  };
}

/**
 * Pure TypeScript controller orchestrating Side Chat discovery, persistent-first fork
 * with seamless ephemeral fallback, first-turn boundary injection, NDJSON debounced
 * snapshot reconciliation, turn interruption, and interaction responses.
 */
export class SideChatController {
  private readonly channel: ChChannelClient;
  private readonly store: SideChatStoreClient;
  private readonly events: ChEventsSubscriber;
  private readonly debounceMs: number;
  private readonly autoConnectEvents: boolean;

  private locale: SideChatLocale;
  private state: SideChatControllerState = createInitialState();
  private readonly listeners = new Set<() => void>();

  private disposed = false;
  private listGeneration = 0;

  // Debounced snapshot reconciliation state
  private snapshotTimer: ReturnType<typeof setTimeout> | null = null;
  private snapshotInFlight = false;
  private snapshotDirty = false;
  private listRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Cached completed raw turns per threadId for `knownTurns` snapshot compaction
  private readonly cachedCompletedTurns = new Map<string, Map<string, RawChTurn>>();
  private readonly cachedEpochs = new Map<string, string>();
  private readonly prependedOlderTurns = new Map<string, NormalizedSideChatTurn[]>();

  constructor(options: SideChatControllerOptions = {}) {
    const httpOpts = {
      ...(options.fetch ? { fetch: options.fetch } : {}),
      ...(options.baseUrl !== undefined ? { baseUrl: options.baseUrl } : {}),
    };
    this.channel = options.channel ?? new ChChannelClient(httpOpts);
    this.store = options.store ?? new SideChatStoreClient(httpOpts);
    this.debounceMs = Math.max(10, options.debounceMs ?? DEFAULT_DEBOUNCE_MS);
    this.autoConnectEvents = options.autoConnectEvents ?? true;
    this.locale = normalizeLocale(options.locale);

    this.events =
      options.events ??
      new ChEventsSubscriber({
        ...httpOpts,
        onEvent: (event) => this.handleChannelEvent(event),
        onConnectionChange: (online) => this.handleConnectionChange(online),
      });
  }

  // -------------------------------------------------------------------------
  // React useSyncExternalStore API
  // -------------------------------------------------------------------------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): SideChatControllerState => this.state;

  // -------------------------------------------------------------------------
  // Lifecycle & configuration
  // -------------------------------------------------------------------------

  setLocale(locale: SideChatLocale | string): void {
    this.locale = normalizeLocale(locale);
  }

  connectEvents(): void {
    if (this.disposed) return;
    this.events.start();
  }

  disconnectEvents(): void {
    this.events.stop();
  }

  clearError(): void {
    if (this.state.error !== null) {
      this.setState({ error: null });
    }
  }

  dispose(): void {
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

  async setSourceThread(
    sourceThreadId: string | null,
    options?: { autoSelectFirst?: boolean },
  ): Promise<void> {
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
        error: null,
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
      await this.selectThread(merged[0]!.threadId);
    }
  }

  async refreshThreads(sourceThreadId?: string): Promise<SideChatThreadSummary[]> {
    const targetSource = sourceThreadId?.trim() || this.state.sourceThreadId;
    if (!targetSource) return [];

    const generation = ++this.listGeneration;
    this.setState({ loadingThreads: true });

    const [pluginOutcome, desktopOutcome] = await Promise.allSettled([
      this.store.list(targetSource),
      this.channel.listAttachedThreads(targetSource),
    ]);

    if (this.disposed || generation !== this.listGeneration) {
      return [...this.state.threads];
    }

    if (pluginOutcome.status === "rejected" && desktopOutcome.status === "rejected") {
      const error = pluginOutcome.reason ?? desktopOutcome.reason;
      this.setState({
        loadingThreads: false,
        error: makeErrorInfo(error, this.locale),
      });
      throw error;
    }

    const pluginRecords = pluginOutcome.status === "fulfilled" ? pluginOutcome.value : [];
    const attachedRows = desktopOutcome.status === "fulfilled" ? desktopOutcome.value.data : [];

    const merged = this.mergeDiscoveredThreads(targetSource, pluginRecords, attachedRows);

    // Keep activeThreadId if still valid, or preserve newly created active thread not yet listed
    let nextActiveSession = this.state.activeSession;
    if (nextActiveSession) {
      const matched = merged.find((item) => item.threadId === nextActiveSession!.threadId);
      if (matched) {
        nextActiveSession = {
          ...nextActiveSession,
          mode: matched.mode,
          title: matched.title || nextActiveSession.title,
          boundaryConsumed: nextActiveSession.boundaryConsumed || matched.boundaryConsumed,
        };
      }
    }

    this.setState({
      threads: merged,
      activeSession: nextActiveSession,
      loadingThreads: false,
    });
    return merged;
  }

  private mergeDiscoveredThreads(
    sourceThreadId: string,
    pluginRecords: readonly SideChatRecord[],
    attachedRows: readonly HostAttachedThreadRow[],
  ): SideChatThreadSummary[] {
    const nowIso = new Date().toISOString();
    const pluginMap = new Map(pluginRecords.map((record) => [record.threadId, record]));
    const seenIds = new Set<string>();
    const results: SideChatThreadSummary[] = [];

    // 1. All Host-attached persistent Side Chats (includes Desktop-created & Web persistent threads)
    for (const row of attachedRows) {
      if (!row || typeof row.id !== "string" || row.id.trim().length === 0) continue;
      const threadId = row.id;
      seenIds.add(threadId);

      const plugin = pluginMap.get(threadId);
      const cleanPreview = stripSideChatBoundary(row.preview ?? "");
      const cleanName = typeof row.name === "string" ? stripSideChatBoundary(row.name).trim() : "";
      const hasExistingHistory =
        cleanPreview.length > 0 || (Array.isArray(row.turns) && row.turns.length > 0);

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
          statusType: row.status?.type ?? "idle",
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
          statusType: row.status?.type ?? "idle",
        });
      }
    }

    // 2. Plugin-only records (ephemeral Side Chats or newly-created persistent Side Chats)
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
        statusType: "idle",
      });
    }

    return results.sort(compareSummaryDesc);
  }

  // -------------------------------------------------------------------------
  // Side Chat creation: Persistent-first + seamless -32602 ephemeral fallback
  // -------------------------------------------------------------------------

  async createSideChat(
    sourceThreadId?: string,
    options?: CreateSideChatOptions,
  ): Promise<SideChatThreadSummary> {
    const targetSource = sourceThreadId?.trim() || this.state.sourceThreadId?.trim() || "";
    if (!targetSource) {
      const draftErr = new SideChatRpcError(
        "side-chat/draft-source",
        "The main conversation is still a draft and has no threadId.",
      );
      this.setState({ error: makeErrorInfo(draftErr, this.locale) });
      throw draftErr;
    }

    this.setState({ creating: true, error: null });

    let createdThreadId: string;
    let mode: SideChatMode;

    try {
      // Step 1: Always attempt persistent attached fork first (no manual mode toggle).
      try {
        const persistentResult = await this.channel.forkThread({
          threadId: targetSource,
          attachToSource: true,
          excludeTurns: true,
        });
        createdThreadId = this.extractDistinctForkThreadId(persistentResult, targetSource);
        mode = "persistent";
      } catch (firstError) {
        // Step 2: Seamlessly fall back to ephemeral fork ONLY on -32602 / unsupported attachToSource.
        if (!isAttachToSourceUnsupportedError(firstError)) {
          throw firstError;
        }
        const ephemeralResult = await this.channel.forkThread({
          threadId: targetSource,
          ephemeral: true,
          excludeTurns: true,
        });
        createdThreadId = this.extractDistinctForkThreadId(ephemeralResult, targetSource);
        mode = "ephemeral";
      }

      const cleanTitle = options?.title ? deriveSideChatTitle(options.title) : "";

      // Step 3: Persist mapping in plugin store.
      const saved = await this.store.upsert({
        threadId: createdThreadId,
        sourceThreadId: targetSource,
        mode,
        title: cleanTitle,
        boundaryConsumed: false,
      });

      const summary: SideChatThreadSummary = {
        threadId: saved.thread.threadId,
        sourceThreadId: saved.thread.sourceThreadId,
        mode: saved.thread.mode,
        title: stripSideChatBoundary(saved.thread.title),
        preview: "",
        boundaryConsumed: saved.thread.boundaryConsumed,
        source: "plugin",
        createdAt: saved.thread.createdAt,
        updatedAt: saved.thread.updatedAt,
        statusType: "idle",
      };

      const nextThreads = [
        summary,
        ...this.state.threads.filter(
          (item) =>
            item.sourceThreadId === targetSource && item.threadId !== summary.threadId,
        ),
      ].sort(compareSummaryDesc);

      const shouldSelect = options?.select !== false;
      const nextSession: SideChatActiveSessionState | null = shouldSelect
        ? {
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
            stale: false,
          }
        : this.state.activeSession;

      this.setState({
        sourceThreadId: targetSource,
        threads: nextThreads,
        activeThreadId: shouldSelect ? summary.threadId : this.state.activeThreadId,
        activeSession: nextSession,
        creating: false,
        error: null,
      });

      if (this.autoConnectEvents) {
        this.events.start();
      }

      if (shouldSelect && !options?.skipInitialSnapshot) {
        await this.refreshSnapshot(summary.threadId).catch(() => undefined);
      }

      return summary;
    } catch (error) {
      this.setState({
        creating: false,
        error: makeErrorInfo(error, this.locale),
      });
      throw error;
    }
  }

  private extractDistinctForkThreadId(
    result: { thread?: { id?: unknown } },
    sourceThreadId: string,
  ): string {
    const id = result?.thread?.id;
    if (typeof id !== "string" || !id.trim() || id === sourceThreadId) {
      throw new SideChatRpcError(
        "side-chat/fork-unconfirmed",
        "CodexHost did not confirm a distinct Side Chat thread ID.",
      );
    }
    return id.trim();
  }

  // -------------------------------------------------------------------------
  // Thread selection, deletion, renaming
  // -------------------------------------------------------------------------

  async selectThread(threadId: string | null): Promise<void> {
    this.clearSnapshotTimer();
    this.snapshotDirty = false;

    if (!threadId) {
      this.setState({ activeThreadId: null, activeSession: null });
      return;
    }

    const summary = this.state.threads.find((item) => item.threadId === threadId);
    const prevSession =
      this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;

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
        stale: false,
      },
      error: null,
    });

    await this.refreshSnapshot(threadId);
  }

  async renameThread(threadId: string, rawTitle: string): Promise<void> {
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
          boundaryConsumed: summary.boundaryConsumed,
        });
      } else {
        throw error;
      }
    }

    if (summary?.mode === "persistent") {
      await this.channel.renameThread({ threadId, name: cleanTitle }).catch(() => undefined);
    }

    this.updateLocalThreadSummary(threadId, {
      title: cleanTitle,
      updatedAt: new Date().toISOString(),
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    const sourceThreadId = this.state.sourceThreadId ?? undefined;
    const summary = this.state.threads.find((item) => item.threadId === threadId);
    const mode =
      summary?.mode ??
      (this.state.activeSession?.threadId === threadId ? this.state.activeSession.mode : undefined);

    if (mode === "persistent") {
      try {
        await this.channel.archiveThread({ threadId });
      } catch (error) {
        const ignorableMissing =
          error instanceof SideChatRpcError &&
          (error.code === -32079 || error.code === -32600 || error.status === 404);
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
      ...(deletedWasActive
        ? {
            activeThreadId: remaining[0]?.threadId ?? null,
            activeSession: null,
          }
        : {}),
    });

    if (deletedWasActive && remaining[0]) {
      await this.selectThread(remaining[0].threadId);
    }
  }

  // -------------------------------------------------------------------------
  // Messaging: first-turn boundary injection & /btw one-step ask
  // -------------------------------------------------------------------------

  async askInNewSideChat(
    sourceThreadId: string | undefined,
    questionText: string,
  ): Promise<AskInNewSideChatResult> {
    const trimmed = questionText.trim();
    if (!trimmed) {
      throw new SideChatRpcError("side-chat/empty-message", "Question text cannot be empty.");
    }

    const created = await this.createSideChat(sourceThreadId, {
      title: deriveSideChatTitle(trimmed),
      select: true,
      skipInitialSnapshot: true,
    });

    await this.sendMessage(created.threadId, questionText);

    const updated =
      this.state.threads.find((item) => item.threadId === created.threadId) ?? created;
    return { thread: updated, mode: updated.mode };
  }

  async sendMessage(threadId: string, rawUserText: string): Promise<void> {
    if (!rawUserText.trim()) {
      throw new SideChatRpcError("side-chat/empty-message", "Message text cannot be empty.");
    }

    let summary = this.state.threads.find((item) => item.threadId === threadId);
    let session =
      this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;

    // For a Desktop-discovered side chat with an empty preview whose snapshot has not
    // yet been inspected, read its snapshot first to verify whether own turns already exist.
    let boundaryConsumed =
      Boolean(summary?.boundaryConsumed) ||
      Boolean(session?.boundaryConsumed) ||
      Boolean(session?.loaded && session.turns.length > 0);

    if (!boundaryConsumed && summary?.source === "desktop" && (!session || !session.loaded)) {
      await this.refreshSnapshot(threadId).catch(() => undefined);
      summary = this.state.threads.find((item) => item.threadId === threadId);
      session = this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
      boundaryConsumed =
        Boolean(summary?.boundaryConsumed) ||
        Boolean(session?.boundaryConsumed) ||
        Boolean(session?.loaded && session.turns.length > 0);
    }

    const shouldInjectBoundary = !boundaryConsumed;
    const wireText = shouldInjectBoundary ? injectSideChatBoundary(rawUserText) : rawUserText;
    const clientUserMessageId = createClientUserMessageId();

    this.setState({ sending: true, error: null });

    try {
      // Strictly one submission; NEVER auto-retry on unknown network outcomes.
      await this.channel.startTurn({
        threadId,
        text: wireText,
        clientUserMessageId,
      });
    } catch (error) {
      this.setState({
        sending: false,
        error: makeErrorInfo(error, this.locale),
      });
      throw error;
    }

    // Write accepted by Host: mark boundary consumed and update derived title immediately.
    const needsTitle = !summary?.title || summary.title.trim().length === 0;
    const derivedTitle = needsTitle ? deriveSideChatTitle(rawUserText) : (summary?.title ?? "");
    const nowIso = new Date().toISOString();

    this.updateLocalThreadSummary(threadId, {
      boundaryConsumed: true,
      ...(needsTitle && derivedTitle ? { title: derivedTitle } : {}),
      preview: summary?.preview || deriveSideChatTitle(rawUserText, 120),
      updatedAt: nowIso,
    });
    this.setState({ sending: false });

    // Persist boundaryConsumed & title to plugin store non-fatally (accepted turn must not turn into send error).
    await this.persistTurnMetadataBestEffort(threadId, summary, derivedTitle, needsTitle);

    // Refresh snapshot non-fatally: a failed read never turns an accepted write into a rejected send.
    await this.refreshSnapshot(threadId).catch(() => undefined);
  }

  private async persistTurnMetadataBestEffort(
    threadId: string,
    summary: SideChatThreadSummary | undefined,
    title: string,
    needsTitle: boolean,
  ): Promise<void> {
    try {
      await this.store.patch(threadId, {
        boundaryConsumed: true,
        ...(needsTitle && title ? { title } : {}),
      });
    } catch (error) {
      if (error instanceof SideChatRpcError && error.status === 404 && summary) {
        await this.store
          .upsert({
            threadId,
            sourceThreadId: summary.sourceThreadId,
            mode: summary.mode,
            title,
            boundaryConsumed: true,
          })
          .catch(() => undefined);
      }
    }
  }

  // -------------------------------------------------------------------------
  // Snapshot reconciliation, older turn paging, interrupt, and interactions
  // -------------------------------------------------------------------------

  async refreshSnapshot(threadIdInput?: string): Promise<void> {
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
        ...normalized.turns,
      ];

      const summary = this.state.threads.find((item) => item.threadId === threadId);
      const boundaryConsumed =
        Boolean(summary?.boundaryConsumed) ||
        Boolean(
          this.state.activeSession?.threadId === threadId &&
            this.state.activeSession.boundaryConsumed,
        ) ||
        combinedTurns.length > 0;

      const resolvedTitle =
        summary?.title ||
        normalized.title ||
        deriveSideChatTitle(normalized.preview) ||
        this.deriveTitleFromTurns(combinedTurns);

      if (summary) {
        const shouldBumpBoundary = !summary.boundaryConsumed && boundaryConsumed;
        const shouldSetTitle = !summary.title && resolvedTitle.length > 0;
        if (shouldBumpBoundary || shouldSetTitle || normalized.statusType !== summary.statusType) {
          this.updateLocalThreadSummary(threadId, {
            boundaryConsumed,
            ...(shouldSetTitle ? { title: resolvedTitle } : {}),
            ...(normalized.preview ? { preview: normalized.preview } : {}),
            statusType: normalized.statusType,
          });
        }
      }

      if (this.state.activeThreadId === threadId) {
        const existingSession =
          this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
        this.setState({
          activeSession: {
            threadId,
            mode: summary?.mode ?? existingSession?.mode ?? "persistent",
            title: resolvedTitle,
            boundaryConsumed,
            turns: combinedTurns,
            hasOlderTurns:
              olderTurns.length > 0
                ? Boolean(existingSession?.hasOlderTurns)
                : normalized.hasOlderTurns,
            nextTurnsCursor:
              olderTurns.length > 0
                ? (existingSession?.nextTurnsCursor ?? normalized.nextTurnsCursor)
                : normalized.nextTurnsCursor,
            activeTurnId: normalized.activeTurnId,
            isRunning: normalized.isRunning,
            interactions: normalized.interactions,
            epoch: normalized.epoch,
            nativeError: normalized.nativeError,
            loaded: true,
            loading: false,
            loadingOlder: existingSession?.loadingOlder ?? false,
            stale: false,
          },
        });
      }
    } catch (error) {
      if (this.disposed) return;
      const isExpired = error instanceof SideChatRpcError && error.code === -32079;
      const existing =
        this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
      this.setState({
        error: makeErrorInfo(error, this.locale),
        ...(existing
          ? {
              activeSession: {
                ...existing,
                loading: false,
                ...(isExpired ? { stale: true, isRunning: false, activeTurnId: null } : {}),
              },
            }
          : {}),
      });
    } finally {
      this.snapshotInFlight = false;
      // If another `changed` event arrived while this snapshot read was in flight,
      // schedule one follow-up reconciliation read.
      if (
        !this.disposed &&
        this.snapshotDirty &&
        this.state.activeThreadId === threadId
      ) {
        this.scheduleSnapshotRefresh(threadId);
      }
    }
  }

  private async fetchResolvedSnapshot(threadId: string): Promise<ClientThreadSnapshot> {
    const cachedMap = this.cachedCompletedTurns.get(threadId) ?? new Map<string, RawChTurn>();
    const knownTurns: ClientKnownTurn[] = [...cachedMap.values()]
      .slice(-MAX_KNOWN_TURNS)
      .flatMap((turn) =>
        turn.fingerprint ? [{ id: turn.id, fingerprint: turn.fingerprint }] : [],
      );

    let snapshot = await this.channel.snapshot(threadId, { knownTurns });

    const prevEpoch = this.cachedEpochs.get(threadId);
    if (prevEpoch && prevEpoch !== snapshot.cursor.epoch) {
      cachedMap.clear();
      this.prependedOlderTurns.delete(threadId);
    }

    const hasUnresolvedPlaceholder = (candidate: ClientThreadSnapshot): boolean =>
      candidate.turnsPage.data.some(
        (turn) => turn.unchanged && cachedMap.get(turn.id)?.fingerprint !== turn.fingerprint,
      );

    if (hasUnresolvedPlaceholder(snapshot)) {
      snapshot = await this.channel.snapshot(threadId, { knownTurns: [] });
      if (snapshot.turnsPage.data.some((turn) => turn.unchanged)) {
        throw new SideChatRpcError(
          "host/history-invalid",
          "Host returned an unchanged placeholder that was not requested.",
        );
      }
    }

    const resolvedData = snapshot.turnsPage.data.map((turn) => {
      if (turn.unchanged) {
        return cachedMap.get(turn.id)!;
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
        data: resolvedData,
      },
    };
  }

  async loadOlderTurns(threadIdInput?: string): Promise<void> {
    const threadId = threadIdInput ?? this.state.activeThreadId;
    const session = this.state.activeSession;
    if (
      !threadId ||
      !session ||
      session.threadId !== threadId ||
      !session.nextTurnsCursor ||
      session.loadingOlder
    ) {
      return;
    }

    this.setState({
      activeSession: { ...session, loadingOlder: true },
    });

    try {
      const page = await this.channel.listTurnsPage(threadId, session.nextTurnsCursor, 5);
      if (this.disposed || this.state.activeThreadId !== threadId) return;

      const olderNormalized = [...page.data].reverse().map(normalizeTurn);
      const existingOlder = this.prependedOlderTurns.get(threadId) ?? [];
      const existingIds = new Set(existingOlder.map((t) => t.id));
      const mergedOlder = [
        ...olderNormalized.filter((t) => !existingIds.has(t.id)),
        ...existingOlder,
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
            loadingOlder: false,
          },
        });
      }
    } catch (error) {
      if (this.disposed) return;
      const currentSession = this.state.activeSession;
      this.setState({
        error: makeErrorInfo(error, this.locale),
        ...(currentSession && currentSession.threadId === threadId
          ? { activeSession: { ...currentSession, loadingOlder: false } }
          : {}),
      });
      throw error;
    }
  }

  private resolveActiveTurnId(session: SideChatActiveSessionState | null): string | null {
    if (!session) return null;
    if (session.activeTurnId) return session.activeTurnId;
    for (let i = session.turns.length - 1; i >= 0; i -= 1) {
      if (session.turns[i]?.isActive) return session.turns[i]!.id;
    }
    return null;
  }

  async interrupt(threadIdInput?: string): Promise<void> {
    const threadId = threadIdInput ?? this.state.activeThreadId;
    if (!threadId) return;

    let session =
      this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
    let turnId = this.resolveActiveTurnId(session);

    if (!turnId && session?.isRunning) {
      await this.refreshSnapshot(threadId).catch(() => undefined);
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
        error: makeErrorInfo(error, this.locale),
      });
      throw error;
    }

    this.setState({ interrupting: false });
    await this.refreshSnapshot(threadId).catch(() => undefined);
  }

  async respondToInteraction(
    threadId: string,
    interaction: ClientInteraction,
    answer: SideChatInteractionAnswer | null,
  ): Promise<void> {
    const session =
      this.state.activeSession?.threadId === threadId ? this.state.activeSession : null;
    const epoch = session?.epoch ?? this.cachedEpochs.get(threadId);
    if (!epoch) {
      const err = new SideChatRpcError(
        "side-chat/missing-epoch",
        "Cannot respond to interaction without an active snapshot epoch.",
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
      error: null,
    });

    try {
      // Strictly one submission; never auto-retry on unknown outcomes.
      await this.channel.respond(payload);
    } catch (error) {
      this.setState({
        respondingRequestIds: this.state.respondingRequestIds.filter(
          (id) => id !== interaction.requestId,
        ),
        error: makeErrorInfo(error, this.locale),
      });
      // Read-only reconciliation after error (mirrors ch-interactions.ts).
      await this.refreshSnapshot(threadId).catch(() => undefined);
      throw error;
    }

    this.setState({
      respondingRequestIds: this.state.respondingRequestIds.filter(
        (id) => id !== interaction.requestId,
      ),
    });
    await this.refreshSnapshot(threadId).catch(() => undefined);
  }

  // -------------------------------------------------------------------------
  // Real-time NDJSON event handling & debounced scheduling
  // -------------------------------------------------------------------------

  private handleConnectionChange(online: boolean): void {
    if (this.disposed) return;
    if (this.state.connected !== online) {
      this.setState({ connected: online });
    }
  }

  private handleChannelEvent(event: ClientChannelEvent): void {
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
      if (
        this.state.sourceThreadId &&
        (event.method.startsWith("thread/") ||
          (event.method === "turn/completed" &&
            this.state.threads.some((item) => item.threadId === event.threadId)))
      ) {
        this.scheduleThreadsRefresh();
      }
    }
  }

  private forgetKnownTurns(): void {
    this.cachedCompletedTurns.clear();
    this.cachedEpochs.clear();
  }

  private scheduleSnapshotRefresh(threadId: string): void {
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

  private scheduleThreadsRefresh(): void {
    if (this.disposed || !this.state.sourceThreadId || this.listRefreshTimer !== null) return;
    this.listRefreshTimer = setTimeout(() => {
      this.listRefreshTimer = null;
      if (!this.disposed && this.state.sourceThreadId) {
        void this.refreshThreads(this.state.sourceThreadId).catch(() => undefined);
      }
    }, this.debounceMs);
  }

  private clearSnapshotTimer(): void {
    if (this.snapshotTimer !== null) {
      clearTimeout(this.snapshotTimer);
      this.snapshotTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearSnapshotTimer();
    if (this.listRefreshTimer !== null) {
      clearTimeout(this.listRefreshTimer);
      this.listRefreshTimer = null;
    }
  }

  // -------------------------------------------------------------------------
  // State mutation helpers
  // -------------------------------------------------------------------------

  private deriveTitleFromTurns(turns: readonly NormalizedSideChatTurn[]): string {
    for (const turn of turns) {
      for (const item of turn.items) {
        if (item.kind === "userMessage" && item.text.trim().length > 0) {
          return deriveSideChatTitle(item.text);
        }
      }
    }
    return "";
  }

  private updateLocalThreadSummary(
    threadId: string,
    patch: Partial<SideChatThreadSummary>,
  ): void {
    let changed = false;
    const nextThreads = this.state.threads.map((item) => {
      if (item.threadId !== threadId) return item;
      changed = true;
      return { ...item, ...patch };
    });

    const nextActiveSession =
      this.state.activeSession && this.state.activeSession.threadId === threadId
        ? {
            ...this.state.activeSession,
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.mode !== undefined ? { mode: patch.mode } : {}),
            ...(patch.boundaryConsumed !== undefined
              ? { boundaryConsumed: patch.boundaryConsumed }
              : {}),
          }
        : this.state.activeSession;

    if (changed || nextActiveSession !== this.state.activeSession) {
      this.setState({
        threads: changed ? nextThreads.sort(compareSummaryDesc) : this.state.threads,
        activeSession: nextActiveSession,
      });
    }
  }

  private setState(patch: Partial<SideChatControllerState>): void {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) {
      listener();
    }
  }
}
