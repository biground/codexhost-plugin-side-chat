import assert from "node:assert/strict";
import test from "node:test";

import {
  SIDE_CHAT_BOUNDARY_END,
  SIDE_CHAT_BOUNDARY_START,
  deriveSideChatTitle,
  hasSideChatBoundary,
  injectSideChatBoundary,
  stripSideChatBoundary,
  stripSideChatBoundaryPrefix,
} from "../src/client/boundary.ts";
import { SideChatController } from "../src/client/controller.ts";
import {
  buildInteractionResponseResult,
  buildRespondRequest,
  formatApprovalActionLabels,
  type ClientInteraction,
} from "../src/client/interactions.ts";
import {
  ChChannelClient,
  ChEventsSubscriber,
  SideChatRpcError,
  SideChatStoreClient,
  formatSideChatError,
  normalizeSnapshot,
  type ClientThreadSnapshot,
  type RawChTurn,
} from "../src/client/protocol.ts";
import type { SideChatRecord } from "../src/types.ts";

const EPOCH_1 = "11111111-1111-4111-8111-111111111111";
const EPOCH_2 = "22222222-2222-4222-8222-222222222222";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function makeSnapshot(overrides: Partial<ClientThreadSnapshot> & { threadId?: string } = {}): ClientThreadSnapshot {
  const threadId = overrides.threadId ?? overrides.thread?.id ?? "sc-1";
  return {
    cursor: overrides.cursor ?? { epoch: EPOCH_1, sequence: 1 },
    activeTurnId: overrides.activeTurnId ?? null,
    thread: overrides.thread ?? {
      id: threadId,
      cwd: "/repo",
      modelProvider: "codexhost",
      createdAt: 1_700_000_000,
      updatedAt: 1_700_000_010,
      status: { type: "idle" },
      name: null,
      preview: "",
      turns: [],
    },
    turnsPage: overrides.turnsPage ?? { data: [], nextCursor: null },
    configuration: overrides.configuration ?? {},
    interactions: overrides.interactions ?? [],
    ...(overrides.queue ? { queue: overrides.queue } : {}),
  };
}

interface MockGatewayOptions {
  rpcHandler?: (method: string, params: Record<string, unknown>) => unknown | Promise<unknown>;
  snapshotHandler?: (
    threadId: string,
    body: Record<string, unknown>,
  ) => ClientThreadSnapshot | Promise<ClientThreadSnapshot>;
  respondHandler?: (body: Record<string, unknown>) => unknown | Promise<unknown>;
  initialStoreRecords?: SideChatRecord[];
  eventsHandler?: (url: URL, signal?: AbortSignal) => Response | Promise<Response>;
}

function createMockEnv(options: MockGatewayOptions = {}) {
  const records = new Map<string, SideChatRecord>(
    (options.initialStoreRecords ?? []).map((r) => [r.threadId, r]),
  );
  const rpcCalls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const snapshotCalls: Array<{ threadId: string; body: Record<string, unknown> }> = [];
  const respondCalls: Array<Record<string, unknown>> = [];
  const storeCalls: Array<{ method: string; path: string; body?: unknown }> = [];
  const eventUrls: string[] = [];

  const mockFetch: typeof fetch = async (input, init) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const rawBody = typeof init?.body === "string" ? init.body : undefined;
    const parsedBody = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : undefined;

    if (url.pathname === "/api/ch/v1/events") {
      eventUrls.push(`${url.pathname}${url.search}`);
      if (options.eventsHandler) {
        return await options.eventsHandler(url, init?.signal ?? undefined);
      }
      // Return a never-ending silent stream until aborted
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => {
            try {
              controller.close();
            } catch {
              // already closed
            }
          });
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "application/x-ndjson" },
      });
    }

    if (url.pathname === "/api/ch/v1/rpc") {
      const rpcMethod = String(parsedBody?.method ?? "");
      const rpcParams = (parsedBody?.params ?? {}) as Record<string, unknown>;
      rpcCalls.push({ method: rpcMethod, params: rpcParams });
      try {
        const result = options.rpcHandler
          ? await options.rpcHandler(rpcMethod, rpcParams)
          : rpcMethod === "thread/list"
            ? { data: [], nextCursor: null }
            : {};
        return jsonResponse({ result }, 200);
      } catch (err) {
        if (err instanceof SideChatRpcError) {
          return jsonResponse(
            { error: { code: err.code, message: err.message } },
            err.status ?? 400,
          );
        }
        throw err;
      }
    }

    if (url.pathname === "/api/ch/v1/snapshot") {
      const threadId = String(parsedBody?.threadId ?? "");
      snapshotCalls.push({ threadId, body: parsedBody ?? {} });
      try {
        const result = options.snapshotHandler
          ? await options.snapshotHandler(threadId, parsedBody ?? {})
          : makeSnapshot({ threadId });
        return jsonResponse({ result }, 200);
      } catch (err) {
        if (err instanceof SideChatRpcError) {
          return jsonResponse(
            { error: { code: err.code, message: err.message } },
            err.status ?? 400,
          );
        }
        throw err;
      }
    }

    if (url.pathname === "/api/ch/v1/respond") {
      respondCalls.push(parsedBody ?? {});
      try {
        const result = options.respondHandler
          ? await options.respondHandler(parsedBody ?? {})
          : { resolved: true };
        return jsonResponse({ result }, 200);
      } catch (err) {
        if (err instanceof SideChatRpcError) {
          return jsonResponse(
            { error: { code: err.code, message: err.message } },
            err.status ?? 400,
          );
        }
        throw err;
      }
    }

    if (url.pathname === "/codexhost-side-chat/threads") {
      storeCalls.push({ method, path: `${url.pathname}${url.search}`, body: parsedBody });
      if (method === "GET") {
        const sourceId = url.searchParams.get("sourceThreadId");
        const list = [...records.values()]
          .filter((item) => (!sourceId ? true : item.sourceThreadId === sourceId))
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return jsonResponse({ threads: list }, 200);
      }
      if (method === "POST") {
        const now = new Date().toISOString();
        const tid = String(parsedBody?.threadId);
        const existing = records.get(tid);
        const record: SideChatRecord = {
          threadId: tid,
          sourceThreadId: String(parsedBody?.sourceThreadId),
          mode: parsedBody?.mode as "persistent" | "ephemeral",
          title: typeof parsedBody?.title === "string" ? parsedBody.title : (existing?.title ?? ""),
          boundaryConsumed:
            typeof parsedBody?.boundaryConsumed === "boolean"
              ? parsedBody.boundaryConsumed
              : (existing?.boundaryConsumed ?? false),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        records.set(tid, record);
        const threads = [...records.values()]
          .filter((item) => item.sourceThreadId === record.sourceThreadId)
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
        return jsonResponse({ thread: record, threads }, existing ? 200 : 201);
      }
    }

    const patchOrDelete = /^\/codexhost-side-chat\/threads\/([^/]+)$/u.exec(url.pathname);
    if (patchOrDelete?.[1]) {
      const tid = decodeURIComponent(patchOrDelete[1]);
      storeCalls.push({ method, path: `${url.pathname}${url.search}`, body: parsedBody });
      if (method === "PATCH") {
        const existing = records.get(tid);
        if (!existing) {
          return jsonResponse({ error: { code: "side-chat/not-found", message: "Not found" } }, 404);
        }
        const updated: SideChatRecord = {
          ...existing,
          ...(typeof parsedBody?.title === "string" ? { title: parsedBody.title } : {}),
          ...(typeof parsedBody?.boundaryConsumed === "boolean"
            ? { boundaryConsumed: parsedBody.boundaryConsumed }
            : {}),
          ...(parsedBody?.mode === "persistent" || parsedBody?.mode === "ephemeral"
            ? { mode: parsedBody.mode }
            : {}),
          updatedAt: new Date().toISOString(),
        };
        records.set(tid, updated);
        return jsonResponse({ thread: updated }, 200);
      }
      if (method === "DELETE") {
        const deleted = records.delete(tid);
        if (!deleted) {
          return jsonResponse({ error: { code: "side-chat/not-found", message: "Not found" } }, 404);
        }
        return jsonResponse({ deleted: true }, 200);
      }
    }

    return jsonResponse({ error: { code: "not-found", message: `Unhandled ${method} ${url.pathname}` } }, 404);
  };

  return {
    mockFetch,
    records,
    rpcCalls,
    snapshotCalls,
    respondCalls,
    storeCalls,
    eventUrls,
  };
}

