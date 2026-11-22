/**
 * CodexHost manifestVersion 2 Cross-Platform Floating Drawer Widget (`widget/index.mjs`).
 *
 * - Runs automatically in both Desktop & Web main windows inside a Shadow DOM container.
 * - Root wrapper keeps `pointer-events: none`; ONLY the floating launcher pill and the
 *   expanded slide-over drawer capture pointer events (`pointer-events: auto`).
 * - Responds to `widgetPosition`, `showFloatingLauncher`, and `codexhost-side-chat:open`.
 * - Uses ONLY package-relative `.mjs` static imports (zero external dependencies).
 */
import { stripSideChatBoundary } from "../shared/boundary.mjs";
import {
  createSideChatClient,
  DEFAULT_SETTINGS,
  detectCurrentWebThreadContext,
  normalizeSettings,
  OPEN_EVENT_NAME,
  readExtensionSettings,
  resolveActiveMainThreadId,
} from "../shared/client-api.mjs";
import { createTranslator } from "../shared/i18n.mjs";
import { createModeBadge, createSideChatView } from "../shared/side-chat-view.mjs";

export async function mount(root, api) {
  const doc = root.ownerDocument || document;
  const win = doc.defaultView || globalThis.window;
  const client = createSideChatClient(api);

  const state = {
    locale: api.locale || "en",
    colorScheme: api.colorScheme || "light",
    settings: { ...DEFAULT_SETTINGS },
    open: false,
    channelConnected: true,
    mainThreads: [],
    sourceThreadId: null,
    isDraft: false,
    sideChats: [],
    activeThreadId: null,
    disposed: false,
  };

  const t = (key, params) => createTranslator(state.locale)(key, params);

  // Outer transparent non-blocking wrapper (`pointer-events: none` in CSS)
  const wrapper = doc.createElement("div");
  wrapper.className = "sc-widget-root";
  wrapper.dataset.colorScheme = state.colorScheme;
  wrapper.dataset.position = state.settings.widgetPosition;
  wrapper.dataset.scSideChatRoot = "true";

  // Floating corner launcher pill (`pointer-events: auto`)
  const launcher = doc.createElement("button");
  launcher.type = "button";
  launcher.className = "sc-widget-launcher";
  const launcherIcon = doc.createElement("span");
  launcherIcon.className = "sc-widget-launcher-dot";
  const launcherText = doc.createElement("span");
  launcherText.className = "sc-widget-launcher-label";
  launcher.append(launcherIcon, launcherText);

  // Slide-over drawer (`pointer-events: auto`)
  const drawer = doc.createElement("section");
  drawer.className = "sc-widget-drawer";
  drawer.hidden = true;

  const drawerTop = doc.createElement("div");
  drawerTop.className = "sc-drawer-top";

  const drawerTopRow = doc.createElement("div");
  drawerTopRow.className = "sc-drawer-top-row";
  const drawerHeading = doc.createElement("span");
  drawerHeading.className = "sc-drawer-heading";
  const closeBtn = doc.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "sc-btn sc-btn-ghost sc-btn-xs";
  drawerTopRow.append(drawerHeading, closeBtn);

  const mainRow = doc.createElement("div");
  mainRow.className = "sc-drawer-selector-row";
  const mainLabel = doc.createElement("label");
  mainLabel.className = "sc-drawer-selector-label";
  const mainSelect = doc.createElement("select");
  mainSelect.className = "sc-select";
  mainRow.append(mainLabel, mainSelect);

  // Compact branch pills strip (each displays permanent Persistent / Ephemeral badge)
  const branchStrip = doc.createElement("div");
  branchStrip.className = "sc-branch-strip";

  drawerTop.append(drawerTopRow, mainRow, branchStrip);

  const viewHost = doc.createElement("div");
  viewHost.className = "sc-drawer-view-host";

  drawer.append(drawerTop, viewHost);
  wrapper.append(launcher, drawer);
  root.replaceChildren(wrapper);

  const view = createSideChatView({
    doc,
    container: viewHost,
    api,
    client,
    getLocale: () => state.locale,
    compact: true,
    onThreadsMutated: (info) => {
      if (info?.created) {
        state.activeThreadId = info.created.threadId;
      } else if (info?.archivedThreadId && state.activeThreadId === info.archivedThreadId) {
        state.activeThreadId = null;
      }
      void refreshLists({ keepSelection: true });
    },
    onNewBranchRequested: async (sourceThreadId) => {
      await handleCreateBranch(sourceThreadId);
    },
    onArchiveRequested: async (target) => {
      await handleArchiveBranch(target);
    },
  });
  view.setVisible(false);

  function renderWidgetChrome() {
    wrapper.dataset.colorScheme = state.colorScheme;
    wrapper.dataset.position = state.settings.widgetPosition;
    launcher.hidden = !state.settings.showFloatingLauncher || state.open;
    launcherText.textContent = t("widget.launcher");
    launcher.title = t("widget.launcherTitle");
    drawer.hidden = !state.open;
    drawerHeading.textContent = t("app.title");
    closeBtn.textContent = t("widget.close");
    mainLabel.textContent = t("widget.mainThreadLabel");
  }

  function renderMainSelect() {
    mainSelect.replaceChildren();
    if (state.mainThreads.length === 0) {
      const opt = doc.createElement("option");
      opt.value = "";
      opt.textContent = t("widget.noMainThreads");
      mainSelect.append(opt);
      mainSelect.disabled = true;
      return;
    }

    mainSelect.disabled = false;
    if (
      state.sourceThreadId &&
      !state.mainThreads.some((item) => item.threadId === state.sourceThreadId)
    ) {
      const currentOpt = doc.createElement("option");
      currentOpt.value = state.sourceThreadId;
      currentOpt.textContent = state.sourceThreadId;
      mainSelect.append(currentOpt);
    }

    for (const main of state.mainThreads) {
      const opt = doc.createElement("option");
      opt.value = main.threadId;
      opt.textContent = main.title || main.threadId;
      mainSelect.append(opt);
    }

    mainSelect.value = state.sourceThreadId ?? "";
  }

  function renderBranchStrip() {
    branchStrip.replaceChildren();
    if (state.sideChats.length === 0) {
      branchStrip.hidden = true;
      return;
    }
    branchStrip.hidden = false;

    for (const item of state.sideChats) {
      const chip = doc.createElement("button");
      chip.type = "button";
      chip.className = "sc-branch-chip";
      if (item.threadId === state.activeThreadId) {
        chip.classList.add("sc-branch-chip-active");
      }

      const name = doc.createElement("span");
      name.className = "sc-branch-chip-title";
      name.textContent =
        stripSideChatBoundary(item.title || item.preview || "").trim() || t("header.untitled");

      chip.append(name, createModeBadge(doc, item.mode, t, { showSubtitle: false }));
      chip.addEventListener("click", () => {
        state.activeThreadId = item.threadId;
        renderBranchStrip();
        syncView();
      });
      branchStrip.append(chip);
    }
  }

  function syncView() {
    let active = state.sideChats.find((item) => item.threadId === state.activeThreadId) ?? null;
    if (!active && state.sideChats.length > 0) {
      active = state.sideChats[0];
      state.activeThreadId = active.threadId;
    }
    view.setContext({
      sourceThreadId: state.sourceThreadId,
      isDraft: state.isDraft,
      channelOffline: !state.channelConnected,
      activeThread: active,
    });
  }

  async function refreshLists({ keepSelection = true, preferSourceThreadId = null, preferThreadId = null } = {}) {
    if (state.disposed || api.signal.aborted) return;

    const detected =
      api.hostTarget === "web"
        ? detectCurrentWebThreadContext(win, doc)
        : { threadId: null, isDraft: false };

    try {
      const mainRes = await client.listMainThreads();
      if (state.disposed || api.signal.aborted) return;
      state.channelConnected = true;
      state.mainThreads = Array.isArray(mainRes?.threads) ? mainRes.threads : [];
    } catch {
      if (state.disposed || api.signal.aborted) return;
      state.channelConnected = false;
    }

    if (preferSourceThreadId) {
      state.sourceThreadId = preferSourceThreadId;
      state.isDraft = false;
    } else if (detected.isDraft && !detected.threadId) {
      state.sourceThreadId = null;
      state.isDraft = true;
    } else {
      state.isDraft = false;
      state.sourceThreadId = resolveActiveMainThreadId(
        state.mainThreads,
        detected,
        state.sourceThreadId,
      );
    }

    if (state.sourceThreadId) {
      try {
        const sideRes = await client.listSideChats({ sourceThreadId: state.sourceThreadId });
        if (state.disposed || api.signal.aborted) return;
        state.sideChats = Array.isArray(sideRes?.threads) ? sideRes.threads : [];
      } catch {
        if (state.disposed || api.signal.aborted) return;
        state.sideChats = [];
      }
    } else {
      state.sideChats = [];
    }

    if (preferThreadId) {
      if (!state.sideChats.some((item) => item.threadId === preferThreadId)) {
        state.sideChats = [
          {
            threadId: preferThreadId,
            sourceThreadId: state.sourceThreadId ?? "",
            mode: "persistent",
            title: "",
            preview: "",
            boundaryConsumed: true,
            source: "plugin",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            statusType: "active",
          },
          ...state.sideChats,
        ];
      }
      state.activeThreadId = preferThreadId;
    } else if (!keepSelection) {
      state.activeThreadId = state.sideChats[0]?.threadId ?? null;
    }

    renderMainSelect();
    renderBranchStrip();
    syncView();
  }

  async function handleCreateBranch(sourceThreadId) {
    const targetSource = sourceThreadId || state.sourceThreadId;
    if (!targetSource || state.isDraft) {
      view.setError({ code: "side-chat/draft-source", message: "" });
      return;
    }
    try {
      const res = await client.createSideChat({ sourceThreadId: targetSource });
      if (state.disposed) return;
      await refreshLists({
        keepSelection: true,
        preferSourceThreadId: targetSource,
        preferThreadId: res.thread.threadId,
      });
      view.focusInput();
    } catch (error) {
      if (!state.disposed) view.setError(error);
    }
  }

  async function handleArchiveBranch(target) {
    try {
      await client.archiveSideChat(target.threadId, target.sourceThreadId);
      if (state.disposed) return;
      if (state.activeThreadId === target.threadId) {
        state.activeThreadId = null;
      }
      await refreshLists({ keepSelection: true, preferSourceThreadId: state.sourceThreadId });
    } catch (error) {
      if (!state.disposed) view.setError(error);
    }
  }

  async function openDrawer(detail = {}) {
    state.open = true;
    renderWidgetChrome();
    view.setVisible(true);

    const hasExplicitDraftError = detail.errorCode === "side-chat/draft-source";
    if (hasExplicitDraftError) {
      state.isDraft = true;
      state.sourceThreadId = null;
      state.sideChats = [];
      state.activeThreadId = null;
      renderMainSelect();
      renderBranchStrip();
      syncView();
    } else {
      await refreshLists({
        keepSelection: true,
        preferSourceThreadId:
          typeof detail.sourceThreadId === "string" && detail.sourceThreadId.trim()
            ? detail.sourceThreadId.trim()
            : null,
        preferThreadId:
          typeof detail.threadId === "string" && detail.threadId.trim()
            ? detail.threadId.trim()
            : null,
      });
    }

    if (typeof detail.prefillQuestion === "string" && detail.prefillQuestion.length > 0) {
      view.prefillInput(detail.prefillQuestion);
    }
    if (detail.errorCode || detail.errorMessage) {
      view.setError({
        code: detail.errorCode ?? "side-chat/error",
        message: detail.errorMessage ?? "",
      });
    }
    if (detail.threadId) {
      await view.refreshActive();
    }
    if (detail.focusInput !== false) {
      view.focusInput();
    }
  }

  function closeDrawer() {
    state.open = false;
    view.setVisible(false);
    renderWidgetChrome();
  }

  // Event listeners
  launcher.addEventListener("click", () => {
    void openDrawer({ focusInput: true });
  });
  closeBtn.addEventListener("click", () => {
    closeDrawer();
  });
  mainSelect.addEventListener("change", () => {
    const nextId = mainSelect.value || null;
    state.sourceThreadId = nextId;
    state.isDraft = false;
    state.activeThreadId = null;
    void refreshLists({ keepSelection: false, preferSourceThreadId: nextId });
  });

  const onOpenEvent = (event) => {
    const detail = event && typeof event === "object" && "detail" in event ? event.detail : {};
    void openDrawer(detail || {});
  };
  const onNavChange = () => {
    if (state.open && api.hostTarget === "web") {
      void refreshLists({ keepSelection: true });
    }
  };

  win?.addEventListener(OPEN_EVENT_NAME, onOpenEvent);
  win?.addEventListener("popstate", onNavChange);
  win?.addEventListener("hashchange", onNavChange);

  const unsubLocale = api.onLocaleChange((nextLocale) => {
    state.locale = nextLocale || "en";
    renderWidgetChrome();
    renderMainSelect();
    renderBranchStrip();
    view.setLocale(state.locale);
  });
  const unsubScheme = api.onColorSchemeChange((nextScheme) => {
    state.colorScheme = nextScheme || "light";
    wrapper.dataset.colorScheme = state.colorScheme;
  });
  const unsubStorage = api.storage.onChange((values) => {
    state.settings = normalizeSettings(values);
    renderWidgetChrome();
  });

  const cleanup = () => {
    if (state.disposed) return;
    state.disposed = true;
    win?.removeEventListener(OPEN_EVENT_NAME, onOpenEvent);
    win?.removeEventListener("popstate", onNavChange);
    win?.removeEventListener("hashchange", onNavChange);
    unsubLocale();
    unsubScheme();
    unsubStorage();
    view.dispose();
  };
  api.signal.addEventListener("abort", cleanup, { once: true });

  renderWidgetChrome();
  state.settings = await readExtensionSettings(api);
  if (!state.disposed) {
    renderWidgetChrome();
  }

  return cleanup;
}
