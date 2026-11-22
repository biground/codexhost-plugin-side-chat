/**
 * Unit and contract verification tests for manifestVersion 2 unified Host extension:
 * - `manifest.json` strict v2 schema & package entry validation (PNG signatures, limits, suffixes)
 * - `backend/index.mjs` single-file ESM activation, strict JSON IPC serialization,
 *   client-hosts discovery, persistent-first + -32602 ephemeral fallback, snapshot normalization,
 *   boundary injection/stripping, interruptTurn, respondInteraction, and archiveSideChat
 * - `page/`, `widget/`, `shared/` static relative `.mjs` import & Desktop Rollup linker safety
 * - `widget/style.css` click-through pointer-events invariants
 * - `web/index.mjs` `/btw` and `/btw <question>` capture-phase interception & topbar button
 */
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function assertStrictBackendJson(value: unknown, label: string): void {
  const serialized = JSON.stringify(value, (_key, entry: unknown) => {
    if (
      entry === undefined ||
      typeof entry === "function" ||
      typeof entry === "symbol" ||
      (typeof entry === "number" && !Number.isFinite(entry))
    ) {
      throw new TypeError(`${label}: not strictly JSON-serializable`);
    }
    return entry;
  });
  assert.ok(Buffer.byteLength(serialized, "utf8") < 2 * 1024 * 1024);
}

test("manifest.json strictly matches manifestVersion 2 schema and asset constraints", () => {
  const raw = readFileSync(resolve(root, "manifest.json"), "utf8");
  assert.ok(Buffer.byteLength(raw, "utf8") <= 128 * 1024);
  const manifest = JSON.parse(raw) as Record<string, unknown>;

  assert.equal(manifest.manifestVersion, 2);
  assert.equal(manifest.id, "codexhost-side-chat");
  assert.equal(manifest.version, "0.2.0");
  assert.equal(manifest.author, "biground");
  assert.equal(manifest.repository, "https://github.com/biground/codexhost-plugin-side-chat");
  assert.deepEqual(manifest.categories, ["workflow", "interface", "tools"]);
  assert.equal(manifest.icon, "assets/icon.png");
  assert.deepEqual(manifest.screenshots, ["assets/preview.png"]);

  const allowedTopLevel = new Set([
    "manifestVersion",
    "id",
    "name",
    "version",
    "description",
    "details",
    "author",
    "repository",
    "icon",
    "screenshots",
    "categories",
    "settingsSchema",
    "slots",
    "page",
    "widget",
    "desktop",
    "web",
    "backend",
  ]);
  for (const key of Object.keys(manifest)) {
    assert.ok(allowedTopLevel.has(key), `Unexpected extra manifest key: ${key}`);
  }

  for (const field of ["name", "description", "details"]) {
    const loc = manifest[field] as Record<string, unknown>;
    assert.deepEqual(Object.keys(loc).sort(), ["en", "zh-CN"]);
    assert.ok(typeof loc.en === "string" && loc.en.trim().length > 0);
    assert.ok(typeof loc["zh-CN"] === "string" && loc["zh-CN"].trim().length > 0);
  }

  const settings = manifest.settingsSchema as Array<Record<string, unknown>>;
  assert.equal(settings.length, 3);
  assert.deepEqual(
    settings.map((s) => s.key),
    ["widgetPosition", "showFloatingLauncher", "enableWebBtwShortcut"],
  );
  assert.equal(settings[0]?.type, "select");
  assert.equal(settings[0]?.default, "bottom-right");
  assert.equal(settings[1]?.type, "boolean");
  assert.equal(settings[1]?.default, true);
  assert.equal(settings[2]?.type, "boolean");
  assert.equal(settings[2]?.default, true);

  assert.deepEqual(manifest.page, {
    apiVersion: 1,
    entry: "page/index.mjs",
    style: "page/style.css",
    title: { en: "Side Chat", "zh-CN": "侧边聊天" },
  });
  assert.deepEqual(manifest.widget, {
    apiVersion: 1,
    entry: "widget/index.mjs",
    style: "widget/style.css",
  });
  assert.deepEqual(manifest.web, {
    apiVersion: 1,
    entry: "web/index.mjs",
    style: "web/style.css",
  });
  assert.deepEqual(manifest.backend, {
    apiVersion: 1,
    entry: "backend/index.mjs",
  });

  // Verify PNG signatures & byte limits
  const pngSig = Buffer.from("89504e470d0a1a0a", "hex");
  const iconBytes = readFileSync(resolve(root, "assets/icon.png"));
  assert.ok(iconBytes.subarray(0, 8).equals(pngSig), "assets/icon.png must have valid PNG signature");
  assert.ok(iconBytes.length <= 128 * 1024, "assets/icon.png must be <= 128 KiB");

  const previewBytes = readFileSync(resolve(root, "assets/preview.png"));
  assert.ok(
    previewBytes.subarray(0, 8).equals(pngSig),
    "assets/preview.png must have valid PNG signature",
  );
  assert.ok(previewBytes.length <= 512 * 1024, "assets/preview.png must be <= 512 KiB");

  // Verify all declared entry/style files exist and satisfy size limits
  for (const rel of [
    "page/index.mjs",
    "page/style.css",
    "widget/index.mjs",
    "widget/style.css",
    "web/index.mjs",
    "web/style.css",
    "backend/index.mjs",
  ]) {
    const full = resolve(root, rel);
    assert.ok(existsSync(full), `Missing declared manifest entry: ${rel}`);
    const size = statSync(full).size;
    if (rel.endsWith(".css")) {
      assert.ok(size > 0 && size <= 256 * 1024, `${rel} exceeds style limit`);
    } else {
      assert.ok(size > 0 && size <= 2 * 1024 * 1024, `${rel} exceeds script limit`);
    }
  }

  // Verify .gitignore ignores release/ and *.zip without ignoring extension folders
  const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
  assert.match(gitignore, /^release\/$/m);
  assert.match(gitignore, /^\*\.zip$/m);
  for (const keep of ["backend", "page", "widget", "web", "shared", "assets", "lib"]) {
    assert.ok(
      !new RegExp(`^\\s*/?${keep}/?\\s*$`, "m").test(gitignore),
      `.gitignore must not ignore ${keep}/`,
    );
  }
});

