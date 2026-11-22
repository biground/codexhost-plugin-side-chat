import assert from "node:assert/strict";
import test from "node:test";

import { SIDE_CHAT_BOUNDARY_START } from "../src/client/boundary.ts";
import {
  BTW_TRIGGER_SOURCE_NAME,
  createBtwInputTriggerSource,
  matchesBtwQuery,
  parseBtwCommandLine,
} from "../src/client/btw-trigger.ts";
import { SideChatController } from "../src/client/controller.ts";
import {
  SIDE_CHAT_SHORTCUT_DEFAULTS,
  SIDE_CHAT_SHORTCUT_ID,
  SIDE_CHAT_TAB_KIND,
  apply,
  name as pluginName,
} from "../src/client/index.tsx";
import { SIDE_CHAT_LOCALE_NS, createSideChatTranslator } from "../src/client/locales.ts";
import { SideChatRpcError, type ClientThreadSnapshot } from "../src/client/protocol.ts";
import { resolveMainSessionFromSnapshot } from "../src/client/session-source.ts";
import { SideChatTabManager } from "../src/client/tab-manager.ts";
import type {
  ClientInputTriggerSource,
  ClientPluginContext,
  ClientSessionListRow,
  ClientSessionListSnapshot,
  ClientShortcutCommand,
  ClientSidebarTabDefinition,
  ClientSidebarTabRecord,
  SideChatRecord,
} from "../src/types.ts";

const EPOCH_1 = "11111111-1111-4111-8111-111111111111";

