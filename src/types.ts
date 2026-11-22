/**
 * Shared types for `codexhost-plugin-side-chat` host and client entries.
 *
 * Node HTTP types are imported strictly with `import type` so browser bundles
 * never pull in Node runtime modules.
 */
import type { IncomingMessage, ServerResponse } from "node:http";

/** Persistence mode of a Side Chat thread. Determined automatically (persistent-first with seamless ephemeral fallback). */
export type SideChatMode = "persistent" | "ephemeral";

/** Persisted Side Chat mapping record stored in `<dataDirectory>/side-chat-store.json`. */
export interface SideChatRecord {
  readonly threadId: string;
  readonly sourceThreadId: string;
  readonly mode: SideChatMode;
  readonly title: string;
  readonly boundaryConsumed: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** Request payload for `POST /codexhost-side-chat/threads`. */
export interface CreateSideChatRecordInput {
  readonly threadId: string;
  readonly sourceThreadId: string;
  readonly mode: SideChatMode;
  readonly title?: string;
  readonly boundaryConsumed?: boolean;
  readonly createdAt?: string;
  readonly updatedAt?: string;
}

/** Request payload for `PATCH /codexhost-side-chat/threads/:threadId`. */
export interface UpdateSideChatRecordPatch {
  readonly sourceThreadId?: string;
  readonly mode?: SideChatMode;
  readonly title?: string;
  readonly boundaryConsumed?: boolean;
}

export interface SideChatThreadsListResponse {
  readonly threads: readonly SideChatRecord[];
}

export interface SideChatThreadUpsertResponse {
  readonly thread: SideChatRecord;
  readonly threads: readonly SideChatRecord[];
}

export interface SideChatThreadPatchResponse {
  readonly thread: SideChatRecord;
}

export interface SideChatThreadDeleteResponse {
  readonly deleted: true;
}

export interface SideChatApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

/** Host Cordis web server route contract (mirrors CodexHost `webServer` service). */
export interface HostWebRoute {
  readonly kind: "exact" | "prefix";
  readonly path: string;
  handler(req: IncomingMessage, res: ServerResponse): void | Promise<void>;
}

export interface HostWebServerService {
  register(route: HostWebRoute): () => void;
}

export interface HostRequestAuth {
  readonly credential: string;
  readonly local: boolean;
  readonly scope: "full" | "scoped";
}

/** Host Cordis access service contract (mirrors CodexHost `codexhostAccess` service). */
export interface HostAccessService {
  readonly authEnabled: boolean;
  readonly dataDirectory: string;
  getRequestAuth(request: IncomingMessage): HostRequestAuth | undefined;
}

export interface HostPluginContext {
  readonly webServer: HostWebServerService;
  readonly codexhostAccess: HostAccessService;
  effect(callback: () => void | (() => void), label?: string): void;
}

export interface ClientObservable<T> {
  getSnapshot(): T;
  subscribe(listener: () => void): () => void;
}

export interface ClientLocaleSnapshot {
  readonly active: string;
  readonly revision?: number;
}

export type ClientTranslateFn = (
  key: string,
  params?: Record<string, string | number>,
) => string;

export interface ClientLocaleService {
  register(
    namespace: string,
    dictionaries: Record<string, Record<string, string>>,
  ): () => void;
  bind(namespace: string): ClientTranslateFn;
  getLocale?(): ClientLocaleSnapshot;
  getSnapshot?(): ClientLocaleSnapshot;
  subscribe?(listener: () => void): () => void;
}

export interface ClientShortcutBinding {
  readonly code: string;
  readonly secondCode?: string;
  readonly modifiers: readonly ("primary" | "control" | "alt" | "shift" | "meta")[];
}

export interface ClientShortcutCatalogEntry {
  readonly id: string;
  readonly label: string;
  readonly aliases: readonly string[];
  readonly keys: readonly string[];
  readonly aria?: string | undefined;
}

export interface ClientShortcutContext {
  readonly source?: "keyboard" | "menu" | "iframe" | "webview";
  readonly region: "page" | "editable" | "terminal";
  readonly modal: string | null;
  readonly target: Element | null;
}

export type ClientShortcutResolution =
  | { readonly status: "handled"; run(): void }
  | { readonly status: "blocked"; readonly reason: string }
  | { readonly status: "pass" };

export interface ClientShortcutCommand {
  readonly id: string;
  readonly label: () => string;
  readonly aliases: readonly string[];
  readonly defaults: Readonly<Partial<Record<string, ClientShortcutBinding>>>;
  readonly regions: readonly ("page" | "editable" | "terminal")[];
  readonly modals: readonly string[];
  resolve(context: ClientShortcutContext): ClientShortcutResolution;
}

export interface ClientShortcutsService {
  readonly catalog: ClientObservable<readonly ClientShortcutCatalogEntry[]>;
  register(command: ClientShortcutCommand): () => void;
}

export interface ClientSidebarTabRecord {
  readonly id: string;
  readonly kind: string;
  readonly contentId: string;
  readonly title: string;
}

export interface ClientSidebarTabNavigation {
  readonly address: string;
  readonly params: unknown;
  readonly revision: number;
}

export interface ClientSidebarTabActions {
  bindCommands(commands: { readonly refresh?: () => void }): () => void;
  openTab(
    kind: string,
    options?: {
      readonly paneId?: string;
      readonly preferNewPane?: boolean;
      readonly revealIfOpened?: boolean;
      readonly replaceTab?: boolean;
      readonly params?: unknown;
    },
  ): void;
  close(): void;
}

export interface ClientSidebarTabInfo {
  readonly sidebar: {
    readonly expanded: boolean;
    readonly fullscreen: boolean;
  };
  readonly panel: { readonly id: string };
  readonly tab: ClientSidebarTabRecord & {
    readonly visible: boolean;
    readonly navigation: ClientSidebarTabNavigation;
    readonly signal: AbortSignal;
    readonly actions: ClientSidebarTabActions;
  };
}

export interface ClientSidebarGuideEntry {
  readonly commandId?: string;
  readonly id: string;
  readonly order: number;
  readonly title: () => string;
  readonly description?: () => string;
  readonly icon?: unknown;
}

export interface ClientSidebarTabDefinition {
  readonly id: string;
  readonly kind: string;
  readonly multiple?: boolean;
  readonly keepMounted?: boolean;
  readonly priority?: "extension" | "builtin" | "fallback";
  readonly title: (address: string) => string;
  readonly guide?: readonly ClientSidebarGuideEntry[];
}

export interface ClientSidebarRightTabsService {
  register(definition: ClientSidebarTabDefinition): () => void;
}

export interface ClientSidebarRightTarget {
  readonly sessionId: string;
  readonly paneId: string;
  readonly host: "dock" | "float";
  readonly tabId?: string | undefined;
}

export interface ClientSidebarRightService {
  readonly mounted?: ClientObservable<string | undefined>;
  tabsIn?(sessionId: string): readonly ClientSidebarTabRecord[];
  openTab(
    kind: string,
    options?: {
      readonly paneId?: string;
      readonly preferNewPane?: boolean;
      readonly replaceTab?: string;
      readonly revealIfOpened?: boolean;
      readonly params?: unknown;
    },
  ): void;
  openTabIn?(
    sessionId: string,
    kind: string,
    options?: {
      readonly paneId?: string;
      readonly preferNewPane?: boolean;
      readonly replaceTab?: string;
      readonly revealIfOpened?: boolean;
      readonly params?: unknown;
    },
  ): void;
  focus?(tabId: string): void;
  isExpanded?(): boolean;
  toggleExpanded?(): void;
  commandTarget?(element?: Element | null): ClientSidebarRightTarget | undefined;
  openTabFromTarget?(kind: string, target: ClientSidebarRightTarget): void;
  registerCloseHandler?(
    kind: string,
    handler: (sessionId: string, tab: ClientSidebarTabRecord) => void,
  ): () => void;
}

export interface ClientSessionListRow {
  readonly id?: string;
  readonly blank?: boolean;
  readonly running?: boolean;
  readonly title?: string | null;
  readonly projectionValues?: {
    readonly threadReference?: {
      readonly hostId?: string;
      readonly threadId?: string;
    } | null;
    readonly [key: string]: unknown;
  } | null;
  readonly [key: string]: unknown;
}

export interface ClientSessionListSnapshot {
  readonly byId: Readonly<Record<string, ClientSessionListRow | undefined>>;
}

export interface ClientSessionInputFacade {
  notify(level: "info" | "error", text: string): void;
  focus?(): void;
  readonly state?: ClientObservable<{ readonly draftRev: number; readonly draft: string }>;
}

export interface ClientSessionScope {
  get(name: "conversation"):
    | {
        readonly input: {
          for(scope: ClientSessionScope): ClientSessionInputFacade;
        };
      }
    | undefined;
  get(name: string): unknown;
  bail(
    subject: unknown,
    event: string,
    payload: Record<string, unknown>,
  ): unknown;
}

export interface ClientSessionsService {
  readonly list: ClientObservable<ClientSessionListSnapshot>;
  scope?(sessionId: string): ClientSessionScope | undefined;
  subagentAddress?(sessionId: string): unknown;
}

export interface ClientTokenSpan {
  readonly start: number;
  readonly end: number;
  readonly draftRev: number;
}

export interface ClientSubmitOutcome {
  readonly kind: "success" | "error";
  readonly text?: string;
}

export interface ClientCommandClaim {
  readonly name: string;
  readonly token: string;
  readonly hint?: string;
  readonly attachments?: boolean;
  submit(
    args: string,
    actx: unknown,
    attachments: readonly unknown[],
  ): Promise<ClientSubmitOutcome>;
}

export type ClientPickOutcome =
  | { readonly claim: ClientCommandClaim }
  | { readonly text: string; readonly continue?: boolean }
  | "refresh"
  | "handled"
  | undefined;

export interface ClientInputTriggerCandidate {
  readonly name: string;
  readonly label?: string;
  readonly showAlias?: boolean;
  readonly description?: string;
  readonly icon?: unknown;
  readonly hint?: string;
  readonly disabledReason?: string;
  readonly busy?: boolean;
  readonly section?: string;
  readonly value?: string;
}

export interface ClientCandidateRequest {
  readonly launcher?: string;
  readonly menuEpoch?: object;
  readonly query: string;
  readonly quoted?: boolean;
  readonly position: "leading" | "inline";
  readonly drilled: boolean;
  readonly signal: AbortSignal;
}

export interface ClientInputTriggerPick {
  readonly trigger?: "/" | "@" | "#";
  readonly candidate: ClientInputTriggerCandidate;
  readonly session: { readonly sessionId: string };
  readonly position: "leading" | "inline";
  readonly via: "menu" | "space" | "enter";
  readonly action: "pick" | "drill";
  readonly span: ClientTokenSpan;
}

export interface ClientSubmitEnvelope {
  readonly attachments: number;
}

export interface ClientInputTriggerSource {
  readonly trigger: "/" | "@" | "#";
  readonly aliases?: readonly ("/" | "@" | "#")[];
  readonly name: string;
  readonly order?: number;
  readonly launcher?: string;
  readonly launcherOrder?: number;
  readonly showGroupTitle?: boolean;
  candidates(
    session: { readonly sessionId: string },
    req: ClientCandidateRequest,
  ): Promise<readonly ClientInputTriggerCandidate[]>;
  onPick(pick: ClientInputTriggerPick): ClientPickOutcome;
  matchSpace?(session: { readonly sessionId: string }, token: string): ClientPickOutcome;
  matchEnter?(
    session: { readonly sessionId: string },
    line: string,
    signal: AbortSignal,
    envelope: ClientSubmitEnvelope,
  ): Promise<ClientPickOutcome>;
  subscribeCandidates?(
    session: { readonly sessionId: string },
    listener: () => void,
  ): () => void;
}

export interface ClientInputTriggersService {
  registerSource(source: ClientInputTriggerSource): () => void;
}

export interface ClientSlotsService {
  inject(name: string, register: () => () => void): () => void;
  register(
    options: {
      readonly name: string;
      readonly key?: string;
      readonly id?: string;
      readonly order?: number;
      readonly locale?: string;
      readonly inject?: (sessionId: string) => Record<string, unknown>;
    },
    component: (props: never) => unknown,
  ): () => void;
}

export interface ClientPluginContext {
  readonly slots: ClientSlotsService;
  readonly locale: ClientLocaleService;
  readonly sidebarRight: ClientSidebarRightService;
  readonly sidebarRightTabs: ClientSidebarRightTabsService;
  readonly shortcuts: ClientShortcutsService;
  readonly sessions: ClientSessionsService;
  readonly commandUi: unknown;
  readonly inputTriggers: ClientInputTriggersService;
  effect(callback: () => void | (() => void), label?: string): void;
  on?(event: string, listener: (...args: unknown[]) => void): () => void;
}
