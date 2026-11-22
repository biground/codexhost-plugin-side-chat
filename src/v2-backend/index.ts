/**
 * Entry point for CodexHost manifestVersion 2 single-instance Node backend (`backend/index.mjs`).
 *
 * Registers all Side Chat IPC handlers synchronously during `activate(ctx)` and
 * returns a disposer to release resources cleanly on deactivation.
 */
import { SideChatV2BackendService } from "./service.ts";

export interface HostExtensionBackendContext {
  readonly extensionId: string;
  readonly extensionDir: string;
  readonly dataDir: string;
  readSettings(): Promise<Record<string, unknown>>;
  writeSettings(values: Record<string, unknown>): Promise<Record<string, unknown>>;
  handle(method: string, handler: (params: unknown) => unknown | Promise<unknown>): void;
}

export async function activate(ctx: HostExtensionBackendContext): Promise<() => void> {
  const service = new SideChatV2BackendService({
    extensionId: ctx.extensionId,
    dataDir: ctx.dataDir,
  });

  // Register every IPC handler synchronously before `activate()` resolves.
  ctx.handle("ping", () => service.ping());
  ctx.handle("status", () => service.status());
  ctx.handle("listMainThreads", () => service.listMainThreads());
  ctx.handle("listSideChats", (params) => service.listSideChats(params));
  ctx.handle("createSideChat", (params) => service.createSideChat(params));
  ctx.handle("readSnapshot", (params) => service.readSnapshot(params));
  ctx.handle("startTurn", (params) => service.startTurn(params));
  ctx.handle("interruptTurn", (params) => service.interruptTurn(params));
  ctx.handle("respondInteraction", (params) => service.respondInteraction(params));
  ctx.handle("renameSideChat", (params) => service.renameSideChat(params));
  ctx.handle("archiveSideChat", (params) => service.archiveSideChat(params));

  return () => {
    service.dispose();
  };
}

export default { activate };
