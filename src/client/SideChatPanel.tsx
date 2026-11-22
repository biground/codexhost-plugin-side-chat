/**
 * Right-sidebar Side Chat panel component (`SideChatPanelView` + slot adapter `SideChatTabBody`).
 *
 * Key invariants:
 * - Permanent, prominent top mode badge (`持久`/`Persistent` vs `临时`/`Ephemeral`) with
 *   explanatory subtitle; ZERO manual mode toggle switch.
 * - Multiple Side Chat tabs bind independently to their own `SideChatController`.
 * - User bubbles strip first-turn boundary prefixes via `stripSideChatBoundary`.
 * - Collapsible reasoning/tool cards, running Stop button (`turn/interrupt`), inline
 *   `approval`/`question` interaction cards, and IME-safe Enter/Shift+Enter composer.
 */
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { ClientSidebarTabInfo, ClientTranslateFn } from "../types.ts";
import { stripSideChatBoundary } from "./boundary.ts";
import type { SideChatController, SideChatThreadSummary } from "./controller.ts";
import { PlusIcon, RefreshIcon, SendIcon, SideChatIcon, StopIcon, TrashIcon } from "./icons.tsx";
import { InteractionCards } from "./InteractionCards.tsx";
import type { ClientInteraction, SideChatInteractionAnswer } from "./interactions.ts";
import {
  createSideChatTranslator,
  wrapHostTranslator,
  type SideChatTranslate,
} from "./locales.ts";
import { MarkdownContent } from "./MarkdownContent.tsx";
import type { SideChatLocale } from "./protocol.ts";
import type { MainSessionResolution } from "./session-source.ts";
import type { SideChatTabManager } from "./tab-manager.ts";
import { ToolItemCard } from "./ToolCards.tsx";

export interface SideChatTabNavigationParams {
  readonly sideThreadId?: string;
  readonly focusComposer?: boolean;
  readonly focusNonce?: number;
}

export function parseSideChatTabParams(raw: unknown): SideChatTabNavigationParams {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const record = raw as Record<string, unknown>;
  return {
    ...(typeof record.sideThreadId === "string" && record.sideThreadId.trim().length > 0
      ? { sideThreadId: record.sideThreadId.trim() }
      : {}),
    ...(record.focusComposer === true ? { focusComposer: true } : {}),
    ...(typeof record.focusNonce === "number" ? { focusNonce: record.focusNonce } : {}),
  };
}

function formatThreadOptionLabel(
  item: SideChatThreadSummary,
  t: SideChatTranslate,
): string {
  const baseTitle = item.title.trim() || item.preview.trim() || t("header.untitled");
  const modeLabel =
    item.mode === "persistent"
      ? t("mode.persistent.badge")
      : t("mode.ephemeral.badge");
  const desktopSuffix = item.source === "desktop" ? ` · ${t("header.desktopTag")}` : "";
  return `[${modeLabel}] ${baseTitle}${desktopSuffix}`;
}

export interface SideChatPanelViewProps {
  readonly controller: SideChatController;
  readonly resolution: MainSessionResolution;
  readonly t?: SideChatTranslate;
  readonly locale?: SideChatLocale | string;
  readonly focusNonce?: number;
  readonly visible?: boolean;
  readonly onThreadsMutated?: (sourceThreadId: string) => void;
}

/**
 * Pure React Side Chat panel driven directly by a `SideChatController`.
 */
