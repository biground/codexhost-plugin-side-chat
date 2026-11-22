/**
 * Deterministic standard 32-bit (non-ZIP64) packager for CodexHost manifestVersion 2 extension.
 * Outputs `release/codexhost-side-chat.zip` with `manifest.json` at archive root,
 * matching every invariant in `packages/harness-plugin-files/src/extension-zip.ts`.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { crc32, deflateRawSync } from "node:zlib";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "release");
const outZip = resolve(outDir, "codexhost-side-chat.zip");

const LOCAL_HEADER_SIG = 0x04034b50;
const CENTRAL_HEADER_SIG = 0x02014b50;
const EOCD_SIG = 0x06054b50;

// Deterministic DOS timestamp (2026-01-01 00:00:00)
const DOS_TIME = 0x0000;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

function collectArchiveFiles() {
  const files = [
    "manifest.json",
    "README.md",
    "LICENSE",
    "assets/icon.png",
    "assets/preview.png",
    "page/index.mjs",
    "page/style.css",
    "widget/index.mjs",
    "widget/style.css",
    "web/index.mjs",
    "web/style.css",
    "backend/index.mjs",
  ];

  const sharedDir = resolve(root, "shared");
  for (const name of readdirSync(sharedDir)) {
    const full = join(sharedDir, name);
    if (statSync(full).isFile() && name.endsWith(".mjs")) {
      files.push(`shared/${name}`);
    }
  }

  // Deterministic lexicographical order using forward slashes
  return [...new Set(files)].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

function buildStandardZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const { name, raw } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(raw) >>> 0;
    const deflated = deflateRawSync(raw, { level: 9 });
    const useDeflate = deflated.length < raw.length;
    const method = useDeflate ? 8 : 0;
    const payload = useDeflate ? deflated : raw;

    // Local file header (30 bytes + filename)
    const localHeader = Buffer.allocUnsafe(30);
    localHeader.writeUInt32LE(LOCAL_HEADER_SIG, 0);
    localHeader.writeUInt16LE(20, 4); // version needed: 2.0
    localHeader.writeUInt16LE(0, 6); // flags = 0 (no data descriptor)
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(DOS_TIME, 10);
    localHeader.writeUInt16LE(DOS_DATE, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(raw.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra length = 0

    localParts.push(localHeader, nameBuf, payload);

    // Central directory header (46 bytes + filename)
    const centralHeader = Buffer.allocUnsafe(46);
    centralHeader.writeUInt32LE(CENTRAL_HEADER_SIG, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0, 8); // flags = 0
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(DOS_TIME, 12);
    centralHeader.writeUInt16LE(DOS_DATE, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(raw.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number start = 0
    centralHeader.writeUInt16LE(0, 36); // internal attrs = 0
    centralHeader.writeUInt32LE(0, 38); // external attrs = 0
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header

    centralParts.push(centralHeader, nameBuf);

    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirSize = centralParts.reduce((sum, buf) => sum + buf.length, 0);

  // End of Central Directory Record (22 bytes)
  const eocd = Buffer.allocUnsafe(22);
  eocd.writeUInt32LE(EOCD_SIG, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // central dir start disk
  eocd.writeUInt16LE(entries.length, 8); // entries on this disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(offset, 16); // central dir offset
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

const filePaths = collectArchiveFiles();
const entries = filePaths.map((rel) => ({
  name: rel,
  raw: readFileSync(resolve(root, rel)),
}));

const zipBuffer = buildStandardZip(entries);
mkdirSync(outDir, { recursive: true });
writeFileSync(outZip, zipBuffer);

const sha256 = createHash("sha256").update(zipBuffer).digest("hex");
console.log(
  `Packed ${entries.length} files -> release/codexhost-side-chat.zip (${zipBuffer.length} bytes, sha256=${sha256})`,
);
