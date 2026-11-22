/**
 * Per-tab Side Chat controller lifecycle manager, `/btw` handoff registry,
 * tab-title observable projection, and composer focus signal bus.
 */
import type { ClientObservable, SideChatMode } from "../types.ts";
import { deriveSideChatTitle } from "./boundary.ts";
import {
  SideChatController,
  type SideChatControllerOptions,
  type SideChatThreadSummary,
} from "./controller.ts";
import { normalizeLocale, type SideChatLocale } from "./protocol.ts";

export interface SideChatTabTitleSnapshot {
  readonly threadId: string | null;
  readonly title: string;
  readonly mode: SideChatMode | null;
  readonly isRunning: boolean;
}

export interface BtwCreatedSideChat {
  readonly thread: SideChatThreadSummary;
  readonly mode: SideChatMode;
  readonly controller: SideChatController;
  readonly sendPromise: Promise<void>;
}

export interface SideChatTabManagerOptions {
  readonly fetch?: typeof fetch;
  readonly baseUrl?: string;
  readonly locale?: SideChatLocale | string;
  readonly debounceMs?: number;
  readonly autoConnectEvents?: boolean;
  readonly createController?: (options: SideChatControllerOptions) => SideChatController;
}

const EMPTY_TITLE_SNAPSHOT: SideChatTabTitleSnapshot = Object.freeze({
  threadId: null,
  title: "",
  mode: null,
  isRunning: false,
});

function tabKey(sessionId: string, tabId: string): string {
  return `${sessionId}\0${tabId}`;
}

/**
 * Coordinates independent `SideChatController` instances across multiple right-sidebar
 * `sidechat` tabs, pre-created `/btw` handoffs, sibling thread-list synchronization,
 * live tab-chip titles, and composer focus requests.
 */
export class SideChatTabManager {
  private readonly controllers = new Map<string, SideChatController>();
  private readonly controllerUnsubs = new Map<string, () => void>();
  private readonly pendingByThreadId = new Map<string, SideChatController>();
  private readonly titleSnapshots = new Map<string, SideChatTabTitleSnapshot>();
  private readonly titleListeners = new Map<string, Set<() => void>>();

  private focusSeq = 0;
  private readonly sessionFocusNonces = new Map<string, number>();
  private readonly tabFocusNonces = new Map<string, number>();
  private readonly focusListeners = new Map<string, Set<() => void>>();

  private locale: SideChatLocale;
  private disposed = false;

  constructor(private readonly options: SideChatTabManagerOptions = {}) {
    this.locale = normalizeLocale(options.locale);
  }

  private buildController(): SideChatController {
    const controllerOptions: SideChatControllerOptions = {
      ...(this.options.fetch ? { fetch: this.options.fetch } : {}),
      ...(this.options.baseUrl !== undefined ? { baseUrl: this.options.baseUrl } : {}),
      ...(this.options.debounceMs !== undefined ? { debounceMs: this.options.debounceMs } : {}),
      ...(this.options.autoConnectEvents !== undefined
        ? { autoConnectEvents: this.options.autoConnectEvents }
        : {}),
      locale: this.locale,
    };
    return this.options.createController
      ? this.options.createController(controllerOptions)
      : new SideChatController(controllerOptions);
  }

  setLocale(localeInput: SideChatLocale | string): void {
    this.locale = normalizeLocale(localeInput);
    for (const controller of this.controllers.values()) {
      controller.setLocale(this.locale);
    }
    for (const controller of this.pendingByThreadId.values()) {
      controller.setLocale(this.locale);
    }
  }

  getLocale(): SideChatLocale {
    return this.locale;
  }

  nextFocusNonce(): number {
    this.focusSeq += 1;
    return this.focusSeq;
  }

