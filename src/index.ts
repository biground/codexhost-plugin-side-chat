/**
 * Host Cordis plugin entry for `codexhost-plugin-side-chat`.
 *
 * Mounts `/codexhost-side-chat/*` persistence endpoints backed by
 * `<codexhostAccess.dataDirectory>/side-chat-store.json` with primary-access auth
 * (when `authEnabled === true`) and same-origin write protection (when `--no-auth`).
 */
import type { IncomingMessage, ServerResponse } from "node:http";

import { SideChatStore, SideChatStoreError } from "./store.ts";
import type {
  CreateSideChatRecordInput,
  HostAccessService,
  HostPluginContext,
  UpdateSideChatRecordPatch,
} from "./types.ts";

export { SideChatStore, SideChatStoreError } from "./store.ts";
export type * from "./types.ts";

export const name = "codexhost-plugin-side-chat";
export const inject = ["webServer", "codexhostAccess"] as const;

export const SIDE_CHAT_ROUTE_PREFIX = "/codexhost-side-chat";
const MAX_BODY_BYTES = 128 * 1024;

function writeJson(res: ServerResponse, status: number, body: unknown): void {
  res
    .writeHead(status, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    })
    .end(JSON.stringify(body));
}

function isSameOriginHost(originHeader: string, hostHeader: string | undefined): boolean {
  if (!hostHeader) return false;
  try {
    return new URL(originHeader).host.toLowerCase() === hostHeader.toLowerCase();
  } catch {
    return false;
  }
}

async function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  for await (const chunk of req) {
    const part = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
    totalBytes += part.length;
    if (totalBytes > MAX_BODY_BYTES) {
      throw new SideChatStoreError(413, "side-chat/payload-too-large", "Request body is too large.");
    }
    chunks.push(part);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SideChatStoreError(400, "side-chat/invalid-json", "Request body must be valid JSON.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new SideChatStoreError(
      400,
      "side-chat/invalid",
      "Request body must be a JSON object.",
    );
  }
  return parsed as Record<string, unknown>;
}

function decodeThreadIdSegment(rawSegment: string): string {
  try {
    return decodeURIComponent(rawSegment);
  } catch {
    throw new SideChatStoreError(400, "side-chat/invalid", "Invalid threadId path encoding.");
  }
}

/**
 * Create the HTTP request handler for `/codexhost-side-chat/*`.
 */
export function createSideChatRouteHandler(
  access: HostAccessService,
  store: SideChatStore,
): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const method = (req.method ?? "GET").toUpperCase();

    if (access.authEnabled) {
      const reqAuth = access.getRequestAuth(req);
      if (!reqAuth) {
        writeJson(res, 401, {
          error: {
            code: "auth/unauthorized",
            message: "Authentication is required to access Side Chat endpoints.",
          },
        });
        return;
      }
      if (reqAuth.scope !== "full") {
        writeJson(res, 403, {
          error: {
            code: "auth/forbidden",
            message: "Primary full access is required to access Side Chat endpoints.",
          },
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
              message: "Cross-origin mutating requests are forbidden.",
            },
          });
          return;
        }
      }
    }

    const url = new URL(req.url ?? SIDE_CHAT_ROUTE_PREFIX, "http://localhost");
    const subpath = url.pathname.slice(SIDE_CHAT_ROUTE_PREFIX.length) || "/";

    try {
      if (method === "GET" && subpath === "/threads") {
        const sourceThreadId = url.searchParams.get("sourceThreadId")?.trim() || undefined;
        writeJson(res, 200, { threads: store.list(sourceThreadId) });
        return;
      }

      if (method === "POST" && subpath === "/threads") {
        const body = await readJsonBody(req);
        const rawThreadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
        const existed = rawThreadId.length > 0 && store.get(rawThreadId) !== undefined;
        const thread = store.upsert(body as unknown as CreateSideChatRecordInput);
        writeJson(res, existed ? 200 : 201, {
          thread,
          threads: store.list(thread.sourceThreadId),
        });
        return;
      }

      const threadMatch = /^\/threads\/([^/]+)$/u.exec(subpath);
      if (threadMatch?.[1]) {
        const threadId = decodeThreadIdSegment(threadMatch[1]);

        if (method === "PATCH") {
          const body = await readJsonBody(req);
          const thread = store.update(threadId, body as UpdateSideChatRecordPatch);
          writeJson(res, 200, { thread });
          return;
        }

        if (method === "DELETE") {
          const sourceThreadId = url.searchParams.get("sourceThreadId")?.trim() || undefined;
          const deleted = store.remove(threadId, sourceThreadId);
          if (!deleted) {
            writeJson(res, 404, {
              error: {
                code: "side-chat/not-found",
                message: "Side chat thread not found.",
              },
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
          message: "Route not found.",
        },
      });
    } catch (error) {
      if (error instanceof SideChatStoreError) {
        writeJson(res, error.status, {
          error: {
            code: error.code,
            message: error.message,
          },
        });
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      writeJson(res, 400, {
        error: {
          code: "side-chat/invalid",
          message,
        },
      });
    }
  };
}

export function apply(ctx: HostPluginContext): void {
  const access = ctx.codexhostAccess;
  const store = new SideChatStore(access.dataDirectory);
  const handler = createSideChatRouteHandler(access, store);

  ctx.effect(
    () =>
      ctx.webServer.register({
        kind: "prefix",
        path: SIDE_CHAT_ROUTE_PREFIX,
        handler,
      }),
    `${name}: side-chat routes`,
  );
}
