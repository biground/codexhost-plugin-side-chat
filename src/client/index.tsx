/**
 * Browser client entry for `codexhost-plugin-side-chat`.
 *
 * Registers:
 * - Self-contained light/dark stylesheet (`<style id="codexhost-plugin-side-chat-styles">`)
 * - Bilingual (`zh` / `en`) locale namespace `codexhostSideChat`
 * - Keyboard shortcut `sidechat.new` (`Ctrl+Alt+Shift+B` / `⌘⌥⇧B`, Web-legal & conflict-free)
 * - Right-sidebar `sidechat` tab type (`multiple: true`, `keepMounted: true`)
 * - Three right-sidebar slots: `sidebar.right.tab.guide.entry`, `sidebar.right.pane.tab`,
 *   and `sidebar.right.pane.tab.title`
 * - Main-composer `/btw` input trigger (`candidates`, `onPick`, `matchSpace`, `matchEnter`)
 *
 * Maintains zero top-level browser global or React runtime side-effects so the bundled
 * `lib/client.js` loads cleanly inside isolated module-loader sandboxes.
 */
import type { ClientObservable, ClientPluginContext } from "../types.ts";
import { registerBtwInputTrigger } from "./btw-trigger.ts";
import { SideChatGuideArtwork } from "./icons.tsx";
import {
  SIDE_CHAT_EN,
  SIDE_CHAT_LOCALE_NS,
  SIDE_CHAT_ZH,
  wrapHostTranslator,
} from "./locales.ts";
import { normalizeLocale, type SideChatLocale } from "./protocol.ts";
import {
  resolveMainSessionFromSnapshot,
  type MainSessionResolution,
} from "./session-source.ts";
import { SideChatGuide } from "./SideChatGuide.tsx";
import { SideChatPanelView, SideChatTabBody } from "./SideChatPanel.tsx";
import { SideChatTitle } from "./SideChatTitle.tsx";
import { ensureSideChatStyles } from "./styles.ts";
import { SideChatTabManager } from "./tab-manager.ts";

export * from "./boundary.ts";
export * from "./interactions.ts";
export * from "./protocol.ts";
export * from "./controller.ts";
export * from "./locales.ts";
export * from "./session-source.ts";
export * from "./tab-manager.ts";
export * from "./btw-trigger.ts";
export * from "./styles.ts";
export * from "./icons.tsx";
export { MarkdownContent } from "./MarkdownContent.tsx";
export { ToolItemCard } from "./ToolCards.tsx";
export { InteractionCards } from "./InteractionCards.tsx";
export { SideChatPanelView, SideChatTabBody, parseSideChatTabParams } from "./SideChatPanel.tsx";
export { SideChatGuide } from "./SideChatGuide.tsx";
export { SideChatTitle } from "./SideChatTitle.tsx";
export type {
  CreateSideChatRecordInput,
  SideChatMode,
  SideChatRecord,
  UpdateSideChatRecordPatch,
  ClientPluginContext,
} from "../types.ts";

export const name = "codexhost-plugin-side-chat";
export const inject = [
  "slots",
  "locale",
  "sidebarRight",
  "sidebarRightTabs",
  "shortcuts",
  "sessions",
  "commandUi",
  "inputTriggers",
] as const;

export const SIDE_CHAT_TAB_KIND = "sidechat";
export const SIDE_CHAT_SHORTCUT_ID = "sidechat.new";

/**
 * Default binding for `sidechat.new`.
 *
 * Uses `primary + alt + shift + KeyB` (`Ctrl+Alt+Shift+B` on Windows/Linux, `⌘⌥⇧B` on macOS):
 * - Satisfies CodexHost `isWebBindingAllowed` (>= 3 modifiers on Web Windows/macOS; `Alt+Shift+B`
 *   without `primary` is rejected by `ShortcutRegistry.register`).
 * - Avoids conflicts with `sidebar.left.toggle` (`Ctrl+Alt+B` / `⌘⌥B`) and
 *   `sidebar.right.toggle` (`Ctrl+Shift+B` / `⌘⇧B`).
 */
