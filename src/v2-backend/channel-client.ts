/**
 * Local CodexHost Client Channel HTTP client for the v2 Host extension backend.
 *
 * Discovers active `host-*.json` descriptors under `CODEXHOST_SIDE_CHAT_CHANNEL_DIR`
 * or `<dataDir>/../../client-hosts`, filters alive processes (`process.kill(pid, 0)`),
 * orders by `startedAt` descending, and talks directly to `http://127.0.0.1:<port>/v1/*`
 * via `node:http` (never sending an `Origin` header, never going through HTTP proxies).
 */
import { readdir, readFile } from "node:fs/promises";
import { request as httpRequest } from "node:http";
import { createConnection } from "node:net";
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

const REQUEST_TIMEOUT_MS = 8_500;
const PROBE_TIMEOUT_MS = 600;

export function resolveClientChannelDir(dataDir: string): string {
  const override = process.env.CODEXHOST_SIDE_CHAT_CHANNEL_DIR?.trim();
  if (override) return path.resolve(override);
  return path.resolve(dataDir, "..", "..", "client-hosts");
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

export class LocalClientChannelClient {
  private readonly dataDir: string;
  private readonly explicitChannelDir: string | undefined;
  private cached: LocalClientChannelDescriptor | null = null;
  private cachedDir: string | null = null;
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
    this.cachedDir = null;
  }

  invalidateCache(): void {
    this.cached = null;
    this.cachedDir = null;
  }

  async discoverDescriptors(): Promise<LocalClientChannelDescriptor[]> {
    const dir = this.channelDir;
    let entries: string[];
    try {
      entries = await readdir(dir);
    } catch {
      return [];
    }

    const candidates: LocalClientChannelDescriptor[] = [];
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
        // Ignore stale, partially written, or unreadable descriptor files.
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

  async getActiveDescriptor(forceRescan = false): Promise<LocalClientChannelDescriptor> {
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
      // Return the newest alive descriptor if TCP probe raced, letting HTTP surface exact error.
      this.cached = descriptors[0]!;
      this.cachedDir = dir;
      return this.cached;
    }
    throw new ClientChannelError(
      "side-chat/channel-offline",
      `No active CodexHost client channel found in ${dir}.`,
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
        const reachable = await probeTcpLoopback(candidate.port);
        if (reachable) {
          this.cached = candidate;
          return {
            connected: true,
            channelDir: this.channelDir,
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
        error: "Discovered CodexHost client channel port is not accepting connections.",
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
          timeout: REQUEST_TIMEOUT_MS,
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

    if (response.status === 401) {
      throw new ClientChannelError(-32001, "Unauthorized client channel token", {
        status: 401,
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
  ): Promise<T> {
    const first = await this.getActiveDescriptor(false);
    try {
      return await this.postJsonOnce<T>(first, endpointPath, payload, methodLabel);
    } catch (error) {
      if (
        allowRescanRetry &&
        error instanceof ClientChannelError &&
        error.retryableTransport
      ) {
        this.cached = null;
        const refreshed = await this.getActiveDescriptor(true);
        return this.postJsonOnce<T>(refreshed, endpointPath, payload, methodLabel);
      }
      throw error;
    }
  }

  async rpc<T = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    options?: { allowRescanRetry?: boolean },
  ): Promise<T> {
    const envelope = await this.postJsonWithRescan<unknown>(
      "/v1/rpc",
      { method, params },
      method,
      options?.allowRescanRetry ?? true,
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
    },
  ): Promise<T> {
    const body: Record<string, unknown> = { threadId };
    if (options?.truncateToolOutput !== undefined) {
      body.truncateToolOutput = options.truncateToolOutput;
    }
    if (options?.knownTurns !== undefined) {
      body.knownTurns = options.knownTurns;
    }
    const envelope = await this.postJsonWithRescan<unknown>("/v1/snapshot", body, "snapshot", true);
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result as T;
    }
    return envelope as T;
  }

  async respond<T = { resolved?: boolean }>(payload: {
    readonly epoch: string;
    readonly threadId: string;
    readonly requestId: string | number;
    readonly result: Record<string, unknown>;
  }): Promise<T> {
    const envelope = await this.postJsonWithRescan<unknown>(
      "/v1/respond",
      payload,
      "respond",
      true,
    );
    if (isPlainRecord(envelope) && "result" in envelope) {
      return envelope.result as T;
    }
    return envelope as T;
  }
}
