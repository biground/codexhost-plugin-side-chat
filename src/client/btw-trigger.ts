/**
 * Main-composer `/btw` input trigger source & command-claim interception.
 *
 * Uses `ctx.inputTriggers.registerSource` with `candidates`, `onPick`, `matchSpace`,
 * and `matchEnter` so BOTH bare `/btw` and argued `/btw <question>` (including
 * multiline prompts and while the main session is `running`) are 100% intercepted
 * and NEVER leak into the main conversation's `defaultSink`.
 */
import type {
  ClientCommandClaim,
  ClientInputTriggerSource,
  ClientPluginContext,
  ClientSubmitOutcome,
} from "../types.ts";
import { SideChatIcon } from "./icons.tsx";
import { createSideChatTranslator, type SideChatTranslate } from "./locales.ts";
import { formatSideChatError, type SideChatLocale } from "./protocol.ts";
import { resolveMainSessionFromSnapshot } from "./session-source.ts";
import type { SideChatTabManager } from "./tab-manager.ts";

export const BTW_TRIGGER_SOURCE_NAME = "codexhost-side-chat";

const BTW_LINE_PATTERN = /^(\/btw)(?:\s+([\s\S]*))?$/iu;
const BTW_TOKEN_PATTERN = /^\/btw$/iu;

const BTW_SEARCH_KEYWORDS = [
  "btw",
  "side",
  "chat",
  "sidechat",
  "side-chat",
  "side chat",
  "侧边",
  "侧边聊天",
  "旁路",
  "旁路提问",
] as const;

export interface ParsedBtwCommandLine {
  readonly rawPrefix: string;
  readonly args: string;
}

/**
 * Matches `/btw` or `/btw <question>` (case-insensitive, multiline-safe).
 * Returns `null` for non-matching commands such as `/btwsomething` or `/plan`.
 */
export function parseBtwCommandLine(line: string): ParsedBtwCommandLine | null {
  const trimmed = line.trim();
  const match = BTW_LINE_PATTERN.exec(trimmed);
  if (!match || !match[1]) return null;
  return {
    rawPrefix: match[1],
    args: (match[2] ?? "").trim(),
  };
}

/**
 * Returns true if the slash query should surface the `/btw` candidate.
 */
export function matchesBtwQuery(rawQuery: string): boolean {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (query.length === 0) return true;
  return BTW_SEARCH_KEYWORDS.some(
    (keyword) => keyword.includes(query) || query.includes(keyword),
  );
}

/**
 * Sends a composer error/info notice to `sessionId` via its session scope.
 */
export function notifyMainComposer(
  ctx: Pick<ClientPluginContext, "sessions">,
  sessionId: string,
  level: "info" | "error",
  text: string,
): void {
  const scope = ctx.sessions.scope?.(sessionId);
  const conversation = scope?.get("conversation");
  conversation?.input.for(scope!).notify(level, text);
}

/**
 * Opens or focuses a right-sidebar `sidechat` tab for `sessionId` and requests
 * Side Chat composer focus.
 */
export function openOrFocusSideChatTab(
  ctx: Pick<ClientPluginContext, "sidebarRight">,
  manager: SideChatTabManager,
  sessionId: string,
  options?: {
    readonly sideThreadId?: string;
    readonly createNewTab?: boolean;
  },
): void {
  const focusNonce = manager.nextFocusNonce();
  const params = {
    focusComposer: true,
    focusNonce,
    ...(options?.sideThreadId ? { sideThreadId: options.sideThreadId } : {}),
  };

  if (!options?.createNewTab) {
    const existing = ctx.sidebarRight
      .tabsIn?.(sessionId)
      ?.find((tab) => tab.kind === "sidechat");
    if (existing) {
      const mountedSession = ctx.sidebarRight.mounted?.getSnapshot();
      const canUseMountedControls =
        mountedSession === undefined || mountedSession === sessionId;
      if (
        canUseMountedControls &&
        ctx.sidebarRight.isExpanded &&
        !ctx.sidebarRight.isExpanded()
      ) {
        ctx.sidebarRight.toggleExpanded?.();
      }
      if (canUseMountedControls) {
        ctx.sidebarRight.focus?.(existing.id);
      } else if (ctx.sidebarRight.openTabIn) {
        ctx.sidebarRight.openTabIn(sessionId, "sidechat", { params });
      }
      manager.requestFocus(sessionId, existing.id);
      return;
    }
  }

  if (ctx.sidebarRight.openTabIn) {
    ctx.sidebarRight.openTabIn(sessionId, "sidechat", { params });
  } else {
    ctx.sidebarRight.openTab("sidechat", { params });
  }
  manager.requestFocus(sessionId);
}

export interface BtwTriggerOptions {
  readonly t?: SideChatTranslate;
  readonly getLocale?: () => SideChatLocale;
}

/**
 * Builds the `InputTriggerSource` implementing `/btw` in both `/` and `+` menus,
 * Space command-claim entry, and Enter direct interception.
 */
