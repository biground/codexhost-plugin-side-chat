/**
 * Real host integration tests against `D:/WorkSpace/Everything/codex-host/packages/web-server/src/`.
 *
 * All temporary directories live in `os.tmpdir()` and are cleaned up automatically.
 * Never writes anything inside `codex-host`.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const hostRoot = "D:/WorkSpace/Everything/codex-host";
const hostWebServerSrc = join(hostRoot, "packages/web-server/src");
const hasHostRepo = existsSync(hostWebServerSrc);

function hostModuleUrl(filename: string): string {
  return pathToFileURL(join(hostWebServerSrc, filename)).href;
}

function copyPluginPackage(destination: string): void {
  mkdirSync(destination, { recursive: true });
  for (const entry of ["package.json", "README.md", "lib", "assets", "locale"]) {
    const src = join(pluginRoot, entry);
    if (existsSync(src)) {
      cpSync(src, join(destination, entry), { recursive: true });
    }
  }
}

test(
  "codex-host real asset, metadata, WebAssets composition, and DshWebServices plugin loading",
  { skip: !hasHostRepo && "codex-host repository not found at expected path" },
  async (t) => {
    const [
      { readExternalClientAssets, checkExternalClientDependencies, EXTERNAL_CLIENT_PLATFORM_MODULES },
      { sourceClientRuntimeVersions, checkClientRuntimeVersions, CLIENT_RUNTIME_VERSIONS_FILE },
      { CLIENT_PLUGINS },
      { readExtensionMeta },
      { WebAssets },
      { WebUiExtensions },
      { DataDir },
      { DshWebServices },
    ] = await Promise.all([
      import(hostModuleUrl("external-client-assets.ts")),
      import(hostModuleUrl("client-runtime-versions.ts")),
      import(hostModuleUrl("plugins.ts")),
      import(hostModuleUrl("ui-extension-meta.ts")),
      import(hostModuleUrl("web-assets.ts")),
      import(hostModuleUrl("ui-extensions.ts")),
      import(hostModuleUrl("store.ts")),
      import(hostModuleUrl("dsh-web-services.ts")),
    ]);

    // a. readExternalClientAssets
    const assets = readExternalClientAssets({
      id: "codexhost-plugin-side-chat",
      directory: pluginRoot,
    });
    assert.equal(assets.id, "codexhost-plugin-side-chat");
    assert.ok(assets.clientPath.endsWith("client.js"));
    assert.equal(assets.manifest.inject?.length, 8);
    assert.ok(assets.requirements.some((req: { name: string }) => req.name === "react"));

    // b. checkExternalClientDependencies
    assert.doesNotThrow(() => {
      checkExternalClientDependencies([assets], new Set(CLIENT_PLUGINS));
    });

    // c. sourceClientRuntimeVersions + checkClientRuntimeVersions
    const runtimeVersions = sourceClientRuntimeVersions(
      hostRoot,
      new Map(),
      CLIENT_PLUGINS,
      EXTERNAL_CLIENT_PLATFORM_MODULES,
    );
    assert.equal(runtimeVersions.version, 1);
    assert.ok(typeof runtimeVersions.packages.react === "string");
    assert.doesNotThrow(() => {
      checkClientRuntimeVersions("codexhost-plugin-side-chat", assets.requirements, runtimeVersions);
    });

    // d. readExtensionMeta
    const meta = readExtensionMeta("codexhost-plugin-side-chat", pluginRoot);
    assert.ok(meta, "readExtensionMeta should return metadata");
    assert.equal(meta.error, undefined);
    assert.equal(typeof meta.title, "object");
    assert.equal((meta.title as Record<string, string>)?.en, "Side Chat");
    assert.equal((meta.title as Record<string, string>)?.["zh-cn"], "侧边聊天 (Side Chat)");
    assert.equal(typeof meta.description, "object");
    assert.ok((meta.description as Record<string, string>)?.en?.length > 0);
    assert.ok((meta.description as Record<string, string>)?.["zh-cn"]?.length > 0);
    assert.ok(typeof meta.icon === "string" && meta.icon.startsWith("data:image/svg+xml;base64,"));

    // Create isolated temp root for packed WebAssets + DataDir runtime tests
    const tempRoot = mkdtempSync(join(tmpdir(), "codexhost-side-chat-host-int-"));
    t.after(() => rmSync(tempRoot, { recursive: true, force: true }));

    // e. WebAssets composition & /plugins/codexhost-plugin-side-chat/client.js serving
    const packedRoot = join(tempRoot, "packed-web");
    mkdirSync(packedRoot, { recursive: true });
    writeFileSync(
      join(packedRoot, "index.html"),
      "<!doctype html><html><head><title>CodexHost</title></head><body></body></html>",
    );
    writeFileSync(join(packedRoot, CLIENT_RUNTIME_VERSIONS_FILE), JSON.stringify(runtimeVersions));

    const stubInjectIds = assets.manifest.inject ?? [];
    const packedPlugins = stubInjectIds.map((id: string) => {
      const safeDir = id.replaceAll("/", "__");
      const pluginDir = join(packedRoot, "plugins", safeDir);
      mkdirSync(pluginDir, { recursive: true });
      writeFileSync(
        join(pluginDir, "client.js"),
        `window.__ModuleLoader__.load({id:${JSON.stringify(id)},factory:()=>({apply(){}})});\n`,
      );
      return { id, dir: safeDir, manifest: { platform: "web" } };
    });
    writeFileSync(join(packedRoot, "plugins.json"), JSON.stringify(packedPlugins));

    const webAssets = new WebAssets({
      packedRoot,
      plugins: stubInjectIds,
      externalPlugins: [{ id: "codexhost-plugin-side-chat", directory: pluginRoot }],
      globals: {},
      title: "CodexHost",
    });

    const entry = webAssets.graph.entries.find(
      (item: { id: string }) => item.id === "codexhost-plugin-side-chat",
    );
    assert.ok(entry, "WebAssets graph must include codexhost-plugin-side-chat");
    const indexHtml = webAssets.index().body.toString("utf8");
    assert.ok(indexHtml.includes("codexhost-plugin-side-chat"));

    const servedClient = webAssets.plugin(`/${entry.url}`);
    assert.ok(servedClient, `WebAssets must serve /${entry.url}`);
    assert.equal(servedClient.contentType, "text/javascript; charset=utf-8");
    const servedCode = servedClient.body.toString("utf8");
    assert.ok(servedCode.includes("window.__ModuleLoader__.load"));
    assert.ok(servedCode.includes("codexhost-plugin-side-chat"));
    const builtClient = readFileSync(join(pluginRoot, "lib/client.js"), "utf8");
    assert.ok(servedCode.includes(builtClient.trim().slice(0, 64)));

    // f. WebUiExtensions + DshWebServices.open + loadPlugins + HTTP routes & auth
    const dataRoot = join(tempRoot, "data");
    const installId = randomUUID();
    const installedPkgDir = join(
      dataRoot,
      "ui-extensions/packages",
      installId,
      "node_modules/codexhost-plugin-side-chat",
    );
    copyPluginPackage(installedPkgDir);
    writeFileSync(
      join(dataRoot, "ui-extensions/installed.json"),
      JSON.stringify({
        version: 1,
        extensions: [
          {
            id: "codexhost-plugin-side-chat",
            name: "codexhost-plugin-side-chat",
            version: "0.1.0",
            format: "dsh",
            supportedTargets: ["web"],
            enabledTargets: ["web"],
            source: pluginRoot,
            installedAt: new Date().toISOString(),
            installId,
          },
        ],
      }),
    );

    const mockHostAccess = {
      authEnabled: true,
      dataDirectory: dataRoot,
      getRequestAuth(req: IncomingMessage) {
        const token = req.headers["x-test-auth"];
        if (token === "full-token") {
          return { credential: "full-token", local: true, scope: "full" as const };
        }
        if (token === "scoped-token") {
          return { credential: "scoped-token", local: true, scope: "scoped" as const };
        }
        return undefined;
      },
    };

    const services = await DshWebServices.open({
      workspaceRoot: tempRoot,
      threadWorkspace: () => tempRoot,
      codexhostAccess: mockHostAccess,
    });
    t.after(() => services.close());

    const runtime = await services.loadPlugins({
      packages: [],
      builtins: [],
      address: () => ({ host: "127.0.0.1", port: 0 }),
    });
    t.after(() => runtime.close());

    const extensions = new WebUiExtensions(new DataDir(dataRoot), {
      validate: (plugins: readonly { id: string; directory: string }[]) => {
        const read = plugins.map(readExternalClientAssets);
        checkExternalClientDependencies(read, new Set(CLIENT_PLUGINS));
      },
      apply: (packages: readonly { id: string; directory: string }[], changedId?: string) =>
        runtime.update(packages, changedId),
    });

    await extensions.restore();
    const uiState = extensions.state();
    assert.equal(uiState.extensions.length, 1);
    assert.equal(uiState.extensions[0]?.meta?.error, undefined);
    assert.equal(uiState.extensions[0]?.loadError, undefined);
    assert.ok(
      uiState.loadedIds.includes("codexhost-plugin-side-chat"),
      `Expected codexhost-plugin-side-chat in loadedIds, got ${JSON.stringify(uiState.loadedIds)}`,
    );
    assert.ok(
      runtime.clients
        .graph()
        .entries.some((item: { id: string }) => item.id === "codexhost-plugin-side-chat"),
      "runtime.clients.graph() must include codexhost-plugin-side-chat",
    );

    const server = createServer((req, res) => {
      void runtime
        .handle(req, res)
        .then((handled: boolean) => {
          if (!handled) res.writeHead(404).end();
        })
        .catch(() => {
          if (!res.headersSent) res.writeHead(500).end();
        });
    });
    await new Promise<void>((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
    t.after(
      () =>
        new Promise<void>((resolveClose) => {
          server.closeAllConnections();
          server.close(() => resolveClose());
        }),
    );

    const baseUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;

    // 401 when unauthenticated
    const unauthRes = await fetch(`${baseUrl}/codexhost-side-chat/threads`);
    assert.equal(unauthRes.status, 401);

    // 403 when scoped
    const scopedRes = await fetch(`${baseUrl}/codexhost-side-chat/threads`, {
      headers: { "x-test-auth": "scoped-token" },
    });
    assert.equal(scopedRes.status, 403);

    // 201 POST + 200 GET when full auth
    const createRes = await fetch(`${baseUrl}/codexhost-side-chat/threads`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-test-auth": "full-token",
      },
      body: JSON.stringify({
        threadId: "side-host-int-1",
        sourceThreadId: "main-host-int-1",
        mode: "persistent",
        title: "Host integration check",
      }),
    });
    assert.equal(createRes.status, 201);
    const createdJson = (await createRes.json()) as {
      thread: { threadId: string; mode: string; sourceThreadId: string };
    };
    assert.equal(createdJson.thread.threadId, "side-host-int-1");
    assert.equal(createdJson.thread.mode, "persistent");

    const listRes = await fetch(
      `${baseUrl}/codexhost-side-chat/threads?sourceThreadId=main-host-int-1`,
      {
        headers: { "x-test-auth": "full-token" },
      },
    );
    assert.equal(listRes.status, 200);
    const listJson = (await listRes.json()) as {
      threads: Array<{ threadId: string; title: string }>;
    };
    assert.equal(listJson.threads.length, 1);
    assert.equal(listJson.threads[0]?.threadId, "side-host-int-1");
    assert.equal(listJson.threads[0]?.title, "Host integration check");
  },
);
