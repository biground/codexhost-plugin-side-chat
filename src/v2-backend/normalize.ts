/**
 * Snapshot normalizer for the v2 Host extension backend.
 *
 * Aligns strictly with `src/client/protocol.ts` while additionally exposing `rawText`
 * alongside boundary-stripped `text` and `hadBoundaryPrefix` on every `userMessage`.
 */
import { hasSideChatBoundary, stripSideChatBoundary } from "../client/boundary.ts";
import type { ClientInteraction } from "../client/interactions.ts";
import {
  REASONING_TRANSCRIPT_COMMAND,
  resolveConversationItems,
  type ClientThreadSnapshot,
  type RawChItem,
  type RawChTurn,
  type SideChatFileChange,
  type SideChatItemStatus,
  type SideChatTurnOutcome,
} from "../client/protocol.ts";
import { isPlainRecord } from "./json.ts";

export type V2NormalizedMessageItem =
  | {
      readonly kind: "userMessage";
      readonly id: string;
      readonly text: string;
      readonly rawText: string;
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

export interface V2NormalizedTurn {
  readonly id: string;
  readonly status: string;
  readonly isActive: boolean;
  readonly outcome: SideChatTurnOutcome;
  readonly unknownReason?: string;
  readonly errorMessage?: string;
  readonly startedAt?: number | null;
  readonly completedAt?: number | null;
  readonly fingerprint?: string;
  readonly items: readonly V2NormalizedMessageItem[];
}

export interface V2NormalizedSnapshot {
  readonly threadId: string;
  readonly epoch: string;
  readonly sequence: number;
  readonly title: string | null;
  readonly preview: string;
  readonly statusType: string;
  readonly activeTurnId: string | null;
  readonly isRunning: boolean;
  readonly turns: readonly V2NormalizedTurn[];
  readonly hasOlderTurns: boolean;
  readonly nextTurnsCursor: string | null;
  readonly interactions: readonly ClientInteraction[];
  readonly nativeError: string | null;
  readonly attachedToThreadId: string | null;
  readonly ephemeral: boolean | null;
}

function normalizeFileChangeKind(value: unknown): SideChatFileChange["kind"] {
  const kindType = typeof value === "string" ? value : isPlainRecord(value) ? value.type : undefined;
  if (kindType === "add" || kindType === "create") return "add";
  if (kindType === "delete") return "delete";
  return "update";
}

function normalizeFileChanges(value: unknown): SideChatFileChange[] {
  if (!Array.isArray(value)) return [];
  const changes: SideChatFileChange[] = [];
  for (const entry of value) {
    if (!isPlainRecord(entry)) continue;
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
  if (isPlainRecord(item.error) && typeof item.error.message === "string") {
    return item.error.message;
  }
  if (!isPlainRecord(item.result) || !Array.isArray(item.result.content)) return "";
  return item.result.content
    .map((block) =>
      isPlainRecord(block) && block.type === "text" && typeof block.text === "string"
        ? block.text
        : JSON.stringify(block),
    )
    .join("\n");
}

function extractDynamicToolOutput(item: RawChItem): string {
  const source = item.result ?? item.contentItems;
  if (Array.isArray(source)) {
    return source
      .map((entry) =>
        isPlainRecord(entry) && entry.type === "text" && typeof entry.text === "string"
          ? entry.text
          : JSON.stringify(entry),
      )
      .join("\n");
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
        if (isPlainRecord(part) && part.type === "text" && typeof part.text === "string") {
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
): V2NormalizedMessageItem | undefined {
  const id = item.id;
  switch (item.type) {
    case "userMessage": {
      const rawText = extractUserMessageText(item);
      const hadBoundaryPrefix = hasSideChatBoundary(rawText);
      return {
        kind: "userMessage",
        id,
        text: stripSideChatBoundary(rawText),
        rawText,
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
        ...(isPlainRecord(item.error) && typeof item.error.message === "string"
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
        ...(isPlainRecord(item.error) && typeof item.error.message === "string"
          ? { errorMessage: item.error.message }
          : {}),
      };
    default:
      return undefined;
  }
}

export function normalizeV2Turn(turn: RawChTurn): V2NormalizedTurn {
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

  const items: V2NormalizedMessageItem[] = [];
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

export function normalizeV2Snapshot(snapshot: ClientThreadSnapshot): V2NormalizedSnapshot {
  const rawTurns = Array.isArray(snapshot.turnsPage?.data) ? snapshot.turnsPage.data : [];
  const chronologicalTurns = [...rawTurns].reverse().map(normalizeV2Turn);

  let fallbackActiveTurnId: string | null = null;
  for (let i = chronologicalTurns.length - 1; i >= 0; i -= 1) {
    if (chronologicalTurns[i]?.isActive) {
      fallbackActiveTurnId = chronologicalTurns[i]!.id;
      break;
    }
  }
  const activeTurnId = snapshot.activeTurnId ?? fallbackActiveTurnId;
  const statusType = snapshot.thread?.status?.type ?? "idle";
  const isRunning = activeTurnId !== null || statusType === "active";

  const rawNativeError =
    snapshot.thread?.nativeInteractionError ?? snapshot.thread?.nativeSendError ?? null;

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
    hasOlderTurns: (snapshot.turnsPage?.nextCursor ?? null) !== null,
    nextTurnsCursor: snapshot.turnsPage?.nextCursor ?? null,
    interactions: Array.isArray(snapshot.interactions) ? snapshot.interactions : [],
    nativeError: typeof rawNativeError === "string" ? rawNativeError : null,
    attachedToThreadId:
      typeof snapshot.thread.attachedToThreadId === "string" &&
      snapshot.thread.attachedToThreadId.trim().length > 0
        ? snapshot.thread.attachedToThreadId.trim()
        : null,
    ephemeral: typeof snapshot.thread.ephemeral === "boolean" ? snapshot.thread.ephemeral : null,
  };
}