export function createBtwInputTriggerSource(
  ctx: Pick<ClientPluginContext, "sessions" | "sidebarRight">,
  manager: SideChatTabManager,
  options: BtwTriggerOptions = {},
): ClientInputTriggerSource {
  const getLocale = options.getLocale ?? (() => manager.getLocale());
  const translate: SideChatTranslate =
    options.t ??
    ((key, params) => createSideChatTranslator(getLocale())(key, params));

  const submitBtw = async (
    sessionId: string,
    args: string,
    attachments: readonly unknown[],
  ): Promise<ClientSubmitOutcome> => {
    if (Array.isArray(attachments) && attachments.length > 0) {
      return {
        kind: "error",
        text: translate("slash.attachmentsUnsupported"),
      };
    }

    const resolution = resolveMainSessionFromSnapshot(
      sessionId,
      ctx.sessions.list.getSnapshot(),
    );
    if (resolution.status === "draft") {
      return {
        kind: "error",
        text: translate("error.draftMainSession"),
      };
    }
    if (resolution.status === "remote-unsupported") {
      return {
        kind: "error",
        text: translate("error.remoteHostUnsupported"),
      };
    }

    const trimmedQuestion = args.trim();
    if (trimmedQuestion.length === 0) {
      openOrFocusSideChatTab(ctx, manager, sessionId);
      return { kind: "success" };
    }

    try {
      const created = await manager.createAndStartForBtw(
        resolution.sourceThreadId,
        trimmedQuestion,
      );
      openOrFocusSideChatTab(ctx, manager, sessionId, {
        sideThreadId: created.thread.threadId,
        createNewTab: true,
      });
      return { kind: "success" };
    } catch (error) {
      return {
        kind: "error",
        text: formatSideChatError(error, getLocale()),
      };
    }
  };

  const makeClaim = (sessionId: string, token: string): ClientCommandClaim => ({
    name: "btw",
    token,
    hint: translate("slash.claimHint"),
    submit: (args, _actx, attachments) => submitBtw(sessionId, args, attachments),
  });

  return {
    name: BTW_TRIGGER_SOURCE_NAME,
    trigger: "/",
    launcher: "command",
    order: 5,
    launcherOrder: 15,
    showGroupTitle: false,
    subscribeCandidates: (_session, listener) => ctx.sessions.list.subscribe(listener),
    async candidates(_session, req) {
      // Leading `/` typing OR programmatic `+` command launcher.
      if (req.position !== "leading" && req.launcher !== "command") {
        return [];
      }
      if (!matchesBtwQuery(req.query)) {
        return [];
      }
      // Deliberately NEVER disabled while `row.running === true`: `/btw` is meant to work in parallel.
      return [
        {
          name: "btw",
          label: translate("slash.label"),
          description: translate("slash.description"),
          hint: translate("slash.hint"),
          section: translate("slash.section"),
          icon: SideChatIcon,
        },
      ];
    },
    onPick(pick) {
      const sessionId = pick.session.sessionId;
      const resolution = resolveMainSessionFromSnapshot(
        sessionId,
        ctx.sessions.list.getSnapshot(),
      );
      if (resolution.status === "draft") {
        notifyMainComposer(ctx, sessionId, "error", translate("error.draftMainSession"));
        return "handled";
      }
      if (resolution.status === "remote-unsupported") {
        notifyMainComposer(
          ctx,
          sessionId,
          "error",
          translate("error.remoteHostUnsupported"),
        );
        return "handled";
      }

      if (pick.span.start !== pick.span.end) {
        const scope = ctx.sessions.scope?.(sessionId);
        scope?.bail(scope, "slash/input-consume-token", {
          guard: { kind: "span", span: pick.span },
        });
      }

      openOrFocusSideChatTab(ctx, manager, sessionId);
      return "handled";
    },
    matchSpace(session, token) {
      const trimmed = token.trim();
      if (!BTW_TOKEN_PATTERN.test(trimmed)) {
        return undefined;
      }
      return {
        claim: makeClaim(session.sessionId, `${trimmed} `),
      };
    },
    async matchEnter(session, line, _signal, envelope) {
      const parsed = parseBtwCommandLine(line);
      if (!parsed) {
        return undefined;
      }
      if (envelope.attachments > 0) {
        throw new Error(translate("slash.attachmentsUnsupported"));
      }
      // Preserve the exact typed prefix casing (e.g. `/BTW `) so SubmitMachine `argsAfter`
      // reliably extracts arguments without losing text.
      return {
        claim: makeClaim(session.sessionId, `${parsed.rawPrefix} `),
      };
    },
  };
}

export function registerBtwInputTrigger(
  ctx: Pick<ClientPluginContext, "inputTriggers" | "sessions" | "sidebarRight">,
  manager: SideChatTabManager,
  options: BtwTriggerOptions = {},
): () => void {
  return ctx.inputTriggers.registerSource(
    createBtwInputTriggerSource(ctx, manager, options),
  );
}
