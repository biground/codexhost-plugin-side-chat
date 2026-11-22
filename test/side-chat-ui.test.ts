import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TestRenderer, { act } from "react-test-renderer";

import {
  SIDE_CHAT_BOUNDARY_BLOCK,
  SIDE_CHAT_BOUNDARY_START,
  injectSideChatBoundary,
} from "../src/client/boundary.ts";
import { SideChatController } from "../src/client/controller.ts";
import type { ClientInteraction } from "../src/client/interactions.ts";
import { createSideChatTranslator } from "../src/client/locales.ts";
import type { ClientThreadSnapshot } from "../src/client/protocol.ts";
import { SideChatGuide } from "../src/client/SideChatGuide.tsx";
import { SideChatPanelView } from "../src/client/SideChatPanel.tsx";
import { SideChatTitle } from "../src/client/SideChatTitle.tsx";
import type { ClientSidebarTabInfo, SideChatRecord } from "../src/types.ts";

const EPOCH_1 = "11111111-1111-4111-8111-111111111111";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function makeFixtureEnv(options: {
  records: SideChatRecord[];
  snapshots: Record<string, ClientThreadSnapshot>;
  attachedRows?: Array<Record<string, unknown>>;
}) {
  const records = new Map(options.records.map((r) => [r.threadId, r]));
  const rpcCalls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const respondCalls: Array<Record<string, unknown>> = [];

  const mockFetch: typeof fetch = async (input, init) => {
    const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const url = new URL(rawUrl, "http://localhost");
    const method = (init?.method ?? "GET").toUpperCase();
    const body = typeof init?.body === "string" ? (JSON.parse(init.body) as Record<string, unknown>) : undefined;

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
      if (rpcMethod === "thread/list") {
        return jsonResponse({ result: { data: options.attachedRows ?? [], nextCursor: null } }, 200);
      }
      if (rpcMethod === "thread/fork") {
        return jsonResponse({ result: { thread: { id: "sc-new" } } }, 200);
      }
      return jsonResponse({ result: {} }, 200);
    }

    if (url.pathname === "/api/ch/v1/snapshot") {
      const threadId = String(body?.threadId ?? "");
      const snap = options.snapshots[threadId] ?? {
        cursor: { epoch: EPOCH_1, sequence: 1 },
        activeTurnId: null,
        thread: {
          id: threadId,
          cwd: "/repo",
          modelProvider: "codexhost",
          createdAt: 1_700_000_000,
          updatedAt: 1_700_000_010,
          status: { type: "idle" },
          turns: [],
        },
        turnsPage: { data: [], nextCursor: null },
        configuration: {},
        interactions: [],
      };
      return jsonResponse({ result: snap }, 200);
    }

    if (url.pathname === "/api/ch/v1/respond") {
      respondCalls.push(body ?? {});
      return jsonResponse({ result: { resolved: true } }, 200);
    }

    if (url.pathname === "/codexhost-side-chat/threads") {
      if (method === "GET") {
        return jsonResponse({ threads: [...records.values()] }, 200);
      }
      if (method === "POST") {
        const now = new Date().toISOString();
        const rec: SideChatRecord = {
          threadId: String(body?.threadId),
          sourceThreadId: String(body?.sourceThreadId),
          mode: body?.mode as "persistent" | "ephemeral",
          title: String(body?.title ?? ""),
          boundaryConsumed: Boolean(body?.boundaryConsumed),
          createdAt: now,
          updatedAt: now,
        };
        records.set(rec.threadId, rec);
        return jsonResponse({ thread: rec, threads: [...records.values()] }, 201);
      }
    }

    const byId = /^\/codexhost-side-chat\/threads\/([^/]+)$/u.exec(url.pathname);
    if (byId?.[1]) {
      const tid = decodeURIComponent(byId[1]);
      if (method === "PATCH") {
        const existing = records.get(tid);
        if (!existing) return jsonResponse({ error: { code: "not-found", message: "missing" } }, 404);
        const next = { ...existing, ...body, updatedAt: new Date().toISOString() };
        records.set(tid, next);
        return jsonResponse({ thread: next }, 200);
      }
      if (method === "DELETE") {
        records.delete(tid);
        return jsonResponse({ deleted: true }, 200);
      }
    }

    return jsonResponse({ error: { code: "not-found", message: "unhandled" } }, 404);
  };

  return { mockFetch, rpcCalls, respondCalls };
}