test("page/, widget/, and shared/ obey Desktop Rollup linker static relative .mjs rules and click-through CSS", () => {
  const dirs = ["shared", "page", "widget"];
  const importPattern = /(?:^|\n)\s*(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gu;

  for (const dir of dirs) {
    const absDir = resolve(root, dir);
    for (const file of readdirSync(absDir)) {
      if (!file.endsWith(".mjs")) continue;
      const code = readFileSync(join(absDir, file), "utf8");
      const rel = `${dir}/${file}`;

      assert.ok(!/\bimport\s*\(/u.test(code), `${rel} must not use dynamic import()`);
      assert.ok(!/\beval\s*\(/u.test(code), `${rel} must not call eval()`);
      assert.ok(!/\bnew\s+Function\b/u.test(code), `${rel} must not use new Function`);
      assert.ok(!/\.innerHTML\s*=/u.test(code), `${rel} must not assign innerHTML`);

      for (const match of code.matchAll(importPattern)) {
        const spec = match[1]!;
        assert.match(
          spec,
          /^\.\.?\/[^?#\\]+\.mjs$/u,
          `${rel} contains disallowed non-relative or non-.mjs import: ${spec}`,
        );
        assert.ok(
          !spec.includes("backend/index.mjs"),
          `${rel} must never import backend/index.mjs`,
        );
      }
    }
  }

  const widgetCss = readFileSync(resolve(root, "widget/style.css"), "utf8");
  assert.match(widgetCss, /:host\s*\{[^}]*pointer-events:\s*none/su);
  assert.match(widgetCss, /\.cx-page-mount[\s\S]*?\.sc-widget-root\s*\{[^}]*pointer-events:\s*none/su);
  assert.match(widgetCss, /\.sc-widget-launcher\s*\{[^}]*pointer-events:\s*auto/su);
  assert.match(widgetCss, /\.sc-widget-drawer\s*\{[^}]*pointer-events:\s*auto/su);
});

test("backend/index.mjs registers all handlers synchronously and integrates with mock client-channel server", async (t) => {
  const backendPath = resolve(root, "backend/index.mjs");
  assert.ok(existsSync(backendPath), "backend/index.mjs must exist");

  // Ensure bundled backend only imports node:* builtins
  const bundleCode = readFileSync(backendPath, "utf8");
  for (const match of bundleCode.matchAll(/from\s+["']([^"']+)["']/gu)) {
    assert.ok(
      match[1]!.startsWith("node:"),
      `backend/index.mjs must only import node:* builtins, found: ${match[1]}`,
    );
  }

  const tempRoot = mkdtempSync(join(tmpdir(), "codexhost-side-chat-v2-backend-"));
  t.after(() => rmSync(tempRoot, { recursive: true, force: true }));

  const dataDir = join(tempRoot, "host-extension-data", "codexhost-side-chat");
  const channelDir = join(tempRoot, "client-hosts");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(channelDir, { recursive: true });

  const token = "a".repeat(64);
  const epoch = "11111111-1111-4111-8111-111111111111";
  const rpcCalls: Array<{ method: string; params: Record<string, unknown> }> = [];
  const respondCalls: Array<Record<string, unknown>> = [];
  let sawOriginHeader = false;

  const server = createServer((req, res) => {
    if (req.headers.origin) sawOriginHeader = true;
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.headers.authorization !== `Bearer ${token}`) {
      reply(401, { error: { code: -32001, message: "Unauthorized" } });
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
      if (req.url === "/v1/rpc") {
        const method = String(payload.method);
        const params = (payload.params ?? {}) as Record<string, unknown>;
        rpcCalls.push({ method, params });

        if (method === "codexhost/thread/catalog/read") {
          reply(200, {
            result: {
              threads: [
                {
                  id: "main-1",
                  name: "Main Conversation",
                  preview: "Hello main",
                  cwd: "D:/repo",
                  modelProvider: "codexhost",
                  status: { type: "idle" },
                  createdAt: 1700000000,
                  updatedAt: 1700000100,
                },
                {
                  id: "side-desktop-1",
                  attachedToThreadId: "main-1",
                  name: "Desktop Side",
                  preview: "Attached child",
                  cwd: "D:/repo",
                  modelProvider: "codexhost",
                  status: { type: "idle" },
                  createdAt: 1700000050,
                  updatedAt: 1700000090,
                },
              ],
            },
          });
          return;
        }
        if (method === "thread/list" && params.attachedToThreadId === "main-1") {
          reply(200, {
            result: {
              data: [
                {
                  id: "side-desktop-1",
                  attachedToThreadId: "main-1",
                  name: "Desktop Side",
                  preview: "<!-- codexhost-side-chat:boundary:v1 -->\n...\n<!-- /codexhost-side-chat:boundary:v1 -->\n\nExplain cache",
                  createdAt: 1700000050,
                  updatedAt: 1700000090,
                  status: { type: "idle" },
                },
              ],
            },
          });
          return;
        }
        if (method === "thread/fork") {
          if (params.threadId === "main-1" && params.attachToSource === true) {
            reply(200, { result: { thread: { id: "side-persistent-1" } } });
            return;
          }
          if (params.threadId === "main-ephemeral" && params.attachToSource === true) {
            reply(200, { error: { code: -32602, message: "attachToSource is unsupported for paginated parent" } });
            return;
          }
          if (params.threadId === "main-ephemeral" && params.ephemeral === true) {
            reply(200, { result: { thread: { id: "side-ephemeral-1" } } });
            return;
          }
        }
        if (method === "turn/start") {
          reply(200, { result: { turn: { id: "turn-99" } } });
          return;
        }
        if (method === "turn/interrupt") {
          reply(200, { result: { ok: true } });
          return;
        }
        if (method === "thread/archive") {
          reply(200, { result: { archived: true } });
          return;
        }
        reply(200, { result: {} });
        return;
      }

      if (req.url === "/v1/snapshot") {
        const threadId = String(payload.threadId);
        reply(200, {
          result: {
            cursor: { epoch, sequence: 7 },
            activeTurnId: "turn-2",
            thread: {
              id: threadId,
              cwd: "D:/repo",
              modelProvider: "codexhost",
              createdAt: 1700000000,
              updatedAt: 1700000200,
              status: { type: "active" },
              name: "Side Q",
              preview: "Newest preview",
              turns: [],
            },
            turnsPage: {
              // Desc order from Host -> backend must flip to chronological (turn-1 then turn-2)
              data: [
                {
                  id: "turn-2",
                  status: "inProgress",
                  items: [
                    { id: "u2", type: "userMessage", content: [{ type: "text", text: "Follow up" }] },
                    { id: "r2-summary", type: "reasoning", summary: ["Checking logs"], content: [] },
                    // Paired Desktop pseudo-command should be filtered
                    { id: "r2", type: "commandExecution", command: "thinking", status: "completed" },
                    // Genuine command named `thinking` without matching `-summary` reasoning must stay!
                    { id: "cmd-real", type: "commandExecution", command: "thinking", cwd: "/tmp", aggregatedOutput: "ok", exitCode: 0, status: "completed" },
                  ],
                },
                {
                  id: "turn-1",
                  status: "completed",
                  items: [
                    {
                      id: "u1",
                      type: "userMessage",
                      content: [
                        {
                          type: "text",
                          text: "<!-- codexhost-side-chat:boundary:v1 -->\n[Side Chat Read-Only Context Boundary]\nEverything prior...\n<!-- /codexhost-side-chat:boundary:v1 -->\n\nWhat is this file?",
                        },
                      ],
                    },
                    { id: "a1", type: "agentMessage", text: "It is a test file." },
                  ],
                },
              ],
              nextCursor: null,
            },
            configuration: {},
            interactions: [
              {
                requestId: 42,
                threadId,
                kind: "approval",
                interaction: {
                  type: "approval",
                  title: "Run command",
                  actions: [{ id: "accept", label: "Allow", effect: "allowOnce" }],
                },
                request: { method: "item/commandExecution/requestApproval" },
              },
            ],
          },
        });
        return;
      }

      if (req.url === "/v1/respond") {
        respondCalls.push(payload);
        reply(200, { result: { resolved: true } });
        return;
      }

      reply(404, { error: { code: -32601, message: "Not found" } });
    });
  });

  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  t.after(() => new Promise<void>((done) => server.close(() => done())));
  const port = (server.address() as { port: number }).port;

  writeFileSync(
    join(channelDir, `host-${process.pid}-${epoch}.json`),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      port,
      token,
      startedAt: Date.now(),
      epoch,
    }),
  );

  // Import built single-file backend/index.mjs and simulate ExtensionBackendProcess registration guard
  const mod = (await import(pathToFileURL(backendPath).href)) as {
    activate: (ctx: {
      extensionId: string;
      extensionDir: string;
      dataDir: string;
      readSettings: () => Promise<Record<string, unknown>>;
      writeSettings: (v: Record<string, unknown>) => Promise<Record<string, unknown>>;
      handle: (method: string, handler: (params: unknown) => unknown) => void;
    }) => Promise<() => void>;
  };

  let registering = true;
  const handlers = new Map<string, (params: unknown) => unknown>();
  const dispose = await mod.activate({
    extensionId: "codexhost-side-chat",
    extensionDir: root,
    dataDir,
    readSettings: async () => ({}),
    writeSettings: async (v) => v,
    handle(method, handler) {
      assert.equal(registering, true, "Handlers must be registered during activate()");
      handlers.set(method, handler);
    },
  });
  registering = false;
  t.after(() => dispose());

  for (const expectedMethod of [
    "ping",
    "status",
    "listMainThreads",
    "listSideChats",
    "createSideChat",
    "readSnapshot",
    "startTurn",
    "interruptTurn",
    "respondInteraction",
    "renameSideChat",
    "archiveSideChat",
  ]) {
    assert.ok(handlers.has(expectedMethod), `Missing backend handler: ${expectedMethod}`);
  }

  const invoke = async (method: string, params?: unknown) => {
    const res = await handlers.get(method)!(params);
    assertStrictBackendJson(res, method);
    return res as Record<string, unknown>;
  };

  // 1. ping & status
  const pingRes = await invoke("ping");
  assert.equal(pingRes.ok, true);
  assert.equal(pingRes.extensionId, "codexhost-side-chat");

  const statusRes = await invoke("status");
  assert.equal(statusRes.ok, true);
  assert.equal(statusRes.connected, true);
  assert.equal(statusRes.port, port);
  assert.equal(statusRes.epoch, epoch);

  // 2. listMainThreads filters out attachedToThreadId children
  const mainRes = await invoke("listMainThreads");
  assert.equal(mainRes.ok, true);
  const mainThreads = mainRes.threads as Array<{ threadId: string; title: string }>;
  assert.equal(mainThreads.length, 1);
  assert.equal(mainThreads[0]?.threadId, "main-1");

  // 3. createSideChat persistent-first with immediate question (boundary injected)
  const createPersistent = await invoke("createSideChat", {
    sourceThreadId: "main-1",
    question: "How does auth work?",
  });
  assert.equal(createPersistent.ok, true);
  assert.equal(createPersistent.mode, "persistent");
  assert.equal((createPersistent.thread as { threadId: string }).threadId, "side-persistent-1");
  assert.equal((createPersistent.thread as { boundaryConsumed: boolean }).boundaryConsumed, true);
  const startTurnCall = rpcCalls.find((c) => c.method === "turn/start");
  assert.ok(startTurnCall);
  const firstInputText = ((startTurnCall.params.input as Array<{ text: string }>)[0]!).text;
  assert.ok(firstInputText.includes("<!-- codexhost-side-chat:boundary:v1 -->"));
  assert.ok(firstInputText.includes("How does auth work?"));

  // 4. createSideChat seamless -32602 ephemeral fallback
  const createEphemeral = await invoke("createSideChat", {
    sourceThreadId: "main-ephemeral",
  });
  assert.equal(createEphemeral.ok, true);
  assert.equal(createEphemeral.mode, "ephemeral");
  assert.equal((createEphemeral.thread as { threadId: string }).threadId, "side-ephemeral-1");

  // Verify persisted to <dataDir>/side-chats.json
  const persisted = JSON.parse(readFileSync(join(dataDir, "side-chats.json"), "utf8")) as {
    version: number;
    threads: Array<{ threadId: string; mode: string }>;
  };
  assert.equal(persisted.version, 1);
  assert.equal(persisted.threads.length, 2);

  // 5. listSideChats merges local + Desktop-attached threads and strips boundary from preview
  const sideList = await invoke("listSideChats", { sourceThreadId: "main-1" });
  const sideThreads = sideList.threads as Array<{
    threadId: string;
    source: string;
    preview: string;
    mode: string;
  }>;
  assert.ok(sideThreads.some((s) => s.threadId === "side-persistent-1" && s.mode === "persistent"));
  const desktopSide = sideThreads.find((s) => s.threadId === "side-desktop-1");
  assert.ok(desktopSide);
  assert.equal(desktopSide.source, "desktop");
  assert.equal(desktopSide.preview, "Explain cache");

  // 6. readSnapshot flips chronological turns, keeps rawText + clean text, filters paired thinking command only
  const snapRes = await invoke("readSnapshot", { threadId: "side-persistent-1" });
  assert.equal(snapRes.ok, true);
  const snapshot = snapRes.snapshot as {
    turns: Array<{ id: string; items: Array<Record<string, unknown>> }>;
    activeTurnId: string;
  };
  assert.deepEqual(
    snapshot.turns.map((turn) => turn.id),
    ["turn-1", "turn-2"],
  );
  const userItem = snapshot.turns[0]!.items[0]!;
  assert.equal(userItem.kind, "userMessage");
  assert.equal(userItem.text, "What is this file?");
  assert.equal(userItem.hadBoundaryPrefix, true);
  assert.ok(String(userItem.rawText).includes("<!-- codexhost-side-chat:boundary:v1 -->"));

  const turn2Commands = snapshot.turns[1]!.items.filter((i) => i.kind === "commandExecution");
  assert.equal(turn2Commands.length, 1);
  assert.equal(turn2Commands[0]?.id, "cmd-real");

  // 7. interruptTurn auto-resolves activeTurnId when omitted
  const intRes = await invoke("interruptTurn", { threadId: "side-persistent-1" });
  assert.equal(intRes.ok, true);
  assert.equal(intRes.interrupted, true);
  assert.equal(intRes.turnId, "turn-2");

  // 8. respondInteraction submits native approval decision
  const respRes = await invoke("respondInteraction", {
    threadId: "side-persistent-1",
    requestId: 42,
    answer: { kind: "approval", actionId: "accept" },
  });
  assert.equal(respRes.ok, true);
  assert.equal(respRes.resolved, true);
  assert.equal(respondCalls.length, 1);
  assert.deepEqual(respondCalls[0]?.result, { decision: "accept" });

  // 9. archiveSideChat: ephemeral skips thread/archive, persistent calls thread/archive
  const archiveCountBefore = rpcCalls.filter((c) => c.method === "thread/archive").length;
  const archEph = await invoke("archiveSideChat", { threadId: "side-ephemeral-1" });
  assert.equal(archEph.ok, true);
  assert.equal(archEph.removed, true);
  assert.equal(
    rpcCalls.filter((c) => c.method === "thread/archive").length,
    archiveCountBefore,
    "Ephemeral archive must not call Host thread/archive",
  );

  const archPer = await invoke("archiveSideChat", { threadId: "side-persistent-1" });
  assert.equal(archPer.ok, true);
  assert.equal(archPer.removed, true);
  assert.equal(
    rpcCalls.filter((c) => c.method === "thread/archive").length,
    archiveCountBefore + 1,
  );

  assert.equal(sawOriginHeader, false, "Backend client-channel requests must never send Origin header");
});

