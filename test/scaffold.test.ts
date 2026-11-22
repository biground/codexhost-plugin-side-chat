import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import vm from "node:vm";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("package.json and metadata assets satisfy CodexHost Web extension requirements", () => {
  const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")) as Record<
    string,
    unknown
  >;

  assert.equal(pkg.name, "codexhost-plugin-side-chat");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.dependencies, undefined);

  const exportsMap = pkg.exports as Record<string, string>;
  assert.deepEqual(exportsMap, {
    ".": "./lib/index.js",
    "./client": "./lib/client.js",
    "./package.json": "./package.json",
    "./icon": "./assets/icon.svg",
    "./locale/*": "./locale/*",
  });

  assert.deepEqual(pkg.files, ["lib", "assets", "locale", "README.md"]);

  const dsh = pkg.dsh as { client?: { platform?: string; inject?: string[] } };
  assert.equal(dsh.client?.platform, "web");
  assert.ok(Array.isArray(dsh.client?.inject) && dsh.client.inject.length === 8);

  const gitignore = readFileSync(resolve(root, ".gitignore"), "utf8");
  assert.ok(!/^\s*\/?lib\/?\s*$/m.test(gitignore), ".gitignore must not ignore lib/");

  const iconPath = resolve(root, "assets/icon.svg");
  assert.ok(existsSync(iconPath), "assets/icon.svg must exist");
  const iconStat = statSync(iconPath);
  assert.ok(iconStat.size > 0 && iconStat.size < 4096, "assets/icon.svg must be < 4 KiB");

  for (const localeFile of ["locale/en.json", "locale/zh-CN.json"]) {
    const content = JSON.parse(readFileSync(resolve(root, localeFile), "utf8")) as {
      meta?: { title?: string; description?: string };
    };
    assert.ok(typeof content.meta?.title === "string" && content.meta.title.trim().length > 0);
    assert.ok(
      typeof content.meta?.description === "string" && content.meta.description.trim().length > 0,
    );
  }
});

test("lib/index.js and lib/client.js are not ignored by git", () => {
  let ignored = false;
  try {
    execFileSync("git", ["check-ignore", "-q", "lib/index.js", "lib/client.js"], {
      cwd: root,
      stdio: "ignore",
    });
    ignored = true;
  } catch {
    ignored = false;
  }
  assert.equal(ignored, false, "lib/index.js and lib/client.js must not be git-ignored");
});

test("lib/index.js can be imported as Node ESM and exports name, inject, apply", async () => {
  const indexPath = resolve(root, "lib/index.js");
  assert.ok(existsSync(indexPath), "lib/index.js must exist");
  const mod = (await import(pathToFileURL(indexPath).href)) as {
    name?: string;
    inject?: readonly string[];
    apply?: unknown;
  };
  assert.equal(mod.name, "codexhost-plugin-side-chat");
  assert.deepEqual([...(mod.inject ?? [])], ["webServer", "codexhostAccess"]);
  assert.equal(typeof mod.apply, "function");
});

test("lib/client.js registers into window.__ModuleLoader__.load and exports name, inject, apply", () => {
  const clientPath = resolve(root, "lib/client.js");
  assert.ok(existsSync(clientPath), "lib/client.js must exist");
  const code = readFileSync(clientPath, "utf8");

  let loadedId = "";
  let loadedFactory: ((require: (id: string) => unknown) => Record<string, unknown>) | undefined;

  const sandbox = {
    window: {
      __ModuleLoader__: {
        load(entry: {
          id: string;
          factory: (require: (id: string) => unknown) => Record<string, unknown>;
        }) {
          loadedId = entry.id;
          loadedFactory = entry.factory;
        },
      },
    },
  };

  vm.runInNewContext(code, sandbox);
  assert.equal(loadedId, "codexhost-plugin-side-chat");
  assert.equal(typeof loadedFactory, "function");

  const exportsObj = loadedFactory!(() => ({}));
  assert.equal(exportsObj.name, "codexhost-plugin-side-chat");
  assert.deepEqual(
    [...(exportsObj.inject as readonly string[])],
    [
      "slots",
      "locale",
      "sidebarRight",
      "sidebarRightTabs",
      "shortcuts",
      "sessions",
      "commandUi",
      "inputTriggers",
    ],
  );
  assert.equal(typeof exportsObj.apply, "function");
});