test("SideChatPanelView renders permanent Persistent and Ephemeral badges with NO manual mode toggle", async () => {
  const now = new Date().toISOString();
  const env = makeFixtureEnv({
    records: [
      {
        threadId: "sc-persist",
        sourceThreadId: "main-1",
        mode: "persistent",
        title: "Persistent branch",
        boundaryConsumed: true,
        createdAt: now,
        updatedAt: "2026-11-23T00:02:00.000Z",
      },
      {
        threadId: "sc-ephem",
        sourceThreadId: "main-1",
        mode: "ephemeral",
        title: "Ephemeral branch",
        boundaryConsumed: true,
        createdAt: now,
        updatedAt: "2026-11-23T00:01:00.000Z",
      },
    ],
    snapshots: {},
  });

  const controller = new SideChatController({ fetch: env.mockFetch, autoConnectEvents: false });
  await controller.setSourceThread("main-1", { autoSelectFirst: true });

  // 1. Persistent mode in zh & en
  const zhPersistHtml = renderToStaticMarkup(
    React.createElement(SideChatPanelView, {
      controller,
      resolution: { status: "ready", sourceThreadId: "main-1", running: false },
      locale: "zh",
    }),
  );
  assert.match(zhPersistHtml, /data-csc-mode="persistent"/u);
  assert.match(zhPersistHtml, /持久/u);
  assert.match(zhPersistHtml, /随主会话保存，与 Codex Desktop 互通/u);
  // Strictly NO manual mode switch controls (no checkbox/radio/switch inside header)
  assert.doesNotMatch(zhPersistHtml, /type="checkbox"|type="radio"|role="switch"/u);

  const enPersistHtml = renderToStaticMarkup(
    React.createElement(SideChatPanelView, {
      controller,
      resolution: { status: "ready", sourceThreadId: "main-1", running: false },
      locale: "en",
    }),
  );
  assert.match(enPersistHtml, /Persistent/u);
  assert.match(enPersistHtml, /Saved with the main thread and synced with Codex Desktop/u);

  // 2. Switch to ephemeral side chat -> amber Ephemeral badge appears permanently
  await controller.selectThread("sc-ephem");
  const zhEphemHtml = renderToStaticMarkup(
    React.createElement(SideChatPanelView, {
      controller,
      resolution: { status: "ready", sourceThreadId: "main-1", running: false },
      locale: "zh",
    }),
  );
  assert.match(zhEphemHtml, /data-csc-mode="ephemeral"/u);
  assert.match(zhEphemHtml, /临时/u);
  assert.match(zhEphemHtml, /自动无感回退为运行期临时分支，重启 Host 后清理/u);
  assert.doesNotMatch(zhEphemHtml, /type="checkbox"|type="radio"|role="switch"/u);

  const enEphemHtml = renderToStaticMarkup(
    React.createElement(SideChatPanelView, {
      controller,
      resolution: { status: "ready", sourceThreadId: "main-1", running: false },
      locale: "en",
    }),
  );
  assert.match(enEphemHtml, /Ephemeral/u);
  assert.match(enEphemHtml, /Auto-fallback runtime ephemeral branch/u);

  controller.dispose();
});

