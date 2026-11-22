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
function deriveSideChatTitle(rawText, maxLength = 60) {
  const clean = stripSideChatBoundary(rawText).replace(/\s+/gu, " ").trim();
  if (!clean) return "";
  const chars = Array.from(clean);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}\u2026` : clean;
}

// src/client/interactions.ts
function asRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function isNativeApprovalRequest(pending) {
  const method = pending.request.method;
  return method === "item/commandExecution/requestApproval" || method === "item/fileChange/requestApproval";
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
function extractErrorCode(error) {
  if (error instanceof SideChatRpcError) return error.code;
  if (error && typeof error === "object" && "code" in error) {
    const candidate = error.code;
    if (typeof candidate === "number" || typeof candidate === "string") return candidate;
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
function createClientUserMessageId() {
  const randomUuid = typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function" ? globalThis.crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `sidechat-${randomUuid}`;
}

// src/v2-backend/channel-client.ts
import { readdir, readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { createConnection } from "node:net";
import path from "node:path";

// src/v2-backend/json.ts
function isPlainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toStrictJson(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const item of value) {
      out.push(toStrictJson(item));
    }
    return out;
  }
  if (typeof value === "object") {
    const out = {};
    for (const [key, entry] of Object.entries(value)) {
      if (entry === void 0 || typeof entry === "function" || typeof entry === "symbol") {
        continue;
      }
      out[key] = toStrictJson(entry);
    }
    return out;
  }
  return null;
}
function okReply(payload) {
  return toStrictJson({ ok: true, ...payload });
}
function errorReply(code, message, extra) {
  return toStrictJson({
    ok: false,
    ...extra ?? {},
    error: {
      code,
      message: message.trim() || "Side Chat backend error"
    }
  });
}

// src/v2-backend/channel-client.ts
var ClientChannelError = class extends Error {
  code;
  status;
  method;
  retryableTransport;
  constructor(code, message, options) {
    super(message, options?.cause !== void 0 ? { cause: options.cause } : void 0);
    this.name = "ClientChannelError";
    this.code = code;
    this.status = options?.status;
    this.method = options?.method;
    this.retryableTransport = options?.retryableTransport === true;
  }
};
var REQUEST_TIMEOUT_MS = 8500;
var PROBE_TIMEOUT_MS = 600;
function resolveClientChannelDir(dataDir) {
  const override = process.env.CODEXHOST_SIDE_CHAT_CHANNEL_DIR?.trim();
  if (override) return path.resolve(override);
  return path.resolve(dataDir, "..", "..", "client-hosts");
}
function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = error?.code;
    return code === "EPERM";
  }
}
function parseDescriptor(raw, filePath) {
  if (!isPlainRecord(raw)) return void 0;
  const version = raw.version;
  const pid = raw.pid;
  const port = raw.port;
  const token = raw.token;
  const startedAt = raw.startedAt;
  const epoch = raw.epoch;
  if (version !== 1 || typeof pid !== "number" || !Number.isInteger(pid) || pid <= 0 || typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535 || typeof token !== "string" || token.length === 0 || typeof startedAt !== "number" || !Number.isFinite(startedAt) || typeof epoch !== "string" || epoch.trim().length === 0) {
    return void 0;
  }
  return {
    version: 1,
    pid,
    port,
    token,
    startedAt,
    epoch: epoch.trim(),
    ...typeof raw.owner === "string" ? { owner: raw.owner } : {},
    filePath
  };
}
function probeTcpLoopback(port, timeoutMs = PROBE_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}
var LocalClientChannelClient = class {
  dataDir;
  explicitChannelDir;
  cached = null;
  cachedDir = null;
  disposed = false;
  constructor(dataDir, channelDirOverride) {
    this.dataDir = dataDir;
    this.explicitChannelDir = channelDirOverride ? path.resolve(channelDirOverride) : void 0;
  }
  get channelDir() {
    return this.explicitChannelDir ?? resolveClientChannelDir(this.dataDir);
  }
  dispose() {
    this.disposed = true;
    this.cached = null;
    this.cachedDir = null;
  }
  invalidateCache() {
    this.cached = null;
    this.cachedDir = null;
  }
  async discoverDescriptors() {
    const dir = this.channelDir;
    let entries;
    try {
      entries = await readdir(dir);
    } catch {
      return [];
    }
    const candidates = [];
    for (const name of entries) {
      if (!/^host-.*\.json$/iu.test(name)) continue;
      const fullPath = path.join(dir, name);
      try {
        const text = await readFile(fullPath, "utf8");
        const parsed = parseDescriptor(JSON.parse(text), fullPath);
        if (parsed && isProcessAlive(parsed.pid)) {
          candidates.push(parsed);
        }
      } catch {
      }
    }
    candidates.sort((a, b) => {
      const timeDiff = b.startedAt - a.startedAt;
      if (timeDiff !== 0) return timeDiff;
      const ownerA = a.owner === "service" ? 1 : 0;
      const ownerB = b.owner === "service" ? 1 : 0;
      if (ownerB !== ownerA) return ownerB - ownerA;
      return b.pid - a.pid;
    });
    return candidates;
  }
  async getActiveDescriptor(forceRescan = false) {
    const dir = this.channelDir;
    if (this.cachedDir !== dir) {
      this.cached = null;
      this.cachedDir = dir;
    }
    if (!forceRescan && this.cached && isProcessAlive(this.cached.pid)) {
      return this.cached;
    }
    this.cached = null;
    const descriptors = await this.discoverDescriptors();
    for (const candidate of descriptors) {
      if (await probeTcpLoopback(candidate.port)) {
        this.cached = candidate;
        this.cachedDir = dir;
        return candidate;
      }
    }
    if (descriptors.length > 0) {
      this.cached = descriptors[0];
      this.cachedDir = dir;
      return this.cached;
    }
    throw new ClientChannelError(
      "side-chat/channel-offline",
      `No active CodexHost client channel found in ${dir}.`,
      { retryableTransport: true }
    );
  }
  async probeStatus() {
    try {
      const descriptors = await this.discoverDescriptors();
      if (descriptors.length === 0) {
        this.cached = null;
        return {
          connected: false,
          channelDir: this.channelDir,
          pid: null,
          port: null,
          epoch: null,
          error: "No active CodexHost client channel descriptor found."
        };
      }
      for (const candidate of descriptors) {
        const reachable = await probeTcpLoopback(candidate.port);
        if (reachable) {
          this.cached = candidate;
          return {
            connected: true,
            channelDir: this.channelDir,
            pid: candidate.pid,
            port: candidate.port,
            epoch: candidate.epoch,
            error: null
          };
        }
      }
      this.cached = null;
      return {
        connected: false,
        channelDir: this.channelDir,
        pid: descriptors[0]?.pid ?? null,
        port: descriptors[0]?.port ?? null,
        epoch: descriptors[0]?.epoch ?? null,
        error: "Discovered CodexHost client channel port is not accepting connections."
      };
    } catch (error) {
      this.cached = null;
      return {
        connected: false,
        channelDir: this.channelDir,
        pid: null,
        port: null,
        epoch: null,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  async postJsonOnce(descriptor, endpointPath, payload, methodLabel) {
    if (this.disposed) {
      throw new ClientChannelError("side-chat/disposed", "Backend is shutting down.");
    }
    const bodyText = JSON.stringify(payload);
    const bodyBytes = Buffer.byteLength(bodyText, "utf8");
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port: descriptor.port,
          path: endpointPath,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(bodyBytes),
            authorization: `Bearer ${descriptor.token}`
            // Explicitly omit any Origin header (client-channel-server rejects requests with Origin).
          },
          timeout: REQUEST_TIMEOUT_MS
        },
        (res) => {
          const chunks = [];
          res.on("data", (chunk) => {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          });
          res.on("end", () => {
            resolve({
              status: res.statusCode ?? 0,
              rawText: Buffer.concat(chunks).toString("utf8")
            });
          });
          res.on("error", (err) => reject(err));
        }
      );
      req.on("timeout", () => {
        req.destroy(new Error(`Client channel request timed out (${methodLabel})`));
      });
      req.on("error", (err) => reject(err));
      req.end(bodyText);
    }).catch((cause) => {
      const errCode = cause?.code;
      const isConnectRefused = errCode === "ECONNREFUSED" || errCode === "ECONNRESET" || errCode === "EHOSTUNREACH" || errCode === "EPIPE";
      const isTimeout = cause instanceof Error && /timed out/iu.test(cause.message);
      throw new ClientChannelError(
        isTimeout ? -32090 : "side-chat/channel-offline",
        cause instanceof Error ? cause.message : String(cause),
        {
          method: methodLabel,
          // Never mark unknown timeout on mutating calls as blindly retryable; only connection-level
          // failures before/at handshake trigger descriptor rescan when safe.
          retryableTransport: isConnectRefused,
          cause
        }
      );
    });
    let parsed;
    try {
      parsed = response.rawText.trim().length > 0 ? JSON.parse(response.rawText) : {};
    } catch (cause) {
      throw new ClientChannelError(
        response.status || -32603,
        `Client channel returned invalid JSON (HTTP ${response.status})`,
        { status: response.status, method: methodLabel, cause }
      );
    }
    if (response.status === 401) {
      throw new ClientChannelError(-32001, "Unauthorized client channel token", {
        status: 401,
        method: methodLabel,
        retryableTransport: true
      });
    }
    if (isPlainRecord(parsed) && isPlainRecord(parsed.error)) {
      const code = typeof parsed.error.code === "number" || typeof parsed.error.code === "string" ? parsed.error.code : response.status || -32603;
      const message = typeof parsed.error.message === "string" ? parsed.error.message : `Client channel error (${String(code)})`;
      throw new ClientChannelError(code, message, {
        status: response.status,
        method: methodLabel
      });
    }
    if (response.status < 200 || response.status >= 300) {
      throw new ClientChannelError(
        response.status || -32603,
        `Client channel HTTP ${response.status}`,
        { status: response.status, method: methodLabel }
      );
    }
    return parsed;
  }
  async postJsonWithRescan(endpointPath, payload, methodLabel, allowRescanRetry = true) {
    const first = await this.getActiveDescriptor(false);
    try {
      return await this.postJsonOnce(first, endpointPath, payload, methodLabel);
    } catch (error) {
      if (allowRescanRetry && error instanceof ClientChannelError && error.retryableTransport) {
        this.cached = null;
        const refreshed = await this.getActiveDescriptor(true);
        return this.postJsonOnce(refreshed, endpointPath, payload, methodLabel);
      }
      throw error;
    }
  }
  async rpc(method, params = {}, options) {
    const envelope = await this.postJsonWithRescan(
      "/v1/rpc",
      { method, params },
      method,
      options?.allowRescanRetry ?? true
    );
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result;
    }
    return envelope;
  }
  async snapshot(threadId, options) {
    const body = { threadId };
    if (options?.truncateToolOutput !== void 0) {
      body.truncateToolOutput = options.truncateToolOutput;
    }
    if (options?.knownTurns !== void 0) {
      body.knownTurns = options.knownTurns;
    }
    const envelope = await this.postJsonWithRescan("/v1/snapshot", body, "snapshot", true);
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result;
    }
    return envelope;
  }
  async respond(payload) {
    const envelope = await this.postJsonWithRescan(
      "/v1/respond",
      payload,
      "respond",
      true
    );
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result;
    }
    return envelope;
  }
};

// src/v2-backend/normalize.ts
function normalizeFileChangeKind(value) {
  const kindType = typeof value === "string" ? value : isPlainRecord(value) ? value.type : void 0;
  if (kindType === "add" || kindType === "create") return "add";
  if (kindType === "delete") return "delete";
  return "update";
}
function normalizeFileChanges(value) {
  if (!Array.isArray(value)) return [];
  const changes = [];
  for (const entry of value) {
    if (!isPlainRecord(entry)) continue;
    changes.push({
      path: typeof entry.path === "string" ? entry.path : "",
      kind: normalizeFileChangeKind(entry.kind),
      unifiedDiff: typeof entry.diff === "string" ? entry.diff : typeof entry.unifiedDiff === "string" ? entry.unifiedDiff : ""
    });
  }
  return changes;
}
function extractMcpResultText(item) {
  if (isPlainRecord(item.error) && typeof item.error.message === "string") {
    return item.error.message;
  }
  if (!isPlainRecord(item.result) || !Array.isArray(item.result.content)) return "";
  return item.result.content.map(
    (block) => isPlainRecord(block) && block.type === "text" && typeof block.text === "string" ? block.text : JSON.stringify(block)
  ).join("\n");
}
function extractDynamicToolOutput(item) {
  const source = item.result ?? item.contentItems;
  if (Array.isArray(source)) {
    return source.map(
      (entry) => isPlainRecord(entry) && entry.type === "text" && typeof entry.text === "string" ? entry.text : JSON.stringify(entry)
    ).join("\n");
  }
  if (typeof source === "string") return source;
  if (source !== void 0) return JSON.stringify(source);
  return "";
}
function extractUserMessageText(item) {
  if (Array.isArray(item.content)) {
    return item.content.map((part) => {
      if (typeof part === "string") return part;
      if (isPlainRecord(part) && part.type === "text" && typeof part.text === "string") {
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
        rawText,
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
        ...isPlainRecord(item.error) && typeof item.error.message === "string" ? { errorMessage: item.error.message } : {},
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
        ...isPlainRecord(item.error) && typeof item.error.message === "string" ? { errorMessage: item.error.message } : {}
      };
    default:
      return void 0;
  }
}
function normalizeV2Turn(turn) {
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
function normalizeV2Snapshot(snapshot) {
  const rawTurns = Array.isArray(snapshot.turnsPage?.data) ? snapshot.turnsPage.data : [];
  const chronologicalTurns = [...rawTurns].reverse().map(normalizeV2Turn);
  let fallbackActiveTurnId = null;
  for (let i = chronologicalTurns.length - 1; i >= 0; i -= 1) {
    if (chronologicalTurns[i]?.isActive) {
      fallbackActiveTurnId = chronologicalTurns[i].id;
      break;
    }
  }
  const activeTurnId = snapshot.activeTurnId ?? fallbackActiveTurnId;
  const statusType = snapshot.thread?.status?.type ?? "idle";
  const isRunning = activeTurnId !== null || statusType === "active";
  const rawNativeError = snapshot.thread?.nativeInteractionError ?? snapshot.thread?.nativeSendError ?? null;
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
    hasOlderTurns: (snapshot.turnsPage?.nextCursor ?? null) !== null,
    nextTurnsCursor: snapshot.turnsPage?.nextCursor ?? null,
    interactions: Array.isArray(snapshot.interactions) ? snapshot.interactions : [],
    nativeError: typeof rawNativeError === "string" ? rawNativeError : null,
    attachedToThreadId: typeof snapshot.thread.attachedToThreadId === "string" && snapshot.thread.attachedToThreadId.trim().length > 0 ? snapshot.thread.attachedToThreadId.trim() : null,
    ephemeral: typeof snapshot.thread.ephemeral === "boolean" ? snapshot.thread.ephemeral : null
  };
}

// src/v2-backend/store.ts
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
var V2_SIDE_CHATS_FILENAME = "side-chats.json";
var FILE_MODE = 384;
var DIR_MODE = 448;
var MAX_ID_LENGTH = 512;
var MAX_TITLE_LENGTH = 200;
function sanitizeId(value, field) {
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
function sanitizeTitle(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const chars = Array.from(trimmed);
  return chars.length > MAX_TITLE_LENGTH ? chars.slice(0, MAX_TITLE_LENGTH).join("") : trimmed;
}
function sanitizeTimestamp(value, fallback) {
  if (typeof value === "string" && value.trim().length > 0 && !Number.isNaN(Date.parse(value))) {
    return new Date(value).toISOString();
  }
  return fallback;
}
function isValidRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value;
  return typeof candidate.threadId === "string" && candidate.threadId.trim().length > 0 && typeof candidate.sourceThreadId === "string" && candidate.sourceThreadId.trim().length > 0 && (candidate.mode === "persistent" || candidate.mode === "ephemeral") && typeof candidate.title === "string" && typeof candidate.boundaryConsumed === "boolean" && typeof candidate.createdAt === "string" && !Number.isNaN(Date.parse(candidate.createdAt)) && typeof candidate.updatedAt === "string" && !Number.isNaN(Date.parse(candidate.updatedAt));
}
function compareDesc(a, b) {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}
function atomicWriteJson(filePath, payload) {
  mkdirSync(dirname(filePath), { recursive: true, mode: DIR_MODE });
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
var V2SideChatStore = class {
  filePath;
  records = [];
  signature;
  constructor(dataDir) {
    this.filePath = join(dataDir, V2_SIDE_CHATS_FILENAME);
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
        if (!isValidRecord(entry)) continue;
        deduped.set(entry.threadId.trim(), {
          threadId: entry.threadId.trim(),
          sourceThreadId: entry.sourceThreadId.trim(),
          mode: entry.mode,
          title: sanitizeTitle(entry.title),
          boundaryConsumed: entry.boundaryConsumed,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        });
      }
      this.records = [...deduped.values()].sort(compareDesc);
    } catch {
      this.records = [];
    }
  }
  save(next) {
    const sorted = [...next].sort(compareDesc);
    atomicWriteJson(this.filePath, { version: 1, threads: sorted });
    this.records = sorted;
    this.signature = this.fileSignature();
  }
  count() {
    this.sync();
    return this.records.length;
  }
  list(sourceThreadId) {
    this.sync();
    const filter = sourceThreadId?.trim();
    const items = filter ? this.records.filter((record) => record.sourceThreadId === filter) : this.records;
    return items.map((record) => ({ ...record }));
  }
  get(threadId) {
    this.sync();
    const trimmed = threadId.trim();
    const found = this.records.find((record) => record.threadId === trimmed);
    return found ? { ...found } : void 0;
  }
  upsert(input) {
    this.sync();
    const threadId = sanitizeId(input.threadId, "threadId");
    const sourceThreadId = sanitizeId(input.sourceThreadId, "sourceThreadId");
    const mode = input.mode === "ephemeral" ? "ephemeral" : "persistent";
    const existing = this.records.find((record2) => record2.threadId === threadId);
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const record = {
      threadId,
      sourceThreadId,
      mode,
      title: input.title !== void 0 ? sanitizeTitle(input.title) : existing?.title ?? "",
      boundaryConsumed: input.boundaryConsumed !== void 0 ? Boolean(input.boundaryConsumed) : existing?.boundaryConsumed ?? false,
      createdAt: existing ? existing.createdAt : sanitizeTimestamp(input.createdAt, now),
      updatedAt: sanitizeTimestamp(input.updatedAt, now)
    };
    const next = existing ? this.records.map((entry) => entry.threadId === threadId ? record : entry) : [...this.records, record];
    this.save(next);
    return { ...record };
  }
  update(threadIdInput, patch) {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) return void 0;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = {
      ...existing,
      sourceThreadId: patch.sourceThreadId !== void 0 ? sanitizeId(patch.sourceThreadId, "sourceThreadId") : existing.sourceThreadId,
      mode: patch.mode ?? existing.mode,
      title: patch.title !== void 0 ? sanitizeTitle(patch.title) : existing.title,
      boundaryConsumed: patch.boundaryConsumed !== void 0 ? Boolean(patch.boundaryConsumed) : existing.boundaryConsumed,
      updatedAt: sanitizeTimestamp(patch.updatedAt, now)
    };
    this.save(this.records.map((entry) => entry.threadId === threadId ? updated : entry));
    return { ...updated };
  }
  remove(threadIdInput, sourceThreadId) {
    this.sync();
    const threadId = sanitizeId(threadIdInput, "threadId");
    const filter = sourceThreadId?.trim();
    const existing = this.records.find((record) => record.threadId === threadId);
    if (!existing) return false;
    if (filter && existing.sourceThreadId !== filter) return false;
    this.save(this.records.filter((record) => record.threadId !== threadId));
    return true;
  }
};

// src/v2-backend/service.ts
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
function maxIsoTimestamp(a, b) {
  return Date.parse(b) > Date.parse(a) ? b : a;
}
function compareSummaryDesc(a, b) {
  const updatedDiff = Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
  if (updatedDiff !== 0) return updatedDiff;
  const createdDiff = Date.parse(b.createdAt) - Date.parse(a.createdAt);
  if (createdDiff !== 0) return createdDiff;
  return a.threadId.localeCompare(b.threadId);
}
function extractErrorDetails(error) {
  if (error instanceof ClientChannelError) {
    return { code: error.code, message: error.message };
  }
  if (isPlainRecord(error)) {
    const code = typeof error.code === "number" || typeof error.code === "string" ? error.code : "side-chat/error";
    const message = typeof error.message === "string" && error.message.trim().length > 0 ? error.message : "Side Chat operation failed.";
    return { code, message };
  }
  if (error instanceof Error) {
    return { code: "side-chat/error", message: error.message };
  }
  return { code: "side-chat/error", message: String(error ?? "Side Chat operation failed.") };
}
function mapRawMainThread(raw) {
  if (!isPlainRecord(raw)) return void 0;
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!id) return void 0;
  if (typeof raw.attachedToThreadId === "string" && raw.attachedToThreadId.trim().length > 0) {
    return void 0;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const createdAt = toIsoTimestamp(raw.createdAt, now);
  const updatedAt = toIsoTimestamp(raw.updatedAt, createdAt);
  const preview = stripSideChatBoundary(typeof raw.preview === "string" ? raw.preview : "");
  const cleanName = typeof raw.name === "string" ? stripSideChatBoundary(raw.name).trim() : "";
  const title = cleanName || deriveSideChatTitle(preview) || id;
  const statusObj = isPlainRecord(raw.status) ? raw.status : void 0;
  const statusType = typeof statusObj?.type === "string" ? statusObj.type : "idle";
  return {
    threadId: id,
    title,
    preview,
    cwd: typeof raw.cwd === "string" ? raw.cwd : "",
    modelProvider: typeof raw.modelProvider === "string" ? raw.modelProvider : "",
    statusType,
    updatedAt,
    createdAt
  };
}
function mergeThreadsForSource(sourceThreadId, localRecords, attachedRows) {
  const nowIso = (/* @__PURE__ */ new Date()).toISOString();
  const localMap = new Map(localRecords.map((record) => [record.threadId, record]));
  const seen = /* @__PURE__ */ new Set();
  const results = [];
  for (const row of attachedRows) {
    if (!row || typeof row.id !== "string" || !row.id.trim()) continue;
    const threadId = row.id.trim();
    seen.add(threadId);
    const local = localMap.get(threadId);
    const cleanPreview = stripSideChatBoundary(typeof row.preview === "string" ? row.preview : "");
    const cleanName = typeof row.name === "string" ? stripSideChatBoundary(row.name).trim() : "";
    const hasHistory = cleanPreview.length > 0 || Array.isArray(row.turns) && row.turns.length > 0;
    const hostCreated = toIsoTimestamp(row.createdAt, local?.createdAt ?? nowIso);
    const hostUpdated = toIsoTimestamp(row.updatedAt, local?.updatedAt ?? hostCreated);
    const statusType = row.status && typeof row.status.type === "string" ? row.status.type : "idle";
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
        statusType
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
        statusType
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
      statusType: "idle"
    });
  }
  return results.sort(compareSummaryDesc);
}
function asDistinctForkId(result, sourceThreadId) {
  const id = result?.thread?.id;
  if (typeof id !== "string" || !id.trim() || id.trim() === sourceThreadId) {
    throw new ClientChannelError(
      "side-chat/fork-unconfirmed",
      "CodexHost did not confirm a distinct Side Chat thread ID."
    );
  }
  return id.trim();
}
var SideChatV2BackendService = class {
  store;
  channel;
  extensionId;
  constructor(options) {
    this.extensionId = options.extensionId;
    this.store = new V2SideChatStore(options.dataDir);
    this.channel = new LocalClientChannelClient(options.dataDir, options.channelDir);
  }
  dispose() {
    this.channel.dispose();
  }
  ping() {
    return okReply({
      extensionId: this.extensionId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  async status() {
    const probe = await this.channel.probeStatus();
    return okReply({
      connected: probe.connected,
      channelDir: probe.channelDir,
      pid: probe.pid,
      port: probe.port,
      epoch: probe.epoch,
      storedCount: this.store.count(),
      error: probe.error
    });
  }
  async fetchMainThreadsRaw() {
    const knownSideChatIds = new Set(this.store.list().map((record) => record.threadId));
    let rawRows = [];
    try {
      const catalog = await this.channel.rpc("codexhost/thread/catalog/read", {
        includeArchived: false
      });
      if (isPlainRecord(catalog) && Array.isArray(catalog.threads)) {
        rawRows = catalog.threads;
      } else if (isPlainRecord(catalog) && Array.isArray(catalog.data)) {
        rawRows = catalog.data;
      }
    } catch (error) {
      if (error instanceof ClientChannelError && error.code === "side-chat/channel-offline") {
        throw error;
      }
      const listed = await this.channel.rpc("thread/list", {
        archived: false,
        sortKey: "updated_at",
        sortDirection: "desc",
        limit: 100
      });
      if (isPlainRecord(listed) && Array.isArray(listed.data)) {
        rawRows = listed.data;
      } else if (isPlainRecord(listed) && Array.isArray(listed.threads)) {
        rawRows = listed.threads;
      }
    }
    const deduped = /* @__PURE__ */ new Map();
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
  async listMainThreads() {
    try {
      const threads = await this.fetchMainThreadsRaw();
      return okReply({ threads, channelConnected: true });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message, { threads: [], channelConnected: false });
    }
  }
  async listAttachedForSource(sourceThreadId) {
    try {
      const res = await this.channel.rpc("thread/list", {
        attachedToThreadId: sourceThreadId,
        sortKey: "updated_at",
        sortDirection: "desc",
        limit: 100
      });
      const rows = isPlainRecord(res) && Array.isArray(res.data) ? res.data : [];
      return { rows, connected: true };
    } catch {
      return { rows: [], connected: false };
    }
  }
  async listSideChats(rawParams) {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const sourceThreadId = typeof params.sourceThreadId === "string" && params.sourceThreadId.trim().length > 0 ? params.sourceThreadId.trim() : void 0;
    const modeFilter = params.mode === "persistent" || params.mode === "ephemeral" ? params.mode : void 0;
    if (sourceThreadId) {
      const local = this.store.list(sourceThreadId);
      const { rows, connected } = await this.listAttachedForSource(sourceThreadId);
      let merged = mergeThreadsForSource(sourceThreadId, local, rows);
      if (modeFilter) {
        merged = merged.filter((item) => item.mode === modeFilter);
      }
      return okReply({ threads: merged, channelConnected: connected });
    }
    const allLocal = this.store.list();
    const sourceIds = new Set(allLocal.map((record) => record.sourceThreadId));
    let channelConnected = false;
    try {
      const mainThreads = await this.fetchMainThreadsRaw();
      channelConnected = true;
      for (const main of mainThreads.slice(0, 12)) {
        sourceIds.add(main.threadId);
      }
    } catch {
      channelConnected = false;
    }
    const bySourceLocal = /* @__PURE__ */ new Map();
    for (const record of allLocal) {
      const bucket = bySourceLocal.get(record.sourceThreadId) ?? [];
      bucket.push(record);
      bySourceLocal.set(record.sourceThreadId, bucket);
    }
    const sourceList = [...sourceIds];
    const attachedEntries = await Promise.all(
      sourceList.map(async (sid) => {
        const res = await this.listAttachedForSource(sid);
        if (res.connected) channelConnected = true;
        return [sid, res.rows];
      })
    );
    const combinedMap = /* @__PURE__ */ new Map();
    for (const [sid, rows] of attachedEntries) {
      const merged = mergeThreadsForSource(sid, bySourceLocal.get(sid) ?? [], rows);
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
  async createSideChat(rawParams) {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const sourceThreadId = typeof params.sourceThreadId === "string" ? params.sourceThreadId.trim() : "";
    if (!sourceThreadId) {
      return errorReply(
        "side-chat/draft-source",
        "The main conversation is still a draft and has no threadId."
      );
    }
    const requestedTitle = typeof params.title === "string" ? params.title.trim() : "";
    const question = typeof params.question === "string" ? params.question.trim() : "";
    let createdThreadId;
    let mode;
    try {
      try {
        const persistentRes = await this.channel.rpc("thread/fork", {
          threadId: sourceThreadId,
          attachToSource: true,
          excludeTurns: true
        });
        createdThreadId = asDistinctForkId(persistentRes, sourceThreadId);
        mode = "persistent";
      } catch (firstError) {
        if (!isAttachToSourceUnsupportedError(firstError)) {
          throw firstError;
        }
        const ephemeralRes = await this.channel.rpc("thread/fork", {
          threadId: sourceThreadId,
          ephemeral: true,
          excludeTurns: true
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
      boundaryConsumed: false
    });
    if (question.length > 0) {
      const wireText = injectSideChatBoundary(question);
      const clientUserMessageId = createClientUserMessageId();
      try {
        await this.channel.rpc(
          "turn/start",
          {
            threadId: createdThreadId,
            input: [{ type: "text", text: wireText }],
            clientUserMessageId
          },
          { allowRescanRetry: false }
        );
        saved = this.store.update(createdThreadId, {
          boundaryConsumed: true,
          title: saved.title || deriveSideChatTitle(question)
        }) ?? saved;
      } catch (error) {
        const { code, message } = extractErrorDetails(error);
        const partialSummary = {
          threadId: saved.threadId,
          sourceThreadId: saved.sourceThreadId,
          mode: saved.mode,
          title: saved.title,
          preview: "",
          boundaryConsumed: saved.boundaryConsumed,
          source: "plugin",
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
          statusType: "idle"
        };
        return errorReply(code, message, { thread: partialSummary, mode });
      }
    }
    const summary = {
      threadId: saved.threadId,
      sourceThreadId: saved.sourceThreadId,
      mode: saved.mode,
      title: stripSideChatBoundary(saved.title),
      preview: question ? deriveSideChatTitle(question, 120) : "",
      boundaryConsumed: saved.boundaryConsumed,
      source: "plugin",
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      statusType: question ? "active" : "idle"
    };
    return okReply({ thread: summary, mode });
  }
  async readSnapshot(rawParams) {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }
    const truncateToolOutput = typeof params.truncateToolOutput === "boolean" ? params.truncateToolOutput : true;
    try {
      const rawSnapshot = await this.channel.snapshot(threadId, {
        truncateToolOutput
      });
      const normalized = normalizeV2Snapshot(rawSnapshot);
      const hasTurns = normalized.turns.length > 0;
      const firstUserText = normalized.turns.flatMap((turn) => turn.items).find((item) => item.kind === "userMessage")?.text;
      const derivedTitle = normalized.title || deriveSideChatTitle(firstUserText ?? normalized.preview ?? "");
      let local = this.store.get(threadId);
      if (local) {
        const patchTitle = !local.title && derivedTitle ? derivedTitle : void 0;
        const patchBoundary = !local.boundaryConsumed && hasTurns ? true : void 0;
        if (patchTitle !== void 0 || patchBoundary !== void 0) {
          local = this.store.update(threadId, {
            ...patchTitle !== void 0 ? { title: patchTitle } : {},
            ...patchBoundary !== void 0 ? { boundaryConsumed: patchBoundary } : {}
          }) ?? local;
        }
      }
      const resolvedMode = local?.mode ?? (normalized.ephemeral === true ? "ephemeral" : "persistent");
      return okReply({
        snapshot: normalized,
        mode: resolvedMode,
        thread: local ?? {
          threadId,
          sourceThreadId: normalized.attachedToThreadId ?? "",
          mode: resolvedMode,
          title: derivedTitle,
          boundaryConsumed: hasTurns,
          createdAt: toIsoTimestamp(rawSnapshot.thread?.createdAt, (/* @__PURE__ */ new Date()).toISOString()),
          updatedAt: toIsoTimestamp(rawSnapshot.thread?.updatedAt, (/* @__PURE__ */ new Date()).toISOString())
        }
      });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }
  }
  async startTurn(rawParams) {
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
    let discoveredMode = local?.mode ?? "persistent";
    if (!boundaryConsumed && !local) {
      try {
        const rawSnapshot = await this.channel.snapshot(threadId, {
          truncateToolOutput: true
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
      }
    }
    const shouldInjectBoundary = !boundaryConsumed;
    const wireText = shouldInjectBoundary ? injectSideChatBoundary(text) : text;
    const clientUserMessageId = createClientUserMessageId();
    try {
      const res = await this.channel.rpc(
        "turn/start",
        {
          threadId,
          input: [{ type: "text", text: wireText }],
          clientUserMessageId
        },
        { allowRescanRetry: false }
      );
      const derivedTitle = deriveSideChatTitle(text);
      if (local) {
        local = this.store.update(threadId, {
          boundaryConsumed: true,
          ...!local.title && derivedTitle ? { title: derivedTitle } : {}
        }) ?? local;
      } else if (discoveredSourceThreadId) {
        local = this.store.upsert({
          threadId,
          sourceThreadId: discoveredSourceThreadId,
          mode: discoveredMode,
          title: derivedTitle,
          boundaryConsumed: true
        });
      }
      return okReply({
        threadId,
        turnId: typeof res?.turn?.id === "string" ? res.turn.id : null,
        boundaryInjected: shouldInjectBoundary,
        thread: local ?? null
      });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }
  }
  async interruptTurn(rawParams) {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }
    let turnId = typeof params.turnId === "string" && params.turnId.trim().length > 0 ? params.turnId.trim() : null;
    if (!turnId) {
      try {
        const rawSnapshot = await this.channel.snapshot(threadId, {
          truncateToolOutput: true
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
  async respondInteraction(rawParams) {
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
    let pending = isPlainRecord(params.interaction) && "kind" in params.interaction && "interaction" in params.interaction && "request" in params.interaction ? params.interaction : void 0;
    if (!pending || !epoch) {
      try {
        const rawSnapshot = await this.channel.snapshot(threadId, {
          truncateToolOutput: true
        });
        if (!epoch) {
          epoch = rawSnapshot.cursor?.epoch ?? "";
        }
        if (!pending && Array.isArray(rawSnapshot.interactions)) {
          pending = rawSnapshot.interactions.find(
            (item) => String(item.requestId) === String(requestId)
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
      const answer = params.answer === void 0 || params.answer === null ? null : params.answer;
      const respondPayload = buildRespondRequest(epoch, pending, answer);
      const res = await this.channel.respond(respondPayload);
      return okReply({
        threadId,
        requestId,
        resolved: Boolean(res?.resolved ?? true)
      });
    } catch (error) {
      const { code, message } = extractErrorDetails(error);
      return errorReply(code, message);
    }
  }
  async renameSideChat(rawParams) {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    const rawTitle = typeof params.title === "string" ? params.title : "";
    const sourceThreadId = typeof params.sourceThreadId === "string" ? params.sourceThreadId.trim() : "";
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
        boundaryConsumed: false
      });
    }
    const mode = updated?.mode ?? "persistent";
    if (mode === "persistent") {
      await this.channel.rpc("thread/name/set", { threadId, name: cleanTitle }).catch(() => void 0);
    }
    return okReply({
      thread: updated ?? {
        threadId,
        sourceThreadId,
        mode,
        title: cleanTitle
      }
    });
  }
  async archiveSideChat(rawParams) {
    const params = isPlainRecord(rawParams) ? rawParams : {};
    const threadId = typeof params.threadId === "string" ? params.threadId.trim() : "";
    const sourceThreadId = typeof params.sourceThreadId === "string" && params.sourceThreadId.trim().length > 0 ? params.sourceThreadId.trim() : void 0;
    if (!threadId) {
      return errorReply("side-chat/invalid", "threadId is required.");
    }
    const existing = this.store.get(threadId);
    const mode = existing?.mode ?? "persistent";
    if (mode === "persistent") {
      try {
        await this.channel.rpc("thread/archive", { threadId });
      } catch (error) {
        const ignorableMissing = error instanceof ClientChannelError && (error.code === -32079 || error.code === -32600 || error.status === 404);
        if (!ignorableMissing) {
          const { code, message } = extractErrorDetails(error);
          return errorReply(code, message);
        }
      }
    }
    const removed = this.store.remove(threadId, sourceThreadId);
    return okReply({
      threadId,
      mode,
      archived: true,
      removed
    });
  }
};

// src/v2-backend/index.ts
async function activate(ctx) {
  const service = new SideChatV2BackendService({
    extensionId: ctx.extensionId,
    dataDir: ctx.dataDir
  });
  ctx.handle("ping", () => service.ping());
  ctx.handle("status", () => service.status());
  ctx.handle("listMainThreads", () => service.listMainThreads());
  ctx.handle("listSideChats", (params) => service.listSideChats(params));
  ctx.handle("createSideChat", (params) => service.createSideChat(params));
  ctx.handle("readSnapshot", (params) => service.readSnapshot(params));
  ctx.handle("startTurn", (params) => service.startTurn(params));
  ctx.handle("interruptTurn", (params) => service.interruptTurn(params));
  ctx.handle("respondInteraction", (params) => service.respondInteraction(params));
  ctx.handle("renameSideChat", (params) => service.renameSideChat(params));
  ctx.handle("archiveSideChat", (params) => service.archiveSideChat(params));
  return () => {
    service.dispose();
  };
}
var index_default = { activate };
export {
  activate,
  index_default as default
};
