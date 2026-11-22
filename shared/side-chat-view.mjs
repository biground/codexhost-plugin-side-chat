/**
 * Reusable Side Chat conversation pane shared by both `page/index.mjs` and `widget/index.mjs`.
 *
 * Features:
 * - Permanent Persistent / Ephemeral mode badge with explanatory hover tooltip & subtitle (never a toggle)
 * - Boundary-stripped user prompts + safe Markdown assistant replies
 * - Collapsible reasoning & tool-call cards (collapsed by default, state preserved across polls)
 * - One-click Stop button while a turn is running
 * - Inline Approval (with duplicate label disambiguation) & Question (choice/text/secret) cards
 * - Smart visibility-aware polling + clean AbortSignal teardown
 */
import { deriveSideChatTitle, stripSideChatBoundary } from "./boundary.mjs";
import { formatApprovalActionLabels } from "./client-api.mjs";
import { createTranslator, formatSideChatError } from "./i18n.mjs";
import { renderMarkdown } from "./markdown.mjs";

const POLL_RUNNING_MS = 900;
const POLL_IDLE_MS = 5000;

export function createModeBadge(doc, mode, t, { showSubtitle = false } = {}) {
  const isEphemeral = mode === "ephemeral";
  const wrap = doc.createElement("span");
  wrap.className = "sc-mode-wrap";

  const badge = doc.createElement("span");
  badge.className = `sc-mode-badge ${isEphemeral ? "sc-mode-ephemeral" : "sc-mode-persistent"}`;
  badge.dataset.scMode = isEphemeral ? "ephemeral" : "persistent";
  badge.textContent = t(isEphemeral ? "mode.ephemeral.badge" : "mode.persistent.badge");
  badge.title = t(isEphemeral ? "mode.ephemeral.tooltip" : "mode.persistent.tooltip");
  wrap.append(badge);

  if (showSubtitle) {
    const sub = doc.createElement("span");
    sub.className = "sc-mode-subtitle";
    sub.textContent = t(isEphemeral ? "mode.ephemeral.subtitle" : "mode.persistent.subtitle");
    wrap.append(sub);
  }

  return wrap;
}

function statusPill(doc, status, t) {
  const pill = doc.createElement("span");
  pill.className = `sc-status-pill sc-status-${status || "succeeded"}`;
  const key = `tool.status.${status || "succeeded"}`;
  pill.textContent = t(key);
  return pill;
}

function safeJsonPretty(value) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value ?? "");
  }
}

function makeCollapsibleCard(doc, { id, kindClass, summaryText, badgeEl, extraMeta, bodyBuilder, expandedSet }) {
  const details = doc.createElement("details");
  details.className = `sc-card ${kindClass}`;
  details.open = expandedSet.has(id);
  details.addEventListener("toggle", () => {
    if (details.open) expandedSet.add(id);
    else expandedSet.delete(id);
  });

  const summary = doc.createElement("summary");
  summary.className = "sc-card-summary";

  const titleSpan = doc.createElement("span");
  titleSpan.className = "sc-card-title";
  titleSpan.textContent = summaryText;
  summary.append(titleSpan);

  if (extraMeta) {
    const metaSpan = doc.createElement("span");
    metaSpan.className = "sc-card-meta";
    metaSpan.textContent = extraMeta;
    summary.append(metaSpan);
  }
  if (badgeEl) {
    summary.append(badgeEl);
  }
  details.append(summary);

  const body = doc.createElement("div");
  body.className = "sc-card-body";
  bodyBuilder(body);
  details.append(body);
  return details;
}

