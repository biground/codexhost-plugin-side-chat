/**
 * Atomic JSON store for manifestVersion 2 Side Chat metadata.
 *
 * Persisted at `<ctx.dataDir>/side-chats.json` via temp file + atomic rename.
 */
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import type { SideChatMode, SideChatRecord } from "../types.ts";

export const V2_SIDE_CHATS_FILENAME = "side-chats.json";

const FILE_MODE = 0o600;
const DIR_MODE = 0o700;
const MAX_ID_LENGTH = 512;
const MAX_TITLE_LENGTH = 200;

interface StoredV2File {
  readonly version: 1;
  readonly threads: readonly SideChatRecord[];
}

export interface UpsertV2RecordInput {
  readonly threadId: string;
  readonly sourceThreadId: string;
  readonly mode: SideChatMode;
  readonly title?: string;
  readonly boundaryConsumed?: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

export interface PatchV2RecordInput {
  readonly sourceThreadId?: string;
  readonly mode?: SideChatMode;
  readonly title?: string;
  readonly boundaryConsumed?: boolean;
  readonly updatedAt?: string;
}

function sanitizeId(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new Error(`${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${field} cannot be empty.`);
  }
  if (trimmed.length > MAX_ID_LENGTH) {
    throw new Error(`${field} must be at most ${MAX_ID_LENGTH} characters.`);
  }
  if (/[\u0000-\u001f\u007f]/u.test(trimmed)) {
    throw new Error(`${field} contains invalid control characters.`);
  }
  return trimmed;
}

function sanitizeTitle(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const chars = Array.from(trimmed);
  return chars.length > MAX_TITLE_LENGTH ? chars.slice(0, MAX_TITLE_LENGTH).join("") : trimmed;
}

function sanitizeTimestamp(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return fallback;
}

function isValidRecord(value: unknown): value is SideChatRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<SideChatRecord>;
  return (
    typeof candidate.threadId === "string" &&
    candidate.threadId.trim().length > 0 &&
    typeof candidate.sourceThreadId === "string" &&
    candidate.sourceThreadId.trim().length > 0 &&
    (candidate.mode === "persistent" || candidate.mode === "ephemeral") &&
    typeof candidate.title === "string" &&
    typeof candidate.boundaryConsumed === "boolean" &&
    typeof candidate.createdAt === "string" &&
    !Number.isNaN(Date.parse(candidate.createdAt)) &&
    typeof candidate.updatedAt === "string" &&
    !Number.isNaN(Date.parse(candidate.updatedAt))
  );
}

function compareDesc(a: SideChatRecord, b: SideChatRecord): number {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}

function atomicWriteJson(filePath: string, payload: StoredV2File): void {
  mkdirSync(dirname(filePath), { recursive: true, mode: DIR_MODE });
  const tempPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, {
      encoding: "utf8",
      mode: FILE_MODE,
    });
    renameSync(tempPath, filePath);
    try {
      chmodSync(filePath, FILE_MODE);
    } catch {
      // Windows does not implement POSIX chmod identically.
    }
  } finally {
    if (existsSync(tempPath)) {
      rmSync(tempPath, { force: true });
    }
  }
}

export class V2SideChatStore {
  readonly filePath: string;
  private records: SideChatRecord[] = [];
  private signature: string | undefined;

  constructor(dataDir: string) {
    this.filePath = join(dataDir, V2_SIDE_CHATS_FILENAME);
    this.load();
  }

  private fileSignature(): string | undefined {
    try {
      const stats = statSync(this.filePath);
      return `${String(stats.ino)}:${String(stats.mtimeMs)}:${String(stats.size)}`;
    } catch {
      return undefined;
    }
  }

  private sync(): void {
    const current = this.fileSignature();
    if (current === this.signature) return;
    this.load();
  }

