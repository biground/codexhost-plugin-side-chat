/**
 * Local CodexHost Client Channel HTTP client for the v2 Host extension backend.
 *
 * Discovers active `host-*.json` descriptors under `CODEXHOST_SIDE_CHAT_CHANNEL_DIR`
 * or `<dataDir>/../../client-hosts` (with safe fallbacks for `CODEXHOST_DATA_DIR`,
 * `CODEXHOST_SHARED_DATA_DIR`, and symlinked `.codexhost` roots), prioritizes `owner: "service"`,
 * verifies endpoint liveness + Bearer token / epoch before caching, and enforces per-request
 * timeouts strictly below `ExtensionBackendProcess`'s 10,000 ms IPC kill budget.
 */
import { readdir, readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { createConnection } from "node:net";
import { homedir } from "node:os";
import path from "node:path";

import { isPlainRecord } from "./json.ts";

export interface LocalClientChannelDescriptor {
  readonly version: 1;
  readonly pid: number;
  readonly port: number;
  readonly token: string;
  readonly startedAt: number;
  readonly epoch: string;
  readonly owner?: string;
  readonly filePath: string;
}

export interface ChannelProbeStatus {
  readonly connected: boolean;
  readonly channelDir: string;
  readonly pid: number | null;
  readonly port: number | null;
  readonly epoch: string | null;
  readonly error: string | null;
}

export class ClientChannelError extends Error {
  readonly code: number | string;
  readonly status?: number;
  readonly method?: string;
  readonly retryableTransport: boolean;

  constructor(
    code: number | string,
    message: string,
    options?: {
      readonly status?: number;
      readonly method?: string;
      readonly retryableTransport?: boolean;
      readonly cause?: unknown;
    },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "ClientChannelError";
    this.code = code;
    this.status = options?.status;
    this.method = options?.method;
    this.retryableTransport = options?.retryableTransport === true;
  }
}

// Keep single-request budget well under ExtensionBackendProcess's 10_000 ms hard-kill timer.
const DEFAULT_REQUEST_TIMEOUT_MS = 4_500;
const PROBE_TIMEOUT_MS = 600;

export function resolveClientChannelDir(dataDir: string): string {
  const override = process.env.CODEXHOST_SIDE_CHAT_CHANNEL_DIR?.trim();
  if (override) return path.resolve(override);
  return path.resolve(dataDir, "..", "..", "client-hosts");
}

export function resolveClientChannelCandidateDirs(
  dataDir: string,
  explicitOverride?: string,
): string[] {
  if (explicitOverride?.trim()) {
    return [path.resolve(explicitOverride.trim())];
  }
  const envOverride = process.env.CODEXHOST_SIDE_CHAT_CHANNEL_DIR?.trim();
  if (envOverride) {
    return [path.resolve(envOverride)];
  }

  const dirs: string[] = [];
  const pushUnique = (candidate: string | undefined) => {
    if (!candidate?.trim()) return;
    const resolved = path.resolve(candidate.trim());
    if (!dirs.includes(resolved)) dirs.push(resolved);
  };

  const hostDataRoot = path.resolve(dataDir, "..", "..");
  pushUnique(path.join(hostDataRoot, "client-hosts"));

  // Only include `~/.codexhost/client-hosts` as a symlink-safe fallback when `dataDir` itself
  // lives under a `.codexhost` directory, so isolated `--ch-data` / temp test roots stay hermetic.
  if (path.basename(hostDataRoot).toLowerCase() === ".codexhost") {
    try {
      const home = process.env.HOME?.trim() || process.env.USERPROFILE?.trim() || homedir();
      if (home) {
        pushUnique(path.join(home, ".codexhost", "client-hosts"));
      }
    } catch {
      // Ignore homedir resolution errors in restricted environments.
    }
  }

  return dirs;
}

export function isProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    // On Windows/POSIX, EPERM indicates the process exists under another privilege context.
    return code === "EPERM";
  }
}

function parseDescriptor(raw: unknown, filePath: string): LocalClientChannelDescriptor | undefined {
  if (!isPlainRecord(raw)) return undefined;
  const version = raw.version;
  const pid = raw.pid;
  const port = raw.port;
  const token = raw.token;
  const startedAt = raw.startedAt;
  const epoch = raw.epoch;
  if (
    version !== 1 ||
    typeof pid !== "number" ||
    !Number.isInteger(pid) ||
    pid <= 0 ||
    typeof port !== "number" ||
    !Number.isInteger(port) ||
    port < 1 ||
    port > 65535 ||
    typeof token !== "string" ||
    token.length === 0 ||
    typeof startedAt !== "number" ||
    !Number.isFinite(startedAt) ||
    typeof epoch !== "string" ||
    epoch.trim().length === 0
  ) {
    return undefined;
  }
  return {
    version: 1,
    pid,
    port,
    token,
    startedAt,
    epoch: epoch.trim(),
    ...(typeof raw.owner === "string" ? { owner: raw.owner } : {}),
    filePath,
  };
}