test("SideChatPanelView strips first-turn boundary prefix, sanitizes Markdown, toggles tool cards, and triggers Stop while running", async () => {
  const now = new Date().toISOString();
  const env = makeFixtureEnv({
    records: [
      {
        threadId: "sc-1",
        sourceThreadId: "main-1",
        mode: "persistent",
        title: "Debug build",
        boundaryConsumed: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    snapshots: {
      "sc-1": {
        cursor: { epoch: EPOCH_1, sequence: 3 },
        activeTurnId: "turn-2",
        thread: {
          id: "sc-1",
          cwd: "/repo",
          modelProvider: "codexhost",
          createdAt: 1_700_000_000,
          updatedAt: 1_700_000_020,
          status: { type: "active" },
          turns: [],
        },
        turnsPage: {
          nextCursor: null,
          data: [
            {
              id: "turn-2",
              status: "inProgress",
              items: [
                {
                  id: "u-1",
                  type: "userMessage",
                  content: [
                    {
                      type: "text",
                      text: injectSideChatBoundary("Why does `npm run build` warn?"),
                    },
                  ],
                },
                {
                  id: "r-1",
                  type: "reasoning",
                  summary: ["Inspecting build.mjs"],
                  content: ["Checking esbuild options in detail."],
                },
                {
                  id: "cmd-1",
                  type: "commandExecution",
                  command: "npm run build",
                  cwd: "/repo",
                  aggregatedOutput: "Built successfully in 120ms",
                  exitCode: 0,
                  status: "completed",
                },
                {
                  id: "fc-1",
                  type: "fileChange",
                  status: "completed",
                  changes: [
                    {
                      path: "src/index.ts",
                      kind: "update",
                      diff: "@@ -1 +1 @@\n-old\n+new",
                    },
                  ],
                },
                {
                  id: "a-1",
                  type: "agentMessage",
                  text:
                    "Check `build.mjs` and [docs](https://example.com) — never [xss](javascript:alert(1)) or <script>evil()</script>\n\n```ts\nconst ok = true;\n```",
                },
              ],
            },
          ],
        },
        configuration: {},
        interactions: [],
      },
    },
  });

  const controller = new SideChatController({ fetch: env.mockFetch, autoConnectEvents: false });
  await controller.setSourceThread("main-1", { autoSelectFirst: true });

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(SideChatPanelView, {
        controller,
        resolution: { status: "ready", sourceThreadId: "main-1", running: false },
        locale: "zh",
      }),
    );
  });

  // 1. User message bubble strips the boundary prefix completely
  const userBubble = renderer.root.find((node) => node.props["data-csc-item"] === "userMessage");
  assert.equal(userBubble.children.join(""), "Why does `npm run build` warn?");
  const serializedTree = JSON.stringify(renderer.toJSON());
  assert.equal(serializedTree.includes(SIDE_CHAT_BOUNDARY_START), false);
  assert.equal(serializedTree.includes(SIDE_CHAT_BOUNDARY_BLOCK), false);

  // 2. Assistant markdown safely renders code block & safe link, blocks javascript: URL
  const links = renderer.root.findAllByType("a");
  assert.equal(links.length, 1);
  assert.equal(links[0]?.props.href, "https://example.com");
  assert.equal(serializedTree.includes("javascript:alert"), false);
  assert.ok(renderer.root.findAll((node) => node.props["data-csc-code-block"]).length === 1);

  // 3. Tool & reasoning cards start collapsed and expand on click
  const cmdCard = renderer.root.find((node) => node.props["data-csc-item"] === "commandExecution");
  const cmdToggle = cmdCard.findByType("button");
  assert.equal(cmdToggle.props["aria-expanded"], false);
  assert.equal(
    cmdCard.findAll((node) => node.props["data-csc-collapsible-body"] === "true").length,
    0,
  );

  await act(async () => {
    cmdToggle.props.onClick();
  });
  assert.equal(cmdToggle.props["aria-expanded"], true);
  assert.equal(
    cmdCard.findAll((node) => node.props["data-csc-collapsible-body"] === "true").length,
    1,
  );
  assert.ok(JSON.stringify(renderer.toJSON()).includes("Built successfully in 120ms"));

  // 4. Running turn shows Stop button and clicking it calls turn/interrupt
  const stopBtn = renderer.root.find((node) => node.props["data-csc-action"] === "stop");
  await act(async () => {
    stopBtn.props.onClick();
  });
  const interruptCall = env.rpcCalls.find((c) => c.method === "turn/interrupt");
  assert.ok(interruptCall, "expected turn/interrupt RPC on Stop click");
  assert.deepEqual(interruptCall.params, { threadId: "sc-1", turnId: "turn-2" });

  await act(async () => {
    renderer.unmount();
  });
  controller.dispose();
});

