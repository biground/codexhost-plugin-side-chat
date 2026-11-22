/**
 * Full-chain manifestVersion 2 contract, packaging, module-graph, and 4-surface integration tests.
 * Aligns 1:1 with upstream codexhost contracts without requiring external scratch directories in CI.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join, posix, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Script } from "node:vm";
import { crc32, inflateRawSync } from "node:zlib";
import esbuild from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// Upstream-aligned constants & strict validator helpers
// ---------------------------------------------------------------------------
const ZIP_MAX_BYTES = 64 * 1024 * 1024;
const MANIFEST_MAX_BYTES = 128 * 1024;
const SCRIPT_MAX_BYTES = 2 * 1024 * 1024;
const STYLE_MAX_BYTES = 256 * 1024;
const ICON_MAX_BYTES = 128 * 1024;
const SCREENSHOT_MAX_BYTES = 512 * 1024;
const ASSET_MAX_BYTES = 16 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 256 * 1024 * 1024;
const MAX_ENTRIES = 10_000;
const EXPANSION_RATIO = 200;
const EXPANSION_FLOOR_BYTES = 16 * 1024 * 1024;

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const RESERVED_DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³]) *(?:\.|$)/iu;
const ID_REGEX = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/u;
const ALLOWED_CATEGORIES = new Set([
  "appearance",
  "interface",
  "workflow",
  "analytics",
  "integrations",
  "tools",
]);
const ALLOWED_SUFFIX =
  /\.(?:js|mjs|cjs|css|json|png|jpe?g|webp|gif|woff2|md|txt|svg|ts|tsx|ya?ml)$/iu;

function assertResourcePath(resource: unknown): asserts resource is string {
  assert.equal(typeof resource, "string");
  const res = resource as string;
  assert.ok(res.length > 0 && res.length <= 512);
  assert.ok(!res.startsWith("/") && !res.endsWith("/"));
  assert.ok(!res.includes("\\"));
  const parts = res.split("/");
  assert.ok(parts.length <= 32);
  for (const part of parts) {
    assert.ok(part && part !== "." && part !== "..");
    assert.ok(!/[\x00-\x1f\x7f<>"|*]/u.test(part));
    assert.ok(!/[. ]$/u.test(part));
    assert.ok(!RESERVED_DEVICE_NAME.test(part));
  }
}

function assertHttpUrl(value: unknown): asserts value is string {
  assert.equal(typeof value, "string");
  const str = value as string;
  assert.ok(str.trim().length <= 2048);
  assert.match(str, /^https?:\/\/[^/?#\\\s]+/iu);
  const parsed = new URL(str);
  assert.ok(parsed.protocol === "http:" || parsed.protocol === "https:");
  assert.equal(parsed.username, "");
  assert.equal(parsed.password, "");
  assert.ok(!/[\\\s]/u.test(str));
}

function assertLocalized(obj: unknown, max: number, min = 0): void {
  assert.ok(obj && typeof obj === "object" && !Array.isArray(obj));
  const rec = obj as Record<string, unknown>;
  assert.deepEqual(Object.keys(rec).sort(), ["en", "zh-CN"]);
  for (const key of ["en", "zh-CN"]) {
    assert.equal(typeof rec[key], "string");
    const trimmed = (rec[key] as string).trim();
    assert.ok(trimmed.length >= min && trimmed.length <= max);
  }
}

// ---------------------------------------------------------------------------
// 1. Root manifest.json strict validation (hostExtensionManifestV2Schema)
// ---------------------------------------------------------------------------
test("1. manifest.json strictly conforms to hostExtensionManifestV2Schema", () => {
  const raw = readFileSync(resolve(root, "manifest.json"), "utf8");
  assert.ok(Buffer.byteLength(raw, "utf8") <= MANIFEST_MAX_BYTES);
  const m = JSON.parse(raw) as Record<string, any>;

  const allowedTop = new Set([
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
  for (const k of Object.keys(m)) {
    assert.ok(allowedTop.has(k), `Unexpected top-level key: ${k}`);
  }

  assert.equal(m.manifestVersion, 2);
  assert.match(m.id, ID_REGEX);
  assert.ok(!RESERVED_DEVICE_NAME.test(m.id));
  assert.equal(m.id, "codexhost-side-chat");
  assert.equal(m.version, "0.2.0");
  assertLocalized(m.name, 128, 1);
  assertLocalized(m.description, 4096, 0);
  assertLocalized(m.details, 16384, 0);
  assert.equal(m.author, "biground");
  assertHttpUrl(m.repository);

  assert.ok(Array.isArray(m.categories));
  assert.equal(new Set(m.categories).size, m.categories.length);
  for (const cat of m.categories) assert.ok(ALLOWED_CATEGORIES.has(cat));

  assertResourcePath(m.icon);
  assert.ok(m.icon.endsWith(".png"));
  assert.ok(Array.isArray(m.screenshots) && m.screenshots.length === 1);
  assertResourcePath(m.screenshots[0]);

  // settingsSchema validation
  assert.ok(Array.isArray(m.settingsSchema) && m.settingsSchema.length === 3);
  const settings = m.settingsSchema as Array<Record<string, any>>;
  const keys = settings.map((s) => s.key as string);
  assert.deepEqual(keys, ["widgetPosition", "showFloatingLauncher", "enableWebBtwShortcut"]);
  assert.equal(new Set(keys).size, keys.length);

  const [pos, showLauncher, btwShortcut] = settings;
  assert.deepEqual(Object.keys(pos).sort(), ["default", "description", "key", "label", "options", "type"]);
  assert.equal(pos.type, "select");
  assert.equal(pos.default, "bottom-right");
  assertLocalized(pos.label, 128, 1);
  assertLocalized(pos.description, 4096, 1);
  assert.ok(Array.isArray(pos.options) && pos.options.length === 2);
  const optValues = (pos.options as Array<Record<string, any>>).map((o) => o.value as string);
  assert.deepEqual(optValues, ["bottom-right", "bottom-left"]);
  assert.ok(optValues.includes(pos.default));

  for (const [field, expectedDefault] of [
    [showLauncher, true],
    [btwShortcut, true],
  ] as const) {
    assert.deepEqual(Object.keys(field).sort(), ["default", "description", "key", "label", "type"]);
    assert.equal(field.type, "boolean");
    assert.equal(field.default, expectedDefault);
    assertLocalized(field.label, 128, 1);
    assertLocalized(field.description, 4096, 1);
  }

  // Entries & non-overlap checks
  assert.deepEqual(Object.keys(m.page).sort(), ["apiVersion", "entry", "style", "title"]);
  assert.equal(m.page.apiVersion, 1);
  assertResourcePath(m.page.entry);
  assert.ok(m.page.entry.endsWith(".mjs"));
  assertResourcePath(m.page.style);
  assert.ok(m.page.style.endsWith(".css"));
  assertLocalized(m.page.title, 128, 1);

  assert.deepEqual(Object.keys(m.widget).sort(), ["apiVersion", "entry", "style"]);
  assert.equal(m.widget.apiVersion, 1);
  assertResourcePath(m.widget.entry);
  assert.ok(m.widget.entry.endsWith(".mjs"));
  assertResourcePath(m.widget.style);
  assert.ok(m.widget.style.endsWith(".css"));

  assert.deepEqual(Object.keys(m.web).sort(), ["apiVersion", "entry", "style"]);
  assert.equal(m.web.apiVersion, 1);
  assertResourcePath(m.web.entry);
  assert.ok(m.web.entry.endsWith(".mjs"));
  assertResourcePath(m.web.style);
  assert.ok(m.web.style.endsWith(".css"));

  assert.deepEqual(Object.keys(m.backend).sort(), ["apiVersion", "entry"]);
  assert.equal(m.backend.apiVersion, 1);
  assertResourcePath(m.backend.entry);
  assert.ok(m.backend.entry.endsWith(".mjs"));

  const backendCanon = (m.backend.entry as string).normalize("NFC").toLowerCase();
  for (const fe of [m.page.entry as string, m.widget.entry as string, m.web.entry as string]) {
    assert.notEqual(fe.normalize("NFC").toLowerCase(), backendCanon);
  }
});

// ---------------------------------------------------------------------------
// 2. PNG artwork validation
// ---------------------------------------------------------------------------
test("2. PNG artwork exists, has valid PNG signature, IHDR dimensions, and obeys size limits", () => {
  const icon = readFileSync(resolve(root, "assets/icon.png"));
  assert.ok(icon.length <= ICON_MAX_BYTES);
  assert.ok(icon.subarray(0, 8).equals(PNG_SIG), "icon.png missing PNG signature");
  assert.equal(icon.toString("ascii", 12, 16), "IHDR");
  const iconW = icon.readUInt32BE(16);
  const iconH = icon.readUInt32BE(20);
  assert.ok(iconW >= 64 && iconH >= 64);

  const preview = readFileSync(resolve(root, "assets/preview.png"));
  assert.ok(preview.length <= SCREENSHOT_MAX_BYTES);
  assert.ok(preview.subarray(0, 8).equals(PNG_SIG), "preview.png missing PNG signature");
  assert.equal(preview.toString("ascii", 12, 16), "IHDR");
  const prevW = preview.readUInt32BE(16);
  const prevH = preview.readUInt32BE(20);
  assert.ok(prevW >= 640 && prevH >= 360);
});

// ---------------------------------------------------------------------------
// 3. GitHub source zipball whitelist scan (git ls-files + untracked non-ignored)
// ---------------------------------------------------------------------------
test("3. All tracked & deliverable repository files satisfy host-extension-package.ts allowedSuffix and limits", () => {
  const output = execFileSync("git", ["ls-files", "-co", "--exclude-standard"], {
    cwd: root,
    encoding: "utf8",
  });
  const files = output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  assert.ok(files.length > 0);

  for (const rel of files) {
    assert.ok(!rel.endsWith(".zip"), `ZIP file must not be tracked/unignored: ${rel}`);
    assertResourcePath(rel);
    const base = posix.basename(rel);
    const allowed =
      ALLOWED_SUFFIX.test(rel) ||
      /^(?:licen[cs]e|notice|\.gitignore|\.gitattributes)$/iu.test(base);
    assert.ok(allowed, `Disallowed suffix for GitHub source zipball: ${rel}`);

    const size = statSync(resolve(root, rel)).size;
    if (rel === "manifest.json") assert.ok(size <= MANIFEST_MAX_BYTES);
    else if (/\.[cm]?js$/iu.test(rel)) assert.ok(size <= SCRIPT_MAX_BYTES);
    else if (/\.css$/iu.test(rel)) assert.ok(size <= STYLE_MAX_BYTES);
    else assert.ok(size <= ASSET_MAX_BYTES);
  }
});

// ---------------------------------------------------------------------------
// 4. Standard non-ZIP64 packager & upstream extension-zip.ts strict unpacker
// ---------------------------------------------------------------------------
function unpackExtensionZipStrict(zip: Buffer): Map<string, Buffer> {
  assert.ok(zip.length <= ZIP_MAX_BYTES);
  const u16 = (off: number) => zip.readUInt16LE(off);
  const u32 = (off: number) => zip.readUInt32LE(off);
  const END = 0x06054b50;
  const CENTRAL = 0x02014b50;
  const LOCAL = 0x04034b50;
  const utf8 = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true });

  let end = zip.length - 22;
  const earliest = Math.max(0, end - 0xffff);
  while (end >= earliest && (u32(end) !== END || end + 22 + u16(end + 20) !== zip.length)) end--;
  assert.ok(end >= earliest, "missing end of central directory");

  const count = u16(end + 10);
  const start = u32(end + 16);
  assert.equal(u16(end + 4), 0);
  assert.equal(u16(end + 6), 0);
  assert.equal(u16(end + 8), count);
  assert.equal(start + u32(end + 12), end, "invalid central directory bounds (ZIP64 unsupported)");
  assert.ok(count > 0 && count <= MAX_ENTRIES);

  const files = new Map<string, Buffer>();
  const seenPaths = new Set<string>();
  let total = 0;
  let central = start;
  for (let i = 0; i < count; i++) {
    assert.ok(central + 46 <= end && u32(central) === CENTRAL);
    const flags = u16(central + 8);
    const method = u16(central + 10);
    const crc = u32(central + 16);
    const compressed = u32(central + 20);
    const size = u32(central + 24);
    const nameLength = u16(central + 28);
    const next = central + 46 + nameLength + u16(central + 30) + u16(central + 32);
    const attr = u32(central + 38);
    const local = u32(central + 42);

    assert.ok(next <= end && u16(central + 34) === 0);
    assert.equal(flags, 0, "expected flags = 0 (no data descriptor)");
    assert.ok(method === 0 || method === 8);
    assert.equal(attr, 0);

    const rawName = zip.subarray(central + 46, central + 46 + nameLength);
    const name = utf8.decode(rawName);
    assert.ok(!name.includes("\\") && !name.endsWith("/"));
    assertResourcePath(name);
    const key = name.normalize("NFC").toLowerCase();
    assert.ok(!seenPaths.has(key));
    seenPaths.add(key);

    assert.ok(local + 30 <= start && u32(local) === LOCAL);
    const data = local + 30 + nameLength + u16(local + 28);
    assert.ok(data + compressed <= start);
    assert.equal(u16(local + 26), nameLength);
    assert.equal(u16(local + 6), flags);
    assert.equal(u16(local + 8), method);
    assert.ok(zip.subarray(local + 30, local + 30 + nameLength).equals(rawName));
    assert.equal(u32(local + 14), crc);
    assert.equal(u32(local + 18), compressed);
    assert.equal(u32(local + 22), size);

    total += size;
    assert.ok(total <= MAX_UNPACKED_BYTES);
    assert.ok(size <= Math.max(EXPANSION_FLOOR_BYTES, compressed * EXPANSION_RATIO));

    const input = zip.subarray(data, data + compressed);
    const bytes =
      method === 0
        ? Buffer.from(input)
        : inflateRawSync(input, { maxOutputLength: Math.max(1, size) });
    assert.equal(bytes.length, size);
    assert.equal(crc32(bytes) >>> 0, crc);
    files.set(name, bytes);
    central = next;
  }
  assert.equal(central, end);
  return files;
}

test("4. scripts/pack-zip.mjs builds a valid non-ZIP64 archive with manifest.json at root", () => {
  execFileSync(process.execPath, [resolve(root, "scripts/pack-zip.mjs")], { cwd: root });
  const zipPath = resolve(root, "release/codexhost-side-chat.zip");
  assert.ok(existsSync(zipPath));
  const zipBytes = readFileSync(zipPath);
  const files = unpackExtensionZipStrict(zipBytes);

  assert.ok(files.has("manifest.json"), "manifest.json must be at archive root");
  const manifest = JSON.parse(files.get("manifest.json")!.toString("utf8")) as Record<string, any>;
  const utf8 = new TextDecoder("utf-8", { fatal: true });

  for (const script of [
    manifest.page.entry,
    manifest.widget.entry,
    manifest.web.entry,
    manifest.backend.entry,
  ] as string[]) {
    const entryBytes = files.get(script);
    assert.ok(entryBytes, `Missing script in ZIP: ${script}`);
    utf8.decode(entryBytes);
  }
  for (const style of [manifest.page.style, manifest.widget.style, manifest.web.style] as string[]) {
    const styleBytes = files.get(style);
    assert.ok(styleBytes, `Missing style in ZIP: ${style}`);
    utf8.decode(styleBytes);
  }
  assert.ok(files.get(manifest.icon)!.subarray(0, 8).equals(PNG_SIG));
  assert.ok(files.get(manifest.screenshots[0])!.subarray(0, 8).equals(PNG_SIG));
  assert.ok(files.has("README.md"));
  assert.ok(files.has("LICENSE"));

  for (const name of files.keys()) {
    assert.ok(!name.startsWith("node_modules/"));
    assert.ok(!name.startsWith("src/"));
    assert.ok(!name.startsWith("test/"));
  }
});

// ---------------------------------------------------------------------------
// 5. Desktop module graph + vm.Script syntax + Widget/Page CSS contract
// ---------------------------------------------------------------------------
function resolveModulePath(importer: string, specifier: string): string {
  assert.match(specifier, /^\.\.?\//u, `Non-relative import forbidden: ${specifier}`);
  assert.ok(!/[?#\\]/u.test(specifier), `Invalid import chars: ${specifier}`);
  const parts = posix.dirname(importer).split("/").filter((p) => p !== ".");
  for (const seg of specifier.split("/")) {
    const part = decodeURIComponent(seg);
    assert.ok(!/[\\/]/u.test(part));
    if (part === ".") continue;
    if (part === "..") {
      assert.ok(parts.pop() !== undefined, `Import escapes package: ${specifier}`);
    } else {
      parts.push(part);
    }
  }
  const resolved = parts.join("/");
  assert.ok(resolved.endsWith(".mjs"), `Only .mjs imports allowed: ${resolved}`);
  assertResourcePath(resolved);
  return resolved;
}

test("5. Desktop module graph (page + widget) is self-contained relative .mjs, passes vm.Script, and CSS obeys contracts", () => {
  const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8")) as Record<string, any>;
  const backendCanon = (manifest.backend.entry as string).normalize("NFC").toLowerCase();
  const visited = new Set<string>();

  function walkModule(relPath: string): void {
    if (visited.has(relPath)) return;
    visited.add(relPath);
    assert.notEqual(relPath.normalize("NFC").toLowerCase(), backendCanon);

    const code = readFileSync(resolve(root, relPath), "utf8");
    assert.ok(!/\bimport\s*\(/u.test(code), `Dynamic import() forbidden in ${relPath}`);
    assert.ok(!/\beval\s*\(/u.test(code), `eval() forbidden in ${relPath}`);
    assert.ok(!/\bnew\s+Function\b/u.test(code), `new Function forbidden in ${relPath}`);

    const staticImportRe = /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gu;
    let match: RegExpExecArray | null;
    while ((match = staticImportRe.exec(code)) !== null) {
      const target = resolveModulePath(relPath, match[1]);
      walkModule(target);
    }
  }

  walkModule(manifest.page.entry);
  walkModule(manifest.widget.entry);

  // Bundle with esbuild (browser iife) and validate via new vm.Script
  for (const entry of [manifest.page.entry as string, manifest.widget.entry as string]) {
    const res = esbuild.buildSync({
      entryPoints: [resolve(root, entry)],
      bundle: true,
      write: false,
      format: "iife",
      globalName: "__ExtBundle",
      platform: "browser",
      target: "es2022",
    });
    assert.equal(res.errors.length, 0);
    new Script(res.outputFiles[0].text, { filename: entry });
  }

  // CSS contract checks
  const widgetCss = readFileSync(resolve(root, manifest.widget.style), "utf8");
  const pageCss = readFileSync(resolve(root, manifest.page.style), "utf8");
  assert.match(widgetCss, /:host\s*\{[^}]*pointer-events:\s*none/su);
  assert.match(widgetCss, /\.sc-widget-root\s*\{[^}]*pointer-events:\s*none/su);
  assert.match(widgetCss, /\.sc-widget-launcher\s*\{[^}]*pointer-events:\s*auto/su);
  assert.match(widgetCss, /\.sc-widget-drawer\s*\{[^}]*pointer-events:\s*auto/su);

  for (const cssVar of [
    "--cx-page-bg",
    "--cx-page-surface",
    "--cx-page-text",
    "--cx-page-text-muted",
    "--cx-page-border",
    "--cx-page-accent",
    "--cx-page-danger",
    "--cx-page-radius",
  ]) {
    assert.ok(widgetCss.includes(cssVar), `widget/style.css missing ${cssVar}`);
    assert.ok(pageCss.includes(cssVar), `page/style.css missing ${cssVar}`);
  }
});

// ---------------------------------------------------------------------------
// 6. Full 4-surface end-to-end integration test (backend + page + widget + web)
// ---------------------------------------------------------------------------
type ListenerEntry = { fn: (ev: any) => void; capture: boolean };

class MiniEvent {
  type: string;
  bubbles: boolean;
  cancelable: boolean;
  defaultPrevented = false;
  detail: unknown;
  key: string;
  code: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  isComposing: boolean;
  _stopped = false;
  _stoppedImmediate = false;
  target: unknown = null;
  currentTarget: unknown = null;

  constructor(type: string, init: Record<string, any> = {}) {
    this.type = type;
    this.bubbles = Boolean(init.bubbles);
    this.cancelable = Boolean(init.cancelable);
    this.detail = init.detail;
    this.key = init.key ?? "";
    this.code = init.code ?? "";
    this.shiftKey = Boolean(init.shiftKey);
    this.ctrlKey = Boolean(init.ctrlKey);
    this.metaKey = Boolean(init.metaKey);
    this.altKey = Boolean(init.altKey);
    this.isComposing = Boolean(init.isComposing);
  }
  preventDefault(): void {
    this.defaultPrevented = true;
  }
  stopPropagation(): void {
    this._stopped = true;
  }
  stopImmediatePropagation(): void {
    this._stoppedImmediate = true;
    this._stopped = true;
  }
}

class MiniClassList {
  private _set = new Set<string>();
  constructor(private readonly _el: MiniElement) {}
  _syncFromAttr(val: string): void {
    this._set = new Set(String(val || "").split(/\s+/u).filter(Boolean));
  }
  add(...tokens: string[]): void {
    for (const t of tokens) if (t) this._set.add(t);
  }
  remove(...tokens: string[]): void {
    for (const t of tokens) this._set.delete(t);
  }
  toggle(token: string, force?: boolean): void {
    if (force === true) this._set.add(token);
    else if (force === false) this._set.delete(token);
    else if (this._set.has(token)) this._set.delete(token);
    else this._set.add(token);
  }
  contains(token: string): boolean {
    return this._set.has(token);
  }
  toString(): string {
    return [...this._set].join(" ");
  }
}

class MiniElement {
  nodeType = 1;
  tagName: string;
  ownerDocument: MiniDocument;
  parentNode: MiniElement | MiniDocument | null = null;
  children: MiniElement[] = [];
  attributes = new Map<string, string>();
  dataset: Record<string, string> = {};
  style: Record<string, string> = {};
  classList: MiniClassList;
  _listeners = new Map<string, ListenerEntry[]>();
  hidden = false;
  disabled = false;
  type = "";
  private _val = "";
  get value(): string {
    return this._val;
  }
  set value(v: string) {
    this._val = v;
  }
  checked = false;
  placeholder = "";
  title = "";
  open = false;
  private _textContent = "";

  constructor(tagName: string, ownerDocument: MiniDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.classList = new MiniClassList(this);
  }
  get className(): string {
    return this.classList.toString();
  }
  set className(val: string) {
    this.classList._syncFromAttr(val);
  }
  get textContent(): string {
    if (this.children.length === 0) return this._textContent;
    return this._textContent + this.children.map((c) => c.textContent).join("");
  }
  set textContent(val: unknown) {
    this.children = [];
    this._textContent = val == null ? "" : String(val);
  }
  get innerText(): string {
    return this.textContent;
  }
  set innerText(val: string) {
    this.textContent = val;
  }
  setAttribute(name: string, value: string): void {
    const str = String(value);
    this.attributes.set(name, str);
    if (name === "class") this.className = str;
    if (name.startsWith("data-")) {
      const camel = name.slice(5).replace(/-([a-z])/gu, (_, c: string) => c.toUpperCase());
      this.dataset[camel] = str;
    }
  }
  getAttribute(name: string): string | null {
    if (name === "class") return this.className || null;
    return this.attributes.has(name) ? this.attributes.get(name)! : null;
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  append(...nodes: Array<MiniElement | string | null | undefined>): void {
    for (const n of nodes) {
      if (typeof n === "string") {
        const span = this.ownerDocument.createElement("span");
        span.textContent = n;
        this.appendChild(span);
      } else if (n) {
        this.appendChild(n);
      }
    }
  }
  appendChild(node: MiniElement): MiniElement {
    if (node.parentNode && node.parentNode instanceof MiniElement) {
      node.parentNode.removeChild(node);
    }
    node.parentNode = this;
    this.children.push(node);
    return node;
  }
  removeChild(node: MiniElement): MiniElement {
    const idx = this.children.indexOf(node);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      node.parentNode = null;
    }
    return node;
  }
  remove(): void {
    if (this.parentNode && this.parentNode instanceof MiniElement) {
      this.parentNode.removeChild(this);
    }
  }
  replaceChildren(...nodes: Array<MiniElement | string>): void {
    this.children = [];
    this._textContent = "";
    this.append(...nodes);
  }
  getRootNode(): MiniElement | MiniDocument {
    let cur: MiniElement | MiniDocument = this;
    while (cur instanceof MiniElement && cur.parentNode) cur = cur.parentNode;
    return cur;
  }
  matches(selector: string): boolean {
    if (selector.startsWith("[")) {
      const eqIdx = selector.indexOf("=");
      if (eqIdx > 0) {
        const attr = selector.slice(1, eqIdx);
        const val = selector.slice(eqIdx + 1, -1).replace(/^["']|["']$/gu, "");
        return this.getAttribute(attr) === val || this.dataset[attr.slice(5)] === val;
      }
      const attr = selector.slice(1, -1);
      if (attr === "data-sc-side-chat-root" && this.dataset.scSideChatRoot !== undefined) return true;
      return this.attributes.has(attr);
    }
    if (selector.startsWith(".")) {
      return this.classList.contains(selector.slice(1));
    }
    return this.tagName === selector.toUpperCase();
  }
  closest(selector: string): MiniElement | null {
    let cur: MiniElement | MiniDocument | null = this;
    while (cur && cur instanceof MiniElement) {
      if (cur.matches(selector)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }
  querySelectorAll(selector: string): MiniElement[] {
    const out: MiniElement[] = [];
    const walk = (node: MiniElement) => {
      for (const child of node.children) {
        if (child.matches(selector)) out.push(child);
        walk(child);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector: string): MiniElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  addEventListener(type: string, fn: (ev: any) => void, opts?: boolean | { capture?: boolean }): void {
    const capture = typeof opts === "boolean" ? opts : Boolean(opts?.capture);
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type)!.push({ fn, capture });
  }
  removeEventListener(type: string, fn: (ev: any) => void, opts?: boolean | { capture?: boolean }): void {
    const capture = typeof opts === "boolean" ? opts : Boolean(opts?.capture);
    const list = this._listeners.get(type);
    if (!list) return;
    this._listeners.set(
      type,
      list.filter((l) => !(l.fn === fn && l.capture === capture)),
    );
  }
  dispatchEvent(event: MiniEvent): boolean {
    if (!event.target) event.target = this;
    const chain: Array<MiniElement | MiniDocument> = [];
    let cur: MiniElement | MiniDocument | null = this;
    while (cur) {
      chain.unshift(cur);
      cur = cur instanceof MiniElement ? cur.parentNode : null;
    }
    for (const el of chain) {
      const listeners = el._listeners.get(event.type) ?? [];
      for (const { fn, capture } of [...listeners]) {
        if (capture) {
          event.currentTarget = el;
          fn.call(el, event);
          if (event._stoppedImmediate) return !event.defaultPrevented;
        }
      }
      if (event._stopped) return !event.defaultPrevented;
    }
    for (const el of [...chain].reverse()) {
      if (!event.bubbles && el !== this) continue;
      const listeners = el._listeners.get(event.type) ?? [];
      for (const { fn, capture } of [...listeners]) {
        if (!capture) {
          event.currentTarget = el;
          fn.call(el, event);
          if (event._stoppedImmediate) return !event.defaultPrevented;
        }
      }
      if (event._stopped) return !event.defaultPrevented;
    }
    return !event.defaultPrevented;
  }
  click(): void {
    this.dispatchEvent(new MiniEvent("click", { bubbles: true, cancelable: true }));
  }
  focus(): void {}
}

class MiniDocument {
  nodeType = 9;
  documentElement: MiniElement;
  body: MiniElement;
  activeElement: MiniElement | null = null;
  defaultView: any = null;
  _listeners = new Map<string, ListenerEntry[]>();

  constructor() {
    this.documentElement = new MiniElement("html", this);
    this.documentElement.setAttribute("lang", "en");
    this.body = new MiniElement("body", this);
    this.body.parentNode = this;
  }
  createElement(tag: string): MiniElement {
    return new MiniElement(tag, this);
  }
  createDocumentFragment(): MiniElement {
    return new MiniElement("fragment", this);
  }
  createTextNode(text: string): MiniElement {
    const el = new MiniElement("#text", this);
    el.textContent = text;
    return el;
  }
  querySelector(sel: string): MiniElement | null {
    return this.body.querySelector(sel);
  }
  querySelectorAll(sel: string): MiniElement[] {
    return this.body.querySelectorAll(sel);
  }
  addEventListener(type: string, fn: (ev: any) => void, opts?: boolean | { capture?: boolean }): void {
    const capture = typeof opts === "boolean" ? opts : Boolean(opts?.capture);
    if (!this._listeners.has(type)) this._listeners.set(type, []);
    this._listeners.get(type)!.push({ fn, capture });
  }
  removeEventListener(type: string, fn: (ev: any) => void, opts?: boolean | { capture?: boolean }): void {
    const capture = typeof opts === "boolean" ? opts : Boolean(opts?.capture);
    const list = this._listeners.get(type);
    if (!list) return;
    this._listeners.set(
      type,
      list.filter((l) => !(l.fn === fn && l.capture === capture)),
    );
  }
}

function createDomEnvironment() {
  const doc = new MiniDocument();
  const winListeners = new Map<string, Array<(ev: any) => void>>();

  const win = {
    document: doc,
    location: { pathname: "/threads/main-1", search: "", href: "http://localhost/threads/main-1" },
    Event: MiniEvent,
    CustomEvent: MiniEvent,
    KeyboardEvent: MiniEvent,
    HTMLTextAreaElement: {
      prototype: Object.defineProperty({}, "value", {
        get(this: { _val?: string }) {
          return this._val ?? "";
        },
        set(this: { _val?: string }, v: string) {
          this._val = v;
        },
        configurable: true,
      }),
    },
    MutationObserver: class {
      observe(): void {}
      disconnect(): void {}
    },
    addEventListener(type: string, fn: (ev: any) => void): void {
      if (!winListeners.has(type)) winListeners.set(type, []);
      winListeners.get(type)!.push(fn);
    },
    removeEventListener(type: string, fn: (ev: any) => void): void {
      const list = winListeners.get(type);
      if (!list) return;
      winListeners.set(
        type,
        list.filter((l) => l !== fn),
      );
    },
    dispatchEvent(event: MiniEvent): boolean {
      const list = winListeners.get(event.type) ?? [];
      for (const fn of [...list]) fn.call(win, event);
      return !event.defaultPrevented;
    },
  };
  doc.defaultView = win;

  return { doc, win, MiniEvent, docListeners: doc._listeners, winListeners };
}

test("6. Full 4-surface integration: backend <-> page + widget + web (/btw, persistent-first, -32602 fallback, badges, approval/question, dispose)", async () => {
  const tempRoot = mkdtempSync(join(tmpdir(), "sc-v2-e2e-"));
  const dataDir = join(tempRoot, "host-extension-data", "codexhost-side-chat");
  const clientHostsDir = join(tempRoot, "client-hosts");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(clientHostsDir, { recursive: true });

  const prevEnv = process.env.CODEXHOST_DATA_DIR;
  process.env.CODEXHOST_DATA_DIR = tempRoot;

  const prevDoc = globalThis.document;
  const prevWin = globalThis.window;
  const prevEvent = globalThis.Event;
  const prevCustomEvent = globalThis.CustomEvent;

  const threadTurns = new Map<string, Array<Record<string, any>>>();
  const threadRunning = new Map<string, boolean>();
  const respondedInteractions: Array<Record<string, any>> = [];
  let interruptCalled = false;
  let forkSeq = 0;

  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      assert.equal(req.headers.origin, undefined, "Backend must not send Origin header");
      assert.equal(req.headers.authorization, "Bearer secret-e2e-token");
      res.setHeader("Content-Type", "application/json");
      const body = chunks.length
        ? (JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, any>)
        : {};

      if (req.url === "/v1/rpc") {
        const { method, params = {} } = body as { method: string; params?: Record<string, any> };
        if (method === "codexhost/thread/catalog/read") {
          return res.end(
            JSON.stringify({
              result: {
                threads: [
                  { id: "main-1", name: "Main Thread One", updatedAt: 2000, status: { type: "idle" } },
                  { id: "main-2", name: "Unsupported Parent", updatedAt: 1000, status: { type: "idle" } },
                ],
              },
            }),
          );
        }
        if (method === "thread/list") {
          return res.end(JSON.stringify({ result: { data: [] } }));
        }
        if (method === "thread/fork") {
          if (params.threadId === "main-2" && params.attachToSource === true) {
            return res.end(
              JSON.stringify({ error: { code: -32602, message: "attachToSource unsupported" } }),
            );
          }
          const newId = `side-${++forkSeq}`;
          threadTurns.set(newId, []);
          return res.end(JSON.stringify({ result: { thread: { id: newId } } }));
        }
        if (method === "turn/start") {
          const tid = params.threadId as string;
          const text = String(params.input?.[0]?.text ?? params.text ?? "");
          const turns = threadTurns.get(tid) ?? [];
          const turnIdx = turns.length + 1;
          turns.push({
            id: `turn-${turnIdx}`,
            status: text.includes("keep-running") ? "inProgress" : "completed",
            items: [
              { id: `u-${turnIdx}`, type: "userMessage", content: [{ type: "text", text }] },
              { id: `r-${turnIdx}-summary`, type: "reasoning", summary: ["Checked context"], content: [] },
              {
                id: `a-${turnIdx}`,
                type: "agentMessage",
                text: "Side answer ready.",
              },
            ],
          });
          threadTurns.set(tid, turns);
          threadRunning.set(tid, text.includes("keep-running"));
          return res.end(JSON.stringify({ result: { turn: { id: `turn-${turnIdx}` } } }));
        }
        if (method === "turn/interrupt") {
          interruptCalled = true;
          threadRunning.set(params.threadId as string, false);
          return res.end(JSON.stringify({ result: { ok: true } }));
        }
        if (method === "thread/archive") {
          return res.end(JSON.stringify({ result: { archived: true } }));
        }
        return res.end(JSON.stringify({ result: {} }));
      }

      if (req.url === "/v1/snapshot") {
        const tid = String(body.threadId);
        const turns = [...(threadTurns.get(tid) ?? [])].reverse();
        const interactions =
          tid === "side-1"
            ? [
                {
                  requestId: "req-app-1",
                  threadId: tid,
                  kind: "approval",
                  interaction: {
                    type: "approval",
                    title: "Allow tool?",
                    actions: [
                      { id: "accept", label: "Approve", effect: "allowOnce" },
                      { id: "decline", label: "Decline", effect: "deny" },
                    ],
                  },
                  request: { method: "item/commandExecution/requestApproval", params: {} },
                },
                {
                  requestId: "req-q-1",
                  threadId: tid,
                  kind: "question",
                  interaction: {
                    type: "question",
                    title: "Which target?",
                    questions: [
                      {
                        id: "q1",
                        type: "choice",
                        prompt: "Select mode",
                        options: [{ value: "fast", label: "Fast" }],
                      },
                    ],
                  },
                  request: { method: "item/tool/requestUserInput", params: {} },
                },
              ]
            : [];
        return res.end(
          JSON.stringify({
            result: {
              cursor: { epoch: "1000", sequence: 1 },
              activeTurnId: threadRunning.get(tid) ? "turn-3" : null,
              thread: { id: tid, status: { type: threadRunning.get(tid) ? "active" : "idle" } },
              turnsPage: { data: turns },
              interactions,
            },
          }),
        );
      }

      if (req.url === "/v1/respond") {
        respondedInteractions.push(body);
        return res.end(JSON.stringify({ result: { ok: true } }));
      }

      res.writeHead(404);
      res.end("{}");
    });
  });

  await new Promise<void>((resolveReady) => server.listen(0, "127.0.0.1", resolveReady));
  const { port } = server.address() as AddressInfo;
  writeFileSync(
    join(clientHostsDir, `host-${process.pid}-1000.json`),
    JSON.stringify({
      version: 1,
      pid: process.pid,
      port,
      token: "secret-e2e-token",
      epoch: "1000",
      startedAt: Date.now(),
    }),
  );

  const cleanupCallbacks: Array<() => void | Promise<void>> = [];
  try {
    // 1. Activate backend
    const backendMod = await import(pathToFileURL(resolve(root, "backend/index.mjs")).href);
    const handlers = new Map<string, (params: unknown) => Promise<any>>();
    let settings: Record<string, unknown> = {
      widgetPosition: "bottom-right",
      showFloatingLauncher: true,
      enableWebBtwShortcut: true,
    };
    const backendDispose = await backendMod.activate({
      extensionId: "codexhost-side-chat",
      extensionDir: root,
      dataDir,
      handle(method: string, fn: (params: unknown) => Promise<any>) {
        handlers.set(method, fn);
      },
      async readSettings() {
        return settings;
      },
      async writeSettings(next: Record<string, unknown>) {
        settings = { ...settings, ...next };
        return settings;
      },
    });
    cleanupCallbacks.push(() => backendDispose());

    // Test persistent-first + -32602 fallback + boundary prompt injection/stripping
    const persistentRes = await handlers.get("createSideChat")!({ sourceThreadId: "main-1" });
    assert.equal(persistentRes.ok, true, JSON.stringify(persistentRes));
    const persistent = persistentRes.thread;
    assert.equal(persistent.mode, "persistent");

    const ephemeralRes = await handlers.get("createSideChat")!({ sourceThreadId: "main-2" });
    assert.equal(ephemeralRes.ok, true, JSON.stringify(ephemeralRes));
    const ephemeral = ephemeralRes.thread;
    assert.equal(ephemeral.mode, "ephemeral");

    await handlers.get("startTurn")!({ threadId: persistent.threadId, text: "First question" });
    await handlers.get("startTurn")!({ threadId: persistent.threadId, text: "Follow-up keep-running" });

    const turns = threadTurns.get(persistent.threadId)!;
    const firstUserText = String(turns[0].items[0].content[0].text);
    const secondUserText = String(turns[1].items[0].content[0].text);
    assert.match(firstUserText, /codexhost-side-chat:boundary:v1/);
    assert.ok(
      !secondUserText.includes("codexhost-side-chat:boundary:v1"),
      "Follow-up must not re-inject boundary",
    );

    const snapRes = await handlers.get("readSnapshot")!({ threadId: persistent.threadId });
    assert.equal(snapRes.ok, true);
    const snap = snapRes.snapshot;
    assert.equal(snap.turns[0].items[0].kind, "userMessage", "Snapshot must be reversed to chronological order");
    assert.equal(snap.turns[0].items[0].text, "First question", "Boundary prompt must be stripped for UI");

    // 2. Mount page, widget, and web on shared DOM environment
    const { doc, win, MiniEvent: EvCtor, docListeners, winListeners } = createDomEnvironment();
    (globalThis as any).document = doc;
    (globalThis as any).window = win;
    (globalThis as any).Event = EvCtor;
    (globalThis as any).CustomEvent = EvCtor;

    const topbar = doc.createElement("div");
    topbar.setAttribute("data-cx-region", "topbar");
    const mainComposer = doc.createElement("textarea");
    mainComposer.value = "/btw explain this";
    doc.body.append(topbar, mainComposer);

    const webTrackedDisposers: Array<() => void> = [];
    const makeApi = (target: "desktop" | "web") => {
      const ac = new AbortController();
      return {
        id: "codexhost-side-chat",
        apiVersion: 1,
        hostTarget: target,
        locale: "en",
        colorScheme: "dark",
        signal: ac.signal,
        _abortController: ac,
        onLocaleChange: () => () => {},
        onColorSchemeChange: () => () => {},
        assets: { url: async (p: string) => p },
        dom: {
          mount(region: string) {
            if (region !== "topbar") return undefined;
            const container = doc.createElement("div");
            topbar.append(container);
            return {
              container,
              dispose: () => container.remove(),
            };
          },
          mark() {},
          unmark() {},
        },
        track(fn: () => void) {
          if (typeof fn === "function") webTrackedDisposers.push(fn);
        },
        storage: {
          get: async () => settings,
          set: async (v: Record<string, unknown>) => {
            settings = { ...settings, ...v };
            return settings;
          },
          onChange: () => () => {},
        },
        backend: {
          invoke: async (method: string, params?: unknown) => handlers.get(method)!(params),
        },
      };
    };

    const pageRoot = doc.createElement("div");
    const widgetRoot = doc.createElement("div");
    doc.body.append(pageRoot, widgetRoot);

    const pageMod = await import(pathToFileURL(resolve(root, "page/index.mjs")).href);
    const widgetMod = await import(pathToFileURL(resolve(root, "widget/index.mjs")).href);
    const webMod = await import(pathToFileURL(resolve(root, "web/index.mjs")).href);

    const pageApi = makeApi("desktop");
    const widgetApi = makeApi("web");
    const webApi = makeApi("web");

    const disposePage = await pageMod.mount(pageRoot, pageApi);
    cleanupCallbacks.push(() => {
      pageApi._abortController.abort();
      return disposePage();
    });
    const disposeWidget = await widgetMod.mount(widgetRoot, widgetApi);
    cleanupCallbacks.push(() => {
      widgetApi._abortController.abort();
      return disposeWidget();
    });
    const disposeWeb = await webMod.activate(webApi);
    cleanupCallbacks.push(() => {
      webApi._abortController.abort();
      for (const fn of webTrackedDisposers) fn();
      return disposeWeb?.();
    });

    // Verify permanent badges in page (no manual mode toggle)
    const pageText = pageRoot.textContent;
    assert.ok(pageText.includes("Persistent") || pageText.includes("Ephemeral"));
    assert.equal(pageRoot.querySelector("[data-sc-mode-toggle]"), null);

    // Verify topbar button mounted by web/index.mjs
    assert.ok(topbar.children.length >= 1);

    // Verify Stop button triggers turn/interrupt while running
    const stopBtn = pageRoot.querySelectorAll("button").find((b) => b.textContent.trim() === "Stop");
    assert.ok(stopBtn, "Expected Stop button while side-1 is running");
    stopBtn.click();
    await new Promise((r) => setTimeout(r, 30));
    assert.equal(interruptCalled, true, "Stop button must invoke turn/interrupt");

    // Verify approval & question interaction write-back
    const approveBtn = pageRoot.querySelectorAll("button").find((b) => b.textContent.includes("Approve"));
    assert.ok(approveBtn, "Expected inline Approve button");
    approveBtn.click();
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(respondedInteractions.some((r) => r.requestId === "req-app-1"));

    const questionForm = pageRoot.querySelector(".sc-question-form");
    assert.ok(questionForm, "Expected question form");
    const questionRadio = questionForm.querySelector("input");
    assert.ok(questionRadio, "Expected question radio input");
    questionRadio.checked = true;
    questionRadio.dispatchEvent(new EvCtor("change", { bubbles: true }));
    questionForm.dispatchEvent(new EvCtor("submit", { bubbles: true, cancelable: true }));
    await new Promise((r) => setTimeout(r, 30));
    assert.ok(respondedInteractions.some((r) => r.requestId === "req-q-1"), "Question response must write back to /v1/respond");

    // Verify /btw <question> interception in main composer opens widget & does not leak
    const enterEvent = new EvCtor("keydown", { key: "Enter", bubbles: true, cancelable: true });
    mainComposer.dispatchEvent(enterEvent);
    assert.equal(enterEvent.defaultPrevented, true, "/btw must preventDefault on main composer");
    assert.equal(mainComposer.value, "", "Main composer must be cleared after /btw interception");
    await new Promise((r) => setTimeout(r, 80));

    // Verify widget drawer auto-opened
    const drawer = widgetRoot.querySelector(".sc-widget-drawer");
    assert.ok(drawer);
    assert.equal(drawer.hidden, false, "Widget drawer must open on /btw <question>");

    // Verify clean disposal of all 4 surfaces
    while (cleanupCallbacks.length > 0) {
      await cleanupCallbacks.pop()!();
    }

    assert.equal(docListeners.get("keydown")?.length ?? 0, 0, "Document keydown listener must be cleaned up");
    assert.equal(
      winListeners.get("codexhost-side-chat:open")?.length ?? 0,
      0,
      "Window open listener must be cleaned up",
    );
  } finally {
    while (cleanupCallbacks.length > 0) {
      try {
        await cleanupCallbacks.pop()!();
      } catch {}
    }
    globalThis.document = prevDoc;
    globalThis.window = prevWin;
    globalThis.Event = prevEvent;
    globalThis.CustomEvent = prevCustomEvent;
    if (prevEnv === undefined) delete process.env.CODEXHOST_DATA_DIR;
    else process.env.CODEXHOST_DATA_DIR = prevEnv;
    server.closeAllConnections?.();
    server.close();
    rmSync(tempRoot, { recursive: true, force: true });
  }
});