function renderToolOrReasoningItem(doc, item, t, expandedSet) {
  if (item.kind === "reasoning") {
    const preview = (item.summary?.[0] || item.text || "").replace(/\s+/gu, " ").trim().slice(0, 72);
    return makeCollapsibleCard(doc, {
      id: `reasoning:${item.id}`,
      kindClass: "sc-card-reasoning",
      summaryText: preview ? `${t("tool.thinking")} · ${preview}` : t("tool.thinking"),
      expandedSet,
      bodyBuilder: (body) => {
        const pre = doc.createElement("pre");
        pre.className = "sc-card-pre";
        pre.textContent = item.text || "";
        body.append(pre);
      },
    });
  }

  if (item.kind === "commandExecution") {
    const exitText =
      typeof item.exitCode === "number" ? t("tool.commandExit", { code: item.exitCode }) : "";
    return makeCollapsibleCard(doc, {
      id: `cmd:${item.id}`,
      kindClass: "sc-card-tool",
      summaryText: `${t("tool.command")}: ${item.command || ""}`.trim(),
      extraMeta: exitText,
      badgeEl: statusPill(doc, item.status, t),
      expandedSet,
      bodyBuilder: (body) => {
        if (item.cwd) {
          const cwdRow = doc.createElement("div");
          cwdRow.className = "sc-card-kv";
          cwdRow.textContent = `${t("tool.cwd")}: ${item.cwd}`;
          body.append(cwdRow);
        }
        const cmdPre = doc.createElement("pre");
        cmdPre.className = "sc-card-pre";
        cmdPre.textContent = `$ ${item.command || ""}`;
        body.append(cmdPre);
        if (item.output) {
          const outLabel = doc.createElement("div");
          outLabel.className = "sc-card-section-label";
          outLabel.textContent = t("tool.output");
          const outPre = doc.createElement("pre");
          outPre.className = "sc-card-pre";
          outPre.textContent = item.output;
          body.append(outLabel, outPre);
        }
      },
    });
  }

  if (item.kind === "fileChange") {
    const changes = Array.isArray(item.changes) ? item.changes : [];
    return makeCollapsibleCard(doc, {
      id: `file:${item.id}`,
      kindClass: "sc-card-tool",
      summaryText: t("tool.fileChange", { count: changes.length }),
      badgeEl: statusPill(doc, item.status, t),
      expandedSet,
      bodyBuilder: (body) => {
        for (const change of changes) {
          const fileBlock = doc.createElement("div");
          fileBlock.className = "sc-file-change";

          const head = doc.createElement("div");
          head.className = "sc-file-change-head";
          const kindBadge = doc.createElement("span");
          kindBadge.className = `sc-file-kind sc-file-kind-${change.kind || "update"}`;
          kindBadge.textContent =
            change.kind === "add"
              ? t("tool.fileAdd")
              : change.kind === "delete"
                ? t("tool.fileDelete")
                : t("tool.fileUpdate");
          const pathEl = doc.createElement("code");
          pathEl.className = "sc-file-path";
          pathEl.textContent = change.path || "";
          head.append(kindBadge, pathEl);
          fileBlock.append(head);

          if (change.unifiedDiff) {
            const diffPre = doc.createElement("pre");
            diffPre.className = "sc-card-pre sc-diff-pre";
            diffPre.textContent = change.unifiedDiff;
            fileBlock.append(diffPre);
          }
          body.append(fileBlock);
        }
      },
    });
  }

  if (item.kind === "mcpToolCall") {
    return makeCollapsibleCard(doc, {
      id: `mcp:${item.id}`,
      kindClass: "sc-card-tool",
      summaryText: t("tool.mcp", { server: item.server || "mcp", tool: item.tool || "tool" }),
      badgeEl: statusPill(doc, item.status, t),
      expandedSet,
      bodyBuilder: (body) => {
        const argLabel = doc.createElement("div");
        argLabel.className = "sc-card-section-label";
        argLabel.textContent = t("tool.arguments");
        const argPre = doc.createElement("pre");
        argPre.className = "sc-card-pre";
        argPre.textContent = safeJsonPretty(item.arguments ?? {});
        body.append(argLabel, argPre);

        const outText = item.errorMessage || item.output || "";
        if (outText) {
          const outLabel = doc.createElement("div");
          outLabel.className = "sc-card-section-label";
          outLabel.textContent = t("tool.output");
          const outPre = doc.createElement("pre");
          outPre.className = "sc-card-pre";
          outPre.textContent = outText;
          body.append(outLabel, outPre);
        }
      },
    });
  }

  if (item.kind === "dynamicToolCall") {
    return makeCollapsibleCard(doc, {
      id: `dyn:${item.id}`,
      kindClass: "sc-card-tool",
      summaryText: t("tool.dynamic", { tool: item.tool || "tool" }),
      badgeEl: statusPill(doc, item.status, t),
      expandedSet,
      bodyBuilder: (body) => {
        const argLabel = doc.createElement("div");
        argLabel.className = "sc-card-section-label";
        argLabel.textContent = t("tool.arguments");
        const argPre = doc.createElement("pre");
        argPre.className = "sc-card-pre";
        argPre.textContent = safeJsonPretty(item.arguments ?? {});
        body.append(argLabel, argPre);
        if (item.output) {
          const outLabel = doc.createElement("div");
          outLabel.className = "sc-card-section-label";
          outLabel.textContent = t("tool.output");
          const outPre = doc.createElement("pre");
          outPre.className = "sc-card-pre";
          outPre.textContent = item.output;
          body.append(outLabel, outPre);
        }
      },
    });
  }

  if (item.kind === "webSearch") {
    return makeCollapsibleCard(doc, {
      id: `web:${item.id}`,
      kindClass: "sc-card-tool",
      summaryText: `${t("tool.webSearch")}: ${item.query || ""}`.trim(),
      badgeEl: statusPill(doc, item.status, t),
      expandedSet,
      bodyBuilder: (body) => {
        const p = doc.createElement("div");
        p.className = "sc-card-kv";
        p.textContent = item.query || "";
        body.append(p);
      },
    });
  }

  if (item.kind === "contextCompaction") {
    return makeCollapsibleCard(doc, {
      id: `compact:${item.id}`,
      kindClass: "sc-card-tool",
      summaryText: t("tool.compaction"),
      badgeEl: statusPill(doc, item.status, t),
      expandedSet,
      bodyBuilder: (body) => {
        const p = doc.createElement("div");
        p.className = "sc-card-kv";
        p.textContent = item.errorMessage || t("tool.compaction");
        body.append(p);
      },
    });
  }

  return null;
}