test("backend/index.mjs handles offline channels, 401 descriptor rotation rescan, startTurn boundary deduplication, and global listSideChats", async (t) => {
  const backendPath = resolve(root, "backend/index.mjs");
  const mod = (await import(pathToFileURL(backendPath).href)) as {
    activate: (ctx: {
      extensionId: string;
      extensionDir: string;
      dataDir: string;
      readSettings: () => Promise<Record<string, unknown>>;
      writeSettings: (v: Record<string, unknown>) => Promise<Record<string, unknown>>;
      handle: (method: string, handler: (params: unknown) => unknown) => void;
    }) => Promise<() => void>;
  };

  const tempRoot = mkdtempSync(join(tmpdir(), "codexhost-side-chat-v2-edge-"));
  t.after(() => rmSync(tempRoot, { recursive: true, force: true }));

  const dataDir = join(tempRoot, "host-extension-data", "codexhost-side-chat");
  const channelDir = join(tempRoot, "client-hosts");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(channelDir, { recursive: true });

  const handlers = new Map<string, (params: unknown) => unknown>();
  const dispose = await mod.activate({
    extensionId: "codexhost-side-chat",
    extensionDir: root,
    dataDir,
    readSettings: async () => ({}),
    writeSettings: async (v) => v,
    handle(method, handler) {
      handlers.set(method, handler);
    },
  });
  t.after(() => dispose());

  const invoke = async (method: string, params?: unknown) => {
    const res = await handlers.get(method)!(params);
    assertStrictBackendJson(res, method);
    return res as Record<string, unknown>;
  };

  // Offline channel behavior
  const offlineStatus = await invoke("status");
  assert.equal(offlineStatus.ok, true);
  assert.equal(offlineStatus.connected, false);
  const offlineMains = await invoke("listMainThreads");
  assert.equal(offlineMains.ok, false);
  assert.equal((offlineMains.error as { code: string }).code, "side-chat/channel-offline");

  // Start mock channel with rotatable token to verify 401 -> rescan recovery
  let activeToken = "b".repeat(64);
  const epoch = "22222222-2222-4222-8222-222222222222";
  const sentTurnTexts: string[] = [];

  const server = createServer((req, res) => {
    const reply = (status: number, body: unknown) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.headers.authorization !== `Bearer ${activeToken}`) {
      reply(401, { error: { code: -32001, message: "Unauthorized" } });
      return;
    }
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const payload = JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
      if (req.url === "/v1/rpc") {
        const method = String(payload.method);
        const params = (payload.params ?? {}) as Record<string, unknown>;
        if (method === "codexhost/thread/catalog/read") {
          reply(200, {
            result: {
              threads: [
                {
                  id: "main-a",
                  name: "Main A",
                  cwd: "D:/repo",
                  modelProvider: "codexhost",
                  status: { type: "idle" },
                  createdAt: 1700000000,
                  updatedAt: 1700000100,
                },
              ],
            },
          });
          return;
        }
        if (method === "thread/fork") {
          reply(200, { result: { thread: { id: "side-b-1" } } });
          return;
        }
        if (method === "turn/start") {
          const text = ((params.input as Array<{ text: string }>)[0]!).text;
          sentTurnTexts.push(text);
          reply(200, { result: { turn: { id: `turn-${sentTurnTexts.length}` } } });
          return;
        }
        if (method === "thread/list") {
          reply(200, { result: { data: [] } });
          return;
        }
        reply(200, { result: {} });
        return;
      }
      if (req.url === "/v1/snapshot") {
        const threadId = String(payload.threadId);
        reply(200, {
          result: {
            cursor: { epoch, sequence: 1 },
            thread: {
              id: threadId,
              cwd: "D:/repo",
              modelProvider: "codexhost",
              createdAt: 1700000000,
              updatedAt: 1700000100,
              status: { type: "idle" },
              attachedToThreadId: "main-a",
              turns: [],
            },
            turnsPage: {
              data:
                threadId === "desktop-has-history"
                  ? [
                      {
                        id: "old-turn-1",
                        status: "completed",
                        items: [{ id: "u0", type: "userMessage", content: [{ type: "text", text: "Existing" }] }],
                      },
                    ]
                  : [],
              nextCursor: null,
            },
            configuration: {},
            interactions: [],
          },
        });
        return;
      }
      reply(404, { error: { code: -32601, message: "Not found" } });
    });
  });

  await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  t.after(() => new Promise<void>((done) => server.close(() => done())));
  const port = (server.address() as { port: number }).port;

  const descFile = join(channelDir, `host-${process.pid}-${epoch}.json`);
  writeFileSync(
    descFile,
    JSON.stringify({ version: 1, pid: process.pid, port, token: activeToken, startedAt: Date.now(), epoch }),
  );

  // Create branch without initial question -> first startTurn injects boundary, second does NOT
  const created = await invoke("createSideChat", { sourceThreadId: "main-a" });
  assert.equal(created.ok, true);

  const turn1 = await invoke("startTurn", { threadId: "side-b-1", text: "First question" });
  assert.equal(turn1.ok, true);
  assert.equal(turn1.boundaryInjected, true);
  assert.ok(sentTurnTexts[0]!.includes("<!-- codexhost-side-chat:boundary:v1 -->"));

  const turn2 = await invoke("startTurn", { threadId: "side-b-1", text: "Second question" });
  assert.equal(turn2.ok, true);
  assert.equal(turn2.boundaryInjected, false);
  assert.equal(sentTurnTexts[1], "Second question");

  // Unknown Desktop thread that already has history must NOT get boundary injected
  const desktopTurn = await invoke("startTurn", {
    threadId: "desktop-has-history",
    text: "Continue desktop side chat",
  });
  assert.equal(desktopTurn.ok, true);
  assert.equal(desktopTurn.boundaryInjected, false);
  assert.equal(sentTurnTexts[2], "Continue desktop side chat");

  // Rotate token on server + descriptor file -> cached 401 automatically rescans and succeeds
  activeToken = "c".repeat(64);
  writeFileSync(
    descFile,
    JSON.stringify({ version: 1, pid: process.pid, port, token: activeToken, startedAt: Date.now() + 50, epoch }),
  );
  const renamed = await invoke("renameSideChat", { threadId: "side-b-1", title: "Renamed Branch" });
  assert.equal(renamed.ok, true);
  assert.equal((renamed.thread as { title: string }).title, "Renamed Branch");

  // Global listSideChats (no sourceThreadId) returns all branches across sources
  const globalList = await invoke("listSideChats", {});
  assert.equal(globalList.ok, true);
  assert.ok(
    (globalList.threads as Array<{ threadId: string }>).some((item) => item.threadId === "side-b-1"),
  );
});

