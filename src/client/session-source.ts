/**
 * Resolves the active main session's local Host `sourceThreadId` and guards
 * against blank drafts or unsupported remote Hosts.
 */
import type { ClientSessionListRow, ClientSessionListSnapshot } from "../types.ts";

export type MainSessionResolution =
  | {
      readonly status: "ready";
      readonly sourceThreadId: string;
      readonly running: boolean;
    }
  | {
      readonly status: "draft";
      readonly reason: "missing" | "blank";
    }
  | {
      readonly status: "remote-unsupported";
      readonly hostId: string;
    };

/**
 * Pure resolver operating on a single session row from `ctx.sessions.list`.
 */
export function resolveMainSessionRow(
  sessionId: string,
  row: ClientSessionListRow | undefined,
): MainSessionResolution {
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
  const sourceThreadId =
    typeof refThreadId === "string" && refThreadId.trim().length > 0
      ? refThreadId.trim()
      : sessionId;
  return {
    status: "ready",
    sourceThreadId,
    running: row.running === true,
  };
}

/**
 * Resolves `sessionId` directly from a `ctx.sessions.list` snapshot.
 */
export function resolveMainSessionFromSnapshot(
  sessionId: string,
  snapshot: ClientSessionListSnapshot | undefined,
): MainSessionResolution {
  return resolveMainSessionRow(sessionId, snapshot?.byId?.[sessionId]);
}