function probeTcpLoopback(port: number, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    let settled = false;
    const finish = (ok: boolean) => {
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

/**
 * Probes `/v1/__probe__` via `POST` with `{}` JSON body and the descriptor's Bearer token:
 * - Rejects `401` / `403` (stale descriptor whose PID/port were reused by another process).
 * - Real `client-channel-server.ts` validates `Authorization` first, parses `{}`, and returns
 *   `404` JSON `{ error: { code: -32601, message: "Not found" } }` with zero side effects and
 *   without cold-starting stock Codex.
 */
function probeAuthenticatedDescriptor(
  descriptor: LocalClientChannelDescriptor,
  timeoutMs = PROBE_TIMEOUT_MS,
): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      resolve(ok);
    };

    const probeBody = "{}";
    const req = httpRequest(
      {
        hostname: "127.0.0.1",
        port: descriptor.port,
        path: "/v1/__probe__",
        method: "POST",
        headers: {
          "content-type": "application/json",
          "content-length": String(Buffer.byteLength(probeBody, "utf8")),
          authorization: `Bearer ${descriptor.token}`,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer | string) => {
          chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
        });
        res.on("end", () => {
          if (status === 401 || status === 403 || status === 0) {
            finish(false);
            return;
          }
          const raw = Buffer.concat(chunks).toString("utf8").trim();
          if (status >= 200 && status < 300) {
            finish(true);
            return;
          }
          if (status === 404 && raw.length > 0) {
            try {
              const parsed = JSON.parse(raw) as unknown;
              finish(isPlainRecord(parsed));
              return;
            } catch {
              finish(false);
              return;
            }
          }
          finish(false);
        });
        res.on("error", () => finish(false));
      },
    );

    req.on("timeout", () => {
      req.destroy();
      finish(false);
    });
    req.on("error", () => finish(false));
    req.end(probeBody);
  });
}

function descriptorAttemptKey(descriptor: LocalClientChannelDescriptor): string {
  return `${descriptor.filePath}:${descriptor.token}`;
}

export class LocalClientChannelClient {
  private readonly dataDir: string;
  private readonly explicitChannelDir: string | undefined;
  private cached: LocalClientChannelDescriptor | null = null;
  private cachedPrimaryDir: string | null = null;
  private disposed = false;

  constructor(dataDir: string, channelDirOverride?: string) {
    this.dataDir = dataDir;
    this.explicitChannelDir = channelDirOverride ? path.resolve(channelDirOverride) : undefined;
  }

  get channelDir(): string {
    return this.explicitChannelDir ?? resolveClientChannelDir(this.dataDir);
  }

  dispose(): void {
    this.disposed = true;
    this.cached = null;
    this.cachedPrimaryDir = null;
  }

  invalidateCache(): void {
    this.cached = null;
    this.cachedPrimaryDir = null;
  }