test("SideChatPanelView renders and submits inline approval and question interaction cards", async () => {
  const now = new Date().toISOString();
  const approvalInteraction: ClientInteraction = {
    requestId: "req-approve-1",
    threadId: "sc-int",
    kind: "approval",
    interaction: {
      type: "approval",
      title: "Run shell command",
      description: "Inspect git status",
      subject: "git status",
      actions: [
        { id: "accept", label: "Allow once", effect: "allowOnce" },
        { id: "decline", label: "Deny", effect: "deny" },
      ],
    },
    request: { method: "item/commandExecution/requestApproval", params: {} },
  };
  const questionInteraction: ClientInteraction = {
    requestId: "req-question-2",
    threadId: "sc-int",
    kind: "question",
    interaction: {
      type: "question",
      title: "Select target environment",
      questions: [
        {
          type: "choice",
          id: "env",
          prompt: "Which environment?",
          multiple: false,
          allowOther: true,
          options: [
            { value: "dev", label: "Development" },
            { value: "prod", label: "Production" },
          ],
        },
        {
          type: "text",
          id: "note",
          prompt: "Short reason",
        },
      ],
    },
    request: { method: "item/tool/requestUserInput", params: {} },
  };

  const env = makeFixtureEnv({
    records: [
      {
        threadId: "sc-int",
        sourceThreadId: "main-1",
        mode: "persistent",
        title: "Interactive side chat",
        boundaryConsumed: true,
        createdAt: now,
        updatedAt: now,
      },
    ],
    snapshots: {
      "sc-int": {
        cursor: { epoch: EPOCH_1, sequence: 5 },
        activeTurnId: "turn-1",
        thread: {
          id: "sc-int",
          cwd: "/repo",
          modelProvider: "codexhost",
          createdAt: 1_700_000_000,
          updatedAt: 1_700_000_030,
          status: { type: "active" },
          turns: [],
        },
        turnsPage: { data: [], nextCursor: null },
        configuration: {},
        interactions: [approvalInteraction, questionInteraction],
      },
    },
  });

  const controller = new SideChatController({ fetch: env.mockFetch, autoConnectEvents: false });
  await controller.setSourceThread("main-1", { autoSelectFirst: true });

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(SideChatPanelView, {
        controller,
        resolution: { status: "ready", sourceThreadId: "main-1", running: false },
        locale: "zh",
      }),
    );
  });

  // 1. Approval card submit
  const acceptBtn = renderer.root.find(
    (node) => node.props["data-csc-approval-action"] === "accept",
  );
  await act(async () => {
    acceptBtn.props.onClick();
  });
  assert.equal(env.respondCalls.length, 1);
  assert.deepEqual(env.respondCalls[0], {
    epoch: EPOCH_1,
    threadId: "sc-int",
    requestId: "req-approve-1",
    result: { decision: "accept" },
  });

  // 2. Question card rejects empty required fields, then submits valid selection + text
  const submitQuestionBtn = renderer.root.find(
    (node) => node.props["data-csc-action"] === "submit-question",
  );
  await act(async () => {
    submitQuestionBtn.props.onClick();
  });
  assert.equal(env.respondCalls.length, 1, "must block empty required question submission");

  const radioDev = renderer.root.find(
    (node) => node.type === "input" && node.props.type === "radio" && node.props.value === "dev",
  );
  const noteInput = renderer.root.find(
    (node) => node.props["data-csc-question-text"] === "note",
  );

  await act(async () => {
    radioDev.props.onChange();
    noteInput.props.onChange({ target: { value: "Smoke test" } });
  });
  await act(async () => {
    submitQuestionBtn.props.onClick();
  });

  assert.equal(env.respondCalls.length, 2);
  assert.deepEqual(env.respondCalls[1], {
    epoch: EPOCH_1,
    threadId: "sc-int",
    requestId: "req-question-2",
    result: {
      answers: {
        env: { answers: ["dev"] },
        note: { answers: ["Smoke test"] },
      },
    },
  });

  await act(async () => {
    renderer.unmount();
  });
  controller.dispose();
});

