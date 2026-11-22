/**
 * Persistent atomic JSON store for Side Chat mappings.
 *
 * Stored at `<codexhostAccess.dataDirectory>/side-chat-store.json`.
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

import type {
  CreateSideChatRecordInput,
  SideChatMode,
  SideChatRecord,
  UpdateSideChatRecordPatch,
} from "./types.ts";

export const SIDE_CHAT_STORE_FILENAME = "side-chat-store.json";

const FILE_MODE = 0o600;
const DIR_MODE = 0o700;
const MAX_ID_LENGTH = 512;
const MAX_TITLE_LENGTH = 200;

interface StoredFileV1 {
  readonly version: 1;
  readonly threads: readonly SideChatRecord[];
}

export class SideChatStoreError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "SideChatStoreError";
    this.status = status;
    this.code = code;
  }
}

function sanitizeId(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new SideChatStoreError(400, "side-chat/invalid", `${field} must be a string.`);
  }
  const trimmed = value.trim();
  if (!trimmed) {
    throw new SideChatStoreError(400, "side-chat/invalid", `${field} cannot be empty.`);
  }
  if (trimmed.length > MAX_ID_LENGTH) {
    throw new SideChatStoreError(
      400,
      "side-chat/invalid",
      `${field} must be at most ${MAX_ID_LENGTH} characters.`,
    );
  }
  if (/[\u0000-\u001f\u007f]/u.test(trimmed)) {
    throw new SideChatStoreError(
      400,
      "side-chat/invalid",
      `${field} contains invalid control characters.`,
    );
  }
  return trimmed;
}

function sanitizeMode(value: unknown): SideChatMode {
  if (value !== "persistent" && value !== "ephemeral") {
    throw new SideChatStoreError(
      400,
      "side-chat/invalid",
      'mode must be "persistent" or "ephemeral".',
    );
  }
  return value;
}

function sanitizeTitle(value: unknown): string {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") {
    throw new SideChatStoreError(400, "side-chat/invalid", "title must be a string.");
  }
  const trimmed = value.trim();
  const chars = Array.from(trimmed);
  return chars.length > MAX_TITLE_LENGTH ? chars.slice(0, MAX_TITLE_LENGTH).join("") : trimmed;
}

function sanitizeTimestamp(value: unknown, fallback: string): string {
  if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return fallback;
}

function isValidSideChatRecord(value: unknown): value is SideChatRecord {
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

function compareRecordsDesc(a: SideChatRecord, b: SideChatRecord): number {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}

function atomicWriteJson(filePath: string, payload: StoredFileV1): void {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true, mode: DIR_MODE });
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
      // Windows does not implement POSIX chmod modes identically.
    }
  } finally {
    if (existsSync(tempPath)) {
      rmSync(tempPath, { force: true });
    }
  }
}

export class SideChatStore {
  readonly filePath: string;
  private records: SideChatRecord[] = [];
  private signature: string | undefined;

  constructor(dataDirectory: string) {
    this.filePath = join(dataDirectory, SIDE_CHAT_STORE_FILENAME);
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
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8")) as Partial<StoredFileV1>;
      if (parsed?.version !== 1 || !Array.isArray(parsed.threads)) {
        this.records = [];
        return;
      }
      const deduped = new Map<string, SideChatRecord>();
      for (const entry of parsed.threads) {
        if (isValidSideChatRecord(entry)) {
          deduped.set(entry.threadId, {
            threadId: entry.threadId.trim(),
            sourceThreadId: entry.sourceThreadId.trim(),
            mode: entry.mode,
            title: sanitizeTitle(entry.title),
            boundaryConsumed: entry.boundaryConsumed,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
          });
        }
      }
      this.records = [...deduped.values()].sort(compareRecordsDesc);
    } catch {
      // Recover gracefully from corrupted JSON; the next valid mutation heals the file.
      this.records = [];
    }
  }

  private save(nextRecords: SideChatRecord[]): void {
    const sorted = [...nextRecords].sort(compareRecordsDesc);
    atomicWriteJson(this.filePath, {
      version: 1,
      threads: sorted,
    });
    this.records = sorted;
    this.signature = this.fileSignature();
  }

  list(sourceThreadId?: string): SideChatRecord[] {
    this.sync();
    const filterSource = sourceThreadId?.trim();
    const filtered = filterSource
      ? this.records.filter((record) => record.sourceThreadId === filterSource)
      : this.records;
    return filtered.map((record) => ({ ...record }));
  }

  get(threadId: string): SideChatRecord | undefined {
    this.sync();
    const found = this.records.find((record) => record.threadId === threadId);
    return found ? { ...found } : undefined;
  }

  upsert(input: CreateSideChatRecordInput): SideChatRecord {
    this.sync();
    const threadId = sanitizeId(input.threadId, "threadId");
    const sourceThreadId = sanitizeId(input.sourceThreadId, "sourceThreadId");
    const mode = sanitizeMode(input.mode);

    const existing = this.records.find((record) => record.threadId === threadId);
    const now = new Date().toISOString();

    const title =
      input.title !== undefined ? sanitizeTitle(input.title) : (existing?.title ?? "");

    if (input.boundaryConsumed !== undefined && typeof input.boundaryConsumed !== "boolean") {
      throw new SideChatStoreError(
        400,
        "side-chat/invalid",
        "boundaryConsumed must be a boolean.",
      );
    }

    const boundaryConsumed =
      input.boundaryConsumed !== undefined
        ? input.boundaryConsumed
        : (existing?.boundaryConsumed ?? false);

    const createdAt = existing
      ? existing.createdAt
      : sanitizeTimestamp(input.createdAt, now);

    const updatedAt = sanitizeTimestamp(input.updatedAt, now);

    const record: SideChatRecord = {
      threadId,
      sourceThreadId,
      mode,
      title,
      boundaryConsumed,
      createdAt,
      updatedAt,
    };

    const nextRecords = existing
      ? this.records.map((item) => (item.threadId === threadId ? record : item))
      : [...this.records, record];

    this.save(nextRecords);
    return { ...record };
  }

  update(threadIdInput: string, patch: UpdateSideChatRecordPatch): SideChatRecord {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) {
      throw new SideChatStoreError(404, "side-chat/not-found", "Side chat thread not found.");
    }

    if (patch.boundaryConsumed !== undefined && typeof patch.boundaryConsumed !== "boolean") {
      throw new SideChatStoreError(
        400,
        "side-chat/invalid",
        "boundaryConsumed must be a boolean.",
      );
    }

    const updated: SideChatRecord = {
      ...existing,
      sourceThreadId:
        patch.sourceThreadId !== undefined
          ? sanitizeId(patch.sourceThreadId, "sourceThreadId")
          : existing.sourceThreadId,
      mode: patch.mode !== undefined ? sanitizeMode(patch.mode) : existing.mode,
      title: patch.title !== undefined ? sanitizeTitle(patch.title) : existing.title,
      boundaryConsumed:
        patch.boundaryConsumed !== undefined
          ? patch.boundaryConsumed
          : existing.boundaryConsumed,
      updatedAt: new Date().toISOString(),
    };

    this.save(this.records.map((item) => (item.threadId === threadId ? updated : item)));
    return { ...updated };
  }

  remove(threadIdInput: string, sourceThreadId?: string): boolean {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const filterSource = sourceThreadId?.trim();
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) return false;
    if (filterSource && existing.sourceThreadId !== filterSource) return false;

    this.save(this.records.filter((record) => record.threadId !== threadId));
    return true;
  }
}