test("web/index.mjs parses /btw commands accurately and intercepts bare + argued /btw without leaking", async () => {
  const webMod = (await import(pathToFileURL(resolve(root, "web/index.mjs")).href)) as {
    parseWebBtwInput: (raw: string) => { kind: string; question: string } | null;
    activate: (api: unknown) => Promise<() => void>;
  };

  assert.deepEqual(webMod.parseWebBtwInput("/btw"), { kind: "open", question: "" });
  assert.deepEqual(webMod.parseWebBtwInput("  /BTW   "), { kind: "open", question: "" });
  assert.deepEqual(webMod.parseWebBtwInput("/btw what is this?"), {
    kind: "ask",
    question: "what is this?",
  });
  assert.deepEqual(webMod.parseWebBtwInput("/btw line1\nline2"), {
    kind: "ask",
    question: "line1\nline2",
  });
  assert.equal(webMod.parseWebBtwInput("/btwsomething"), null);
  assert.equal(webMod.parseWebBtwInput("hello /btw"), null);

  // Minimal DOM + Window harness to test capture-phase interception, topbar mount, and settings toggle
  type Listener = (event: Record<string, unknown>) => void;
  const docListeners = new Map<string, Set<Listener>>();
  const winListeners = new Map<string, Set<Listener>>();
  const dispatchedOpenEvents: Array<Record<string, unknown>> = [];

  class FakeElement {
    nodeType = 1;
    tagName: string;
    value = "";
    textContent = "";
    className = "";
    title = "";
    type = "";
    children: FakeElement[] = [];
    parentElement: FakeElement | null = null;
    attrs = new Map<string, string>();
    classList = {
      add: (cls: string) => {
        this.className = `${this.className} ${cls}`.trim();
      },
    };
    listeners = new Map<string, Set<Listener>>();
    ownerDocument: unknown;

    constructor(tag: string, ownerDoc: unknown) {
      this.tagName = tag.toUpperCase();
      this.ownerDocument = ownerDoc;
    }
    setAttribute(name: string, val: string) {
      this.attrs.set(name, val);
    }
    getAttribute(name: string) {
      return this.attrs.has(name) ? this.attrs.get(name)! : null;
    }
    append(...nodes: FakeElement[]) {
      for (const n of nodes) {
        n.parentElement = this;
        this.children.push(n);
      }
    }
    contains(node: FakeElement | null): boolean {
      if (!node) return false;
      if (node === this) return true;
      return this.children.some((c) => c.contains(node));
    }
    remove() {
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter((c) => c !== this);
        this.parentElement = null;
      }
    }
    closest(selector: string): FakeElement | null {
      const m = /^\[([^\]]+)\]$/u.exec(selector);
      let cur: FakeElement | null = this;
      while (cur) {
        if (m && cur.attrs.has(m[1]!)) return cur;
        cur = cur.parentElement;
      }
      return null;
    }
    getRootNode() {
      return this.ownerDocument;
    }
    addEventListener(type: string, fn: Listener) {
      const set = this.listeners.get(type) ?? new Set();
      set.add(fn);
      this.listeners.set(type, set);
    }
    dispatchEvent(event: Record<string, unknown>) {
      for (const fn of this.listeners.get(String(event.type)) ?? []) fn(event);
      return true;
    }
  }

  const fakeWin: Record<string, unknown> = {
    location: { href: "http://127.0.0.1:3000/?session=main-web-1" },
    CustomEvent: class {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    Event: class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    },
    addEventListener(type: string, fn: Listener) {
      const set = winListeners.get(type) ?? new Set();
      set.add(fn);
      winListeners.set(type, set);
    },
    removeEventListener(type: string, fn: Listener) {
      winListeners.get(type)?.delete(fn);
    },
    dispatchEvent(event: { type: string; detail?: Record<string, unknown> }) {
      if (event.type === "codexhost-side-chat:open") {
        dispatchedOpenEvents.push(event.detail ?? {});
      }
      for (const fn of winListeners.get(event.type) ?? []) fn(event as unknown as Record<string, unknown>);
      return true;
    },
  };

  const topbarEl = new FakeElement("div", null);
  topbarEl.setAttribute("data-cx-region", "topbar");

  const fakeDoc: Record<string, unknown> = {
    defaultView: fakeWin,
    documentElement: { lang: "zh-CN" },
    createElement: (tag: string) => new FakeElement(tag, fakeDoc),
    querySelector: (selector: string) => (selector === '[data-cx-region="topbar"]' ? topbarEl : null),
    addEventListener(type: string, fn: Listener) {
      const set = docListeners.get(type) ?? new Set();
      set.add(fn);
      docListeners.set(type, set);
    },
    removeEventListener(type: string, fn: Listener) {
      docListeners.get(type)?.delete(fn);
    },
  };
  topbarEl.ownerDocument = fakeDoc;

  const prevWin = (globalThis as Record<string, unknown>).window;
  const prevDoc = (globalThis as Record<string, unknown>).document;
  (globalThis as Record<string, unknown>).window = fakeWin;
  (globalThis as Record<string, unknown>).document = fakeDoc;

  try {
    const controller = new AbortController();
    const backendInvocations: Array<{ method: string; params: unknown }> = [];
    let storageListener: ((v: Record<string, unknown>) => void) | undefined;
    let trackedCleanupCount = 0;

    const fakeApi = {
      id: "codexhost-side-chat",
      apiVersion: 1,
      signal: controller.signal,
      dom: {
        mount(region: string) {
          if (region !== "topbar") return undefined;
          const container = new FakeElement("div", fakeDoc);
          topbarEl.append(container);
          return {
            container,
            dispose: () => container.remove(),
          };
        },
        mark() {},
        unmark() {},
      },
      track(fn: () => void) {
        if (typeof fn === "function") trackedCleanupCount += 1;
      },
      storage: {
        async get() {
          return { enableWebBtwShortcut: true };
        },
        async set(v: Record<string, unknown>) {
          return v;
        },
        onChange(cb: (v: Record<string, unknown>) => void) {
          storageListener = cb;
          return () => {
            storageListener = undefined;
          };
        },
      },
      backend: {
        async invoke(method: string, params: unknown) {
          backendInvocations.push({ method, params });
          if (method === "createSideChat") {
            return {
              ok: true,
              mode: "persistent",
              thread: { threadId: "side-from-btw-1", sourceThreadId: "main-web-1" },
            };
          }
          return { ok: true, threads: [] };
        },
      },
    };

    const dispose = await webMod.activate(fakeApi);
    assert.ok(trackedCleanupCount >= 1);
    assert.equal(topbarEl.children.length, 1, "Topbar launch button should be mounted");

    // Topbar button click dispatches codexhost-side-chat:open
    const topbarBtn = topbarEl.children[0]!.children[0]!;
    topbarBtn.dispatchEvent({ type: "click" });
    assert.equal(dispatchedOpenEvents.length, 1);
    assert.equal(dispatchedOpenEvents[0]?.sourceThreadId, "main-web-1");
    assert.equal(dispatchedOpenEvents[0]?.focusInput, true);

    // Capture-phase Enter on main composer with `/btw <question>` intercepts & creates side chat
    const mainTextarea = new FakeElement("textarea", fakeDoc);
    mainTextarea.value = "/btw explain this hook";
    let prevented = false;
    let stopped = false;
    for (const fn of docListeners.get("keydown") ?? []) {
      fn({
        type: "keydown",
        key: "Enter",
        shiftKey: false,
        ctrlKey: false,
        metaKey: false,
        altKey: false,
        isComposing: false,
        target: mainTextarea,
        preventDefault: () => {
          prevented = true;
        },
        stopImmediatePropagation: () => {
          stopped = true;
        },
      });
    }
    assert.equal(prevented, true);
    assert.equal(stopped, true);
    assert.equal(mainTextarea.value, "", "Main composer must be cleared after /btw intercept");

    await new Promise((r) => setTimeout(r, 15));
    assert.equal(backendInvocations.length, 1);
    assert.deepEqual(backendInvocations[0], {
      method: "createSideChat",
      params: { sourceThreadId: "main-web-1", question: "explain this hook" },
    });
    assert.equal(dispatchedOpenEvents.length, 2);
    assert.equal(dispatchedOpenEvents[1]?.threadId, "side-from-btw-1");

    // Side Chat's own textarea (`data-sc-own-input`) must NEVER be intercepted
    const ownTextarea = new FakeElement("textarea", fakeDoc);
    ownTextarea.setAttribute("data-sc-own-input", "true");
    ownTextarea.value = "/btw inside own input";
    let ownPrevented = false;
    for (const fn of docListeners.get("keydown") ?? []) {
      fn({
        type: "keydown",
        key: "Enter",
        shiftKey: false,
        isComposing: false,
        target: ownTextarea,
        preventDefault: () => {
          ownPrevented = true;
        },
        stopImmediatePropagation: () => {},
      });
    }
    assert.equal(ownPrevented, false);

    // Draft page `/btw <question>` preserves question in open event instead of swallowing it
    fakeWin.location = { href: "http://127.0.0.1:3000/?draft=1" };
    mainTextarea.value = "/btw keep my draft question";
    for (const fn of docListeners.get("keydown") ?? []) {
      fn({
        type: "keydown",
        key: "Enter",
        shiftKey: false,
        isComposing: false,
        target: mainTextarea,
        preventDefault: () => {},
        stopImmediatePropagation: () => {},
      });
    }
    await new Promise((r) => setTimeout(r, 15));
    assert.equal(dispatchedOpenEvents.length, 3);
    assert.equal(dispatchedOpenEvents[2]?.prefillQuestion, "keep my draft question");
    assert.equal(dispatchedOpenEvents[2]?.errorCode, "side-chat/draft-source");

    // Disabling `enableWebBtwShortcut` via storage.onChange stops interception
    storageListener?.({ enableWebBtwShortcut: false });
    mainTextarea.value = "/btw should not intercept";
    let disabledPrevented = false;
    for (const fn of docListeners.get("keydown") ?? []) {
      fn({
        type: "keydown",
        key: "Enter",
        shiftKey: false,
        isComposing: false,
        target: mainTextarea,
        preventDefault: () => {
          disabledPrevented = true;
        },
        stopImmediatePropagation: () => {},
      });
    }
    assert.equal(disabledPrevented, false);

    // Cleanup removes topbar mount & listeners cleanly
    dispose();
    assert.equal(topbarEl.children.length, 0);
    assert.equal(docListeners.get("keydown")?.size ?? 0, 0);
  } finally {
    (globalThis as Record<string, unknown>).window = prevWin;
    (globalThis as Record<string, unknown>).document = prevDoc;
  }
});

test("page/index.mjs and widget/index.mjs import cleanly as standard ESM and export mount(root, api)", async () => {
  const [pageMod, widgetMod, sharedViewMod] = (await Promise.all([
    import(pathToFileURL(resolve(root, "page/index.mjs")).href),
    import(pathToFileURL(resolve(root, "widget/index.mjs")).href),
    import(pathToFileURL(resolve(root, "shared/side-chat-view.mjs")).href),
  ])) as [
    { mount?: unknown },
    { mount?: unknown },
    { createModeBadge?: unknown; createSideChatView?: unknown },
  ];

  assert.equal(typeof pageMod.mount, "function");
  assert.equal(typeof widgetMod.mount, "function");
  assert.equal(typeof sharedViewMod.createModeBadge, "function");
  assert.equal(typeof sharedViewMod.createSideChatView, "function");
});
