// src/store.ts
import { randomBytes } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { dirname, join } from "node:path";
var SIDE_CHAT_STORE_FILENAME = "side-chat-store.json";
var FILE_MODE = 384;
var DIR_MODE = 448;
var MAX_ID_LENGTH = 512;
var MAX_TITLE_LENGTH = 200;
var SideChatStoreError = class extends Error {
  status;
  code;
  constructor(status, code, message) {
    super(message);
    this.name = "SideChatStoreError";
    this.status = status;
    this.code = code;
  }
};
function sanitizeId(value, field) {
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
      `${field} must be at most ${MAX_ID_LENGTH} characters.`
    );
  }
  if (/[\u0000-\u001f\u007f]/u.test(trimmed)) {
    throw new SideChatStoreError(
      400,
      "side-chat/invalid",
      `${field} contains invalid control characters.`
    );
  }
  return trimmed;
}
function sanitizeMode(value) {
  if (value !== "persistent" && value !== "ephemeral") {
    throw new SideChatStoreError(
      400,
      "side-chat/invalid",
      'mode must be "persistent" or "ephemeral".'
    );
  }
  return value;
}
function sanitizeTitle(value) {
  if (value === void 0 || value === null) return "";
  if (typeof value !== "string") {
    throw new SideChatStoreError(400, "side-chat/invalid", "title must be a string.");
  }
  const trimmed = value.trim();
  const chars = Array.from(trimmed);
  return chars.length > MAX_TITLE_LENGTH ? chars.slice(0, MAX_TITLE_LENGTH).join("") : trimmed;
}
function sanitizeTimestamp(value, fallback) {
  if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return fallback;
}
function isValidSideChatRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value;
  return typeof candidate.threadId === "string" && candidate.threadId.trim().length > 0 && typeof candidate.sourceThreadId === "string" && candidate.sourceThreadId.trim().length > 0 && (candidate.mode === "persistent" || candidate.mode === "ephemeral") && typeof candidate.title === "string" && typeof candidate.boundaryConsumed === "boolean" && typeof candidate.createdAt === "string" && !Number.isNaN(Date.parse(candidate.createdAt)) && typeof candidate.updatedAt === "string" && !Number.isNaN(Date.parse(candidate.updatedAt));
}
function compareRecordsDesc(a, b) {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}
function atomicWriteJson(filePath, payload) {
  const dir = dirname(filePath);
  mkdirSync(dir, { recursive: true, mode: DIR_MODE });
  const tempPath = `${filePath}.${randomBytes(6).toString("hex")}.tmp`;
  try {
    writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}
`, {
      encoding: "utf8",
      mode: FILE_MODE
    });
    renameSync(tempPath, filePath);
    try {
      chmodSync(filePath, FILE_MODE);
    } catch {
    }
  } finally {
    if (existsSync(tempPath)) {
      rmSync(tempPath, { force: true });
    }
  }
}
var SideChatStore = class {
  filePath;
  records = [];
  signature;
  constructor(dataDirectory) {
    this.filePath = join(dataDirectory, SIDE_CHAT_STORE_FILENAME);
    this.load();
  }
  fileSignature() {
    try {
      const stats = statSync(this.filePath);
      return `${String(stats.ino)}:${String(stats.mtimeMs)}:${String(stats.size)}`;
    } catch {
      return void 0;
    }
  }
  sync() {
    const current = this.fileSignature();
    if (current === this.signature) return;
    this.load();
  }
  load() {
    this.signature = this.fileSignature();
    if (!existsSync(this.filePath)) {
      this.records = [];
      return;
    }
    try {
      const parsed = JSON.parse(readFileSync(this.filePath, "utf8"));
      if (parsed?.version !== 1 || !Array.isArray(parsed.threads)) {
        this.records = [];
        return;
      }
      const deduped = /* @__PURE__ */ new Map();
      for (const entry of parsed.threads) {
        if (isValidSideChatRecord(entry)) {
          deduped.set(entry.threadId, {
            threadId: entry.threadId.trim(),
            sourceThreadId: entry.sourceThreadId.trim(),
            mode: entry.mode,
            title: sanitizeTitle(entry.title),
            boundaryConsumed: entry.boundaryConsumed,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt
          });
        }
      }
      this.records = [...deduped.values()].sort(compareRecordsDesc);
    } catch {
      this.records = [];
    }
  }
  save(nextRecords) {
    const sorted = [...nextRecords].sort(compareRecordsDesc);
    atomicWriteJson(this.filePath, {
      version: 1,
      threads: sorted
    });
    this.records = sorted;
    this.signature = this.fileSignature();
  }
  list(sourceThreadId) {
    this.sync();
    const filterSource = sourceThreadId?.trim();
    const filtered = filterSource ? this.records.filter((record) => record.sourceThreadId === filterSource) : this.records;
    return filtered.map((record) => ({ ...record }));
  }
  get(threadId) {
    this.sync();
    const found = this.records.find((record) => record.threadId === threadId);
    return found ? { ...found } : void 0;
  }
  upsert(input) {
    this.sync();
    const threadId = sanitizeId(input.threadId, "threadId");
    const sourceThreadId = sanitizeId(input.sourceThreadId, "sourceThreadId");
    const mode = sanitizeMode(input.mode);
    const existing = this.records.find((record2) => record2.threadId === threadId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const title = input.title !== void 0 ? sanitizeTitle(input.title) : existing?.title ?? "";
    if (input.boundaryConsumed !== void 0 && typeof input.boundaryConsumed !== "boolean") {
      throw new SideChatStoreError(
        400,
        "side-chat/invalid",
        "boundaryConsumed must be a boolean."
      );
    }
    const boundaryConsumed = input.boundaryConsumed !== void 0 ? input.boundaryConsumed : existing?.boundaryConsumed ?? false;
    const createdAt = existing ? existing.createdAt : sanitizeTimestamp(input.createdAt, now);
    const updatedAt = sanitizeTimestamp(input.updatedAt, now);
    const record = {
      threadId,
      sourceThreadId,
      mode,
      title,
      boundaryConsumed,
      createdAt,
      updatedAt
    };
    const nextRecords = existing ? this.records.map((item) => item.threadId === threadId ? record : item) : [...this.records, record];
    this.save(nextRecords);
    return { ...record };
  }
  update(threadIdInput, patch) {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) {
      throw new SideChatStoreError(404, "side-chat/not-found", "Side chat thread not found.");
    }
    if (patch.boundaryConsumed !== void 0 && typeof patch.boundaryConsumed !== "boolean") {
      throw new SideChatStoreError(
        400,
        "side-chat/invalid",
        "boundaryConsumed must be a boolean."
      );
    }
    const updated = {
      ...existing,
      sourceThreadId: patch.sourceThreadId !== void 0 ? sanitizeId(patch.sourceThreadId, "sourceThreadId") : existing.sourceThreadId,
      mode: patch.mode !== void 0 ? sanitizeMode(patch.mode) : existing.mode,
      title: patch.title !== void 0 ? sanitizeTitle(patch.title) : existing.title,
      boundaryConsumed: patch.boundaryConsumed !== void 0 ? patch.boundaryConsumed : existing.boundaryConsumed,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    this.save(this.records.map((item) => item.threadId === threadId ? updated : item));
    return { ...updated };
  }
  remove(threadIdInput, sourceThreadId) {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const filterSource = sourceThreadId?.trim();
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) return false;
    if (filterSource && existing.sourceThreadId !== filterSource) return false;
    this.save(this.records.filter((record) => record.threadId !== threadId));
    return true;
  }
};

// src/index.ts
var name = "codexhost-plugin-side-chat";
var inject = ["webServer", "codexhostAccess"];
var SIDE_CHAT_ROUTE_PREFIX = "/codexhost-side-chat";
var MAX_BODY_BYTES = 128 * 1024;
function writeJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  }).end(JSON.stringify(body));
}
function isSameOriginHost(originHeader, hostHeader) {
  if (!hostHeader) return false;
  try {
    return new URL(originHeader).host.toLowerCase() === hostHeader.toLowerCase();
  } catch {
    return false;
  }
}
async function readJsonBody(req) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += part.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new SideChatStoreError(413, "side-chat/payload-too-large", "Request body is too large.");
    }
    chunks.push(part);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SideChatStoreError(400, "side-chat/invalid-json", "Request body must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SideChatStoreError(
      400,
      "side-chat/invalid",
      "Request body must be a JSON object."
    );
  }
  return parsed;
}
function decodeThreadIdSegment(rawSegment) {
  try {
    return decodeURIComponent(rawSegment);
  } catch {
    throw new SideChatStoreError(400, "side-chat/invalid", "Invalid threadId path encoding.");
  }
}
function createSideChatRouteHandler(access, store) {
  return async (req, res) => {
    const method = (req.method ?? "GET").toUpperCase();
    if (access.authEnabled) {
      const reqAuth = access.getRequestAuth(req);
      if (!reqAuth) {
        writeJson(res, 401, {
          error: {
            code: "auth/unauthorized",
            message: "Authentication is required to access Side Chat endpoints."
          }
        });
        return;
      }
      if (reqAuth.scope !== "full") {
        writeJson(res, 403, {
          error: {
            code: "auth/forbidden",
            message: "Primary full access is required to access Side Chat endpoints."
          }
        });
        return;
      }
    } else if (method !== "GET" && method !== "HEAD") {
      const origin = req.headers.origin;
      if (typeof origin === "string" && origin.trim().length > 0) {
        if (!isSameOriginHost(origin, req.headers.host)) {
          writeJson(res, 403, {
            error: {
              code: "auth/cross-origin",
              message: "Cross-origin mutating requests are forbidden."
            }
          });
          return;
        }
      }
    }
    const url = new URL(req.url ?? SIDE_CHAT_ROUTE_PREFIX, "http://localhost");
    const subpath = url.pathname.slice(SIDE_CHAT_ROUTE_PREFIX.length) || "/";
    try {
      if (method === "GET" && subpath === "/threads") {
        const sourceThreadId = url.searchParams.get("sourceThreadId")?.trim() || void 0;
        writeJson(res, 200, { threads: store.list(sourceThreadId) });
        return;
      }
      if (method === "POST" && subpath === "/threads") {
        const body = await readJsonBody(req);
        const rawThreadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
        const existed = rawThreadId.length > 0 && store.get(rawThreadId) !== void 0;
        const thread = store.upsert(body);
        writeJson(res, existed ? 200 : 201, {
          thread,
          threads: store.list(thread.sourceThreadId)
        });
        return;
      }
      const threadMatch = /^\/threads\/([^/]+)$/u.exec(subpath);
      if (threadMatch?.[1]) {
        const threadId = decodeThreadIdSegment(threadMatch[1]);
        if (method === "PATCH") {
          const body = await readJsonBody(req);
          const thread = store.update(threadId, body);
          writeJson(res, 200, { thread });
          return;
        }
        if (method === "DELETE") {
          const sourceThreadId = url.searchParams.get("sourceThreadId")?.trim() || void 0;
          const deleted = store.remove(threadId, sourceThreadId);
          if (!deleted) {
            writeJson(res, 404, {
              error: {
                code: "side-chat/not-found",
                message: "Side chat thread not found."
              }
            });
            return;
          }
          writeJson(res, 200, { deleted: true });
          return;
        }
      }
      writeJson(res, 404, {
        error: {
          code: "not-found",
          message: "Route not found."
        }
      });
    } catch (error) {
      if (error instanceof SideChatStoreError) {
        writeJson(res, error.status, {
          error: {
            code: error.code,
            message: error.message
          }
        });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      writeJson(res, 400, {
        error: {
          code: "side-chat/invalid",
          message
        }
      });
    }
  };
}
function apply(ctx) {
  const access = ctx.codexhostAccess;
  const store = new SideChatStore(access.dataDirectory);
  const handler = createSideChatRouteHandler(access, store);
  ctx.effect(
    () => ctx.webServer.register({
      kind: "prefix",
      path: SIDE_CHAT_ROUTE_PREFIX,
      handler
    }),
    `${name}: side-chat routes`
  );
}
export {
  SIDE_CHAT_ROUTE_PREFIX,
  SideChatStore,
  SideChatStoreError,
  apply,
  createSideChatRouteHandler,
  inject,
  name
};