// ---------------------------------------------------------------------------
// 1. Boundary prompt injection & stripping
// ---------------------------------------------------------------------------

test("boundary helpers inject once, detect, strip cleanly, and derive titles", () => {
  const userQuestion = "How does the cache eviction work?\nSecond line with `code`.";
  assert.equal(hasSideChatBoundary(userQuestion), false);

  const injected = injectSideChatBoundary(userQuestion);
  assert.equal(hasSideChatBoundary(injected), true);
  assert.ok(injected.startsWith(SIDE_CHAT_BOUNDARY_START));
  assert.ok(injected.includes(SIDE_CHAT_BOUNDARY_END));
  assert.ok(injected.endsWith(userQuestion));

  // Idempotent if already injected
  assert.equal(injectSideChatBoundary(injected), injected);

  // Exact stripping (both canonical name and alias)
  assert.equal(stripSideChatBoundary(injected), userQuestion);
  assert.equal(stripSideChatBoundaryPrefix(injected), userQuestion);

  // CRLF and collapsed-whitespace previews
  const crlfInjected = injected.replace(/\n/g, "\r\n");
  assert.equal(stripSideChatBoundary(crlfInjected), userQuestion.replace(/\n/g, "\r\n"));

  const collapsedPreview = injected.replace(/\s+/g, " ");
  assert.equal(
    stripSideChatBoundary(collapsedPreview),
    "How does the cache eviction work? Second line with `code`.",
  );

  // Truncated preview containing only an incomplete boundary prefix returns empty string
  const truncatedBoundary = injected.slice(0, 80);
  assert.equal(stripSideChatBoundary(truncatedBoundary), "");

  // Plain text unchanged
  assert.equal(stripSideChatBoundary("Plain message"), "Plain message");

  // Title derivation strips boundary and trims length
  assert.equal(deriveSideChatTitle(injected, 20), "How does the cache e…");
});

// ---------------------------------------------------------------------------
// 2. Interaction response payload formatting (ch-interactions.ts parity)
// ---------------------------------------------------------------------------