export const SIDE_CHAT_SHORTCUT_DEFAULTS = {
  "desktop:macos": { code: "KeyB", modifiers: ["primary", "alt", "shift"] as const },
  "desktop:windows": { code: "KeyB", modifiers: ["primary", "alt", "shift"] as const },
  "desktop:linux": { code: "KeyB", modifiers: ["primary", "alt", "shift"] as const },
  "web:macos": { code: "KeyB", modifiers: ["primary", "alt", "shift"] as const },
  "web:windows": { code: "KeyB", modifiers: ["primary", "alt", "shift"] as const },
} as const;

function readActiveLocale(ctx: ClientPluginContext): SideChatLocale {
  const active =
    ctx.locale.getLocale?.().active ??
    ctx.locale.getSnapshot?.().active ??
    (typeof document !== "undefined" ? document.documentElement?.lang : undefined);
  return normalizeLocale(active);
}

function createMainSessionObservable(
  ctx: ClientPluginContext,
  sessionId: string,
): ClientObservable<MainSessionResolution> {
  let cached: MainSessionResolution = resolveMainSessionFromSnapshot(
    sessionId,
    ctx.sessions.list.getSnapshot(),
  );

  const compute = (): MainSessionResolution => {
    const next = resolveMainSessionFromSnapshot(
      sessionId,
      ctx.sessions.list.getSnapshot(),
    );
    if (
      cached.status === next.status &&
      (cached.status !== "ready" ||
        (next.status === "ready" &&
          cached.sourceThreadId === next.sourceThreadId &&
          cached.running === next.running)) &&
      (cached.status !== "draft" || (next.status === "draft" && cached.reason === next.reason)) &&
      (cached.status !== "remote-unsupported" ||
        (next.status === "remote-unsupported" && cached.hostId === next.hostId))
    ) {
      return cached;
    }
    cached = next;
    return cached;
  };

  return {
    getSnapshot: () => compute(),
    subscribe: (listener) =>
      ctx.sessions.list.subscribe(() => {
        const before = cached;
        const after = compute();
        if (after !== before) {
          listener();
        }
      }),
  };
}