  async discoverDescriptors(): Promise<LocalClientChannelDescriptor[]> {
    const candidateDirs = resolveClientChannelCandidateDirs(this.dataDir, this.explicitChannelDir);
    const seenKeys = new Set<string>();
    const candidates: LocalClientChannelDescriptor[] = [];

    for (const dir of candidateDirs) {
      let entries: string[];
      try {
        entries = await readdir(dir);
      } catch {
        continue;
      }

      for (const name of entries) {
        if (!/^host-.*\.json$/iu.test(name)) continue;
        const fullPath = path.join(dir, name);
        try {
          const text = await readFile(fullPath, "utf8");
          const parsed = parseDescriptor(JSON.parse(text), fullPath);
          if (parsed && isProcessAlive(parsed.pid)) {
            const key = `${parsed.pid}:${parsed.port}:${parsed.epoch}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              candidates.push(parsed);
            }
          }
        } catch {
          // Ignore stale, partially written, or unreadable descriptor files.
        }
      }

      // If the primary directory already yielded alive descriptors, no need to scan fallback dirs.
      if (candidates.length > 0) break;
    }

    // Prioritize independent `service` owner (v0.24+/v0.25+ Shared Host), then newest `startedAt`.
    candidates.sort((a, b) => {
      const ownerA = a.owner === "service" ? 1 : 0;
      const ownerB = b.owner === "service" ? 1 : 0;
      if (ownerB !== ownerA) return ownerB - ownerA;
      const timeDiff = b.startedAt - a.startedAt;
      if (timeDiff !== 0) return timeDiff;
      return b.pid - a.pid;
    });
    return candidates;
  }

  async getActiveDescriptor(
    forceRescan = false,
    excludeAttemptKeys?: ReadonlySet<string>,
  ): Promise<LocalClientChannelDescriptor> {
    const primaryDir = this.channelDir;
    if (this.cachedPrimaryDir !== primaryDir) {
      this.cached = null;
      this.cachedPrimaryDir = primaryDir;
    }
    if (
      !forceRescan &&
      this.cached &&
      !excludeAttemptKeys?.has(descriptorAttemptKey(this.cached)) &&
      isProcessAlive(this.cached.pid)
    ) {
      return this.cached;
    }
    this.cached = null;
    const descriptors = (await this.discoverDescriptors()).filter(
      (item) => !excludeAttemptKeys?.has(descriptorAttemptKey(item)),
    );
    for (const candidate of descriptors) {
      if (await probeAuthenticatedDescriptor(candidate)) {
        this.cached = candidate;
        this.cachedPrimaryDir = primaryDir;
        return candidate;
      }
    }
    for (const candidate of descriptors) {
      if (await probeTcpLoopback(candidate.port)) {
        this.cached = candidate;
        this.cachedPrimaryDir = primaryDir;
        return candidate;
      }
    }
    if (descriptors.length > 0) {
      this.cached = descriptors[0]!;
      this.cachedPrimaryDir = primaryDir;
      return this.cached;
    }
    throw new ClientChannelError(
      "side-chat/channel-offline",
      `No active CodexHost client channel found in ${primaryDir}.`,
      { retryableTransport: true },
    );
  }

  async probeStatus(): Promise<ChannelProbeStatus> {
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
          error: "No active CodexHost client channel descriptor found.",
        };
      }
      for (const candidate of descriptors) {
        const reachable = await probeAuthenticatedDescriptor(candidate);
        if (reachable) {
          this.cached = candidate;
          this.cachedPrimaryDir = this.channelDir;
          return {
            connected: true,
            channelDir: path.dirname(candidate.filePath),
            pid: candidate.pid,
            port: candidate.port,
            epoch: candidate.epoch,
            error: null,
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
        error: "Discovered CodexHost client channel port is not accepting authenticated connections.",
      };
    } catch (error) {
      this.cached = null;
      return {
        connected: false,
        channelDir: this.channelDir,
        pid: null,
        port: null,
        epoch: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private async postJsonOnce<T>(
    descriptor: LocalClientChannelDescriptor,
    endpointPath: string,
    payload: Record<string, unknown>,
    methodLabel: string,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    if (this.disposed) {
      throw new ClientChannelError("side-chat/disposed", "Backend is shutting down.");
    }

    const bodyText = JSON.stringify(payload);
    const bodyBytes = Buffer.byteLength(bodyText, "utf8");

    const response = await new Promise<{ status: number; rawText: string }>((resolve, reject) => {
      const req = httpRequest(
        {
          hostname: "127.0.0.1",
          port: descriptor.port,
          path: endpointPath,
          method: "POST",
          headers: {
            "content-type": "application/json",
            "content-length": String(bodyBytes),
            authorization: `Bearer ${descriptor.token}`,
            // Explicitly omit any Origin header (client-channel-server rejects requests with Origin).
          },
          timeout: timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on("data", (chunk: Buffer | string) => {
            chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
          });
          res.on("end", () => {
            resolve({
              status: res.statusCode ?? 0,
              rawText: Buffer.concat(chunks).toString("utf8"),
            });
          });
          res.on("error", (err) => reject(err));
        },
      );

      req.on("timeout", () => {
        req.destroy(new Error(`Client channel request timed out (${methodLabel})`));
      });
      req.on("error", (err) => reject(err));
      req.end(bodyText);
    }).catch((cause: unknown) => {
      const errCode = (cause as NodeJS.ErrnoException | undefined)?.code;
      const isConnectRefused =
        errCode === "ECONNREFUSED" ||
        errCode === "ECONNRESET" ||
        errCode === "EHOSTUNREACH" ||
        errCode === "EPIPE";
      const isTimeout = cause instanceof Error && /timed out/iu.test(cause.message);
      throw new ClientChannelError(
        isTimeout ? -32090 : "side-chat/channel-offline",
        cause instanceof Error ? cause.message : String(cause),
        {
          method: methodLabel,
          // Never mark unknown timeout on mutating calls as blindly retryable; only connection-level
          // failures before/at handshake trigger descriptor rescan when safe.
          retryableTransport: isConnectRefused,
          cause,
        },
      );
    });

    let parsed: unknown;
    try {
      parsed = response.rawText.trim().length > 0 ? JSON.parse(response.rawText) : {};
    } catch (cause) {
      throw new ClientChannelError(
        response.status || -32603,
        `Client channel returned invalid JSON (HTTP ${response.status})`,
        { status: response.status, method: methodLabel, cause },
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new ClientChannelError(-32001, "Unauthorized client channel token", {
        status: response.status,
        method: methodLabel,
        retryableTransport: true,
      });
    }

    if (isPlainRecord(parsed) && isPlainRecord(parsed.error)) {
      const code =
        typeof parsed.error.code === "number" || typeof parsed.error.code === "string"
          ? parsed.error.code
          : response.status || -32603;
      const message =
        typeof parsed.error.message === "string"
          ? parsed.error.message
          : `Client channel error (${String(code)})`;
      throw new ClientChannelError(code, message, {
        status: response.status,
        method: methodLabel,
      });
    }

    if (response.status < 200 || response.status >= 300) {
      throw new ClientChannelError(
        response.status || -32603,
        `Client channel HTTP ${response.status}`,
        { status: response.status, method: methodLabel },
      );
    }

    return parsed as T;
  }

  private async postJsonWithRescan<T>(
    endpointPath: string,
    payload: Record<string, unknown>,
    methodLabel: string,
    allowRescanRetry = true,
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  ): Promise<T> {
    const failedKeys = new Set<string>();
    const first = await this.getActiveDescriptor(false);
    try {
      return await this.postJsonOnce<T>(first, endpointPath, payload, methodLabel, timeoutMs);
    } catch (error) {
      if (
        allowRescanRetry &&
        error instanceof ClientChannelError &&
        error.retryableTransport
      ) {
        failedKeys.add(descriptorAttemptKey(first));
        this.cached = null;
        try {
          const refreshed = await this.getActiveDescriptor(true, failedKeys);
          return await this.postJsonOnce<T>(
            refreshed,
            endpointPath,
            payload,
            methodLabel,
            timeoutMs,
          );
        } catch (secondError) {
          if (
            secondError instanceof ClientChannelError &&
            secondError.code === "side-chat/channel-offline" &&
            failedKeys.size > 0
          ) {
            throw error;
          }
          throw secondError;
        }
      }
      throw error;
    }
  }

  async rpc<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    options?: { allowRescanRetry?: boolean; timeoutMs?: number },
  ): Promise<T> {
    const envelope = await this.postJsonWithRescan<unknown>(
      "/v1/rpc",
      { method, params },
      method,
      options?.allowRescanRetry ?? true,
      options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result as T;
    }
    return envelope as T;
  }

  async snapshot<T = unknown>(
    threadId: string,
    options?: {
      readonly truncateToolOutput?: boolean;
      readonly knownTurns?: readonly { readonly id: string; readonly fingerprint: string }[];
      readonly timeoutMs?: number;
    },
  ): Promise<T> {
    const body: Record<string, unknown> = { threadId };
    if (options?.truncateToolOutput !== undefined) {
      body.truncateToolOutput = options.truncateToolOutput;
    }
    if (options?.knownTurns !== undefined) {
      body.knownTurns = options.knownTurns;
    }
    const envelope = await this.postJsonWithRescan<unknown>(
      "/v1/snapshot",
      body,
      "snapshot",
      true,
      options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result as T;
    }
    return envelope as T;
  }

  async respond<T = { resolved?: boolean }>(
    payload: {
      readonly epoch: string;
      readonly threadId: string;
      readonly requestId: string | number;
      readonly result: Record<string, unknown>;
    },
    options?: { readonly timeoutMs?: number },
  ): Promise<T> {
    const envelope = await this.postJsonWithRescan<unknown>(
      "/v1/respond",
      payload,
      "respond",
      true,
      options?.timeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS,
    );
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result as T;
    }
    return envelope as T;
  }
}
