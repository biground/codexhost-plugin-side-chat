import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { apply, inject, name } from "../src/index.ts";
import { SideChatStore } from "../src/store.ts";
import type {
  HostAccessService,
  HostRequestAuth,
  HostWebRoute,
  SideChatRecord,
} from "../src/types.ts";

function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), "codexhost-side-chat-test-"));
}

async function startPluginServer(options: {
  dataDirectory: string;
  authEnabled: boolean;
  resolveAuth?: (req: IncomingMessage) => HostRequestAuth | undefined;
}): Promise<{
  baseUrl: string;
  port: number;
  close: () => Promise<void>;
}> {
  let registeredRoute: HostWebRoute | undefined;
  const cleanups: Array<() => void> = [];

  const access: HostAccessService = {
    authEnabled: options.authEnabled,
    dataDirectory: options.dataDirectory,
    getRequestAuth: (req) => options.resolveAuth?.(req),
  };

  apply({
    webServer: {
      register(route) {
        registeredRoute = route;
        return () => {
          registeredRoute = undefined;
        };
      },
    },
    codexhostAccess: access,
    effect(callback) {
      const cleanup = callback();
      if (typeof cleanup === "function") cleanups.push(cleanup);
    },
  });

  assert.ok(registeredRoute, "plugin must register a webServer route");
  assert.equal(registeredRoute.kind, "prefix");
  assert.equal(registeredRoute.path, "/codexhost-side-chat");

  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (
      registeredRoute &&
      (url.pathname === registeredRoute.path || url.pathname.startsWith(`${registeredRoute.path}/`))
    ) {
      await registeredRoute.handler(req, res);
      return;
    }
    res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ error: "not-found" }));
  });

  await new Promise<void>((resolveListen) => {
    server.listen(0, "127.0.0.1", () => resolveListen());
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  return {
    port: address.port,
    baseUrl: `http://127.0.0.1:${address.port}`,
    close: async () => {
      for (const cleanup of cleanups) cleanup();
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((err) => (err ? rejectClose(err) : resolveClose()));
      });
    },
  };
}

test("server plugin exports canonical name and Cordis inject list", () => {
  assert.equal(name, "codexhost-plugin-side-chat");
  assert.deepEqual([...inject], ["webServer", "codexhostAccess"]);
});