test("buildInteractionResponseResult matches ch-interactions.ts contract for native/MCP approvals and questions", () => {
  const nativeCmdApproval: ClientInteraction = {
    requestId: 42,
    threadId: "sc-1",
    kind: "approval",
    interaction: {
      type: "approval",
      title: "Run git status?",
      actions: [
        { id: "accept", label: "Allow once", effect: "allowOnce" },
        { id: "acceptForSession", label: "Allow for session", effect: "allowForSession" },
        { id: "decline", label: "Decline", effect: "deny" },
      ],
    },
    request: { method: "item/commandExecution/requestApproval", params: {} },
  };
  assert.deepEqual(
    buildInteractionResponseResult(nativeCmdApproval, { kind: "approval", actionId: "acceptForSession" }),
    { decision: "acceptForSession" },
  );
  assert.deepEqual(buildInteractionResponseResult(nativeCmdApproval, null), { decision: "decline" });
  assert.deepEqual(
    buildRespondRequest(EPOCH_1, nativeCmdApproval, { kind: "approval", actionId: "accept" }),
    {
      epoch: EPOCH_1,
      threadId: "sc-1",
      requestId: 42,
      result: { decision: "accept" },
    },
  );

  // Native fileChange approval with only cancel (no decline)
  const nativeFileApproval: ClientInteraction = {
    requestId: "req-file-1",
    threadId: "sc-1",
    kind: "approval",
    interaction: {
      type: "approval",
      title: "Edit file?",
      actions: [
        { id: "accept", label: "Allow", effect: "allowOnce" },
        { id: "cancel", label: "Cancel", effect: "deny" },
      ],
    },
    request: { method: "item/fileChange/requestApproval", params: {} },
  };
  assert.deepEqual(buildInteractionResponseResult(nativeFileApproval, { kind: "approval", dismiss: true }), {
    decision: "cancel",
  });

  // MCP approval with persist effects
  const mcpApproval: ClientInteraction = {
    requestId: "mcp-1",
    threadId: "sc-1",
    kind: "approval",
    interaction: {
      type: "approval",
      title: "Call MCP tool?",
      actions: [
        { id: "once", label: "Allow once", effect: "allowOnce" },
        { id: "sess", label: "Allow session", effect: "allowForSession" },
        { id: "always", label: "Allow always", effect: "allowAlways" },
        { id: "deny", label: "Deny", effect: "deny" },
      ],
    },
    request: {
      method: "mcpServer/elicitation/request",
      params: { requestedSchema: { type: "object", properties: {} } },
    },
  };
  assert.deepEqual(
    buildInteractionResponseResult(mcpApproval, { kind: "approval", actionId: "once" }),
    { action: "accept", content: {} },
  );
  assert.deepEqual(
    buildInteractionResponseResult(mcpApproval, { kind: "approval", actionId: "sess" }),
    { action: "accept", content: {}, _meta: { persist: "session" } },
  );
  assert.deepEqual(
    buildInteractionResponseResult(mcpApproval, { kind: "approval", actionId: "always" }),
    { action: "accept", content: {}, _meta: { persist: "always" } },
  );
  assert.deepEqual(
    buildInteractionResponseResult(mcpApproval, { kind: "approval", actionId: "deny" }),
    { action: "decline" },
  );
  assert.deepEqual(buildInteractionResponseResult(mcpApproval, null), { action: "decline" });

  // Custom schema with requestedSchema.properties.actionId
  const customActionIdApproval: ClientInteraction = {
    requestId: "mcp-2",
    threadId: "sc-1",
    kind: "approval",
    interaction: {
      type: "approval",
      title: "Choose action",
      actions: [{ id: "approve_fast", label: "Approve", effect: "allowOnce" }],
    },
    request: {
      method: "mcpServer/elicitation/request",
      params: { requestedSchema: { properties: { actionId: { type: "string" } } } },
    },
  };
  assert.deepEqual(
    buildInteractionResponseResult(customActionIdApproval, { kind: "approval", actionId: "approve_fast" }),
    { action: "accept", content: { actionId: "approve_fast" } },
  );

  // Duplicate label disambiguation
  assert.deepEqual(
    formatApprovalActionLabels([
      { id: "a", label: "Allow", effect: "allowOnce" },
      { id: "b", label: "Allow", effect: "allowAlways" },
      { id: "c", label: "Deny", effect: "deny" },
    ]),
    ["Allow (1)", "Allow (2)", "Deny"],
  );

  // Question interaction
  const questionInteraction: ClientInteraction = {
    requestId: "q-1",
    threadId: "sc-1",
    kind: "question",
    interaction: {
      type: "question",
      title: "Clarify",
      questions: [
        {
          type: "choice",
          id: "q_env",
          prompt: "Target env?",
          multiple: true,
          allowOther: true,
          options: [
            { value: "dev", label: "Dev" },
            { value: "prod", label: "Prod" },
          ],
        },
        {
          type: "choice",
          id: "q_strict",
          prompt: "Strict choice?",
          multiple: false,
          allowOther: false,
          options: [{ value: "yes", label: "Yes" }],
        },
        {
          type: "text",
          id: "q_note",
          prompt: "Additional note",
        },
      ],
    },
    request: { method: "item/tool/requestUserInput", params: {} },
  };
  assert.deepEqual(
    buildInteractionResponseResult(questionInteraction, {
      kind: "question",
      answers: [
        { id: "q_env", selected: ["Dev"], custom: "Staging" },
        { id: "q_strict", selected: ["Yes"] },
        { id: "q_note", custom: "Keep fast" },
      ],
    }),
    {
      answers: {
        q_env: { answers: ["Dev", "Staging"] },
        q_strict: { answers: ["Yes"] },
        q_note: { answers: ["Keep fast"] },
      },
    },
  );
  assert.throws(
    () =>
      buildInteractionResponseResult(questionInteraction, {
        kind: "question",
        answers: [{ id: "q_strict", custom: "Other" }],
      }),
    /only accepts its listed choices/i,
  );
  assert.throws(
    () =>
      buildInteractionResponseResult(questionInteraction, {
        kind: "question",
        answers: [{ id: "unknown", custom: "x" }],
      }),
    /Unknown native question/i,
  );
});

// ---------------------------------------------------------------------------
// 3. Bilingual error formatting
// ---------------------------------------------------------------------------

test("formatSideChatError produces accurate Chinese and English messages for all known error codes", () => {
  const cases: Array<{ err: SideChatRpcError; zhPattern: RegExp; enPattern: RegExp }> = [
    {
      err: new SideChatRpcError("side-chat/draft-source", "draft"),
      zhPattern: /草稿|主对话/,
      enPattern: /draft/i,
    },
    {
      err: new SideChatRpcError(-32072, "External Native Session is busy"),
      zhPattern: /正忙|外部原生会话/,
      enPattern: /busy/i,
    },
    {
      err: new SideChatRpcError(-32080, "External Fork Checkpoint is unavailable"),
      zhPattern: /检查点|分叉/,
      enPattern: /checkpoint/i,
    },
    {
      err: new SideChatRpcError(-32079, "External Native Session is unavailable"),
      zhPattern: /失效|清理|重启/,
      enPattern: /ephemeral|restart|no longer available/i,
    },
    {
      err: new SideChatRpcError(-32076, "External Harness does not support fork"),
      zhPattern: /不支持分叉/,
      enPattern: /does not support forking/i,
    },
  ];

  for (const item of cases) {
    const zh = formatSideChatError(item.err, "zh-CN");
    const en = formatSideChatError(item.err, "en");
    assert.match(zh, item.zhPattern, `zh message mismatch: ${zh}`);
    assert.match(en, item.enPattern, `en message mismatch: ${en}`);
  }
});

// ---------------------------------------------------------------------------
// 4. Snapshot chronological normalization & item parsing
// ---------------------------------------------------------------------------