test("SideChatPanelView respects IME composition and Shift+Enter vs Enter in composer, and renders draft empty state", async () => {
  const now = new Date().toISOString();
  const env = makeFixtureEnv({
    records: [
      {
        threadId: "sc-ime",
        sourceThreadId: "main-1",
        mode: "persistent",
        title: "IME test",
        boundaryConsumed: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    snapshots: {},
  });
  const controller = new SideChatController({ fetch: env.mockFetch, autoConnectEvents: false });
  await controller.setSourceThread("main-1", { autoSelectFirst: true });

  // Draft main session renders guidance
  const draftHtml = renderToStaticMarkup(
    React.createElement(SideChatPanelView, {
      controller,
      resolution: { status: "draft", reason: "blank" },
      locale: "zh",
    }),
  );
  assert.match(draftHtml, /data-csc-empty="draft"/u);
  assert.match(draftHtml, /请先在主会话发送首条消息以创建会话/u);

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(SideChatPanelView, {
        controller,
        resolution: { status: "ready", sourceThreadId: "main-1", running: false },
        locale: "zh",
      }),
    );
  });

  const textarea = renderer.root.find((node) => node.props["data-csc-composer"]);
  await act(async () => {
    textarea.props.onChange({ target: { value: "测试中文输入" } });
  });

  // IME composing Enter (isComposing: true or keyCode: 229) must NOT submit
  await act(async () => {
    textarea.props.onKeyDown({
      key: "Enter",
      shiftKey: false,
      keyCode: 229,
      nativeEvent: { isComposing: true, keyCode: 229 },
      preventDefault() {},
    });
  });
  assert.equal(env.rpcCalls.filter((c) => c.method === "turn/start").length, 0);

  // Shift+Enter must NOT submit
  await act(async () => {
    textarea.props.onKeyDown({
      key: "Enter",
      shiftKey: true,
      keyCode: 13,
      nativeEvent: { isComposing: false, keyCode: 13 },
      preventDefault() {},
    });
  });
  assert.equal(env.rpcCalls.filter((c) => c.method === "turn/start").length, 0);

  // Plain Enter submits turn/start
  let prevented = false;
  await act(async () => {
    textarea.props.onKeyDown({
      key: "Enter",
      shiftKey: false,
      keyCode: 13,
      nativeEvent: { isComposing: false, keyCode: 13 },
      preventDefault() {
        prevented = true;
      },
    });
  });
  assert.equal(prevented, true);
  assert.equal(env.rpcCalls.filter((c) => c.method === "turn/start").length, 1);

  await act(async () => {
    renderer.unmount();
  });
  controller.dispose();
});

