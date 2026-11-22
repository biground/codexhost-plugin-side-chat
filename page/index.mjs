/**
 * CodexHost manifestVersion 2 Standalone Dual-Pane Workbench (`page/index.mjs`).
 *
 * Uses ONLY package-relative `.mjs` static imports so it links cleanly under
 * Desktop's `@rollup/browser` and loads natively in CodexHost Web.
 */
import { stripSideChatBoundary } from "../shared/boundary.mjs";
import {
  createSideChatClient,
  DEFAULT_SETTINGS,
  normalizeSettings,
  readExtensionSettings,
  writeExtensionSettings,
} from "../shared/client-api.mjs";
import { createTranslator } from "../shared/i18n.mjs";
import { createModeBadge, createSideChatView } from "../shared/side-chat-view.mjs";

const ALL_MAIN_VALUE = "__all__";

export async function mount(root, api) {
  const doc = root.ownerDocument || document;
  const client = createSideChatClient(api);

  const state = {
    locale: api.locale || "en",
    colorScheme: api.colorScheme || "light",
    settings: { ...DEFAULT_SETTINGS },
    settingsOpen: false,
    savingSettings: false,
    channelConnected: null,
    mainThreads: [],
    selectedMainFilter: ALL_MAIN_VALUE,
    modeFilter: "all",
    sideChats: [],
    activeThreadId: null,
    disposed: false,
  };

  const t = (key, params) => createTranslator(state.locale)(key, params);

  // Build layout shell
  const shell = doc.createElement("div");
  shell.className = "sc-page-shell";
  shell.dataset.colorScheme = state.colorScheme;
  shell.dataset.scSideChatRoot = "true";

  // Left sidebar
  const sidebar = doc.createElement("aside");
  sidebar.className = "sc-sidebar";

  const sidebarHeader = doc.createElement("div");
  sidebarHeader.className = "sc-sidebar-header";

  const brandBox = doc.createElement("div");
  brandBox.className = "sc-brand";
  const brandTitle = doc.createElement("h1");
  brandTitle.className = "sc-brand-title";
  const statusRow = doc.createElement("div");
  statusRow.className = "sc-conn-status";
  const statusDot = doc.createElement("span");
  statusDot.className = "sc-conn-dot";
  const statusLabel = doc.createElement("span");
  statusLabel.className = "sc-conn-label";
  statusRow.append(statusDot, statusLabel);
  brandBox.append(brandTitle, statusRow);

  const sidebarHeaderBtns = doc.createElement("div");
  sidebarHeaderBtns.className = "sc-sidebar-header-btns";
  const sidebarRefreshBtn = doc.createElement("button");
  sidebarRefreshBtn.type = "button";
  sidebarRefreshBtn.className = "sc-btn sc-btn-ghost sc-btn-sm";
  const settingsToggleBtn = doc.createElement("button");
  settingsToggleBtn.type = "button";
  settingsToggleBtn.className = "sc-btn sc-btn-secondary sc-btn-sm";
  sidebarHeaderBtns.append(sidebarRefreshBtn, settingsToggleBtn);
  sidebarHeader.append(brandBox, sidebarHeaderBtns);

  // Main thread filter & new branch control
  const controls = doc.createElement("div");
  controls.className = "sc-sidebar-controls";

  const mainLabel = doc.createElement("label");
  mainLabel.className = "sc-field-label";
  const mainSelect = doc.createElement("select");
  mainSelect.className = "sc-select";
  controls.append(mainLabel, mainSelect);

  // Read-only mode filter pills (All / Persistent / Ephemeral)
  const filterRow = doc.createElement("div");
  filterRow.className = "sc-filter-pills";
  const filterButtons = {};
  for (const modeKey of ["all", "persistent", "ephemeral"]) {
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "sc-pill";
    btn.dataset.modeFilter = modeKey;
    btn.addEventListener("click", () => {
      state.modeFilter = modeKey;
      renderSidebarList();
      renderFilters();
    });
    filterButtons[modeKey] = btn;
    filterRow.append(btn);
  }
  controls.append(filterRow);

  const newBranchBtn = doc.createElement("button");
  newBranchBtn.type = "button";
  newBranchBtn.className = "sc-btn sc-btn-primary sc-btn-block";
  controls.append(newBranchBtn);

  // Branch list
  const branchList = doc.createElement("div");
  branchList.className = "sc-branch-list";

  sidebar.append(sidebarHeader, controls, branchList);

  // Right pane: collapsible settings drawer + conversation view
  const mainPane = doc.createElement("section");
  mainPane.className = "sc-main-pane";

  const settingsBar = doc.createElement("div");
  settingsBar.className = "sc-settings-panel";
  settingsBar.hidden = true;

  const settingsHeader = doc.createElement("div");
  settingsHeader.className = "sc-settings-header";
  const settingsTitle = doc.createElement("strong");
  const settingsSavedTag = doc.createElement("span");
  settingsSavedTag.className = "sc-settings-status";
  settingsHeader.append(settingsTitle, settingsSavedTag);

  const settingsGrid = doc.createElement("div");
  settingsGrid.className = "sc-settings-grid";

  // Setting 1: widgetPosition
  const posItem = doc.createElement("div");
  posItem.className = "sc-setting-row";
  const posMeta = doc.createElement("div");
  posMeta.className = "sc-setting-meta";
  const posLabel = doc.createElement("div");
  posLabel.className = "sc-setting-label";
  const posDesc = doc.createElement("div");
  posDesc.className = "sc-setting-desc";
  posMeta.append(posLabel, posDesc);
  const posSelect = doc.createElement("select");
  posSelect.className = "sc-select sc-select-sm";
  const optRight = doc.createElement("option");
  optRight.value = "bottom-right";
  const optLeft = doc.createElement("option");
  optLeft.value = "bottom-left";
  posSelect.append(optRight, optLeft);
  posItem.append(posMeta, posSelect);

  // Setting 2: showFloatingLauncher
  const launcherItem = doc.createElement("label");
  launcherItem.className = "sc-setting-row sc-setting-toggle";
  const launcherMeta = doc.createElement("div");
  launcherMeta.className = "sc-setting-meta";
  const launcherLabel = doc.createElement("div");
  launcherLabel.className = "sc-setting-label";
  const launcherDesc = doc.createElement("div");
  launcherDesc.className = "sc-setting-desc";
  launcherMeta.append(launcherLabel, launcherDesc);
  const launcherCheckbox = doc.createElement("input");
  launcherCheckbox.type = "checkbox";
  launcherCheckbox.className = "sc-checkbox";
  launcherItem.append(launcherMeta, launcherCheckbox);

  // Setting 3: enableWebBtwShortcut
  const btwItem = doc.createElement("label");
  btwItem.className = "sc-setting-row sc-setting-toggle";
  const btwMeta = doc.createElement("div");
  btwMeta.className = "sc-setting-meta";
  const btwLabel = doc.createElement("div");
  btwLabel.className = "sc-setting-label";
  const btwDesc = doc.createElement("div");
  btwDesc.className = "sc-setting-desc";
  btwMeta.append(btwLabel, btwDesc);
  const btwCheckbox = doc.createElement("input");
  btwCheckbox.type = "checkbox";
  btwCheckbox.className = "sc-checkbox";
  btwItem.append(btwMeta, btwCheckbox);

  settingsGrid.append(posItem, launcherItem, btwItem);
  settingsBar.append(settingsHeader, settingsGrid);

  const viewHost = doc.createElement("div");
  viewHost.className = "sc-view-host";

  mainPane.append(settingsBar, viewHost);
  shell.append(sidebar, mainPane);
  root.replaceChildren(shell);

  function getCreationSourceThreadId() {
    if (state.selectedMainFilter && state.selectedMainFilter !== ALL_MAIN_VALUE) {
      return state.selectedMainFilter;
    }
    const active = state.sideChats.find((item) => item.threadId === state.activeThreadId);
    if (active?.sourceThreadId) return active.sourceThreadId;
    return state.mainThreads[0]?.threadId ?? null;
  }

  const view = createSideChatView({
    doc,
    container: viewHost,
    api,
    client,
    getLocale: () => state.locale,
    compact: false,
    onThreadsMutated: (info) => {
      if (info?.created) {
        state.activeThreadId = info.created.threadId;
      } else if (info?.archivedThreadId && state.activeThreadId === info.archivedThreadId) {
        state.activeThreadId = null;
      }
      void reloadAll({ keepSelection: true });
    },
    onNewBranchRequested: async (sourceThreadId) => {
      await handleCreateBranch(sourceThreadId);
    },
    onArchiveRequested: async (target) => {
      await handleArchiveBranch(target);
    },
  });

  function getVisibleSideChats() {
    let list = state.sideChats;
    if (state.selectedMainFilter !== ALL_MAIN_VALUE) {
      list = list.filter((item) => item.sourceThreadId === state.selectedMainFilter);
    }
    if (state.modeFilter !== "all") {
      list = list.filter((item) => item.mode === state.modeFilter);
    }
    return list;
  }

  function renderChrome() {
    shell.dataset.colorScheme = state.colorScheme;
    brandTitle.textContent = t("app.title");
    sidebarRefreshBtn.textContent = t("header.refresh");
    sidebarRefreshBtn.title = t("header.refreshTitle");
    settingsToggleBtn.textContent = t("page.settings.toggle");
    settingsToggleBtn.setAttribute("aria-expanded", String(state.settingsOpen));

    if (state.channelConnected === true) {
      statusDot.className = "sc-conn-dot sc-conn-online";
      statusLabel.textContent = t("status.online");
    } else if (state.channelConnected === false) {
      statusDot.className = "sc-conn-dot sc-conn-offline";
      statusLabel.textContent = t("status.offline");
    } else {
      statusDot.className = "sc-conn-dot";
      statusLabel.textContent = t("status.checking");
    }

    mainLabel.textContent = t("page.mainThreadSelect");
    newBranchBtn.textContent = `+ ${t("header.new")}`;
    newBranchBtn.title = t("header.newTitle");
    newBranchBtn.disabled = !getCreationSourceThreadId();

    renderFilters();
    renderSettingsPanel();
  }

  function renderFilters() {
    filterButtons.all.textContent = t("page.filter.all");
    filterButtons.persistent.textContent = t("page.filter.persistent");
    filterButtons.ephemeral.textContent = t("page.filter.ephemeral");
    for (const [key, btn] of Object.entries(filterButtons)) {
      btn.classList.toggle("sc-pill-active", state.modeFilter === key);
    }
  }

  function renderMainSelect() {
    mainSelect.replaceChildren();
    const allOpt = doc.createElement("option");
    allOpt.value = ALL_MAIN_VALUE;
    allOpt.textContent = t("page.allMainThreads");
    mainSelect.append(allOpt);

    for (const main of state.mainThreads) {
      const opt = doc.createElement("option");
      opt.value = main.threadId;
      opt.textContent = main.title || main.threadId;
      mainSelect.append(opt);
    }

    if (
      state.selectedMainFilter !== ALL_MAIN_VALUE &&
      !state.mainThreads.some((m) => m.threadId === state.selectedMainFilter)
    ) {
      state.selectedMainFilter = ALL_MAIN_VALUE;
    }
    mainSelect.value = state.selectedMainFilter;
  }

  function renderSettingsPanel() {
    settingsBar.hidden = !state.settingsOpen;
    settingsTitle.textContent = t("page.settings.title");
    settingsSavedTag.textContent = state.savingSettings ? t("page.settings.saving") : "";

    posLabel.textContent = t("page.settings.widgetPosition");
    posDesc.textContent = t("page.settings.widgetPositionDesc");
    optRight.textContent = t("page.settings.posRight");
    optLeft.textContent = t("page.settings.posLeft");
    posSelect.value = state.settings.widgetPosition;

    launcherLabel.textContent = t("page.settings.showFloatingLauncher");
    launcherDesc.textContent = t("page.settings.showFloatingLauncherDesc");
    launcherCheckbox.checked = state.settings.showFloatingLauncher;

    btwLabel.textContent = t("page.settings.enableWebBtwShortcut");
    btwDesc.textContent = t("page.settings.enableWebBtwShortcutDesc");
    btwCheckbox.checked = state.settings.enableWebBtwShortcut;
  }

  function syncActiveView() {
    const visible = getVisibleSideChats();
    let active = state.sideChats.find((item) => item.threadId === state.activeThreadId) ?? null;
    if (!active && visible.length > 0) {
      active = visible[0];
      state.activeThreadId = active.threadId;
    }
    view.setContext({
      sourceThreadId: active?.sourceThreadId || getCreationSourceThreadId(),
      isDraft: false,
      channelOffline: state.channelConnected === false,
      activeThread: active,
    });
  }

  function renderSidebarList() {
    const visible = getVisibleSideChats();
    const mainById = new Map(state.mainThreads.map((item) => [item.threadId, item]));
    branchList.replaceChildren();

    if (visible.length === 0) {
      const empty = doc.createElement("div");
      empty.className = "sc-list-empty";
      empty.textContent = t("empty.noBranchesTitle");
      branchList.append(empty);
      return;
    }

    for (const item of visible) {
      const card = doc.createElement("div");
      card.className = "sc-branch-item";
      card.dataset.threadId = item.threadId;
      if (item.threadId === state.activeThreadId) {
        card.classList.add("sc-branch-item-active");
      }

      const mainRow = doc.createElement("div");
      mainRow.className = "sc-branch-item-top";

      const nameEl = doc.createElement("span");
      nameEl.className = "sc-branch-item-title";
      nameEl.textContent =
        stripSideChatBoundary(item.title || item.preview || "").trim() || t("header.untitled");

      const badges = doc.createElement("span");
      badges.className = "sc-branch-item-badges";
      badges.append(createModeBadge(doc, item.mode, t, { showSubtitle: false }));
      if (item.source === "desktop") {
        const dtTag = doc.createElement("span");
        dtTag.className = "sc-desktop-tag";
        dtTag.textContent = t("header.desktopBadge");
        badges.append(dtTag);
      }

      mainRow.append(nameEl, badges);
      card.append(mainRow);

      const metaRow = doc.createElement("div");
      metaRow.className = "sc-branch-item-meta";
      const parentMain = mainById.get(item.sourceThreadId);
      const metaText = doc.createElement("span");
      metaText.className = "sc-branch-item-parent";
      metaText.textContent =
        state.selectedMainFilter === ALL_MAIN_VALUE
          ? parentMain?.title || item.sourceThreadId
          : stripSideChatBoundary(item.preview || "").slice(0, 48) || item.threadId.slice(0, 12);

      const delBtn = doc.createElement("button");
      delBtn.type = "button";
      delBtn.className = "sc-branch-delete";
      delBtn.textContent = t("header.archive");
      delBtn.title = t("header.archiveTitle");
      delBtn.addEventListener("click", (event) => {
        event.stopPropagation();
        void handleArchiveBranch(item);
      });

      metaRow.append(metaText, delBtn);
      card.append(metaRow);

      card.addEventListener("click", () => {
        state.activeThreadId = item.threadId;
        renderSidebarList();
        syncActiveView();
      });

      branchList.append(card);
    }
  }

  async function handleCreateBranch(sourceThreadId) {
    const targetSource = sourceThreadId || getCreationSourceThreadId();
    if (!targetSource) {
      view.setError({ code: "side-chat/draft-source", message: "" });
      return;
    }
    try {
      const res = await client.createSideChat({ sourceThreadId: targetSource });
      if (state.disposed) return;
      state.activeThreadId = res.thread.threadId;
      await reloadAll({ keepSelection: true });
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
      await reloadAll({ keepSelection: true });
    } catch (error) {
      if (!state.disposed) view.setError(error);
    }
  }

  async function persistSettingsPatch(patch) {
    state.savingSettings = true;
    renderSettingsPanel();
    try {
      state.settings = await writeExtensionSettings(api, patch);
      if (!state.disposed) {
        settingsSavedTag.textContent = t("page.settings.saved");
        setTimeout(() => {
          if (!state.disposed && !state.savingSettings) {
            settingsSavedTag.textContent = "";
          }
        }, 1500);
      }
    } catch (error) {
      if (!state.disposed) view.setError(error);
    } finally {
      if (!state.disposed) {
        state.savingSettings = false;
        renderSettingsPanel();
      }
    }
  }

  async function reloadAll({ keepSelection = true } = {}) {
    if (state.disposed || api.signal.aborted) return;

    const [statusOutcome, mainOutcome, sideOutcome] = await Promise.allSettled([
      client.status(),
      client.listMainThreads(),
      client.listSideChats(
        state.selectedMainFilter !== ALL_MAIN_VALUE
          ? { sourceThreadId: state.selectedMainFilter }
          : {},
      ),
    ]);

    if (state.disposed || api.signal.aborted) return;

    if (statusOutcome.status === "fulfilled") {
      state.channelConnected = Boolean(statusOutcome.value?.connected);
    } else {
      state.channelConnected = false;
    }

    if (mainOutcome.status === "fulfilled" && Array.isArray(mainOutcome.value?.threads)) {
      state.mainThreads = mainOutcome.value.threads;
    }

    if (sideOutcome.status === "fulfilled" && Array.isArray(sideOutcome.value?.threads)) {
      state.sideChats = sideOutcome.value.threads;
    }

    if (!keepSelection) {
      state.activeThreadId = null;
    }

    renderChrome();
    renderMainSelect();
    renderSidebarList();
    syncActiveView();
  }

  // Bind UI controls
  sidebarRefreshBtn.addEventListener("click", () => {
    void reloadAll({ keepSelection: true });
  });
  settingsToggleBtn.addEventListener("click", () => {
    state.settingsOpen = !state.settingsOpen;
    renderChrome();
  });
  mainSelect.addEventListener("change", () => {
    state.selectedMainFilter = mainSelect.value || ALL_MAIN_VALUE;
    void reloadAll({ keepSelection: false });
  });
  newBranchBtn.addEventListener("click", () => {
    void handleCreateBranch(getCreationSourceThreadId());
  });
  posSelect.addEventListener("change", () => {
    void persistSettingsPatch({ widgetPosition: posSelect.value });
  });
  launcherCheckbox.addEventListener("change", () => {
    void persistSettingsPatch({ showFloatingLauncher: launcherCheckbox.checked });
  });
  btwCheckbox.addEventListener("change", () => {
    void persistSettingsPatch({ enableWebBtwShortcut: btwCheckbox.checked });
  });

  // Subscribe to Host appearance, locale, and settings changes
  const unsubLocale = api.onLocaleChange((nextLocale) => {
    state.locale = nextLocale || "en";
    renderChrome();
    renderMainSelect();
    renderSidebarList();
    view.setLocale(state.locale);
  });
  const unsubScheme = api.onColorSchemeChange((nextScheme) => {
    state.colorScheme = nextScheme || "light";
    shell.dataset.colorScheme = state.colorScheme;
  });
  const unsubStorage = api.storage.onChange((values) => {
    state.settings = normalizeSettings(values);
    renderSettingsPanel();
  });

  const cleanup = () => {
    if (state.disposed) return;
    state.disposed = true;
    unsubLocale();
    unsubScheme();
    unsubStorage();
    view.dispose();
  };
  api.signal.addEventListener("abort", cleanup, { once: true });

  renderChrome();
  state.settings = await readExtensionSettings(api);
  if (!state.disposed) {
    renderSettingsPanel();
    await reloadAll({ keepSelection: true });
  }

  return cleanup;
}
