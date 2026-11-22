/**
 * CodexHost manifestVersion 2 Web Host Injection (`web/index.mjs`).
 *
 * 1. Mounts a clean Side Chat launch button into `[data-cx-region="topbar"]`
 *    (supporting async SPA appearance via lightweight MutationObserver).
 * 2. When `enableWebBtwShortcut !== false`, intercepts `/btw` and `/btw <question>`
 *    in the document capture phase on the Web main composer so `/btw` NEVER leaks
 *    into the main conversation (even while the main turn is running).
 */
import {
  DEFAULT_SETTINGS,
  detectCurrentWebThreadContext,
  normalizeSettings,
  OPEN_EVENT_NAME,
} from "../shared/client-api.mjs";
import { createTranslator } from "../shared/i18n.mjs";

const BTW_COMMAND_PATTERN = /^\s*\/btw(?:\s+([\s\S]*))?$/iu;

export function parseWebBtwInput(rawText) {
  if (typeof rawText !== "string") return null;
  const match = BTW_COMMAND_PATTERN.exec(rawText);
  if (!match) return null;
  const question = (match[1] ?? "").trim();
  return question.length > 0 ? { kind: "ask", question } : { kind: "open", question: "" };
}

function isOwnExtensionElement(element) {
  if (!element || typeof element !== "object") return false;
  if (typeof element.getAttribute === "function" && element.getAttribute("data-sc-own-input") !== null) {
    return true;
  }
  if (typeof element.closest === "function") {
    if (
      element.closest("[data-sc-own-input]") ||
      element.closest("[data-sc-side-chat-root]") ||
      element.closest("[data-cx-host-widget]") ||
      element.closest("[data-sc-ignore-btw]")
    ) {
      return true;
    }
  }
  // Skip elements living inside any ShadowRoot (such as widget/page shadow roots).
  const rootNode = typeof element.getRootNode === "function" ? element.getRootNode() : null;
  if (rootNode && rootNode !== element.ownerDocument) {
    return true;
  }
  return false;
}

export function resolveMainComposerElement(target) {
  if (!target || typeof target !== "object" || target.nodeType !== 1) return null;
  if (isOwnExtensionElement(target)) return null;

  const tag = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  if (tag === "TEXTAREA") return target;
  if (target.getAttribute?.("contenteditable") === "true" || target.isContentEditable === true) {
    const editableRoot =
      typeof target.closest === "function" ? target.closest('[contenteditable="true"]') : target;
    return editableRoot && !isOwnExtensionElement(editableRoot) ? editableRoot : target;
  }
  if (typeof target.closest === "function") {
    const editableAncestor = target.closest('[contenteditable="true"]');
    if (editableAncestor && !isOwnExtensionElement(editableAncestor)) {
      return editableAncestor;
    }
  }
  return null;
}

export function readComposerText(el) {
  if (!el) return "";
  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";
  if (tag === "TEXTAREA" || tag === "INPUT") {
    return typeof el.value === "string" ? el.value : "";
  }
  return typeof el.innerText === "string" ? el.innerText : (el.textContent ?? "");
}

export function clearComposerInput(el) {
  if (!el) return;
  const win = el.ownerDocument?.defaultView || globalThis.window;
  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";

  if (tag === "TEXTAREA") {
    const proto = win?.HTMLTextAreaElement?.prototype;
    const descriptor = proto ? Object.getOwnPropertyDescriptor(proto, "value") : undefined;
    if (descriptor && typeof descriptor.set === "function") {
      descriptor.set.call(el, "");
    } else {
      el.value = "";
    }
    const EventCtor = win?.Event || globalThis.Event;
    if (EventCtor) {
      el.dispatchEvent(new EventCtor("input", { bubbles: true }));
      el.dispatchEvent(new EventCtor("change", { bubbles: true }));
    }
    return;
  }

  el.textContent = "";
  const InputEventCtor = win?.InputEvent || globalThis.InputEvent;
  const EventCtor = win?.Event || globalThis.Event;
  if (InputEventCtor) {
    el.dispatchEvent(
      new InputEventCtor("input", { bubbles: true, inputType: "deleteContentBackward" }),
    );
  } else if (EventCtor) {
    el.dispatchEvent(new EventCtor("input", { bubbles: true }));
  }
}