export function SideChatPanelView({
  controller,
  resolution,
  t: providedT,
  locale,
  focusNonce = 0,
  visible = true,
  onThreadsMutated,
}: SideChatPanelViewProps): ReactNode {
  const t = providedT ?? createSideChatTranslator(locale);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [draft, setDraft] = useState("");
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const lastFocusNonce = useRef(0);

  const activeSession = state.activeSession;
  const activeMode =
    activeSession?.mode ??
    (state.activeThreadId
      ? state.threads.find((item) => item.threadId === state.activeThreadId)?.mode ?? null
      : null);

  // Auto-focus side chat composer whenever requested via `/btw` or shortcut while visible.
  useEffect(() => {
    if (!visible || focusNonce <= lastFocusNonce.current) return;
    lastFocusNonce.current = focusNonce;
    composerRef.current?.focus();
  }, [focusNonce, visible]);

  // Keep transcript scrolled near the latest streaming item.
  const turnCount = activeSession?.turns.length ?? 0;
  const lastTurnItemCount = activeSession?.turns[turnCount - 1]?.items.length ?? 0;
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || typeof el.scrollTop !== "number") return;
    el.scrollTop = el.scrollHeight;
  }, [turnCount, lastTurnItemCount, activeSession?.isRunning]);

  const isReady = resolution.status === "ready";
  const sourceThreadId = isReady ? resolution.sourceThreadId : null;
  const isRunning = activeSession?.isRunning === true;
  const canSend =
    isReady &&
    !state.sending &&
    !state.creating &&
    !isRunning &&
    !activeSession?.stale &&
    draft.trim().length > 0;

  const handleCreateNew = () => {
    if (!sourceThreadId || state.creating) return;
    void controller
      .createSideChat(sourceThreadId, { select: true })
      .then(() => {
        onThreadsMutated?.(sourceThreadId);
        composerRef.current?.focus();
      })
      .catch(() => undefined);
  };

  const handleDeleteActive = () => {
    if (!state.activeThreadId || !sourceThreadId) return;
    const targetId = state.activeThreadId;
    void controller
      .deleteThread(targetId)
      .then(() => {
        onThreadsMutated?.(sourceThreadId);
      })
      .catch(() => undefined);
  };

  const handleRefresh = () => {
    if (!sourceThreadId) return;
    void controller.refreshThreads(sourceThreadId).catch(() => undefined);
    if (state.activeThreadId) {
      void controller.refreshSnapshot(state.activeThreadId).catch(() => undefined);
    }
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!text || !sourceThreadId || state.sending || state.creating || isRunning || activeSession?.stale) {
      return;
    }
    const previousDraft = draft;
    setDraft("");
    try {
      if (state.activeThreadId) {
        await controller.sendMessage(state.activeThreadId, text);
      } else {
        await controller.askInNewSideChat(sourceThreadId, text);
        onThreadsMutated?.(sourceThreadId);
      }
    } catch {
      // Restore draft only if the user hasn't started typing something else.
      setDraft((current) => (current === "" ? previousDraft : current));
    }
  };

  const handleInterrupt = () => {
    if (!state.activeThreadId || state.interrupting) return;
    void controller.interrupt(state.activeThreadId).catch(() => undefined);
  };

  const handleRespond = (
    pending: ClientInteraction,
    answer: SideChatInteractionAnswer | null,
  ) => {
    if (!state.activeThreadId) return;
    void controller.respondToInteraction(state.activeThreadId, pending, answer).catch(() => undefined);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    const native = event.nativeEvent as { isComposing?: boolean; keyCode?: number } | undefined;
    const isComposing = Boolean(native?.isComposing || event.keyCode === 229 || native?.keyCode === 229);
    if (isComposing) return;
    if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  const modeBadgeLabel =
    activeMode === "persistent"
      ? t("mode.persistent.badge")
      : activeMode === "ephemeral"
        ? t("mode.ephemeral.badge")
        : null;
  const modeSubtitle =
    activeMode === "persistent"
      ? t("mode.persistent.subtitle")
      : activeMode === "ephemeral"
        ? t("mode.ephemeral.subtitle")
        : null;

  return (
    <section
      className="csc-panel"
      data-codexhost-side-chat-panel
      data-csc-source-status={resolution.status}
    >
      {/* Top toolbar + permanent persistent/ephemeral mode badge (strictly NO manual mode switch) */}
      <header className="csc-header">
        <div className="csc-header-row">
          <select
            className="csc-select"
            aria-label={t("header.selectAria")}
            data-csc-thread-select
            disabled={!isReady || state.threads.length === 0}
            value={state.activeThreadId ?? ""}
            onChange={(event) => {
              const nextId = event.target.value;
              if (nextId) {
                void controller.selectThread(nextId).catch(() => undefined);
              }
            }}
          >
            {state.threads.length === 0 ? (
              <option value="">{t("header.noThreadsOption")}</option>
            ) : (
              state.threads.map((item) => (
                <option key={item.threadId} value={item.threadId}>
                  {formatThreadOptionLabel(item, t)}
                </option>
              ))
            )}
          </select>

          <button
            type="button"
            className="csc-btn"
            disabled={!isReady || state.creating}
            title={t("header.newTitle")}
            data-csc-action="new"
            onClick={handleCreateNew}
          >
            <PlusIcon size={13} />
            <span>{t("header.new")}</span>
          </button>

          {state.activeThreadId && (
            <button
              type="button"
              className="csc-btn csc-btn-icon"
              disabled={!isReady}
              title={t("header.deleteTitle")}
              aria-label={t("header.delete")}
              data-csc-action="delete"
              onClick={handleDeleteActive}
            >
              <TrashIcon size={13} />
            </button>
          )}

          <button
            type="button"
            className="csc-btn csc-btn-icon"
            disabled={!isReady || state.loadingThreads}
            title={t("header.refreshTitle")}
            aria-label={t("header.refresh")}
            data-csc-action="refresh"
            onClick={handleRefresh}
          >
            <RefreshIcon size={13} />
          </button>
        </div>

        {activeMode && modeBadgeLabel && modeSubtitle && (
          <div
            className="csc-mode-bar"
            data-csc-mode={activeMode}
            title={modeSubtitle}
            role="status"
          >
            <span className="csc-mode-badge" data-csc-mode-badge={activeMode}>
              <span className="csc-mode-dot" aria-hidden="true" />
              {modeBadgeLabel}
            </span>
            <span className="csc-mode-subtitle" data-csc-mode-subtitle>
              {modeSubtitle}
            </span>
          </div>
        )}
      </header>

      {/* Error & expired banners */}
      {state.error && (
        <div className="csc-alert csc-alert-error" role="alert" data-csc-error>
          <span>{state.error.message}</span>
          <div className="csc-alert-actions">
            <button
              type="button"
              className="csc-btn csc-btn-ghost"
              style={{ height: 22, padding: "0 6px", fontSize: 11 }}
              onClick={() => controller.clearError()}
            >
              {t("composer.dismissError")}
            </button>
          </div>
        </div>
      )}

      {activeSession?.nativeError && (
        <div className="csc-alert csc-alert-error" role="alert" data-csc-native-error>
          <span>{activeSession.nativeError}</span>
        </div>
      )}

      {activeSession?.stale && (
        <div className="csc-alert csc-alert-warn" role="status" data-csc-stale>
          <div>
            <strong>{t("stale.title")}</strong>
            <div>{t("stale.body")}</div>
          </div>
          <div className="csc-alert-actions">
            <button
              type="button"
              className="csc-btn csc-btn-primary"
              style={{ height: 26, fontSize: 11 }}
              disabled={state.creating}
              data-csc-action="stale-new"
              onClick={handleCreateNew}
            >
              {t("stale.action")}
            </button>
          </div>
        </div>
      )}

      {/* Main conversation viewport */}
      <div className="csc-body" ref={bodyRef} data-csc-messages>
        {resolution.status === "draft" ? (
          <div className="csc-empty" data-csc-empty="draft">
            <div className="csc-empty-icon">
              <SideChatIcon size={28} />
            </div>
            <h3 className="csc-empty-title">{t("empty.draftTitle")}</h3>
            <p className="csc-empty-body">{t("empty.draftBody")}</p>
          </div>
        ) : resolution.status === "remote-unsupported" ? (
          <div className="csc-empty" data-csc-empty="remote">
            <div className="csc-empty-icon">
              <SideChatIcon size={28} />
            </div>
            <h3 className="csc-empty-title">{t("empty.remoteTitle")}</h3>
            <p className="csc-empty-body">{t("empty.remoteBody")}</p>
          </div>
        ) : !activeSession ? (
          <div className="csc-empty" data-csc-empty="welcome">
            <div className="csc-empty-icon">
              <SideChatIcon size={28} />
            </div>
            <h3 className="csc-empty-title">{t("empty.welcomeTitle")}</h3>
            <p className="csc-empty-body">{t("empty.welcomeBody")}</p>
            <button
              type="button"
              className="csc-btn csc-btn-primary"
              disabled={state.creating}
              data-csc-action="start"
              onClick={handleCreateNew}
            >
              <PlusIcon size={13} />
              <span>{state.creating ? t("composer.creating") : t("empty.startButton")}</span>
            </button>
          </div>
        ) : (
          <>
            {activeSession.hasOlderTurns && (
              <button
                type="button"
                className="csc-btn csc-load-older"
                disabled={activeSession.loadingOlder}
                data-csc-action="load-older"
                onClick={() => {
                  void controller.loadOlderTurns(activeSession.threadId).catch(() => undefined);
                }}
              >
                {activeSession.loadingOlder ? t("turns.loadingOlder") : t("turns.loadOlder")}
              </button>
            )}

            {activeSession.loading && activeSession.turns.length === 0 ? (
              <div className="csc-empty" data-csc-empty="loading">
                <p className="csc-empty-body">{t("turns.loading")}</p>
              </div>
            ) : activeSession.turns.length === 0 ? (
              <div className="csc-empty" data-csc-empty="branch-ready">
                <h3 className="csc-empty-title">{t("empty.branchReadyTitle")}</h3>
                <p className="csc-empty-body">{t("empty.branchReadyBody")}</p>
              </div>
            ) : (
              activeSession.turns.map((turn) => (
                <div
                  key={turn.id}
                  className="csc-turn"
                  data-csc-turn-id={turn.id}
                  data-csc-turn-outcome={turn.outcome}
                >
                  {turn.items.map((item) => {
                    if (item.kind === "userMessage") {
                      const cleanText = stripSideChatBoundary(item.text);
                      return (
                        <div
                          key={item.id}
                          className="csc-msg csc-msg-user"
                          data-csc-item="userMessage"
                        >
                          {cleanText}
                        </div>
                      );
                    }
                    if (item.kind === "agentMessage") {
                      return (
                        <div
                          key={item.id}
                          className="csc-msg csc-msg-assistant"
                          data-csc-item="agentMessage"
                        >
                          <MarkdownContent text={item.text} t={t} />
                        </div>
                      );
                    }
                    return <ToolItemCard key={item.id} item={item} t={t} />;
                  })}

                  {turn.outcome === "failed" && turn.errorMessage && (
                    <div className="csc-alert csc-alert-error" style={{ margin: 0 }} role="alert">
                      {t("turns.failed", { message: turn.errorMessage })}
                    </div>
                  )}
                  {turn.outcome === "cancelled" && (
                    <div className="csc-turn-status">{t("turns.cancelled")}</div>
                  )}
                  {turn.outcome === "unknown" && (
                    <div className="csc-turn-status">
                      {t("turns.unknownOutcome", { reason: turn.unknownReason ?? "unknown" })}
                    </div>
                  )}
                </div>
              ))
            )}

            {isRunning && (
              <div className="csc-streaming" data-csc-streaming>
                <span className="csc-pulse-dot" aria-hidden="true" />
                <span>{t("turns.streaming")}</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Inline approval & question interaction cards */}
      {activeSession && activeSession.interactions.length > 0 && (
        <InteractionCards
          interactions={activeSession.interactions}
          respondingRequestIds={state.respondingRequestIds}
          onRespond={handleRespond}
          t={t}
        />
      )}

      {/* Bottom composer */}
      <footer className="csc-composer">
        <textarea
          ref={composerRef}
          className="csc-textarea"
          value={draft}
          disabled={!isReady || activeSession?.stale === true}
          placeholder={
            isReady ? t("composer.placeholder") : t("composer.placeholderDraft")
          }
          data-csc-composer
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleComposerKeyDown}
        />
        <div className="csc-composer-footer">
          <span className="csc-composer-hint">
            {state.creating
              ? t("composer.creating")
              : state.sending
                ? t("composer.sending")
                : ""}
          </span>
          {isRunning ? (
            <button
              type="button"
              className="csc-btn csc-btn-danger"
              disabled={state.interrupting}
              data-csc-action="stop"
              onClick={handleInterrupt}
            >
              <StopIcon size={12} />
              <span>{state.interrupting ? t("composer.stopping") : t("composer.stop")}</span>
            </button>
          ) : (
            <button
              type="button"
              className="csc-btn csc-btn-primary"
              disabled={!canSend}
              data-csc-action="send"
              onClick={() => {
                void handleSend();
              }}
            >
              <SendIcon size={12} />
              <span>{state.sending ? t("composer.sending") : t("composer.send")}</span>
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}

export interface SideChatTabBodyProps {
  readonly sessionId: string;
  readonly useTabInfo: () => ClientSidebarTabInfo;
  readonly useMainSession: <R>(selector: (value: MainSessionResolution) => R) => R;
  readonly useFocusNonce: <R>(
    key: string,
    selector: (value: number | undefined) => R,
  ) => R;
  readonly manager: SideChatTabManager;
  readonly getLocale: () => SideChatLocale;
  readonly t: ClientTranslateFn;
}

/**
 * Right-sidebar `sidebar.right.pane.tab` slot component bridging host tab lifecycle,
 * navigation params, and main-session resolution into `SideChatPanelView`.
 */
export function SideChatTabBody({
  sessionId,
  useTabInfo,
  useMainSession,
  useFocusNonce,
  manager,
  getLocale,
  t: hostT,
}: SideChatTabBodyProps): ReactNode {
  const { tab } = useTabInfo();
  const resolution = useMainSession((value) => value);
  const managerFocusNonce = useFocusNonce(tab.id, (value) => value ?? 0);
  const navParams = parseSideChatTabParams(tab.navigation.params);
  const controller = manager.controllerForTab(sessionId, tab.id, {
    ...(navParams.sideThreadId ? { sideThreadId: navParams.sideThreadId } : {}),
  });
  const t = wrapHostTranslator(hostT, getLocale());

  const effectiveFocusNonce = Math.max(
    managerFocusNonce,
    navParams.focusNonce ?? (navParams.focusComposer ? tab.navigation.revision + 1 : 0),
  );

  // Sync controller when main session transitions (draft -> ready) or nav params target a thread.
  const readySourceId = resolution.status === "ready" ? resolution.sourceThreadId : null;
  useEffect(() => {
    if (!readySourceId) {
      void controller.setSourceThread(null);
      return;
    }

    const snap = controller.getSnapshot();
    if (navParams.sideThreadId) {
      if (snap.activeThreadId === navParams.sideThreadId) {
        void controller.refreshThreads(readySourceId).catch(() => undefined);
        return;
      }
      void controller
        .setSourceThread(readySourceId, { autoSelectFirst: false })
        .then(() => controller.selectThread(navParams.sideThreadId!))
        .catch(() => undefined);
      return;
    }

    if (snap.sourceThreadId !== readySourceId) {
      void controller
        .setSourceThread(readySourceId, { autoSelectFirst: true })
        .catch(() => undefined);
    }
  }, [controller, readySourceId, navParams.sideThreadId, tab.navigation.revision]);

  // Bind sidebar page refresh command.
  useEffect(
    () =>
      tab.actions.bindCommands({
        refresh: () => {
          if (!readySourceId) return;
          void controller.refreshThreads(readySourceId).catch(() => undefined);
          const activeId = controller.getSnapshot().activeThreadId;
          if (activeId) {
            void controller.refreshSnapshot(activeId).catch(() => undefined);
          }
        },
      }),
    [tab.actions, controller, readySourceId],
  );

  // Release tab controller when this tab's occurrence aborts permanently.
  useEffect(() => {
    const onAbort = () => {
      manager.releaseTab(sessionId, tab.id);
    };
    if (tab.signal.aborted) {
      onAbort();
      return;
    }
    tab.signal.addEventListener("abort", onAbort, { once: true });
    return () => {
      tab.signal.removeEventListener("abort", onAbort);
    };
  }, [manager, sessionId, tab.id, tab.signal]);

  return (
    <SideChatPanelView
      controller={controller}
      resolution={resolution}
      t={t}
      locale={getLocale()}
      focusNonce={effectiveFocusNonce}
      visible={tab.visible}
      onThreadsMutated={(sourceId) => {
        manager.notifySiblingsChanged(sourceId, controller);
      }}
    />
  );
}
