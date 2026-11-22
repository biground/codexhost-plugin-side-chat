/**
 * Build:
 * 1. `lib/index.js` (legacy v0.1.0 Node host Cordis entry)
 * 2. `lib/client.js` (legacy v0.1.0 DSH Web browser module)
 * 3. `backend/index.mjs` (manifestVersion 2 single-file Node ESM Host backend)
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(root, "lib");
const backendDir = resolve(root, "backend");
const packageId = "codexhost-plugin-side-chat";

mkdirSync(outDir, { recursive: true });
mkdirSync(backendDir, { recursive: true });

const CLIENT_EXTERNALS = [
  "react",
  "react/jsx-runtime",
  "react-dom",
  "react-dom/client",
  "@deepseek-ai/cordis",
  "@deepseek-ai/dsh-client-store",
  "@deepseek-ai/dsh-client-ui-slots",
  "@deepseek-ai/dsh-client-ui-primitives",
  "@deepseek-ai/dsh-client-ui-dockkit",
];

await build({
  entryPoints: [resolve(root, "src/index.ts")],
  outfile: resolve(outDir, "index.js"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  packages: "external",
});

await build({
  entryPoints: [resolve(root, "src/client/index.tsx")],
  outfile: resolve(outDir, "client.js"),
  bundle: true,
  platform: "browser",
  format: "cjs",
  target: "es2022",
  jsx: "automatic",
  sourcemap: false,
  external: CLIENT_EXTERNALS,
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(packageId)}, factory: (require) => {\nvar module = { exports: {} }; var exports = module.exports;`,
  },
  footer: {
    js: "return module.exports; } });",
  },
});

await build({
  entryPoints: [resolve(root, "src/v2-backend/index.ts")],
  outfile: resolve(backendDir, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  sourcemap: false,
  external: ["node:*"],
});

console.log(`Built ${packageId}: lib/index.js + lib/client.js + backend/index.mjs`);