/** Exact mirror of CodexHost SubmitMachine `argsAfter(draft, token)` for strict contract testing. */
function hostArgsAfter(draft: string, token: string): string {
  const s = draft.trimStart();
  if (s.startsWith(token)) return s.slice(token.length);
  const base = token.trimEnd();
  if (s.startsWith(base)) {
    const rest = s.slice(base.length);
    return /^\s/.test(rest) ? rest.slice(1) : rest;
  }
  return "";
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function makeEmptySnapshot(threadId: string): ClientThreadSnapshot {
  return {
    cursor: { epoch: EPOCH_1, sequence: 1 },
    activeTurnId: null,
    thread: {
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
    turnsPage: { data: [], nextCursor: null },
    configuration: {},
    interactions: [],
  };
}

interface MockGatewayConfig {
  forkHandler?: (params: Record<string, unknown>) => unknown | Promise<unknown>;
  turnStartHandler?: (params: Record<string, unknown>) => unknown | Promise<unknown>;
  archiveHandler?: (params: Record<string, unknown>) => unknown | Promise<unknown>;
  initialRecords?: SideChatRecord[];
}

function createGateway(config: MockGatewayConfig = {}) {
  const records = new Map<string, SideChatRecord>(
    (config.initialRecords ?? []).map((item) => [item.threadId, item]),
  );
  const rpcCalls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const storeCalls: Array<{ method: string; path: string; body?: unknown }> = [];
  let forkSeq = 0;

  const mockFetch: typeof fetch = async (input, init) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const rawBody = typeof init?.body === "string" ? init.body : undefined;
    const body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : undefined;

    if (url.pathname === "/api/ch/v1/events") {
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          init?.signal?.addEventListener("abort", () => {
            try {
              controller.close();
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
    }

    if (url.pathname === "/api/ch/v1/rpc") {
      const rpcMethod = String(body?.method ?? "");
      const rpcParams = (body?.params ?? {}) as Record<string, unknown>;
      rpcCalls.push({ method: rpcMethod, params: rpcParams });
      try {
        if (rpcMethod === "thread/fork") {
          if (config.forkHandler) {
            return jsonResponse({ result: await config.forkHandler(rpcParams) }, 200);
          }
          forkSeq += 1;
          return jsonResponse({ result: { thread: { id: `side-${forkSeq}` } } }, 200);
        }
        if (rpcMethod === "turn/start") {
          if (config.turnStartHandler) {
            return jsonResponse({ result: await config.turnStartHandler(rpcParams) }, 200);
          }
          return jsonResponse({ result: { turn: { id: "turn-1" } } }, 200);
        }
        if (rpcMethod === "thread/archive") {
          if (config.archiveHandler) {
            return jsonResponse({ result: await config.archiveHandler(rpcParams) }, 200);
          }
          return jsonResponse({ result: {} }, 200);
        }
        if (rpcMethod === "thread/list") {
          return jsonResponse({ result: { data: [], nextCursor: null } }, 200);
        }
        return jsonResponse({ result: {} }, 200);
      } catch (error) {
        if (error instanceof SideChatRpcError) {
          return jsonResponse(
            { error: { code: error.code, message: error.message } },
            error.status ?? 400,
          );
        }
        throw error;
      }
    }

    if (url.pathname === "/api/ch/v1/snapshot") {
      const threadId = String(body?.threadId ?? "side-1");
      return jsonResponse({ result: makeEmptySnapshot(threadId) }, 200);
    }

    if (url.pathname === "/codexhost-side-chat/threads") {
      storeCalls.push({ method, path: `${url.pathname}${url.search}`, body });
      if (method === "GET") {
        const sourceId = url.searchParams.get("sourceThreadId");
        const threads = [...records.values()].filter((r) =>
          sourceId ? r.sourceThreadId === sourceId : true,
        );
        return jsonResponse({ threads }, 200);
      }
      if (method === "POST") {
        const now = new Date().toISOString();
        const tid = String(body?.threadId);
        const record: SideChatRecord = {
          threadId: tid,
          sourceThreadId: String(body?.sourceThreadId),
          mode: body?.mode as "persistent" | "ephemeral",
          title: typeof body?.title === "string" ? body.title : "",
          boundaryConsumed: Boolean(body?.boundaryConsumed),
          createdAt: now,
          updatedAt: now,
        };
        records.set(tid, record);
        return jsonResponse({ thread: record, threads: [...records.values()] }, 201);
      }
    }

    const byId = /^\/codexhost-side-chat\/threads\/([^/]+)$/u.exec(url.pathname);
    if (byId?.[1]) {
      const tid = decodeURIComponent(byId[1]);
      storeCalls.push({ method, path: `${url.pathname}${url.search}`, body });
      if (method === "PATCH") {
        const existing = records.get(tid);
        if (!existing) {
          return jsonResponse({ error: { code: "side-chat/not-found", message: "Not found" } }, 404);
        }
        const updated: SideChatRecord = {
          ...existing,
          ...(typeof body?.title === "string" ? { title: body.title } : {}),
          ...(typeof body?.boundaryConsumed === "boolean"
            ? { boundaryConsumed: body.boundaryConsumed }
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

  return { mockFetch, rpcCalls, storeCalls, records };
}

function createMockHostContext(options: {
  sessions?: Record<string, ClientSessionListRow>;
  existingTabs?: Record<string, ClientSidebarTabRecord[]>;
  expanded?: boolean;
  mountedSessionId?: string;
  locale?: string;
} = {}) {
  let sessionRows: Record<string, ClientSessionListRow> = { ...(options.sessions ?? {}) };
  const sessionListeners = new Set<() => void>();
  let expanded = options.expanded ?? false;
  let activeLocale = options.locale ?? "zh";

  const notifications: Array<{ sessionId: string; level: "info" | "error"; text: string }> = [];
  const bailEvents: Array<{ sessionId: string; event: string; payload: Record<string, unknown> }> = [];
  const openTabCalls: Array<{ sessionId?: string; kind: string; options?: unknown }> = [];
  const focusTabCalls: string[] = [];
  let toggleExpandedCalls = 0;

  const registeredLocales: Array<{ namespace: string; dictionaries: Record<string, Record<string, string>> }> = [];
  const registeredShortcuts: ClientShortcutCommand[] = [];
  const registeredTabDefs: ClientSidebarTabDefinition[] = [];
  const registeredSlots: Array<{ name: string; key?: string; locale?: string }> = [];
  const registeredTriggerSources: ClientInputTriggerSource[] = [];
  const effectDisposers: Array<() => void> = [];

  const ctx: ClientPluginContext = {
    effect(callback) {
      const cleanup = callback();
      if (typeof cleanup === "function") {
        effectDisposers.push(cleanup);
      }
    },
    slots: {
      inject(_name, register) {
        return register();
      },
      register(opts) {
        registeredSlots.push({
          name: opts.name,
          ...(opts.key ? { key: opts.key } : {}),
          ...(opts.locale ? { locale: opts.locale } : {}),
        });
        return () => {};
      },
    },
    locale: {
      register(namespace, dictionaries) {
        registeredLocales.push({ namespace, dictionaries });
        return () => {};
      },
      bind(namespace) {
        return (key, params) => {
          const entry = registeredLocales.find((item) => item.namespace === namespace);
          const dict = entry?.dictionaries[activeLocale] ?? entry?.dictionaries.en;
          const template = dict?.[key] ?? key;
          if (!params) return template;
          return template.replace(/\{(\w+)\}/gu, (m, k: string) =>
            k in params ? String(params[k]) : m,
          );
        };
      },
      getLocale: () => ({ active: activeLocale }),
      subscribe: () => () => {},
    },
    sidebarRight: {
      mounted: {
        getSnapshot: () => options.mountedSessionId,
        subscribe: () => () => {},
      },
      tabsIn: (sessionId) => options.existingTabs?.[sessionId] ?? [],
      openTab(kind, opts) {
        openTabCalls.push({ kind, options: opts });
      },
      openTabIn(sessionId, kind, opts) {
        openTabCalls.push({ sessionId, kind, options: opts });
      },
      focus(tabId) {
        focusTabCalls.push(tabId);
      },
      isExpanded: () => expanded,
      toggleExpanded() {
        toggleExpandedCalls += 1;
        expanded = !expanded;
      },
      commandTarget: () =>
        options.mountedSessionId
          ? { sessionId: options.mountedSessionId, paneId: "pane-1", host: "dock" }
          : undefined,
      openTabFromTarget(kind, target) {
        openTabCalls.push({ sessionId: target.sessionId, kind, options: { fromTarget: target } });
      },
      registerCloseHandler: () => () => {},
    },
    sidebarRightTabs: {
      register(def) {
        registeredTabDefs.push(def);
        return () => {};
      },
    },
    shortcuts: {
      catalog: {
        getSnapshot: () => [],
        subscribe: () => () => {},
      },
      register(cmd) {
        registeredShortcuts.push(cmd);
        return () => {};
      },
    },
    sessions: {
      list: {
        getSnapshot: (): ClientSessionListSnapshot => ({ byId: sessionRows }),
        subscribe(listener) {
          sessionListeners.add(listener);
          return () => {
            sessionListeners.delete(listener);
          };
        },
      },
      scope(sessionId) {
        return {
          get(serviceName: string) {
            if (serviceName === "conversation") {
              return {
                input: {
                  for() {
                    return {
                      notify(level: "info" | "error", text: string) {
                        notifications.push({ sessionId, level, text });
                      },
                    };
                  },
                },
              };
            }
            return undefined;
          },
          bail(_subject, event, payload) {
            bailEvents.push({ sessionId, event, payload });
            return true;
          },
        };
      },
    },
    commandUi: {},
    inputTriggers: {
      registerSource(source) {
        registeredTriggerSources.push(source);
        return () => {};
      },
    },
  };

  return {
    ctx,
    notifications,
    bailEvents,
    openTabCalls,
    focusTabCalls,
    getToggleExpandedCalls: () => toggleExpandedCalls,
    registeredLocales,
    registeredShortcuts,
    registeredTabDefs,
    registeredSlots,
    registeredTriggerSources,
    setSessionRows(next: Record<string, ClientSessionListRow>) {
      sessionRows = next;
      for (const listener of sessionListeners) listener();
    },
    setLocale(next: string) {
      activeLocale = next;
    },
    disposeEffects() {
      for (const fn of effectDisposers.reverse()) fn();
    },
  };
}

test("parseBtwCommandLine & matchesBtwQuery handle case, multiline, and boundaries accurately", () => {
  assert.deepEqual(parseBtwCommandLine("/btw"), { rawPrefix: "/btw", args: "" });
  assert.deepEqual(parseBtwCommandLine("  /BTW   why is it slow? "), {
    rawPrefix: "/BTW",
    args: "why is it slow?",
  });
  assert.deepEqual(parseBtwCommandLine("/btw\nline 1\nline 2"), {
    rawPrefix: "/btw",
    args: "line 1\nline 2",
  });
  assert.equal(parseBtwCommandLine("/btwsomething hello"), null);
  assert.equal(parseBtwCommandLine("/plan do work"), null);
  assert.equal(parseBtwCommandLine("regular text /btw"), null);

  assert.equal(matchesBtwQuery(""), true);
  assert.equal(matchesBtwQuery("bt"), true);
  assert.equal(matchesBtwQuery("BTW"), true);
  assert.equal(matchesBtwQuery("side"), true);
  assert.equal(matchesBtwQuery("chat"), true);
  assert.equal(matchesBtwQuery("侧边"), true);
  assert.equal(matchesBtwQuery("旁路"), true);
  assert.equal(matchesBtwQuery("terminal"), false);
});

test("resolveMainSessionFromSnapshot guards blank drafts, remote Hosts, and extracts local threadId", () => {
  const snap: ClientSessionListSnapshot = {
    byId: {
      draft: { id: "draft", blank: true, running: false },
      remote: {
        id: "remote",
        blank: false,
        projectionValues: { threadReference: { hostId: "ssh-host-1", threadId: "t-remote" } },
      },
      localRunning: {
        id: "localRunning",
        blank: false,
        running: true,
        projectionValues: { threadReference: { hostId: "local", threadId: "host-thread-99" } },
      },
      fallbackId: {
        id: "fallbackId",
        blank: false,
        running: false,
      },
    },
  };

  assert.deepEqual(resolveMainSessionFromSnapshot("missing", snap), {
    status: "draft",
    reason: "missing",
  });
  assert.deepEqual(resolveMainSessionFromSnapshot("draft", snap), {
    status: "draft",
    reason: "blank",
  });
  assert.deepEqual(resolveMainSessionFromSnapshot("remote", snap), {
    status: "remote-unsupported",
    hostId: "ssh-host-1",
  });
  assert.deepEqual(resolveMainSessionFromSnapshot("localRunning", snap), {
    status: "ready",
    sourceThreadId: "host-thread-99",
    running: true,
  });
  assert.deepEqual(resolveMainSessionFromSnapshot("fallbackId", snap), {
    status: "ready",
    sourceThreadId: "fallbackId",
    running: false,
  });
});

test("/btw candidates appear in leading `/` and `+` launcher and stay enabled while main session is running", async () => {
  const host = createMockHostContext({
    sessions: {
      s1: {
        id: "s1",
        blank: false,
        running: true,
        projectionValues: { threadReference: { hostId: "local", threadId: "thread-1" } },
      },
    },
  });
  const manager = new SideChatTabManager({ autoConnectEvents: false, locale: "zh" });
  const source = createBtwInputTriggerSource(host.ctx, manager, {
    t: createSideChatTranslator("zh"),
    getLocale: () => "zh",
  });

  assert.equal(source.name, BTW_TRIGGER_SOURCE_NAME);
  assert.equal(source.trigger, "/");
  assert.equal(source.launcher, "command");
  assert.equal(source.order, 5);
  assert.equal(source.launcherOrder, 15);
  assert.equal(source.showGroupTitle, false);

  const signal = new AbortController().signal;

  for (const query of ["", "btw", "side", "chat", "侧边", "旁路"]) {
    const items = await source.candidates(
      { sessionId: "s1" },
      { query, position: "leading", drilled: false, signal },
    );
    assert.equal(items.length, 1, `query "${query}" should match /btw`);
    assert.equal(items[0]?.name, "btw");
    assert.equal(items[0]?.disabledReason, undefined, "must NOT disable /btw while main session is running");
  }

  // Inline typed `/` without launcher must not show `/btw`
  const inlineItems = await source.candidates(
    { sessionId: "s1" },
    { query: "btw", position: "inline", drilled: false, signal },
  );
  assert.equal(inlineItems.length, 0);

  // Programmatic `+` command launcher still surfaces `/btw` even if caret is inline
  const launcherItems = await source.candidates(
    { sessionId: "s1" },
    { query: "", position: "inline", launcher: "command", drilled: false, signal },
  );
  assert.equal(launcherItems.length, 1);
  assert.equal(launcherItems[0]?.name, "btw");

  manager.dispose();
});

test("/btw onPick consumes typed token, opens or focuses sidechat tab, and guards blank draft sessions", () => {
  const host = createMockHostContext({
    sessions: {
      ready: {
        id: "ready",
        blank: false,
        running: true,
        projectionValues: { threadReference: { hostId: "local", threadId: "t-ready" } },
      },
      hasExisting: {
        id: "hasExisting",
        blank: false,
        projectionValues: { threadReference: { hostId: "local", threadId: "t-existing" } },
      },
      draft: { id: "draft", blank: true },
    },
    existingTabs: {
      hasExisting: [
        { id: "tab-sc-1", kind: "sidechat", contentId: "sidebar://sidechat/1", title: "Side Chat" },
      ],
    },
    mountedSessionId: "hasExisting",
    expanded: false,
  });
  const manager = new SideChatTabManager({ autoConnectEvents: false, locale: "zh" });
  const source = createBtwInputTriggerSource(host.ctx, manager, {
    t: createSideChatTranslator("zh"),
    getLocale: () => "zh",
  });

  // 1. Typed `/btw` menu pick on ready session with no open sidechat tab
  const pickOutcome = source.onPick({
    trigger: "/",
    candidate: { name: "btw" },
    session: { sessionId: "ready" },
    position: "leading",
    via: "menu",
    action: "pick",
    span: { start: 0, end: 4, draftRev: 7 },
  });
  assert.equal(pickOutcome, "handled");
  assert.equal(host.bailEvents.length, 1);
  assert.equal(host.bailEvents[0]?.event, "slash/input-consume-token");
  assert.deepEqual(host.bailEvents[0]?.payload, {
    guard: { kind: "span", span: { start: 0, end: 4, draftRev: 7 } },
  });
  assert.equal(host.openTabCalls.length, 1);
  assert.equal(host.openTabCalls[0]?.sessionId, "ready");
  assert.equal(host.openTabCalls[0]?.kind, "sidechat");

  // 2. Existing sidechat tab in collapsed sidebar -> expands, focuses existing tab, bumps focus nonce
  const focusObs = manager.focusObservableForTab("hasExisting", "tab-sc-1");
  const beforeFocus = focusObs.getSnapshot();
  source.onPick({
    trigger: "/",
    candidate: { name: "btw" },
    session: { sessionId: "hasExisting" },
    position: "leading",
    via: "menu",
    action: "pick",
    span: { start: 0, end: 0, draftRev: 2 }, // `+` launcher empty span -> no consume-token
  });
  assert.equal(host.bailEvents.length, 1, "empty span must not dispatch consume-token");
  assert.equal(host.getToggleExpandedCalls(), 1);
  assert.deepEqual(host.focusTabCalls, ["tab-sc-1"]);
  assert.ok(focusObs.getSnapshot() > beforeFocus);

  // 3. Blank draft main session -> error notice, draft untouched, no tab opened
  source.onPick({
    trigger: "/",
    candidate: { name: "btw" },
    session: { sessionId: "draft" },
    position: "leading",
    via: "menu",
    action: "pick",
    span: { start: 0, end: 4, draftRev: 1 },
  });
  assert.equal(host.notifications.length, 1);
  assert.equal(host.notifications[0]?.level, "error");
  assert.match(host.notifications[0]!.text, /主会话发送首条消息/u);
  assert.equal(host.bailEvents.length, 1, "blank draft must keep user input intact");

  manager.dispose();
});

test("/btw matchSpace and matchEnter intercept argued `/btw <question>` while main session is running (never leaks to main)", async () => {
  const gateway = createGateway();
  const host = createMockHostContext({
    sessions: {
      sRun: {
        id: "sRun",
        blank: false,
        running: true,
        projectionValues: { threadReference: { hostId: "local", threadId: "main-thread-1" } },
      },
    },
  });
  const manager = new SideChatTabManager({
    fetch: gateway.mockFetch,
    autoConnectEvents: false,
    locale: "zh",
  });
  const source = createBtwInputTriggerSource(host.ctx, manager, {
    t: createSideChatTranslator("zh"),
    getLocale: () => "zh",
  });

  // matchSpace claims `/btw` and `/BTW`, ignores others
  const spaceOutcome = source.matchSpace?.({ sessionId: "sRun" }, "/btw");
  assert.ok(spaceOutcome && typeof spaceOutcome === "object" && "claim" in spaceOutcome);
  assert.equal(spaceOutcome.claim.name, "btw");
  assert.equal(spaceOutcome.claim.token, "/btw ");
  assert.equal(source.matchSpace?.({ sessionId: "sRun" }, "/plan"), undefined);

  // Direct Enter with uppercase `/BTW` + multiline question
  const rawDraft = "/BTW   Why did build fail?\nCheck line 42.";
  const signal = new AbortController().signal;
  const enterOutcome = await source.matchEnter?.(
    { sessionId: "sRun" },
    rawDraft,
    signal,
    { attachments: 0 },
  );
  assert.ok(enterOutcome && typeof enterOutcome === "object" && "claim" in enterOutcome);
  assert.equal(enterOutcome.claim.token, "/BTW ");

  const extractedArgs = hostArgsAfter(rawDraft, enterOutcome.claim.token);
  assert.equal(extractedArgs.trim(), "Why did build fail?\nCheck line 42.");

  const submitResult = await enterOutcome.claim.submit(extractedArgs, {}, []);
  assert.deepEqual(submitResult, { kind: "success" });

  // Wait a microtask tick for background sendMessage to execute turn/start
  await new Promise((resolve) => setTimeout(resolve, 25));

  const forkCall = gateway.rpcCalls.find((c) => c.method === "thread/fork");
  assert.ok(forkCall, "expected thread/fork RPC");
  assert.deepEqual(forkCall.params, {
    threadId: "main-thread-1",
    attachToSource: true,
    excludeTurns: true,
  });

  const turnStartCall = gateway.rpcCalls.find((c) => c.method === "turn/start");
  assert.ok(turnStartCall, "expected turn/start RPC on the forked side chat");
  assert.equal(turnStartCall.params.threadId, "side-1");
  const inputParts = turnStartCall.params.input as Array<{ text: string }>;
  assert.ok(inputParts[0]!.text.startsWith(SIDE_CHAT_BOUNDARY_START));
  assert.ok(inputParts[0]!.text.includes("Why did build fail?\nCheck line 42."));

  assert.equal(host.openTabCalls.length, 1);
  assert.equal(host.openTabCalls[0]?.sessionId, "sRun");
  assert.equal(host.openTabCalls[0]?.kind, "sidechat");
  const openParams = (host.openTabCalls[0]?.options as { params?: { sideThreadId?: string } })?.params;
  assert.equal(openParams?.sideThreadId, "side-1");

  // Bare `/btw` via matchEnter simply opens/focuses sidechat tab without forking
  const bareOutcome = await source.matchEnter?.({ sessionId: "sRun" }, "/btw", signal, {
    attachments: 0,
  });
  assert.ok(bareOutcome && typeof bareOutcome === "object" && "claim" in bareOutcome);
  const bareSubmit = await bareOutcome.claim.submit("", {}, []);
  assert.deepEqual(bareSubmit, { kind: "success" });
  assert.equal(gateway.rpcCalls.filter((c) => c.method === "thread/fork").length, 1);

  manager.dispose();
});

test("/btw matchEnter rejects attachments, blank main sessions, and fork errors while preserving draft", async () => {
  const gateway = createGateway({
    forkHandler() {
      throw new SideChatRpcError(-32080, "No fork checkpoint available");
    },
  });
  const host = createMockHostContext({
    sessions: {
      draftSession: { id: "draftSession", blank: true },
      readySession: {
        id: "readySession",
        blank: false,
        projectionValues: { threadReference: { hostId: "local", threadId: "main-err" } },
      },
    },
  });
  const manager = new SideChatTabManager({
    fetch: gateway.mockFetch,
    autoConnectEvents: false,
    locale: "zh",
  });
  const source = createBtwInputTriggerSource(host.ctx, manager, {
    t: createSideChatTranslator("zh"),
    getLocale: () => "zh",
  });
  const signal = new AbortController().signal;

  // 1. Attachments rejected via thrown error (SubmitMachine keeps draft + attachments)
  await assert.rejects(
    async () => {
      await source.matchEnter?.({ sessionId: "readySession" }, "/btw check image", signal, {
        attachments: 1,
      });
    },
    /不支持携带附件/u,
  );

  // 2. Blank main session returns error outcome and never calls fork
  const draftOutcome = await source.matchEnter?.(
    { sessionId: "draftSession" },
    "/btw explain this",
    signal,
    { attachments: 0 },
  );
  assert.ok(draftOutcome && typeof draftOutcome === "object" && "claim" in draftOutcome);
  const draftSubmit = await draftOutcome.claim.submit("explain this", {}, []);
  assert.equal(draftSubmit.kind, "error");
  assert.match(draftSubmit.text ?? "", /主会话发送首条消息/u);
  assert.equal(gateway.rpcCalls.length, 0);
  assert.equal(host.openTabCalls.length, 0);

  // 3. Fork -32080 returns localized error outcome, preserves draft, does NOT open tab
  const errOutcome = await source.matchEnter?.(
    { sessionId: "readySession" },
    "/btw explain fork error",
    signal,
    { attachments: 0 },
  );
  assert.ok(errOutcome && typeof errOutcome === "object" && "claim" in errOutcome);
  const errSubmit = await errOutcome.claim.submit("explain fork error", {}, []);
  assert.equal(errSubmit.kind, "error");
  assert.match(errSubmit.text ?? "", /分叉检查点/u);
  assert.equal(host.openTabCalls.length, 0);

  manager.dispose();
});

test("deleteThread archives persistent side chats via thread/archive before removing store record, and skips archive for ephemeral", async () => {
  const now = new Date().toISOString();
  const gateway = createGateway({
    initialRecords: [
      {
        threadId: "persist-1",
        sourceThreadId: "main-1",
        mode: "persistent",
        title: "Persistent chat",
        boundaryConsumed: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        threadId: "ephem-1",
        sourceThreadId: "main-1",
        mode: "ephemeral",
        title: "Ephemeral chat",
        boundaryConsumed: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
  });

  const controller = new SideChatController({
    fetch: gateway.mockFetch,
    autoConnectEvents: false,
  });
  await controller.setSourceThread("main-1", { autoSelectFirst: false });

  await controller.deleteThread("persist-1");
  const archiveCalls = gateway.rpcCalls.filter((call) => call.method === "thread/archive");
  assert.equal(archiveCalls.length, 1);
  assert.deepEqual(archiveCalls[0]?.params, { threadId: "persist-1" });
  assert.equal(gateway.records.has("persist-1"), false);

  await controller.deleteThread("ephem-1");
  assert.equal(
    gateway.rpcCalls.filter((call) => call.method === "thread/archive").length,
    1,
    "ephemeral delete must not invoke thread/archive",
  );
  assert.equal(gateway.records.has("ephem-1"), false);

  controller.dispose();
});

test("apply(ctx) registers locale, web-legal conflict-free shortcut, sidebarRightTabs, 3 slots, and /btw inputTrigger", () => {
  const host = createMockHostContext({
    mountedSessionId: "session-42",
    sessions: {
      "session-42": {
        id: "session-42",
        blank: false,
        projectionValues: { threadReference: { hostId: "local", threadId: "thread-42" } },
      },
    },
  });

  apply(host.ctx);

  // 1. Locale registered with zh and en dictionaries
  assert.equal(host.registeredLocales.length, 1);
  assert.equal(host.registeredLocales[0]?.namespace, SIDE_CHAT_LOCALE_NS);
  assert.ok(host.registeredLocales[0]?.dictionaries.zh);
  assert.ok(host.registeredLocales[0]?.dictionaries.en);

  // 2. Shortcut registered with Web-legal (>=3 modifiers on web) and conflict-free defaults
  assert.equal(host.registeredShortcuts.length, 1);
  const shortcut = host.registeredShortcuts[0]!;
  assert.equal(shortcut.id, SIDE_CHAT_SHORTCUT_ID);
  for (const profile of [
    "desktop:macos",
    "desktop:windows",
    "desktop:linux",
    "web:macos",
    "web:windows",
  ] as const) {
    const binding = shortcut.defaults[profile];
    assert.ok(binding, `expected binding for ${profile}`);
    assert.equal(binding.code, "KeyB");
    assert.deepEqual([...binding.modifiers], ["primary", "alt", "shift"]);
  }
  assert.deepEqual(shortcut.defaults, SIDE_CHAT_SHORTCUT_DEFAULTS);

  // Shortcut resolves and opens sidechat tab
  const resolved = shortcut.resolve({ region: "page", modal: null, target: null });
  assert.equal(resolved.status, "handled");
  if (resolved.status === "handled") resolved.run();
  assert.equal(host.openTabCalls.length, 1);
  assert.equal(host.openTabCalls[0]?.kind, SIDE_CHAT_TAB_KIND);

  // 3. sidebarRightTabs registered
  assert.equal(host.registeredTabDefs.length, 1);
  const tabDef = host.registeredTabDefs[0]!;
  assert.equal(tabDef.id, pluginName);
  assert.equal(tabDef.kind, SIDE_CHAT_TAB_KIND);
  assert.equal(tabDef.multiple, true);
  assert.equal(tabDef.keepMounted, true);
  assert.equal(tabDef.guide?.length, 1);
  assert.equal(tabDef.guide?.[0]?.commandId, SIDE_CHAT_SHORTCUT_ID);

  // 4. All 3 right-sidebar slots registered under plugin key
  const slotNames = host.registeredSlots.map((slot) => slot.name).sort();
  assert.deepEqual(slotNames, [
    "sidebar.right.pane.tab",
    "sidebar.right.pane.tab.title",
    "sidebar.right.tab.guide.entry",
  ]);
  for (const slot of host.registeredSlots) {
    assert.equal(slot.key, pluginName);
    assert.equal(slot.locale, SIDE_CHAT_LOCALE_NS);
  }

  // 5. /btw input trigger source registered
  assert.equal(host.registeredTriggerSources.length, 1);
  assert.equal(host.registeredTriggerSources[0]?.name, BTW_TRIGGER_SOURCE_NAME);
  assert.equal(host.registeredTriggerSources[0]?.trigger, "/");
  assert.equal(host.registeredTriggerSources[0]?.launcher, "command");

  host.disposeEffects();
});