  /**
   * Returns the controller bound to `(sessionId, tabId)`, adopting a pre-created
   * `/btw` controller when `options.sideThreadId` matches one in flight.
   */
  controllerForTab(
    sessionId: string,
    tabId: string,
    options?: { readonly sideThreadId?: string },
  ): SideChatController {
    const key = tabKey(sessionId, tabId);
    const existing = this.controllers.get(key);
    if (existing) {
      return existing;
    }

    let controller: SideChatController | undefined;
    if (options?.sideThreadId) {
      controller = this.pendingByThreadId.get(options.sideThreadId);
      if (controller) {
        this.pendingByThreadId.delete(options.sideThreadId);
      }
    }
    if (!controller) {
      controller = this.buildController();
    }

    this.controllers.set(key, controller);
    this.updateTitleSnapshot(key, controller);
    const unsub = controller.subscribe(() => {
      this.updateTitleSnapshot(key, controller!);
    });
    this.controllerUnsubs.set(key, unsub);
    this.notifyTitleListeners(key);
    return controller;
  }

  getTabController(sessionId: string, tabId: string): SideChatController | undefined {
    return this.controllers.get(tabKey(sessionId, tabId));
  }

  /**
   * Creates a new Side Chat branch for `/btw <question>`, registers it for seamless tab
   * adoption, notifies sibling tabs, and dispatches the first turn with boundary injection.
   *
   * If `createSideChat` (fork or metadata persistence) fails, the temporary controller is
   * disposed and the error propagates so the main composer can retain the user's draft.
   */
  async createAndStartForBtw(
    sourceThreadId: string,
    questionText: string,
  ): Promise<BtwCreatedSideChat> {
    const trimmed = questionText.trim();
    const controller = this.buildController();

    let created: SideChatThreadSummary;
    try {
      created = await controller.createSideChat(sourceThreadId, {
        title: deriveSideChatTitle(trimmed),
        select: true,
        skipInitialSnapshot: true,
      });
    } catch (error) {
      controller.dispose();
      throw error;
    }

    this.pendingByThreadId.set(created.threadId, controller);
    this.notifySiblingsChanged(sourceThreadId, controller);

    const sendPromise = controller
      .sendMessage(created.threadId, trimmed)
      .then(() => {
        this.notifySiblingsChanged(sourceThreadId, controller);
      })
      .catch(() => {
        // Error is captured on `controller.getSnapshot().error` and surfaced inside the right sidebar panel.
      });

    return {
      thread: created,
      mode: created.mode,
      controller,
      sendPromise,
    };
  }

  /**
   * Notifies sibling tab controllers showing the same `sourceThreadId` to refresh their
   * thread list so newly created, renamed, or deleted side chats stay in sync.
   */
  notifySiblingsChanged(sourceThreadId: string | null, origin?: SideChatController): void {
    if (!sourceThreadId || this.disposed) return;
    for (const controller of this.controllers.values()) {
      if (controller === origin) continue;
      if (controller.getSnapshot().sourceThreadId === sourceThreadId) {
        void controller.refreshThreads(sourceThreadId).catch(() => undefined);
      }
    }
  }

  /**
   * Requests composer focus inside a specific `(sessionId, tabId)` or any visible
   * side chat tab belonging to `sessionId`.
   */
  requestFocus(sessionId: string, tabId?: string): number {
    const nonce = this.nextFocusNonce();
    if (tabId) {
      const key = tabKey(sessionId, tabId);
      this.tabFocusNonces.set(key, nonce);
      this.emitFocusKey(key);
    } else {
      this.sessionFocusNonces.set(sessionId, nonce);
      for (const key of this.focusListeners.keys()) {
        if (key.startsWith(`${sessionId}\0`)) {
          this.emitFocusKey(key);
        }
      }
    }
    return nonce;
  }