test("SideChatStore supports CRUD, sorting, restart persistence, and corrupt file recovery", () => {
  const dir = makeTempDir();
  try {
    const store = new SideChatStore(dir);
    assert.equal(store.filePath, join(dir, "side-chat-store.json"));
    assert.deepEqual(store.list(), []);

    const first = store.upsert({
      threadId: "sc-1",
      sourceThreadId: "main-a",
      mode: "persistent",
      title: "First question",
      boundaryConsumed: false,
      createdAt: "2026-11-23T00:00:01.000Z",
      updatedAt: "2026-11-23T00:00:01.000Z",
    });
    const second = store.upsert({
      threadId: "sc-2",
      sourceThreadId: "main-a",
      mode: "ephemeral",
      title: "Second question",
      boundaryConsumed: true,
      createdAt: "2026-11-23T00:00:02.000Z",
      updatedAt: "2026-11-23T00:00:05.000Z",
    });
    store.upsert({
      threadId: "sc-other",
      sourceThreadId: "main-b",
      mode: "persistent",
      title: "Other main thread",
      boundaryConsumed: false,
    });

    const listA = store.list("main-a");
    assert.deepEqual(
      listA.map((item) => item.threadId),
      ["sc-2", "sc-1"],
      "list should be sorted by updatedAt descending",
    );
    assert.equal(first.mode, "persistent");
    assert.equal(second.boundaryConsumed, true);

    // Idempotent upsert keeps createdAt and existing boundaryConsumed when omitted
    const idempotent = store.upsert({
      threadId: "sc-2",
      sourceThreadId: "main-a",
      mode: "ephemeral",
      title: "Second question updated",
    });
    assert.equal(idempotent.createdAt, second.createdAt);
    assert.equal(idempotent.boundaryConsumed, true);
    assert.equal(idempotent.title, "Second question updated");

    // Patch fields
    const patched = store.update("sc-1", {
      title: "Renamed first",
      boundaryConsumed: true,
      mode: "ephemeral",
    });
    assert.equal(patched.title, "Renamed first");
    assert.equal(patched.boundaryConsumed, true);
    assert.equal(patched.mode, "ephemeral");

    // Restart persistence via a fresh store instance
    const reloaded = new SideChatStore(dir);
    assert.equal(reloaded.list("main-a").length, 2);
    assert.equal(reloaded.get("sc-1")?.title, "Renamed first");
    assert.equal(reloaded.get("sc-1")?.boundaryConsumed, true);

    // Source-scoped remove refuses mismatched sourceThreadId
    assert.equal(reloaded.remove("sc-1", "wrong-source"), false);
    assert.ok(reloaded.get("sc-1"));
    assert.equal(reloaded.remove("sc-1", "main-a"), true);
    assert.equal(reloaded.get("sc-1"), undefined);

    // Corrupt JSON recovery
    writeFileSync(reloaded.filePath, "{broken-json", "utf8");
    const recoveredFromBroken = new SideChatStore(dir);
    assert.deepEqual(recoveredFromBroken.list(), []);

    // Partial corruption recovery: keeps valid records and drops invalid entries
    writeFileSync(
      reloaded.filePath,
      JSON.stringify({
        version: 1,
        threads: [
          {
            threadId: "sc-valid",
            sourceThreadId: "main-a",
            mode: "persistent",
            title: "Still valid",
            boundaryConsumed: false,
            createdAt: "2026-11-23T00:01:00.000Z",
            updatedAt: "2026-11-23T00:01:00.000Z",
          },
          { threadId: "", mode: "invalid" },
          null,
        ],
      }),
      "utf8",
    );
    const recoveredPartial = new SideChatStore(dir);
    assert.deepEqual(
      recoveredPartial.list().map((item) => item.threadId),
      ["sc-valid"],
    );

    // Subsequent write heals file cleanly
    recoveredPartial.upsert({
      threadId: "sc-healed",
      sourceThreadId: "main-a",
      mode: "persistent",
      title: "Healed",
    });
    const persistedJson = JSON.parse(readFileSync(recoveredPartial.filePath, "utf8")) as {
      version: number;
      threads: SideChatRecord[];
    };
    assert.equal(persistedJson.version, 1);
    assert.equal(persistedJson.threads.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("HTTP routes enforce authEnabled=true (401 unauth, 403 scoped, 200/201 full) and persist JSON", async () => {
  const dir = makeTempDir();
  const server = await startPluginServer({
    dataDirectory: dir,
    authEnabled: true,
    resolveAuth(req) {
      const authHeader = req.headers.authorization;
      if (authHeader === "Bearer full-token") {
        return { credential: "primary", local: true, scope: "full" };
      }
      if (authHeader === "Bearer scoped-token") {
        return { credential: "scoped:1", local: false, scope: "scoped" };
      }
      return undefined;
    },
  });

  try {
    // 1. No credentials -> 401 auth/unauthorized
    const unauthRes = await fetch(`${server.baseUrl}/codexhost-side-chat/threads?sourceThreadId=m1`);
    assert.equal(unauthRes.status, 401);
    assert.equal(unauthRes.headers.get("cache-control"), "no-store");
    const unauthBody = (await unauthRes.json()) as { error: { code: string } };
    assert.equal(unauthBody.error.code, "auth/unauthorized");

    // 2. Scoped token -> 403 auth/forbidden
    const scopedRes = await fetch(`${server.baseUrl}/codexhost-side-chat/threads?sourceThreadId=m1`, {
      headers: { authorization: "Bearer scoped-token" },
    });
    assert.equal(scopedRes.status, 403);
    assert.equal(scopedRes.headers.get("cache-control"), "no-store");
    const scopedBody = (await scopedRes.json()) as { error: { code: string } };
    assert.equal(scopedBody.error.code, "auth/forbidden");

    // 3. Full token -> POST create
    const postRes = await fetch(`${server.baseUrl}/codexhost-side-chat/threads`, {
      method: "POST",
      headers: {
        authorization: "Bearer full-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        threadId: "sc-100",
        sourceThreadId: "m1",
        mode: "persistent",
        title: "Investigate cache",
        boundaryConsumed: false,
      }),
    });
    assert.equal(postRes.status, 201);
    assert.equal(postRes.headers.get("cache-control"), "no-store");
    const postBody = (await postRes.json()) as {
      thread: SideChatRecord;
      threads: SideChatRecord[];
    };
    assert.equal(postBody.thread.threadId, "sc-100");
    assert.equal(postBody.thread.mode, "persistent");
    assert.equal(postBody.threads.length, 1);

    // 4. Full token -> GET list
    const getRes = await fetch(`${server.baseUrl}/codexhost-side-chat/threads?sourceThreadId=m1`, {
      headers: { authorization: "Bearer full-token" },
    });
    assert.equal(getRes.status, 200);
    assert.equal(getRes.headers.get("cache-control"), "no-store");
    const getBody = (await getRes.json()) as { threads: SideChatRecord[] };
    assert.equal(getBody.threads.length, 1);
    assert.equal(getBody.threads[0]?.threadId, "sc-100");

    // 5. Full token -> PATCH update
    const patchRes = await fetch(`${server.baseUrl}/codexhost-side-chat/threads/sc-100`, {
      method: "PATCH",
      headers: {
        authorization: "Bearer full-token",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        title: "Cache investigation done",
        boundaryConsumed: true,
      }),
    });
    assert.equal(patchRes.status, 200);
    const patchBody = (await patchRes.json()) as { thread: SideChatRecord };
    assert.equal(patchBody.thread.title, "Cache investigation done");
    assert.equal(patchBody.thread.boundaryConsumed, true);

    // Verify file on disk
    const onDisk = JSON.parse(readFileSync(join(dir, "side-chat-store.json"), "utf8")) as {
      version: number;
      threads: SideChatRecord[];
    };
    assert.equal(onDisk.threads[0]?.boundaryConsumed, true);

    // 6. Full token -> DELETE
    const delRes = await fetch(
      `${server.baseUrl}/codexhost-side-chat/threads/sc-100?sourceThreadId=m1`,
      {
        method: "DELETE",
        headers: { authorization: "Bearer full-token" },
      },
    );
    assert.equal(delRes.status, 200);
    assert.deepEqual(await delRes.json(), { deleted: true });

    // Confirm deleted
    const afterDelRes = await fetch(
      `${server.baseUrl}/codexhost-side-chat/threads?sourceThreadId=m1`,
      { headers: { authorization: "Bearer full-token" } },
    );
    assert.deepEqual(await afterDelRes.json(), { threads: [] });
  } finally {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});

test("HTTP routes in --no-auth mode allow same-origin/local requests and block cross-origin writes (403)", async () => {
  const dir = makeTempDir();
  const server = await startPluginServer({
    dataDirectory: dir,
    authEnabled: false,
  });

  try {
    // Local GET without Origin allowed
    const getRes = await fetch(`${server.baseUrl}/codexhost-side-chat/threads?sourceThreadId=m2`);
    assert.equal(getRes.status, 200);

    // Local POST without Origin allowed
    const postNoOrigin = await fetch(`${server.baseUrl}/codexhost-side-chat/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        threadId: "sc-local-1",
        sourceThreadId: "m2",
        mode: "ephemeral",
        title: "Local no origin",
      }),
    });
    assert.equal(postNoOrigin.status, 201);

    // Same-origin POST allowed
    const postSameOrigin = await fetch(`${server.baseUrl}/codexhost-side-chat/threads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: server.baseUrl,
      },
      body: JSON.stringify({
        threadId: "sc-local-2",
        sourceThreadId: "m2",
        mode: "persistent",
        title: "Local same origin",
      }),
    });
    assert.equal(postSameOrigin.status, 201);

    // Cross-origin POST blocked with 403 auth/cross-origin
    const crossPost = await fetch(`${server.baseUrl}/codexhost-side-chat/threads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://evil.example",
      },
      body: JSON.stringify({
        threadId: "sc-evil",
        sourceThreadId: "m2",
        mode: "persistent",
        title: "Evil",
      }),
    });
    assert.equal(crossPost.status, 403);
    assert.equal(crossPost.headers.get("cache-control"), "no-store");
    const crossPostBody = (await crossPost.json()) as { error: { code: string } };
    assert.equal(crossPostBody.error.code, "auth/cross-origin");

    // Cross-origin PATCH blocked
    const crossPatch = await fetch(`${server.baseUrl}/codexhost-side-chat/threads/sc-local-1`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: `http://127.0.0.1:${server.port + 1}`,
      },
      body: JSON.stringify({ title: "Hijacked" }),
    });
    assert.equal(crossPatch.status, 403);

    // Cross-origin DELETE blocked
    const crossDelete = await fetch(
      `${server.baseUrl}/codexhost-side-chat/threads/sc-local-1?sourceThreadId=m2`,
      {
        method: "DELETE",
        headers: { origin: "http://evil.local" },
      },
    );
    assert.equal(crossDelete.status, 403);

    // Malformed Origin header on mutating request blocked
    const badOrigin = await fetch(`${server.baseUrl}/codexhost-side-chat/threads/sc-local-1`, {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        origin: "not-a-valid-url",
      },
      body: JSON.stringify({ title: "Hijacked" }),
    });
    assert.equal(badOrigin.status, 403);

    // Invalid payload / unknown route handling
    const badJson = await fetch(`${server.baseUrl}/codexhost-side-chat/threads`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{bad",
    });
    assert.equal(badJson.status, 400);

    const notFound = await fetch(`${server.baseUrl}/codexhost-side-chat/unknown`);
    assert.equal(notFound.status, 404);
  } finally {
    await server.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