function findComposerInScope(scope) {
  if (!scope || typeof scope.querySelectorAll !== "function") return null;
  const candidates = scope.querySelectorAll('textarea, [contenteditable="true"]');
  for (const el of candidates) {
    const resolved = resolveMainComposerElement(el);
    if (resolved) return resolved;
  }
  return null;
}

function isLikelySendButton(target) {
  if (!target || typeof target.closest !== "function") return null;
  const button = target.closest("button, [role='button']");
  if (!button || isOwnExtensionElement(button)) return null;
  if (button.getAttribute("type") === "submit") return button;
  const label = [
    button.getAttribute("aria-label") || "",
    button.getAttribute("title") || "",
    button.getAttribute("data-testid") || "",
    button.textContent || "",
  ]
    .join(" ")
    .toLowerCase();
  if (/(?:\bsend\b|发送|submit)/u.test(label)) {
    return button;
  }
  return null;
}

function detectDocumentLocale(doc) {
  const lang = doc?.documentElement?.lang || globalThis.navigator?.language || "en";
  return lang;
}

export async function activate(api) {
  const doc = globalThis.document;
  const win = globalThis.window;
  if (!doc || !win) return () => {};

  let disposed = false;
  let settings = { ...DEFAULT_SETTINGS };
  let topbarMount = null;
  let mountedTopbarParent = null;
  let observer = null;

  const dispatchOpen = (detail) => {
    const CustomEventCtor = win.CustomEvent || globalThis.CustomEvent;
    if (CustomEventCtor) {
      win.dispatchEvent(new CustomEventCtor(OPEN_EVENT_NAME, { detail }));
    }
  };

  async function resolveSourceThreadId() {
    const detected = detectCurrentWebThreadContext(win, doc);
    if (detected.threadId) {
      return { sourceThreadId: detected.threadId, isDraft: false };
    }
    if (detected.isDraft) {
      return { sourceThreadId: null, isDraft: true };
    }
    try {
      const res = await api.backend.invoke("listMainThreads", {});
      const threads = res && typeof res === "object" && Array.isArray(res.threads) ? res.threads : [];
      if (threads.length > 0 && typeof threads[0]?.threadId === "string") {
        return { sourceThreadId: threads[0].threadId, isDraft: false };
      }
    } catch {
      // Backend unavailable; treat as unresolved draft so question is preserved in drawer.
    }
    return { sourceThreadId: null, isDraft: true };
  }

  async function executeBtw(parsed) {
    const { sourceThreadId, isDraft } = await resolveSourceThreadId();
    if (disposed || api.signal.aborted) return;

    if (parsed.kind === "open") {
      dispatchOpen({
        ...(sourceThreadId ? { sourceThreadId } : {}),
        focusInput: true,
      });
      return;
    }

    // `/btw <question>` on a blank draft: NEVER swallow the user's question!
    if (!sourceThreadId || isDraft) {
      dispatchOpen({
        focusInput: true,
        prefillQuestion: parsed.question,
        errorCode: "side-chat/draft-source",
      });
      return;
    }

    try {
      const res = await api.backend.invoke("createSideChat", {
        sourceThreadId,
        question: parsed.question,
      });
      if (disposed || api.signal.aborted) return;

      if (res && typeof res === "object" && res.ok !== false && res.thread?.threadId) {
        dispatchOpen({
          sourceThreadId,
          threadId: res.thread.threadId,
          focusInput: true,
        });
        return;
      }

      dispatchOpen({
        sourceThreadId,
        focusInput: true,
        prefillQuestion: parsed.question,
        errorCode: res?.error?.code ?? "side-chat/error",
        errorMessage: res?.error?.message ?? "",
      });
    } catch (error) {
      if (disposed || api.signal.aborted) return;
      dispatchOpen({
        sourceThreadId,
        focusInput: true,
        prefillQuestion: parsed.question,
        errorCode: "side-chat/error",
        errorMessage: error instanceof Error ? error.message : String(error ?? ""),
      });
    }
  }

  function tryInterceptComposer(event, composer) {
    if (disposed || api.signal.aborted || !settings.enableWebBtwShortcut) return false;
    if (!composer) return false;
    const text = readComposerText(composer);
    const parsed = parseWebBtwInput(text);
    if (!parsed) return false;

    event.preventDefault();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    } else if (typeof event.stopPropagation === "function") {
      event.stopPropagation();
    }

    clearComposerInput(composer);
    void executeBtw(parsed);
    return true;
  }

  const onKeyDown = (event) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.isComposing ||
      event.keyCode === 229
    ) {
      return;
    }
    const composer = resolveMainComposerElement(event.target);
    tryInterceptComposer(event, composer);
  };

  const onSubmit = (event) => {
    const form = event.target;
    if (!form || typeof form.querySelectorAll !== "function") return;
    if (isOwnExtensionElement(form)) return;
    const composer = findComposerInScope(form);
    tryInterceptComposer(event, composer);
  };

  const onClick = (event) => {
    const button = isLikelySendButton(event.target);
    if (!button) return;
    const scope =
      button.closest("form") ||
      button.closest("[data-cx-region='conversation']") ||
      button.parentElement?.parentElement;
    const composer = findComposerInScope(scope);
    tryInterceptComposer(event, composer);
  };

  // Mount Topbar launch button (and re-mount if SPA replaces topbar)
  function ensureTopbarButton() {
    if (disposed || api.signal.aborted) return;
    const topbar = doc.querySelector('[data-cx-region="topbar"]');
    if (!topbar) {
      if (topbarMount) {
        topbarMount.dispose();
        topbarMount = null;
        mountedTopbarParent = null;
      }
      return;
    }
    if (topbarMount && mountedTopbarParent === topbar && topbar.contains(topbarMount.container)) {
      return;
    }
    if (topbarMount) {
      topbarMount.dispose();
      topbarMount = null;
      mountedTopbarParent = null;
    }
    const mounted = api.dom.mount("topbar", "append");
    if (!mounted) return;
    topbarMount = mounted;
    mountedTopbarParent = topbar;

    const t = createTranslator(detectDocumentLocale(doc));
    const btn = doc.createElement("button");
    btn.type = "button";
    btn.className = "sc-web-topbar-btn";
    btn.setAttribute("data-sc-topbar-trigger", "true");
    btn.title = t("topbar.buttonTitle");

    const dot = doc.createElement("span");
    dot.className = "sc-web-topbar-dot";
    const label = doc.createElement("span");
    label.textContent = t("topbar.button");
    btn.append(dot, label);

    btn.addEventListener("click", () => {
      const detected = detectCurrentWebThreadContext(win, doc);
      dispatchOpen({
        ...(detected.threadId ? { sourceThreadId: detected.threadId } : {}),
        focusInput: true,
      });
    });

    mounted.container.classList.add("sc-web-topbar-host");
    mounted.container.append(btn);
  }

  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("submit", onSubmit, true);
  doc.addEventListener("click", onClick, true);

  ensureTopbarButton();
  if (typeof win.MutationObserver === "function" && doc.documentElement) {
    observer = new win.MutationObserver(() => {
      ensureTopbarButton();
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }

  const unsubStorage = api.storage.onChange((values) => {
    settings = normalizeSettings(values);
  });

  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    doc.removeEventListener("keydown", onKeyDown, true);
    doc.removeEventListener("submit", onSubmit, true);
    doc.removeEventListener("click", onClick, true);
    observer?.disconnect();
    observer = null;
    unsubStorage();
    topbarMount?.dispose();
    topbarMount = null;
    mountedTopbarParent = null;
  };

  api.track(cleanup);
  api.signal?.addEventListener?.("abort", cleanup, { once: true });

  try {
    settings = normalizeSettings(await api.storage.get());
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }

  return cleanup;
}