  focusObservableForTab(sessionId: string, tabId: string): ClientObservable<number> {
    const key = tabKey(sessionId, tabId);
    return {
      getSnapshot: () =>
        Math.max(
          this.sessionFocusNonces.get(sessionId) ?? 0,
          this.tabFocusNonces.get(key) ?? 0,
        ),
      subscribe: (listener) => {
        let listeners = this.focusListeners.get(key);
        if (!listeners) {
          listeners = new Set();
          this.focusListeners.set(key, listeners);
        }
        listeners.add(listener);
        return () => {
          listeners?.delete(listener);
          if (listeners && listeners.size === 0) {
            this.focusListeners.delete(key);
          }
        };
      },
    };
  }

  titleObservableForTab(
    sessionId: string,
    tabId: string,
  ): ClientObservable<SideChatTabTitleSnapshot> {
    const key = tabKey(sessionId, tabId);
    return {
      getSnapshot: () => this.titleSnapshots.get(key) ?? EMPTY_TITLE_SNAPSHOT,
      subscribe: (listener) => {
        let listeners = this.titleListeners.get(key);
        if (!listeners) {
          listeners = new Set();
          this.titleListeners.set(key, listeners);
        }
        listeners.add(listener);
        return () => {
          listeners?.delete(listener);
          if (listeners && listeners.size === 0) {
            this.titleListeners.delete(key);
          }
        };
      },
    };
  }

  async renameActiveInTab(sessionId: string, tabId: string, nextTitle: string): Promise<void> {
    const controller = this.controllers.get(tabKey(sessionId, tabId));
    if (!controller) return;
    const snap = controller.getSnapshot();
    const targetId = snap.activeThreadId;
    if (!targetId) return;
    await controller.renameThread(targetId, nextTitle);
    this.notifySiblingsChanged(snap.sourceThreadId, controller);
  }

  releaseTab(sessionId: string, tabId: string): void {
    const key = tabKey(sessionId, tabId);
    const unsub = this.controllerUnsubs.get(key);
    if (unsub) {
      unsub();
      this.controllerUnsubs.delete(key);
    }
    const controller = this.controllers.get(key);
    if (controller) {
      this.controllers.delete(key);
      controller.dispose();
    }
    this.titleSnapshots.delete(key);
    this.tabFocusNonces.delete(key);
    this.notifyTitleListeners(key);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const unsub of this.controllerUnsubs.values()) {
      unsub();
    }
    this.controllerUnsubs.clear();
    for (const controller of this.controllers.values()) {
      controller.dispose();
    }
    this.controllers.clear();
    for (const controller of this.pendingByThreadId.values()) {
      controller.dispose();
    }
    this.pendingByThreadId.clear();
    this.titleSnapshots.clear();
    this.titleListeners.clear();
    this.focusListeners.clear();
    this.sessionFocusNonces.clear();
    this.tabFocusNonces.clear();
  }

  private emitFocusKey(key: string): void {
    const listeners = this.focusListeners.get(key);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener();
    }
  }

  private updateTitleSnapshot(key: string, controller: SideChatController): void {
    const state = controller.getSnapshot();
    const active = state.activeSession;
    const summary = state.activeThreadId
      ? state.threads.find((item) => item.threadId === state.activeThreadId)
      : undefined;
    const next: SideChatTabTitleSnapshot = {
      threadId: active?.threadId ?? state.activeThreadId,
      title: active?.title || summary?.title || "",
      mode: active?.mode ?? summary?.mode ?? null,
      isRunning: active?.isRunning ?? false,
    };
    const prev = this.titleSnapshots.get(key);
    if (
      prev &&
      prev.threadId === next.threadId &&
      prev.title === next.title &&
      prev.mode === next.mode &&
      prev.isRunning === next.isRunning
    ) {
      return;
    }
    this.titleSnapshots.set(key, Object.freeze(next));
    this.notifyTitleListeners(key);
  }

  private notifyTitleListeners(key: string): void {
    const listeners = this.titleListeners.get(key);
    if (!listeners) return;
    for (const listener of [...listeners]) {
      listener();
    }
  }
}