function buildTimelineSignature(state) {
  const snap = state.snapshot;
  const turnsSig = snap
    ? snap.turns.map((turn) => ({
        id: turn.id,
        status: turn.status,
        outcome: turn.outcome,
        err: turn.errorMessage ?? "",
        items: turn.items.map((item) => [
          item.kind,
          item.id,
          item.status ?? "",
          item.text?.length ?? 0,
          item.output?.length ?? 0,
          item.changes?.length ?? 0,
        ]),
      }))
    : null;
  return JSON.stringify({
    locale: state.locale,
    sourceThreadId: state.sourceThreadId,
    isDraft: state.isDraft,
    channelOffline: state.channelOffline,
    activeThreadId: state.activeThread?.threadId ?? null,
    loading: state.loadingSnapshot,
    stale: state.stale,
    isRunning: snap?.isRunning ?? false,
    nativeError: snap?.nativeError ?? null,
    turnsSig,
  });
}

export function createSideChatView({
  doc,
  container,
  api,
  client,
  getLocale,
  compact = false,
  onThreadsMutated,
  onNewBranchRequested,
  onArchiveRequested,
}) {
  const expandedCards = new Set();
  const questionDrafts = new Map();
  const submittingIds = new Set();

  const state = {
    locale: getLocale(),
    sourceThreadId: null,
    isDraft: false,
    channelOffline: false,
    activeThread: null,
    snapshot: null,
    loadingSnapshot: false,
    sending: false,
    creating: false,
    interrupting: false,
    stale: false,
    error: null,
    visible: true,
    disposed: false,
  };

  let pollTimer = null;
  let pollInFlight = false;
  let lastTimelineSignature = "";
  let lastInteractionsSignature = "";

  const root = doc.createElement("div");
  root.className = `sc-view ${compact ? "sc-view-compact" : "sc-view-full"}`;
  root.dataset.scSideChatRoot = "true";

  // Header
  const header = doc.createElement("div");
  header.className = "sc-view-header";

  const titleGroup = doc.createElement("div");
  titleGroup.className = "sc-view-title-group";
  const titleRow = doc.createElement("div");
  titleRow.className = "sc-view-title-row";
  const titleText = doc.createElement("span");
  titleText.className = "sc-view-title";
  const badgeSlot = doc.createElement("span");
  badgeSlot.className = "sc-view-badge-slot";
  titleRow.append(titleText, badgeSlot);
  const subtitleText = doc.createElement("div");
  subtitleText.className = "sc-view-subtitle";
  titleGroup.append(titleRow, subtitleText);

  const actionsGroup = doc.createElement("div");
  actionsGroup.className = "sc-view-actions";
  const refreshBtn = doc.createElement("button");
  refreshBtn.type = "button";
  refreshBtn.className = "sc-btn sc-btn-ghost sc-btn-sm";
  const newBtn = doc.createElement("button");
  newBtn.type = "button";
  newBtn.className = "sc-btn sc-btn-secondary sc-btn-sm";
  const archiveBtn = doc.createElement("button");
  archiveBtn.type = "button";
  archiveBtn.className = "sc-btn sc-btn-ghost sc-btn-danger sc-btn-sm";
  actionsGroup.append(refreshBtn, newBtn, archiveBtn);

  header.append(titleGroup, actionsGroup);

  // Error banner
  const errorBanner = doc.createElement("div");
  errorBanner.className = "sc-error-banner";
  errorBanner.hidden = true;
  const errorMessageEl = doc.createElement("span");
  errorMessageEl.className = "sc-error-text";
  const errorDismissBtn = doc.createElement("button");
  errorDismissBtn.type = "button";
  errorDismissBtn.className = "sc-btn sc-btn-ghost sc-btn-xs";
  errorDismissBtn.addEventListener("click", () => {
    state.error = null;
    renderError();
  });
  errorBanner.append(errorMessageEl, errorDismissBtn);

  // Scrollable body
  const scrollArea = doc.createElement("div");
  scrollArea.className = "sc-scroll";
  const timeline = doc.createElement("div");
  timeline.className = "sc-timeline";
  const interactionsHost = doc.createElement("div");
  interactionsHost.className = "sc-interactions";
  scrollArea.append(timeline, interactionsHost);

  // Composer
  const composer = doc.createElement("div");
  composer.className = "sc-composer";
  const textarea = doc.createElement("textarea");
  textarea.className = "sc-composer-input";
  textarea.rows = compact ? 2 : 3;
  // Critical marker so `web/index.mjs` NEVER intercepts Side Chat's own composer!
  textarea.setAttribute("data-sc-own-input", "true");

  const composerBar = doc.createElement("div");
  composerBar.className = "sc-composer-bar";
  const composerHint = doc.createElement("span");
  composerHint.className = "sc-composer-hint";
  const composerButtons = doc.createElement("div");
  composerButtons.className = "sc-composer-buttons";

  const stopBtn = doc.createElement("button");
  stopBtn.type = "button";
  stopBtn.className = "sc-btn sc-btn-danger sc-btn-sm";
  stopBtn.hidden = true;

  const sendBtn = doc.createElement("button");
  sendBtn.type = "button";
  sendBtn.className = "sc-btn sc-btn-primary sc-btn-sm";

  composerButtons.append(stopBtn, sendBtn);
  composerBar.append(composerHint, composerButtons);
  composer.append(textarea, composerBar);

  root.append(header, errorBanner, scrollArea, composer);
  container.replaceChildren(root);

  const t = (key, params) => createTranslator(state.locale)(key, params);

  function scrollToBottomIfNear() {
    const distance = scrollArea.scrollHeight - scrollArea.scrollTop - scrollArea.clientHeight;
    if (distance < 120) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }
  }

  function renderHeader() {
    refreshBtn.textContent = t("header.refresh");
    refreshBtn.title = t("header.refreshTitle");
    newBtn.textContent = compact ? t("header.newShort") : t("header.new");
    newBtn.title = t("header.newTitle");
    archiveBtn.textContent = t("header.archive");
    archiveBtn.title = t("header.archiveTitle");

    const active = state.activeThread;
    if (active) {
      const displayTitle =
        stripSideChatBoundary(active.title || state.snapshot?.title || "").trim() ||
        t("header.untitled");
      titleText.textContent = displayTitle;
      badgeSlot.replaceChildren(createModeBadge(doc, active.mode, t, { showSubtitle: false }));
      subtitleText.textContent = t(
        active.mode === "ephemeral" ? "mode.ephemeral.subtitle" : "mode.persistent.subtitle",
      );
      archiveBtn.hidden = false;
      archiveBtn.disabled = state.sending || state.creating;
    } else {
      titleText.textContent = t("app.title");
      badgeSlot.replaceChildren();
      subtitleText.textContent = t("app.subtitle");
      archiveBtn.hidden = true;
    }

    newBtn.disabled = !state.sourceThreadId || state.creating || state.isDraft;
    refreshBtn.disabled = state.loadingSnapshot;
  }

  function renderError() {
    if (!state.error) {
      errorBanner.hidden = true;
      errorMessageEl.textContent = "";
      return;
    }
    errorBanner.hidden = false;
    errorMessageEl.textContent = formatSideChatError(state.error, state.locale);
    errorDismissBtn.textContent = t("composer.dismissError");
  }

  function renderComposer() {
    const isRunning = Boolean(state.snapshot?.isRunning);
    const hasMain = Boolean(state.sourceThreadId) && !state.isDraft;
    textarea.placeholder = hasMain ? t("composer.placeholder") : t("composer.placeholderNoMain");
    textarea.disabled = state.sending || state.creating;

    stopBtn.hidden = !isRunning || !state.activeThread;
    stopBtn.disabled = state.interrupting;
    stopBtn.textContent = state.interrupting ? t("composer.stopping") : t("composer.stop");

    sendBtn.disabled =
      state.sending || state.creating || !hasMain || textarea.value.trim().length === 0;
    sendBtn.textContent = state.creating
      ? t("composer.creating")
      : state.sending
        ? t("composer.sending")
        : t("composer.send");

    composerHint.textContent = isRunning ? t("turns.streaming") : "";
  }

  function renderEmptyState(titleKey, bodyKey, actionConfig = null) {
    const box = doc.createElement("div");
    box.className = "sc-empty";

    const h = doc.createElement("div");
    h.className = "sc-empty-title";
    h.textContent = t(titleKey);
    const p = doc.createElement("p");
    p.className = "sc-empty-body";
    p.textContent = t(bodyKey);
    box.append(h, p);

    if (actionConfig) {
      const btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "sc-btn sc-btn-primary sc-btn-sm";
      btn.textContent = actionConfig.label;
      btn.addEventListener("click", actionConfig.onClick);
      box.append(btn);
    }
    return box;
  }

  function renderTimeline(force = false) {
    const sig = buildTimelineSignature(state);
    if (!force && sig === lastTimelineSignature) return;
    lastTimelineSignature = sig;

    timeline.replaceChildren();

    if (state.channelOffline && !state.snapshot) {
      timeline.append(renderEmptyState("empty.offlineTitle", "empty.offlineBody"));
      return;
    }

    if (state.isDraft) {
      timeline.append(renderEmptyState("empty.draftTitle", "empty.draftBody"));
      return;
    }

    if (!state.sourceThreadId && !state.activeThread) {
      timeline.append(renderEmptyState("empty.noMainTitle", "empty.noMainBody"));
      return;
    }

    if (state.stale) {
      timeline.append(
        renderEmptyState("stale.title", "stale.body", {
          label: t("stale.action"),
          onClick: () => {
            void handleNewBranch();
          },
        }),
      );
      return;
    }

    if (!state.activeThread) {
      timeline.append(
        renderEmptyState("empty.noBranchesTitle", "empty.noBranchesBody", {
          label: t("header.new"),
          onClick: () => {
            void handleNewBranch();
          },
        }),
      );
      return;
    }

    if (state.loadingSnapshot && !state.snapshot) {
      const loadingEl = doc.createElement("div");
      loadingEl.className = "sc-loading";
      loadingEl.textContent = t("turns.loading");
      timeline.append(loadingEl);
      return;
    }

    const turns = state.snapshot?.turns ?? [];
    if (turns.length === 0) {
      timeline.append(renderEmptyState("empty.branchReadyTitle", "empty.branchReadyBody"));
      return;
    }

    for (const turn of turns) {
      const turnEl = doc.createElement("div");
      turnEl.className = "sc-turn";
      turnEl.dataset.turnId = turn.id;

      for (const item of turn.items) {
        if (item.kind === "userMessage") {
          const clean = stripSideChatBoundary(item.text ?? item.rawText ?? "");
          const msg = doc.createElement("div");
          msg.className = "sc-msg sc-msg-user";
          const label = doc.createElement("div");
          label.className = "sc-msg-role";
          label.textContent = t("message.user");
          const bubble = doc.createElement("div");
          bubble.className = "sc-msg-bubble";
          bubble.textContent = clean;
          msg.append(label, bubble);
          turnEl.append(msg);
          continue;
        }

        if (item.kind === "agentMessage") {
          const msg = doc.createElement("div");
          msg.className = "sc-msg sc-msg-assistant";
          const label = doc.createElement("div");
          label.className = "sc-msg-role";
          label.textContent = t("message.assistant");
          const bubble = doc.createElement("div");
          bubble.className = "sc-msg-bubble sc-md";
          bubble.append(renderMarkdown(doc, item.text || "", t));
          msg.append(label, bubble);
          turnEl.append(msg);
          continue;
        }

        const card = renderToolOrReasoningItem(doc, item, t, expandedCards);
        if (card) turnEl.append(card);
      }

      if (turn.outcome === "failed" && turn.errorMessage) {
        const note = doc.createElement("div");
        note.className = "sc-turn-notice sc-turn-error";
        note.textContent = t("turns.failed", { message: turn.errorMessage });
        turnEl.append(note);
      } else if (turn.outcome === "cancelled") {
        const note = doc.createElement("div");
        note.className = "sc-turn-notice";
        note.textContent = t("turns.cancelled");
        turnEl.append(note);
      } else if (turn.outcome === "unknown" && turn.unknownReason) {
        const note = doc.createElement("div");
        note.className = "sc-turn-notice sc-turn-warn";
        note.textContent = t("turns.unknownOutcome", { reason: turn.unknownReason });
        turnEl.append(note);
      }

      timeline.append(turnEl);
    }

    if (state.snapshot?.isRunning) {
      const streaming = doc.createElement("div");
      streaming.className = "sc-streaming-row";
      const dot = doc.createElement("span");
      dot.className = "sc-pulse-dot";
      const txt = doc.createElement("span");
      txt.textContent = t("turns.streaming");
      streaming.append(dot, txt);
      timeline.append(streaming);
    }

    if (state.snapshot?.nativeError) {
      const nativeErr = doc.createElement("div");
      nativeErr.className = "sc-turn-notice sc-turn-error";
      nativeErr.textContent = state.snapshot.nativeError;
      timeline.append(nativeErr);
    }

    scrollToBottomIfNear();
  }

  function renderApprovalCard(pending) {
    const key = String(pending.requestId);
    const busy = submittingIds.has(key);
    const card = doc.createElement("div");
    card.className = "sc-interaction-card sc-interaction-approval";

    const head = doc.createElement("div");
    head.className = "sc-interaction-head";
    head.textContent = pending.interaction.title || t("interaction.approvalTitle");
    card.append(head);

    if (pending.interaction.description) {
      const desc = doc.createElement("div");
      desc.className = "sc-interaction-desc";
      desc.textContent = pending.interaction.description;
      card.append(desc);
    }

    if (pending.interaction.subject !== undefined && pending.interaction.subject !== null) {
      const pre = doc.createElement("pre");
      pre.className = "sc-card-pre";
      pre.textContent = safeJsonPretty(pending.interaction.subject);
      card.append(pre);
    }

    const actionsRow = doc.createElement("div");
    actionsRow.className = "sc-interaction-actions";
    const actions = pending.interaction.actions ?? [];
    const labels = formatApprovalActionLabels(actions);

    actions.forEach((action, idx) => {
      const btn = doc.createElement("button");
      btn.type = "button";
      const isDeny = action.effect === "deny" || action.id === "decline" || action.id === "cancel";
      btn.className = isDeny ? "sc-btn sc-btn-danger sc-btn-sm" : "sc-btn sc-btn-primary sc-btn-sm";
      btn.textContent = labels[idx] ?? action.label;
      btn.disabled = busy;
      btn.addEventListener("click", () => {
        void submitInteraction(pending, { kind: "approval", actionId: action.id });
      });
      actionsRow.append(btn);
    });

    const dismissBtn = doc.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "sc-btn sc-btn-ghost sc-btn-sm";
    dismissBtn.textContent = t("interaction.dismiss");
    dismissBtn.disabled = busy;
    dismissBtn.addEventListener("click", () => {
      void submitInteraction(pending, { kind: "approval", dismiss: true });
    });
    actionsRow.append(dismissBtn);

    card.append(actionsRow);
    return card;
  }

  function renderQuestionCard(pending) {
    const key = String(pending.requestId);
    const busy = submittingIds.has(key);
    let draft = questionDrafts.get(key);
    if (!draft) {
      draft = { values: {}, validationError: "" };
      questionDrafts.set(key, draft);
    }

    const card = doc.createElement("div");
    card.className = "sc-interaction-card sc-interaction-question";

    const head = doc.createElement("div");
    head.className = "sc-interaction-head";
    head.textContent = pending.interaction.title || t("interaction.questionTitle");
    card.append(head);

    const form = doc.createElement("form");
    form.className = "sc-question-form";

    const questions = pending.interaction.questions ?? [];
    for (const q of questions) {
      const field = doc.createElement("div");
      field.className = "sc-question-field";

      const label = doc.createElement("div");
      label.className = "sc-question-prompt";
      label.textContent = q.optional ? `${q.prompt} (${t("interaction.optional")})` : q.prompt;
      field.append(label);

      const entry = draft.values[q.id] ?? { selected: [], custom: "" };
      draft.values[q.id] = entry;

      if (q.type === "text") {
        if (q.secret) {
          const note = doc.createElement("div");
          note.className = "sc-secret-note";
          note.textContent = t("interaction.secretNote");
          field.append(note);
        }
        const input = doc.createElement("input");
        input.type = q.secret ? "password" : "text";
        input.className = "sc-text-input";
        input.placeholder = t("interaction.textPlaceholder");
        input.value = entry.custom;
        input.disabled = busy;
        input.setAttribute("data-sc-own-input", "true");
        input.addEventListener("input", () => {
          entry.custom = input.value;
        });
        field.append(input);
      } else if (q.type === "choice") {
        const optionsList = doc.createElement("div");
        optionsList.className = "sc-choice-list";
        const groupName = `sc-q-${key}-${q.id}`;

        for (const opt of q.options ?? []) {
          const row = doc.createElement("label");
          row.className = "sc-choice-option";

          const box = doc.createElement("input");
          box.type = q.multiple ? "checkbox" : "radio";
          box.name = groupName;
          box.value = opt.value;
          box.checked = entry.selected.includes(opt.value);
          box.disabled = busy;
          box.addEventListener("change", () => {
            if (q.multiple) {
              if (box.checked) {
                if (!entry.selected.includes(opt.value)) entry.selected.push(opt.value);
              } else {
                entry.selected = entry.selected.filter((v) => v !== opt.value);
              }
            } else if (box.checked) {
              entry.selected = [opt.value];
            }
          });

          const textWrap = doc.createElement("span");
          textWrap.className = "sc-choice-text";
          const optLabel = doc.createElement("span");
          optLabel.className = "sc-choice-label";
          optLabel.textContent = opt.label;
          textWrap.append(optLabel);
          if (opt.description) {
            const optDesc = doc.createElement("span");
            optDesc.className = "sc-choice-desc";
            optDesc.textContent = opt.description;
            textWrap.append(optDesc);
          }

          row.append(box, textWrap);
          optionsList.append(row);
        }
        field.append(optionsList);

        if (q.allowOther) {
          const otherInput = doc.createElement("input");
          otherInput.type = "text";
          otherInput.className = "sc-text-input";
          otherInput.placeholder = t("interaction.otherPlaceholder");
          otherInput.value = entry.custom;
          otherInput.disabled = busy;
          otherInput.setAttribute("data-sc-own-input", "true");
          otherInput.addEventListener("input", () => {
            entry.custom = otherInput.value;
          });
          field.append(otherInput);
        }
      }

      form.append(field);
    }

    const validationEl = doc.createElement("div");
    validationEl.className = "sc-question-error";
    validationEl.hidden = !draft.validationError;
    validationEl.textContent = draft.validationError;
    form.append(validationEl);

    const actionsRow = doc.createElement("div");
    actionsRow.className = "sc-interaction-actions";

    const submitBtn = doc.createElement("button");
    submitBtn.type = "submit";
    submitBtn.className = "sc-btn sc-btn-primary sc-btn-sm";
    submitBtn.disabled = busy;
    submitBtn.textContent = busy ? t("interaction.submitting") : t("interaction.submit");

    const dismissBtn = doc.createElement("button");
    dismissBtn.type = "button";
    dismissBtn.className = "sc-btn sc-btn-ghost sc-btn-sm";
    dismissBtn.disabled = busy;
    dismissBtn.textContent = t("interaction.dismiss");
    dismissBtn.addEventListener("click", () => {
      void submitInteraction(pending, null);
    });

    actionsRow.append(submitBtn, dismissBtn);
    form.append(actionsRow);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const answers = [];
      for (const q of questions) {
        const entry = draft.values[q.id] ?? { selected: [], custom: "" };
        const selected = Array.isArray(entry.selected) ? entry.selected : [];
        const custom = typeof entry.custom === "string" ? entry.custom.trim() : "";
        if (!q.optional && selected.length === 0 && !custom) {
          draft.validationError = t("interaction.requiredError");
          validationEl.hidden = false;
          validationEl.textContent = draft.validationError;
          return;
        }
        answers.push({
          id: q.id,
          ...(selected.length > 0 ? { selected } : {}),
          ...(custom ? { custom } : {}),
        });
      }
      draft.validationError = "";
      validationEl.hidden = true;
      void submitInteraction(pending, { kind: "question", answers });
    });

    card.append(form);
    return card;
  }

  function renderInteractions(force = false) {
    const interactions = state.snapshot?.interactions ?? [];
    const sig = JSON.stringify({
      locale: state.locale,
      ids: interactions.map((i) => `${i.kind}:${String(i.requestId)}`),
      submitting: [...submittingIds].sort(),
    });
    if (!force && sig === lastInteractionsSignature) return;
    lastInteractionsSignature = sig;

    const liveKeys = new Set(interactions.map((i) => String(i.requestId)));
    for (const key of [...questionDrafts.keys()]) {
      if (!liveKeys.has(key)) questionDrafts.delete(key);
    }

    interactionsHost.replaceChildren();
    if (interactions.length === 0) return;

    for (const pending of interactions) {
      if (pending.interaction?.type === "approval") {
        interactionsHost.append(renderApprovalCard(pending));
      } else if (pending.interaction?.type === "question") {
        interactionsHost.append(renderQuestionCard(pending));
      }
    }
    scrollToBottomIfNear();
  }

  function renderAll(force = false) {
    renderHeader();
    renderError();
    renderTimeline(force);
    renderInteractions(force);
    renderComposer();
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearTimeout(pollTimer);
      pollTimer = null;
    }
  }

  function scheduleNextPoll() {
    stopPolling();
    if (state.disposed || api.signal.aborted) return;
    if (!state.visible || !state.activeThread || state.stale) return;
    if (doc.hidden) return;
    const delay = state.snapshot?.isRunning ? POLL_RUNNING_MS : POLL_IDLE_MS;
    pollTimer = setTimeout(() => {
      pollTimer = null;
      void pollOnce();
    }, delay);
  }

  async function pollOnce() {
    if (state.disposed || api.signal.aborted || pollInFlight || !state.activeThread) return;
    if (!state.visible || doc.hidden) return;
    pollInFlight = true;
    try {
      await fetchSnapshot(state.activeThread.threadId, { silent: true });
    } finally {
      pollInFlight = false;
      scheduleNextPoll();
    }
  }

  async function fetchSnapshot(threadId, { silent = false } = {}) {
    if (!threadId || state.disposed || api.signal.aborted) return;
    if (!silent) {
      state.loadingSnapshot = true;
      renderAll();
    }
    try {
      const res = await client.readSnapshot(threadId);
      if (state.disposed || state.activeThread?.threadId !== threadId) return;
      state.snapshot = res.snapshot;
      state.stale = false;
      state.channelOffline = false;
      if (res.thread || res.mode) {
        state.activeThread = {
          ...state.activeThread,
          mode: res.mode ?? res.thread?.mode ?? state.activeThread.mode,
          title:
            stripSideChatBoundary(res.thread?.title || res.snapshot?.title || "").trim() ||
            state.activeThread.title,
          boundaryConsumed: Boolean(
            res.thread?.boundaryConsumed || (res.snapshot?.turns?.length ?? 0) > 0,
          ),
        };
      }
      if (!silent) state.error = null;
    } catch (error) {
      if (state.disposed || state.activeThread?.threadId !== threadId) return;
      if (error?.code === -32079) {
        state.stale = true;
        state.error = null;
        stopPolling();
      } else if (error?.code === "side-chat/channel-offline") {
        state.channelOffline = true;
        state.error = error;
      } else if (!silent) {
        state.error = error;
      }
    } finally {
      if (!state.disposed) {
        state.loadingSnapshot = false;
        renderAll();
        scheduleNextPoll();
      }
    }
  }

  async function handleNewBranch() {
    if (!state.sourceThreadId || state.isDraft || state.creating) return;
    if (typeof onNewBranchRequested === "function") {
      await onNewBranchRequested(state.sourceThreadId);
      return;
    }
    state.creating = true;
    state.error = null;
    renderAll();
    try {
      const res = await client.createSideChat({ sourceThreadId: state.sourceThreadId });
      if (state.disposed) return;
      state.activeThread = res.thread;
      state.snapshot = null;
      state.stale = false;
      state.creating = false;
      renderAll(true);
      onThreadsMutated?.({ created: res.thread });
      await fetchSnapshot(res.thread.threadId);
      textarea.focus();
    } catch (error) {
      if (state.disposed) return;
      state.creating = false;
      state.error = error;
      renderAll();
    }
  }

  async function handleArchive() {
    if (!state.activeThread) return;
    const target = state.activeThread;
    if (typeof onArchiveRequested === "function") {
      await onArchiveRequested(target);
      return;
    }
    try {
      await client.archiveSideChat(target.threadId, target.sourceThreadId);
      if (state.disposed) return;
      state.activeThread = null;
      state.snapshot = null;
      stopPolling();
      renderAll(true);
      onThreadsMutated?.({ archivedThreadId: target.threadId });
    } catch (error) {
      if (state.disposed) return;
      state.error = error;
      renderAll();
    }
  }

  async function handleSend() {
    const text = textarea.value.trim();
    if (!text || state.sending || state.creating) return;
    if (!state.sourceThreadId || state.isDraft) {
      state.error = { code: "side-chat/draft-source", message: "" };
      renderError();
      return;
    }

    state.error = null;

    // If no side branch exists yet for this main thread, create one and ask in one step.
    if (!state.activeThread || state.stale) {
      state.creating = true;
      renderAll();
      try {
        const res = await client.createSideChat({
          sourceThreadId: state.sourceThreadId,
          question: text,
        });
        if (state.disposed) return;
        textarea.value = "";
        state.activeThread = res.thread;
        state.snapshot = null;
        state.stale = false;
        state.creating = false;
        renderAll(true);
        onThreadsMutated?.({ created: res.thread });
        await fetchSnapshot(res.thread.threadId);
      } catch (error) {
        if (state.disposed) return;
        state.creating = false;
        if (error?.thread) {
          state.activeThread = error.thread;
          onThreadsMutated?.({ created: error.thread });
        }
        state.error = error;
        renderAll();
      }
      return;
    }

    const threadId = state.activeThread.threadId;
    state.sending = true;
    renderComposer();
    try {
      const res = await client.startTurn(threadId, text);
      if (state.disposed) return;
      textarea.value = "";
      state.sending = false;
      if (res.thread) {
        state.activeThread = {
          ...state.activeThread,
          title: res.thread.title || state.activeThread.title || deriveSideChatTitle(text),
          boundaryConsumed: true,
        };
      }
      renderAll();
      onThreadsMutated?.({ updatedThreadId: threadId });
      await fetchSnapshot(threadId);
    } catch (error) {
      if (state.disposed) return;
      state.sending = false;
      state.error = error;
      renderAll();
    }
  }

  async function handleStop() {
    if (!state.activeThread || state.interrupting) return;
    state.interrupting = true;
    renderComposer();
    try {
      await client.interruptTurn(state.activeThread.threadId, state.snapshot?.activeTurnId ?? null);
      if (state.disposed) return;
      await fetchSnapshot(state.activeThread.threadId, { silent: true });
    } catch (error) {
      if (state.disposed) return;
      state.error = error;
    } finally {
      if (!state.disposed) {
        state.interrupting = false;
        renderAll();
      }
    }
  }

  async function submitInteraction(pending, answer) {
    if (!state.activeThread) return;
    const key = String(pending.requestId);
    if (submittingIds.has(key)) return;
    submittingIds.add(key);
    renderInteractions(true);
    try {
      await client.respondInteraction({
        threadId: state.activeThread.threadId,
        epoch: state.snapshot?.epoch,
        requestId: pending.requestId,
        interaction: pending,
        answer,
      });
      if (state.disposed) return;
      questionDrafts.delete(key);
      state.error = null;
      await fetchSnapshot(state.activeThread.threadId, { silent: true });
    } catch (error) {
      if (state.disposed) return;
      state.error = error;
      renderError();
    } finally {
      submittingIds.delete(key);
      if (!state.disposed) {
        renderInteractions(true);
      }
    }
  }

  // Event bindings
  refreshBtn.addEventListener("click", () => {
    if (state.activeThread) {
      void fetchSnapshot(state.activeThread.threadId);
    } else {
      onThreadsMutated?.({ refresh: true });
    }
  });
  newBtn.addEventListener("click", () => {
    void handleNewBranch();
  });
  archiveBtn.addEventListener("click", () => {
    void handleArchive();
  });
  sendBtn.addEventListener("click", () => {
    void handleSend();
  });
  stopBtn.addEventListener("click", () => {
    void handleStop();
  });
  textarea.addEventListener("input", () => {
    renderComposer();
  });
  textarea.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      !event.isComposing
    ) {
      event.preventDefault();
      void handleSend();
    }
  });

  const onVisibilityChange = () => {
    if (doc.hidden) {
      stopPolling();
    } else if (state.visible && state.activeThread) {
      void pollOnce();
    }
  };
  doc.addEventListener("visibilitychange", onVisibilityChange);

  const onAbort = () => dispose();
  api.signal.addEventListener("abort", onAbort, { once: true });

  function dispose() {
    if (state.disposed) return;
    state.disposed = true;
    stopPolling();
    doc.removeEventListener("visibilitychange", onVisibilityChange);
    api.signal.removeEventListener("abort", onAbort);
  }

  renderAll(true);

  return {
    setLocale(locale) {
      state.locale = locale;
      renderAll(true);
    },
    setContext({ sourceThreadId, isDraft = false, channelOffline = false, activeThread }) {
      const prevThreadId = state.activeThread?.threadId ?? null;
      const nextThreadId = activeThread?.threadId ?? null;
      state.sourceThreadId = sourceThreadId ?? null;
      state.isDraft = Boolean(isDraft);
      state.channelOffline = Boolean(channelOffline);
      state.activeThread = activeThread ?? null;

      if (prevThreadId !== nextThreadId) {
        stopPolling();
        state.snapshot = null;
        state.stale = false;
        state.error = null;
        lastTimelineSignature = "";
        lastInteractionsSignature = "";
        renderAll(true);
        if (nextThreadId) {
          void fetchSnapshot(nextThreadId);
        }
      } else {
        renderAll();
      }
    },
    setVisible(visible) {
      state.visible = Boolean(visible);
      if (!state.visible) {
        stopPolling();
      } else if (state.activeThread) {
        void fetchSnapshot(state.activeThread.threadId, { silent: Boolean(state.snapshot) });
      }
    },
    setError(error) {
      state.error = error;
      renderError();
    },
    prefillInput(text) {
      if (typeof text === "string") {
        textarea.value = text;
        renderComposer();
      }
    },
    focusInput() {
      setTimeout(() => {
        if (!state.disposed) textarea.focus();
      }, 20);
    },
    refreshActive() {
      if (state.activeThread) {
        return fetchSnapshot(state.activeThread.threadId);
      }
      return Promise.resolve();
    },
    dispose,
  };
}