export function apply(ctx: ClientPluginContext): void {
  const pluginId = name;
  const manager = new SideChatTabManager({
    locale: readActiveLocale(ctx),
  });

  // 1. Inject self-contained styles.
  ctx.effect(() => ensureSideChatStyles(pluginId), `${pluginId}: styles`);

  // 2. Register bilingual locale dictionaries & keep controller locale synced.
  ctx.effect(
    () => ctx.locale.register(SIDE_CHAT_LOCALE_NS, { zh: SIDE_CHAT_ZH, en: SIDE_CHAT_EN }),
    `${pluginId}: locale`,
  );
  const hostT = ctx.locale.bind(SIDE_CHAT_LOCALE_NS);
  const t = wrapHostTranslator(hostT, () => readActiveLocale(ctx));

  ctx.effect(() => {
    const syncLocale = () => {
      manager.setLocale(readActiveLocale(ctx));
    };
    const offSub = ctx.locale.subscribe?.(syncLocale);
    const offEvent = ctx.on?.("locale/change", syncLocale);
    syncLocale();
    return () => {
      offSub?.();
      offEvent?.();
    };
  }, `${pluginId}: locale sync`);

  // 3. Dispose all per-tab controllers when plugin unloads.
  ctx.effect(
    () => () => {
      manager.dispose();
    },
    `${pluginId}: lifetime`,
  );

  // 4. Register keyboard shortcut (`sidechat.new`).
  ctx.effect(
    () =>
      ctx.shortcuts.register({
        id: SIDE_CHAT_SHORTCUT_ID,
        label: () => t("shortcut.new"),
        aliases: ["side chat", "new side chat", "btw"],
        defaults: SIDE_CHAT_SHORTCUT_DEFAULTS,
        regions: ["page", "editable", "terminal"],
        modals: [],
        resolve: ({ target: element }) => {
          const target = ctx.sidebarRight.commandTarget?.(element);
          if (target === undefined) {
            return { status: "blocked", reason: t("shortcut.noSession") };
          }
          return {
            status: "handled",
            run: () => {
              if (ctx.sidebarRight.openTabFromTarget) {
                ctx.sidebarRight.openTabFromTarget(SIDE_CHAT_TAB_KIND, target);
              } else if (ctx.sidebarRight.openTabIn) {
                ctx.sidebarRight.openTabIn(target.sessionId, SIDE_CHAT_TAB_KIND, {
                  params: { focusComposer: true, focusNonce: manager.nextFocusNonce() },
                });
              } else {
                ctx.sidebarRight.openTab(SIDE_CHAT_TAB_KIND, {
                  params: { focusComposer: true, focusNonce: manager.nextFocusNonce() },
                });
              }
              manager.requestFocus(target.sessionId);
            },
          };
        },
      }),
    `${pluginId}: shortcut`,
  );

  // 5. Register right-sidebar `sidechat` tab type.
  ctx.effect(
    () =>
      ctx.sidebarRightTabs.register({
        id: pluginId,
        kind: SIDE_CHAT_TAB_KIND,
        multiple: true,
        keepMounted: true,
        priority: "extension",
        title: () => t("tab.title"),
        guide: [
          {
            id: "new",
            commandId: SIDE_CHAT_SHORTCUT_ID,
            order: 25,
            title: () => t("guide.title"),
            description: () => t("guide.description"),
            icon: SideChatGuideArtwork,
          },
        ],
      }),
    `${pluginId}: tab type`,
  );

  // 6. Clean up per-tab controllers when tabs are explicitly closed.
  if (ctx.sidebarRight.registerCloseHandler) {
    ctx.effect(
      () =>
        ctx.sidebarRight.registerCloseHandler!(SIDE_CHAT_TAB_KIND, (sessionId, tab) => {
          manager.releaseTab(sessionId, tab.id);
        }),
      `${pluginId}: close handler`,
    );
  }

  // 7. Mount right-sidebar guide card slot.
  ctx.effect(
    () =>
      ctx.slots.inject("sidebar.right.tab.guide.entry", () =>
        ctx.slots.register(
          {
            name: "sidebar.right.tab.guide.entry",
            key: pluginId,
            locale: SIDE_CHAT_LOCALE_NS,
            inject: () => ({
              hooks: { shortcuts: ctx.shortcuts.catalog },
            }),
          },
          SideChatGuide as (props: never) => unknown,
        ),
      ),
    `${pluginId}: guide slot`,
  );

  // 8. Mount right-sidebar tab body slot.
  ctx.effect(
    () =>
      ctx.slots.inject("sidebar.right.pane.tab", () =>
        ctx.slots.register(
          {
            name: "sidebar.right.pane.tab",
            key: pluginId,
            locale: SIDE_CHAT_LOCALE_NS,
            inject: (sessionId) => ({
              manager,
              getLocale: () => readActiveLocale(ctx),
              hooks: {
                mainSession: createMainSessionObservable(ctx, sessionId),
              },
              keyedHooks: {
                focusNonce: (tabId: string) => manager.focusObservableForTab(sessionId, tabId),
              },
            }),
          },
          SideChatTabBody as (props: never) => unknown,
        ),
      ),
    `${pluginId}: body slot`,
  );

  // 9. Mount right-sidebar dynamic tab title slot.
  ctx.effect(
    () =>
      ctx.slots.inject("sidebar.right.pane.tab.title", () =>
        ctx.slots.register(
          {
            name: "sidebar.right.pane.tab.title",
            key: pluginId,
            locale: SIDE_CHAT_LOCALE_NS,
            inject: (sessionId) => ({
              getLocale: () => readActiveLocale(ctx),
              renameTab: (tabId: string, nextTitle: string) =>
                manager.renameActiveInTab(sessionId, tabId, nextTitle),
              keyedHooks: {
                sideChatTitle: (tabId: string) =>
                  manager.titleObservableForTab(sessionId, tabId),
              },
            }),
          },
          SideChatTitle as (props: never) => unknown,
        ),
      ),
    `${pluginId}: title slot`,
  );

  // 10. Register main-composer `/btw` input trigger & direct-send interception.
  ctx.effect(
    () =>
      registerBtwInputTrigger(ctx, manager, {
        t,
        getLocale: () => readActiveLocale(ctx),
      }),
    `${pluginId}: /btw trigger`,
  );
}