  private load(): void {
    this.signature = this.fileSignature();
    if (!existsSync(this.filePath)) {
      this.records = [];
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as Partial<StoredV2File>;
      if (parsed?.version !== 1 || !Array.isArray(parsed.threads)) {
        this.records = [];
        return;
      }
      const deduped = new Map<string, SideChatRecord>();
      for (const entry of parsed.threads) {
        if (!isValidRecord(entry)) continue;
        deduped.set(entry.threadId.trim(), {
          threadId: entry.threadId.trim(),
          sourceThreadId: entry.sourceThreadId.trim(),
          mode: entry.mode,
          title: sanitizeTitle(entry.title),
          boundaryConsumed: entry.boundaryConsumed,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        });
      }
      this.records = [...deduped.values()].sort(compareDesc);
    } catch {
      this.records = [];
    }
  }

  private save(next: SideChatRecord[]): void {
    const sorted = [...next].sort(compareDesc);
    atomicWriteJson(this.filePath, { version: 1, threads: sorted });
    this.records = sorted;
    this.signature = this.fileSignature();
  }

  count(): number {
    this.sync();
    return this.records.length;
  }

  list(sourceThreadId?: string): SideChatRecord[] {
    this.sync();
    const filter = sourceThreadId?.trim();
    const items = filter
      ? this.records.filter((record) => record.sourceThreadId === filter)
      : this.records;
    return items.map((record) => ({ ...record }));
  }

  get(threadId: string): SideChatRecord | undefined {
    this.sync();
    const trimmed = threadId.trim();
    const found = this.records.find((record) => record.threadId === trimmed);
    return found ? { ...found } : undefined;
  }

  upsert(input: UpsertV2RecordInput): SideChatRecord {
    this.sync();
    const threadId = sanitizeId(input.threadId, "threadId");
    const sourceThreadId = sanitizeId(input.sourceThreadId, "sourceThreadId");
    const mode: SideChatMode = input.mode === "ephemeral" ? "ephemeral" : "persistent";
    const existing = this.records.find((record) => record.threadId === threadId);
    const now = new Date().toISOString();

    const record: SideChatRecord = {
      threadId,
      sourceThreadId,
      mode,
      title: input.title !== undefined ? sanitizeTitle(input.title) : (existing?.title ?? ""),
      boundaryConsumed:
        input.boundaryConsumed !== undefined
          ? Boolean(input.boundaryConsumed)
          : (existing?.boundaryConsumed ?? false),
      createdAt: existing ? existing.createdAt : sanitizeTimestamp(input.createdAt, now),
      updatedAt: sanitizeTimestamp(input.updatedAt, now),
    };

    const next = existing
      ? this.records.map((entry) => (entry.threadId === threadId ? record : entry))
      : [...this.records, record];
    this.save(next);
    return { ...record };
  }

  update(threadIdInput: string, patch: PatchV2RecordInput): SideChatRecord | undefined {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) return undefined;

    const now = new Date().toISOString();
    const updated: SideChatRecord = {
      ...existing,
      sourceThreadId:
        patch.sourceThreadId !== undefined
          ? sanitizeId(patch.sourceThreadId, "sourceThreadId")
          : existing.sourceThreadId,
      mode: patch.mode ?? existing.mode,
      title: patch.title !== undefined ? sanitizeTitle(patch.title) : existing.title,
      boundaryConsumed:
        patch.boundaryConsumed !== undefined
          ? Boolean(patch.boundaryConsumed)
          : existing.boundaryConsumed,
      updatedAt: sanitizeTimestamp(patch.updatedAt, now),
    };

    this.save(this.records.map((entry) => (entry.threadId === threadId ? updated : entry)));
    return { ...updated };
  }

  remove(threadIdInput: string, sourceThreadId?: string): boolean {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const filter = sourceThreadId?.trim();
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) return false;
    if (filter && existing.sourceThreadId !== filter) return false;

    this.save(this.records.filter((record) => record.threadId !== threadId));
    return true;
  }
}