test("normalizeSnapshot flips desc turns to chronological asc and parses all item types accurately", () => {
  const snapshot = makeSnapshot({
    activeTurnId: "turn-2",
    turnsPage: {
      nextCursor: "cursor-older",
      // Host returns newest-first (desc): [turn-2, turn-1]
      data: [
        {
          id: "turn-2",
          status: "inProgress",
          items: [
            {
              id: "u2",
              type: "userMessage",
              content: [{ type: "text", text: "Follow-up question" }],
              clientId: "cid-2",
            },
            {
              id: "r1-summary",
              type: "reasoning",
              summary: ["Checking files"],
              content: ["Inspecting store.ts"],
            },
            {
              // Twin pseudo-command paired with r1-summary -> MUST be filtered out!
              id: "r1",
              type: "commandExecution",
              command: "thinking",
              aggregatedOutput: "twin transcript",
              status: "completed",
            },
            {
              // Real command literally named "thinking" WITHOUT paired -summary -> MUST be kept!
              id: "cmd-real-thinking",
              type: "commandExecution",
              command: "thinking",
              cwd: "/repo",
              aggregatedOutput: "real output",
              exitCode: 0,
              status: "completed",
            },
            {
              id: "fc-cumulative",
              type: "fileChange",
              changes: [{ path: "a.ts", kind: "update", diff: "@@ cumulative @@" }],
              status: "completed",
            },
            {
              id: "mcp-1",
              type: "mcpToolCall",
              server: "docs",
              tool: "search",
              arguments: { q: "side-chat" },
              result: { content: [{ type: "text", text: "found 2 docs" }] },
              status: "completed",
            },
            {
              id: "dyn-1",
              type: "dynamicToolCall",
              tool: "fetch_status",
              arguments: { id: 1 },
              contentItems: [{ type: "text", text: "ok" }],
              status: "completed",
            },
            {
              id: "ws-1",
              type: "webSearch",
              query: "codexhost side chat",
            },
            {
              id: "cc-1",
              type: "contextCompaction",
              status: "inProgress",
            },
            {
              id: "a2",
              type: "agentMessage",
              text: "escaped markdown",
              codexhostNativeText: "native **markdown**",
              phase: "final_answer",
            },
          ],
          codexhostFileOperations: [
            {
              beforeItemId: "mcp-1",
              item: {
                id: "op-file-1",
                type: "fileChange",
                changes: [{ path: "src/a.ts", kind: { type: "create" }, unifiedDiff: "+hello" }],
                status: "completed",
              },
            },
            {
              beforeItemId: null,
              item: {
                id: "op-file-end",
                type: "fileChange",
                changes: [{ path: "src/b.ts", kind: "delete", diff: "-bye" }],
                status: "failed",
              },
            },
          ],
        },
        {
          id: "turn-1",
          status: "completed",
          codexhostTurnOutcome: { status: "unknown", reason: "stream closed" },
          items: [
            {
              id: "u1",
              type: "userMessage",
              content: [{ type: "text", text: injectSideChatBoundary("First side question") }],
              clientId: "cid-1",
            },
            {
              id: "a1",
              type: "agentMessage",
              text: "First answer",
            },
          ],
        },
      ],
    },
  });

  const normalized = normalizeSnapshot(snapshot);
  assert.equal(normalized.hasOlderTurns, true);
  assert.equal(normalized.nextTurnsCursor, "cursor-older");
  assert.equal(normalized.activeTurnId, "turn-2");
  assert.equal(normalized.isRunning, true);

  // Flipped to oldest -> newest: [turn-1, turn-2]
  assert.deepEqual(
    normalized.turns.map((t) => t.id),
    ["turn-1", "turn-2"],
  );

  // Turn 1: boundary stripped, unknown outcome preserved
  const t1 = normalized.turns[0]!;
  assert.equal(t1.outcome, "unknown");
  assert.equal(t1.unknownReason, "stream closed");
  assert.equal(t1.items[0]?.kind, "userMessage");
  if (t1.items[0]?.kind === "userMessage") {
    assert.equal(t1.items[0].text, "First side question");
    assert.equal(t1.items[0].hadBoundaryPrefix, true);
  }

  // Turn 2: pseudo thinking filtered, real thinking kept, codexhostFileOperations anchored properly
  const t2 = normalized.turns[1]!;
  assert.equal(t2.isActive, true);
  assert.deepEqual(
    t2.items.map((item) => item.id),
    [
      "u2",
      "r1-summary",
      "cmd-real-thinking",
      "op-file-1", // anchored before mcp-1, replacing fc-cumulative
      "mcp-1",
      "dyn-1",
      "ws-1",
      "cc-1",
      "a2",
      "op-file-end", // null anchor appended at end
    ],
  );
  const fileOp1 = t2.items.find((i) => i.id === "op-file-1");
  assert.equal(fileOp1?.kind, "fileChange");
  if (fileOp1?.kind === "fileChange") {
    assert.equal(fileOp1.changes[0]?.kind, "add");
    assert.equal(fileOp1.changes[0]?.path, "src/a.ts");
  }
  const agentMsg = t2.items.find((i) => i.id === "a2");
  assert.equal(agentMsg?.kind, "agentMessage");
  if (agentMsg?.kind === "agentMessage") {
    assert.equal(agentMsg.text, "native **markdown**");
    assert.equal(agentMsg.phase, "final_answer");
  }
  const mcpItem = t2.items.find((i) => i.id === "mcp-1");
  assert.equal(mcpItem?.kind, "mcpToolCall");
  if (mcpItem?.kind === "mcpToolCall") {
    assert.equal(mcpItem.server, "docs");
    assert.equal(mcpItem.tool, "search");
    assert.equal(mcpItem.output, "found 2 docs");
  }
});

// ---------------------------------------------------------------------------
// 5. Controller: Persistent-first & seamless -32602 ephemeral fallback
// ---------------------------------------------------------------------------