test("SideChatGuide and SideChatTitle render expected chrome and handle actions", async () => {
  const opened: Array<{ kind: string; options?: unknown }> = [];
  const fakeTabInfo: ClientSidebarTabInfo = {
    sidebar: { expanded: true, fullscreen: false },
    panel: { id: "pane-1" },
    tab: {
      id: "tab-1",
      kind: "sidechat",
      contentId: "sidebar://sidechat/1",
      title: "侧边聊天",
      visible: true,
      navigation: { address: "sidebar://sidechat/1", params: undefined, revision: 1 },
      signal: new AbortController().signal,
      actions: {
        bindCommands: () => () => {},
        openTab(kind, opts) {
          opened.push({ kind, options: opts });
        },
        close: () => {},
      },
    },
  };

  let guideRenderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    guideRenderer = TestRenderer.create(
      React.createElement(SideChatGuide, {
        entryId: "new",
        kind: "sidechat",
        title: "侧边聊天",
        description: "旁路并行提问",
        useTabInfo: () => fakeTabInfo,
        useShortcuts: (selector) =>
          selector([
            {
              id: "sidechat.new",
              label: "新建侧边聊天",
              aliases: ["btw"],
              keys: ["Ctrl", "+", "Alt", "+", "Shift", "+", "B"],
              aria: "Control+Alt+Shift+B",
            },
          ]),
      }),
    );
  });

  const guideBtn = guideRenderer.root.findByType("button");
  assert.equal(guideBtn.props["data-sidebar-right-guide-entry"], "sidechat");
  assert.equal(guideBtn.props["aria-keyshortcuts"], "Control+Alt+Shift+B");
  await act(async () => {
    guideBtn.props.onClick();
  });
  assert.deepEqual(opened, [{ kind: "sidechat", options: { replaceTab: true } }]);

  const titleHtml = renderToStaticMarkup(
    React.createElement(SideChatTitle, {
      useTabInfo: () => fakeTabInfo,
      useSideChatTitle: (_key, selector) =>
        selector({
          threadId: "sc-1",
          title: "排查编译告警",
          mode: "ephemeral",
          isRunning: false,
        }),
      renameTab: async () => {},
      getLocale: () => "zh" as const,
      t: createSideChatTranslator("zh"),
    }),
  );
  assert.match(titleHtml, /排查编译告警/u);
  assert.match(titleHtml, /data-csc-mode="ephemeral"/u);

  await act(async () => {
    guideRenderer.unmount();
  });
});

test("SideChatPanelView supports switching Desktop/Web side chats, creating new branches, and archiving", async () => {
  const now = new Date().toISOString();
  const env = makeFixtureEnv({
    records: [
      {
        threadId: "sc-web",
        sourceThreadId: "main-1",
        mode: "persistent",
        title: "Web side chat",
        boundaryConsumed: true,
        createdAt: now,
        updatedAt: "2026-11-23T00:05:00.000Z",
      },
    ],
    attachedRows: [
      {
        id: "sc-desktop",
        attachedToThreadId: "main-1",
        name: "Desktop side chat",
        preview: "How does routing work?",
        createdAt: 1_700_000_000,
        updatedAt: 1_700_000_050,
        status: { type: "idle" },
      },
    ],
    snapshots: {},
  });

  const controller = new SideChatController({ fetch: env.mockFetch, autoConnectEvents: false });
  await controller.setSourceThread("main-1", { autoSelectFirst: true });

  let renderer!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    renderer = TestRenderer.create(
      React.createElement(SideChatPanelView, {
        controller,
        resolution: { status: "ready", sourceThreadId: "main-1", running: false },
        locale: "zh",
      }),
    );
  });

  const select = renderer.root.find((node) => node.props["data-csc-thread-select"]);
  const optionTexts = select.findAllByType("option").map((opt) => opt.children.join(""));
  assert.ok(optionTexts.some((txt) => txt.includes("Web side chat")));
  assert.ok(optionTexts.some((txt) => txt.includes("Desktop side chat") && txt.includes("Desktop")));

  // Switch to Desktop side chat via dropdown
  await act(async () => {
    select.props.onChange({ target: { value: "sc-desktop" } });
    await new Promise((r) => setTimeout(r, 10));
  });
  assert.equal(controller.getSnapshot().activeThreadId, "sc-desktop");

  // Click "+ 新建" to fork a new side chat
  const newBtn = renderer.root.find((node) => node.props["data-csc-action"] === "new");
  await act(async () => {
    newBtn.props.onClick();
    await new Promise((r) => setTimeout(r, 15));
  });
  assert.equal(controller.getSnapshot().activeThreadId, "sc-new");

  // Click archive/delete on persistent thread -> calls thread/archive
  const delBtn = renderer.root.find((node) => node.props["data-csc-action"] === "delete");
  await act(async () => {
    delBtn.props.onClick();
    await new Promise((r) => setTimeout(r, 15));
  });
  assert.ok(
    env.rpcCalls.some((c) => c.method === "thread/archive" && c.params.threadId === "sc-new"),
    "expected thread/archive RPC when archiving persistent side chat",
  );

  await act(async () => {
    renderer.unmount();
  });
  controller.dispose();
});