test("controller tries attachToSource persistent fork first and records mode=persistent", async () => {
  const env = createMockEnv({
    rpcHandler(method, params) {
      if (method === "thread/fork") {
        assert.deepEqual(params, {
          threadId: "main-1",
          attachToSource: true,
          excludeTurns: true,
        });
        return { thread: { id: "sc-persistent-1" } };
      }
      if (method === "thread/list") return { data: [], nextCursor: null };
      return {};
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    autoConnectEvents: false,
  });

  const created = await controller.createSideChat("main-1");
  assert.equal(created.threadId, "sc-persistent-1");
  assert.equal(created.mode, "persistent");
  assert.equal(created.boundaryConsumed, false);

  const state = controller.getSnapshot();
  assert.equal(state.activeThreadId, "sc-persistent-1");
  assert.equal(state.activeSession?.mode, "persistent");
  assert.equal(env.records.get("sc-persistent-1")?.mode, "persistent");
  controller.dispose();
});

test("controller seamlessly falls back to ephemeral fork when attachToSource returns -32602", async () => {
  let forkAttempts = 0;
  const env = createMockEnv({
    rpcHandler(method, params) {
      if (method === "thread/fork") {
        forkAttempts += 1;
        if (forkAttempts === 1) {
          assert.equal(params.attachToSource, true);
          assert.equal(params.excludeTurns, true);
          throw new SideChatRpcError(-32602, "attachToSource requires a paginated parent");
        }
        assert.deepEqual(params, {
          threadId: "main-legacy",
          ephemeral: true,
          excludeTurns: true,
        });
        return { thread: { id: "sc-ephemeral-1" } };
      }
      if (method === "thread/list") return { data: [], nextCursor: null };
      return {};
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    autoConnectEvents: false,
  });

  const created = await controller.createSideChat("main-legacy");
  assert.equal(forkAttempts, 2);
  assert.equal(created.threadId, "sc-ephemeral-1");
  assert.equal(created.mode, "ephemeral");

  const state = controller.getSnapshot();
  assert.equal(state.error, null, "seamless fallback must not leave an error in state");
  assert.equal(state.activeSession?.mode, "ephemeral");
  assert.equal(env.records.get("sc-ephemeral-1")?.mode, "ephemeral");
  controller.dispose();
});

test("controller does NOT fall back to ephemeral on -32072 / -32080 and exposes localized errors", async () => {
  const env = createMockEnv({
    rpcHandler(method) {
      if (method === "thread/fork") {
        throw new SideChatRpcError(-32072, "External Native Session is busy");
      }
      return {};
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    locale: "zh",
    autoConnectEvents: false,
  });

  await assert.rejects(() => controller.createSideChat("main-busy"));
  assert.equal(
    env.rpcCalls.filter((c) => c.method === "thread/fork").length,
    1,
    "must not retry ephemeral on -32072",
  );
  assert.match(controller.getSnapshot().error?.message ?? "", /正忙/);

  // Draft source check
  await assert.rejects(() => controller.createSideChat(""));
  assert.equal(controller.getSnapshot().error?.code, "side-chat/draft-source");
  controller.dispose();
});

// ---------------------------------------------------------------------------
// 6. First-turn boundary injection, second-turn skip, Desktop merge discovery
// ---------------------------------------------------------------------------

test("askInNewSideChat injects boundary on turn 1 only, strips in UI, and never retries unknown network errors", async () => {
  const turnsOnServer: RawChTurn[] = [];
  let failNextTurnStart = false;

  const env = createMockEnv({
    rpcHandler(method, params) {
      if (method === "thread/fork") {
        return { thread: { id: "sc-ask-1" } };
      }
      if (method === "turn/start") {
        if (failNextTurnStart) {
          throw new TypeError("Failed to fetch");
        }
        const input = params.input as Array<{ type: string; text: string }>;
        turnsOnServer.unshift({
          id: `turn-${turnsOnServer.length + 1}`,
          status: "completed",
          items: [
            {
              id: `u-${turnsOnServer.length + 1}`,
              type: "userMessage",
              content: input,
              clientId: String(params.clientUserMessageId),
            },
            {
              id: `a-${turnsOnServer.length + 1}`,
              type: "agentMessage",
              text: `Reply ${turnsOnServer.length + 1}`,
            },
          ],
        });
        return { turn: { id: `turn-${turnsOnServer.length}` } };
      }
      return { data: [], nextCursor: null };
    },
    snapshotHandler(threadId) {
      return makeSnapshot({
        threadId,
        turnsPage: { data: [...turnsOnServer], nextCursor: null },
      });
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    autoConnectEvents: false,
  });
  await controller.setSourceThread("main-1");

  // Turn 1 via askInNewSideChat
  await controller.askInNewSideChat("main-1", "Explain the retry policy");

  const startCalls = env.rpcCalls.filter((c) => c.method === "turn/start");
  assert.equal(startCalls.length, 1);
  const turn1Text = (startCalls[0]!.params.input as Array<{ text: string }>)[0]!.text;
  assert.equal(hasSideChatBoundary(turn1Text), true, "turn 1 must carry boundary prefix");
  assert.equal(stripSideChatBoundary(turn1Text), "Explain the retry policy");
  assert.equal(typeof startCalls[0]!.params.clientUserMessageId, "string");
  assert.equal(env.records.get("sc-ask-1")?.boundaryConsumed, true);
  assert.equal(env.records.get("sc-ask-1")?.title, "Explain the retry policy");

  // Normalized turn 1 user bubble must NOT contain boundary comments
  const snap1 = controller.getSnapshot();
  assert.equal(snap1.activeSession?.turns.length, 1);
  const firstUserItem = snap1.activeSession?.turns[0]?.items[0];
  assert.equal(firstUserItem?.kind, "userMessage");
  if (firstUserItem?.kind === "userMessage") {
    assert.equal(firstUserItem.text, "Explain the retry policy");
  }

  // Turn 2 via sendMessage: must NOT inject boundary again
  await controller.sendMessage("sc-ask-1", "What about backoff?");
  const allStartCalls = env.rpcCalls.filter((c) => c.method === "turn/start");
  assert.equal(allStartCalls.length, 2);
  const turn2Text = (allStartCalls[1]!.params.input as Array<{ text: string }>)[0]!.text;
  assert.equal(hasSideChatBoundary(turn2Text), false, "turn 2 must not re-inject boundary");
  assert.equal(turn2Text, "What about backoff?");

  // Turn 3 with unknown network error: must NOT auto-retry
  failNextTurnStart = true;
  await assert.rejects(() => controller.sendMessage("sc-ask-1", "Third message"));
  assert.equal(
    env.rpcCalls.filter((c) => c.method === "turn/start").length,
    3,
    "turn/start must never auto-retry after unknown network error",
  );

  controller.dispose();
});

test("merges Desktop attachedToThreadId side chats and skips boundary injection when history exists", async () => {
  const env = createMockEnv({
    initialStoreRecords: [
      {
        threadId: "sc-web-ephemeral",
        sourceThreadId: "main-shared",
        mode: "ephemeral",
        title: "Web ephemeral",
        boundaryConsumed: false,
        createdAt: "2026-11-23T00:00:01.000Z",
        updatedAt: "2026-11-23T00:00:01.000Z",
      },
    ],
    rpcHandler(method, params) {
      if (method === "thread/list") {
        assert.equal(params.attachedToThreadId, "main-shared");
        return {
          data: [
            {
              id: "sc-desktop-1",
              attachedToThreadId: "main-shared",
              name: null,
              preview: "Existing Desktop question",
              createdAt: 1_800_000_000,
              updatedAt: 1_800_000_050,
              status: { type: "idle" },
            },
          ],
          nextCursor: null,
        };
      }
      if (method === "turn/start") {
        return { turn: { id: "turn-2" } };
      }
      return {};
    },
    snapshotHandler(threadId) {
      if (threadId === "sc-desktop-1") {
        return makeSnapshot({
          threadId,
          turnsPage: {
            nextCursor: null,
            data: [
              {
                id: "turn-1",
                status: "completed",
                items: [
                  {
                    id: "u-d1",
                    type: "userMessage",
                    content: [{ type: "text", text: "Existing Desktop question" }],
                  },
                ],
              },
            ],
          },
        });
      }
      return makeSnapshot({ threadId });
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    autoConnectEvents: false,
  });

  await controller.setSourceThread("main-shared");
  const state = controller.getSnapshot();
  assert.equal(state.threads.length, 2);

  const desktopEntry = state.threads.find((t) => t.threadId === "sc-desktop-1");
  assert.ok(desktopEntry, "Desktop attached side chat must be discovered");
  assert.equal(desktopEntry.mode, "persistent");
  assert.equal(desktopEntry.boundaryConsumed, true);
  assert.equal(desktopEntry.source, "desktop");
  assert.equal(desktopEntry.title, "Existing Desktop question");

  // Continuing conversation on Desktop side chat must NOT inject boundary prefix
  await controller.sendMessage("sc-desktop-1", "Continue from Web");
  const turnStart = env.rpcCalls.find((c) => c.method === "turn/start");
  assert.ok(turnStart);
  const sentText = (turnStart.params.input as Array<{ text: string }>)[0]!.text;
  assert.equal(hasSideChatBoundary(sentText), false);
  assert.equal(sentText, "Continue from Web");

  controller.dispose();
});

// ---------------------------------------------------------------------------
// 7. NDJSON event stream coalescing, in-flight re-read, reset, interrupt & respond
// ---------------------------------------------------------------------------

test("NDJSON events coalesce rapid changed bursts, re-read after in-flight change, and handle reset", async () => {
  const encoder = new TextEncoder();
  let streamController: ReadableStreamDefaultController<Uint8Array> | undefined;
  let snapshotCount = 0;
  let releaseSecondSnapshot: (() => void) | undefined;

  const env = createMockEnv({
    initialStoreRecords: [
      {
        threadId: "sc-live",
        sourceThreadId: "main-live",
        mode: "persistent",
        title: "Live stream test",
        boundaryConsumed: true,
        createdAt: "2026-11-23T00:00:00.000Z",
        updatedAt: "2026-11-23T00:00:00.000Z",
      },
    ],
    eventsHandler(_url, signal) {
      const stream = new ReadableStream<Uint8Array>({
        start(ctrl) {
          streamController = ctrl;
          signal?.addEventListener("abort", () => {
            try {
              ctrl.close();
            } catch {
              // ignore
            }
          });
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "application/x-ndjson" },
      });
    },
    async snapshotHandler(threadId, body) {
      snapshotCount += 1;
      const callNum = snapshotCount;
      if (callNum === 2) {
        await new Promise<void>((resolveWait) => {
          releaseSecondSnapshot = resolveWait;
        });
      }
      const epoch = callNum >= 4 ? EPOCH_2 : EPOCH_1;
      const known = body.knownTurns as Array<{ id: string; fingerprint: string }> | undefined;
      return makeSnapshot({
        threadId,
        cursor: { epoch, sequence: callNum },
        turnsPage: {
          nextCursor: null,
          data: [
            {
              id: "turn-1",
              status: "completed",
              fingerprint: `fp-${epoch}-1`,
              items:
                known?.some((k) => k.id === "turn-1" && k.fingerprint === `fp-${epoch}-1`)
                  ? []
                  : [
                      {
                        id: "u1",
                        type: "userMessage",
                        content: [{ type: "text", text: "Hello" }],
                      },
                      { id: "a1", type: "agentMessage", text: `Snapshot #${callNum}` },
                    ],
              ...(known?.some((k) => k.id === "turn-1" && k.fingerprint === `fp-${epoch}-1`)
                ? { unchanged: true as const }
                : {}),
            },
          ],
        },
      });
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    debounceMs: 40,
    autoConnectEvents: true,
  });

  // Initial load performs snapshot #1
  await controller.setSourceThread("main-live");
  assert.equal(snapshotCount, 1);
  assert.ok(streamController, "event stream should be open");

  const emitLine = (obj: unknown | "") => {
    const line = obj === "" ? "\n" : `${JSON.stringify(obj)}\n`;
    streamController!.enqueue(encoder.encode(line));
  };

  // Emit hello (reset: false) + heartbeat + 3 rapid changed events for sc-live
  emitLine({ type: "hello", version: 1, cursor: { epoch: EPOCH_1, sequence: 1 }, reset: false });
  emitLine("");
  emitLine({
    type: "changed",
    cursor: { epoch: EPOCH_1, sequence: 2 },
    threadId: "sc-live",
    method: "item/updated",
  });
  emitLine({
    type: "changed",
    cursor: { epoch: EPOCH_1, sequence: 3 },
    threadId: "sc-live",
    method: "item/updated",
  });
  emitLine({
    type: "changed",
    cursor: { epoch: EPOCH_1, sequence: 4 },
    threadId: "sc-live",
    method: "turn/completed",
  });

  // Wait for debounce to trigger snapshot #2 (which is paused in flight)
  await new Promise((r) => setTimeout(r, 90));
  assert.equal(snapshotCount, 2, "3 rapid changed events must coalesce into 1 snapshot call");
  assert.ok(releaseSecondSnapshot);

  // While snapshot #2 is in flight, emit another changed event
  emitLine({
    type: "changed",
    cursor: { epoch: EPOCH_1, sequence: 5 },
    threadId: "sc-live",
    method: "item/completed",
  });

  // Release snapshot #2 -> controller must automatically schedule ONE follow-up read (#3)
  releaseSecondSnapshot();
  await new Promise((r) => setTimeout(r, 110));
  assert.equal(snapshotCount, 3, "in-flight change must trigger one follow-up snapshot");
  // Verify knownTurns placeholder preserved the previous cached turn content!
  const msgAfterPlaceholder = controller.getSnapshot().activeSession?.turns[0]?.items[1];
  assert.equal(msgAfterPlaceholder?.kind, "agentMessage");
  if (msgAfterPlaceholder?.kind === "agentMessage") {
    assert.equal(msgAfterPlaceholder.text, "Snapshot #1");
  }

  // Emit hello with reset: true & new epoch -> must clear knownTurns and re-fetch (#4)
  emitLine({ type: "hello", version: 1, cursor: { epoch: EPOCH_2, sequence: 0 }, reset: true });
  await new Promise((r) => setTimeout(r, 110));
  assert.equal(snapshotCount, 4, "hello reset=true must trigger snapshot refresh");
  const fourthBody = env.snapshotCalls[3]!.body;
  assert.deepEqual(fourthBody.knownTurns, [], "reset must clear knownTurns fingerprints");

  controller.dispose();
});

test("controller supports turn/interrupt, respondToInteraction, stale -32079 handling, and useSyncExternalStore subscriptions", async () => {
  const pendingApproval: ClientInteraction = {
    requestId: "apr-9",
    threadId: "sc-ops",
    kind: "approval",
    interaction: {
      type: "approval",
      title: "Run tests?",
      actions: [
        { id: "accept", label: "Allow", effect: "allowOnce" },
        { id: "decline", label: "Deny", effect: "deny" },
      ],
    },
    request: { method: "item/commandExecution/requestApproval", params: {} },
  };

  let failSnapshotExpired = false;
  let interactionResolved = false;

  const env = createMockEnv({
    initialStoreRecords: [
      {
        threadId: "sc-ops",
        sourceThreadId: "main-ops",
        mode: "ephemeral",
        title: "Ops check",
        boundaryConsumed: true,
        createdAt: "2026-11-23T00:00:00.000Z",
        updatedAt: "2026-11-23T00:00:00.000Z",
      },
    ],
    rpcHandler(method, params) {
      if (method === "turn/interrupt") {
        assert.deepEqual(params, { threadId: "sc-ops", turnId: "turn-active-1" });
        return {};
      }
      if (method === "thread/list") return { data: [], nextCursor: null };
      return {};
    },
    snapshotHandler(threadId) {
      if (failSnapshotExpired) {
        throw new SideChatRpcError(-32079, "External Native Session is unavailable");
      }
      return makeSnapshot({
        threadId,
        cursor: { epoch: EPOCH_1, sequence: 7 },
        activeTurnId: "turn-active-1",
        interactions: interactionResolved ? [] : [pendingApproval],
        turnsPage: {
          nextCursor: null,
          data: [
            {
              id: "turn-active-1",
              status: "inProgress",
              items: [{ id: "u1", type: "userMessage", content: [{ type: "text", text: "Run" }] }],
            },
          ],
        },
      });
    },
    respondHandler(body) {
      interactionResolved = true;
      assert.deepEqual(body, {
        epoch: EPOCH_1,
        threadId: "sc-ops",
        requestId: "apr-9",
        result: { decision: "accept" },
      });
      return { resolved: true };
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    locale: "en",
    autoConnectEvents: false,
  });

  let notifications = 0;
  const unsubscribe = controller.subscribe(() => {
    notifications += 1;
  });
  const initialRef = controller.getSnapshot();
  assert.equal(controller.getSnapshot(), initialRef, "getSnapshot must be referentially stable");

  await controller.setSourceThread("main-ops");
  assert.ok(notifications > 0);
  assert.notEqual(controller.getSnapshot(), initialRef);
  assert.equal(controller.getSnapshot().activeSession?.interactions.length, 1);

  // Interrupt active turn
  await controller.interrupt("sc-ops");
  assert.equal(env.rpcCalls.filter((c) => c.method === "turn/interrupt").length, 1);

  // Respond to interaction
  await controller.respondToInteraction("sc-ops", pendingApproval, {
    kind: "approval",
    actionId: "accept",
  });
  assert.equal(env.respondCalls.length, 1);
  assert.equal(controller.getSnapshot().activeSession?.interactions.length, 0);

  // Ephemeral session expired after host restart (-32079)
  failSnapshotExpired = true;
  await controller.refreshSnapshot("sc-ops");
  assert.equal(controller.getSnapshot().activeSession?.stale, true);
  assert.match(controller.getSnapshot().error?.message ?? "", /no longer available|restart/i);

  unsubscribe();
  controller.dispose();
});

test("ChEventsSubscriber reconnects carrying last known epoch and sequence cursor", async () => {
  const encoder = new TextEncoder();
  const seenUrls: string[] = [];
  let attempt = 0;

  const mockFetch: typeof fetch = async (input) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    seenUrls.push(rawUrl);
    attempt += 1;
    if (attempt === 1) {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: "hello",
                version: 1,
                cursor: { epoch: EPOCH_1, sequence: 10 },
                reset: false,
              })}\n${JSON.stringify({
                type: "changed",
                cursor: { epoch: EPOCH_1, sequence: 12 },
                threadId: "sc-1",
                method: "turn/completed",
              })}\n`,
            ),
          );
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "content-type": "application/x-ndjson" },
      });
    }
    // Second connection stays open until aborted
    const stream = new ReadableStream<Uint8Array>({
      start() {},
    });
    return new Response(stream, {
      status: 200,
      headers: { "content-type": "application/x-ndjson" },
    });
  };

  const subscriber = new ChEventsSubscriber({
    fetch: mockFetch,
    reconnectBaseMs: 25,
    onEvent() {},
  });
  subscriber.start();
  await new Promise((r) => setTimeout(r, 120));
  subscriber.stop();

  assert.ok(seenUrls.length >= 2, `expected reconnect, saw: ${seenUrls.join(", ")}`);
  assert.equal(seenUrls[0], "/api/ch/v1/events");
  assert.equal(seenUrls[1], `/api/ch/v1/events?epoch=${EPOCH_1}&after=12`);

  // Verify standalone client wrappers instantiate cleanly
  const channel = new ChChannelClient({ fetch: mockFetch });
  const store = new SideChatStoreClient({ fetch: mockFetch });
  assert.ok(channel);
  assert.ok(store);
});

test("controller handles MCP persist & question respondToInteraction, loadOlderTurns, rename/delete, and placeholder fallback", async () => {
  const mcpInteraction: ClientInteraction = {
    requestId: "mcp-persist-1",
    threadId: "sc-edge",
    kind: "approval",
    interaction: {
      type: "approval",
      title: "Allow MCP tool?",
      actions: [
        { id: "allow_always", label: "Always allow", effect: "allowAlways" },
        { id: "deny", label: "Deny", effect: "deny" },
      ],
    },
    request: {
      method: "mcpServer/elicitation/request",
      params: { requestedSchema: { type: "object", properties: {} } },
    },
  };
  const questionInteraction: ClientInteraction = {
    requestId: "q-edge-1",
    threadId: "sc-edge",
    kind: "question",
    interaction: {
      type: "question",
      questions: [
        {
          type: "choice",
          id: "mode",
          prompt: "Which output?",
          multiple: false,
          allowOther: false,
          options: [{ value: "json", label: "JSON" }],
        },
      ],
    },
    request: { method: "item/tool/requestUserInput", params: {} },
  };

  let snapshotRound = 0;
  let respondShouldFail = false;

  const env = createMockEnv({
    initialStoreRecords: [
      {
        threadId: "sc-edge",
        sourceThreadId: "main-edge",
        mode: "persistent",
        title: "Edge check",
        boundaryConsumed: true,
        createdAt: "2026-11-23T00:00:00.000Z",
        updatedAt: "2026-11-23T00:00:00.000Z",
      },
    ],
    rpcHandler(method, params) {
      if (method === "thread/list") return { data: [], nextCursor: null };
      if (method === "thread/turns/list") {
        assert.equal(params.cursor, "cursor-older-1");
        assert.equal(params.sortDirection, "desc");
        return {
          data: [
            {
              id: "turn-0",
              status: "completed",
              items: [
                { id: "u0", type: "userMessage", content: [{ type: "text", text: "Older Q" }] },
                { id: "a0", type: "agentMessage", text: "Older A" },
              ],
            },
          ],
          nextCursor: null,
        };
      }
      if (method === "thread/name/set") return {};
      return {};
    },
    snapshotHandler(threadId, body) {
      snapshotRound += 1;
      const known = body.knownTurns as Array<{ id: string; fingerprint: string }> | undefined;
      // On round 2, simulate Host sending an unknown unchanged placeholder so fallback to knownTurns:[] triggers
      if (snapshotRound === 2 && known && known.length > 0) {
        return makeSnapshot({
          threadId,
          cursor: { epoch: EPOCH_1, sequence: 2 },
          turnsPage: {
            nextCursor: "cursor-older-1",
            data: [
              {
                id: "turn-unknown",
                status: "completed",
                fingerprint: "fp-mismatch",
                items: [],
                unchanged: true,
              },
            ],
          },
        });
      }
      return makeSnapshot({
        threadId,
        cursor: { epoch: EPOCH_1, sequence: snapshotRound },
        interactions: [mcpInteraction, questionInteraction],
        turnsPage: {
          nextCursor: "cursor-older-1",
          data: [
            {
              id: "turn-1",
              status: "completed",
              fingerprint: "fp-turn-1",
              items: [
                { id: "u1", type: "userMessage", content: [{ type: "text", text: "Recent Q" }] },
                { id: "a1", type: "agentMessage", text: "Recent A" },
              ],
            },
          ],
        },
      });
    },
    respondHandler() {
      if (respondShouldFail) {
        throw new SideChatRpcError(-32072, "External Native Session is busy");
      }
      return { resolved: true };
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    autoConnectEvents: false,
  });
  await controller.setSourceThread("main-edge");

  // Trigger unresolved placeholder fallback (round 2 returns placeholder -> round 3 retries with knownTurns: [])
  await controller.refreshSnapshot("sc-edge");
  assert.equal(env.snapshotCalls.length, 3);
  assert.deepEqual(env.snapshotCalls[2]!.body.knownTurns, []);

  // Load older turns -> prepends turn-0 before turn-1
  await controller.loadOlderTurns("sc-edge");
  assert.deepEqual(
    controller.getSnapshot().activeSession?.turns.map((t) => t.id),
    ["turn-0", "turn-1"],
  );
  assert.equal(controller.getSnapshot().activeSession?.hasOlderTurns, false);

  // MCP persist approval payload
  await controller.respondToInteraction("sc-edge", mcpInteraction, {
    kind: "approval",
    actionId: "allow_always",
  });
  assert.deepEqual(env.respondCalls[0], {
    epoch: EPOCH_1,
    threadId: "sc-edge",
    requestId: "mcp-persist-1",
    result: { action: "accept", content: {}, _meta: { persist: "always" } },
  });

  // Question interaction payload
  await controller.respondToInteraction("sc-edge", questionInteraction, {
    kind: "question",
    answers: [{ id: "mode", selected: ["JSON"] }],
  });
  assert.deepEqual(env.respondCalls[1], {
    epoch: EPOCH_1,
    threadId: "sc-edge",
    requestId: "q-edge-1",
    result: { answers: { mode: { answers: ["JSON"] } } },
  });

  // Respond error must NOT auto-retry and must clear respondingRequestIds
  respondShouldFail = true;
  await assert.rejects(() =>
    controller.respondToInteraction("sc-edge", mcpInteraction, {
      kind: "approval",
      actionId: "deny",
    }),
  );
  assert.equal(env.respondCalls.length, 3);
  assert.deepEqual(controller.getSnapshot().respondingRequestIds, []);

  // Rename & delete
  await controller.renameThread("sc-edge", "Renamed Edge");
  assert.equal(controller.getSnapshot().threads[0]?.title, "Renamed Edge");
  assert.equal(env.records.get("sc-edge")?.title, "Renamed Edge");

  await controller.deleteThread("sc-edge");
  assert.equal(controller.getSnapshot().threads.length, 0);
  assert.equal(controller.getSnapshot().activeThreadId, null);
  assert.equal(env.records.has("sc-edge"), false);

  controller.dispose();
});

test("Desktop side chat with empty preview but existing snapshot turns still skips boundary injection", async () => {
  const env = createMockEnv({
    rpcHandler(method) {
      if (method === "thread/list") {
        return {
          data: [
            {
              id: "sc-desktop-empty-preview",
              attachedToThreadId: "main-empty-preview",
              name: "Desktop Thread",
              preview: "",
              createdAt: 1_800_000_000,
              updatedAt: 1_800_000_010,
              status: { type: "idle" },
            },
          ],
          nextCursor: null,
        };
      }
      if (method === "turn/start") return { turn: { id: "turn-2" } };
      return {};
    },
    snapshotHandler(threadId) {
      return makeSnapshot({
        threadId,
        turnsPage: {
          nextCursor: null,
          data: [
            {
              id: "turn-1",
              status: "completed",
              items: [{ id: "u1", type: "userMessage", content: [{ type: "text", text: "Prior" }] }],
            },
          ],
        },
      });
    },
  });

  const controller = new SideChatController({
    fetch: env.mockFetch,
    autoConnectEvents: false,
  });
  await controller.setSourceThread("main-empty-preview", { autoSelectFirst: false });
  assert.equal(controller.getSnapshot().threads[0]?.boundaryConsumed, false);

  // Sending directly without prior selectThread inspects snapshot first and skips boundary injection
  await controller.sendMessage("sc-desktop-empty-preview", "Follow up without boundary");
  const startCall = env.rpcCalls.find((c) => c.method === "turn/start");
  assert.ok(startCall);
  assert.equal(
    (startCall.params.input as Array<{ text: string }>)[0]!.text,
    "Follow up without boundary",
  );
  controller.dispose();
});
