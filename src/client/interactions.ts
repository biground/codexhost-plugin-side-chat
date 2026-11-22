/**
 * Browser-safe interaction contracts and `/api/ch/v1/respond` result builder.
 *
 * Strictly mirrors CodexHost's `packages/web-server/src/ch-interactions.ts`
 * approval (native decision + MCP elicitation / persist) and question formats.
 */

export interface ClientQuestionOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
}

export type ClientQuestion =
  | {
      readonly type: "text";
      readonly id: string;
      readonly prompt: string;
      readonly secret?: boolean;
      readonly optional?: boolean;
    }
  | {
      readonly type: "choice";
      readonly id: string;
      readonly prompt: string;
      readonly multiple: boolean;
      readonly allowOther: boolean;
      readonly optional?: boolean;
      readonly options: readonly ClientQuestionOption[];
    };

export interface ClientApprovalAction {
  readonly id: string;
  readonly label: string;
  readonly effect: string;
}

export type ClientInteractionValue =
  | {
      readonly type: "approval";
      readonly title: string;
      readonly description?: string;
      readonly subject?: unknown;
      readonly actions: readonly ClientApprovalAction[];
    }
  | {
      readonly type: "question";
      readonly title?: string;
      readonly questions: readonly ClientQuestion[];
    };

export interface ClientInteraction {
  readonly requestId: string | number;
  readonly threadId: string;
  readonly kind: "approval" | "question";
  readonly interaction: ClientInteractionValue;
  readonly request: Record<string, unknown>;
}

export type SideChatApprovalAnswer =
  | {
      readonly kind: "approval";
      readonly actionId: string;
      readonly dismiss?: false;
    }
  | {
      readonly kind: "approval";
      readonly dismiss: true;
      readonly actionId?: null;
    };

export interface SideChatQuestionEntryAnswer {
  readonly id: string;
  readonly selected?: readonly string[];
  readonly custom?: string;
}

export interface SideChatQuestionAnswer {
  readonly kind: "question";
  readonly answers: readonly SideChatQuestionEntryAnswer[];
}

export type SideChatInteractionAnswer = SideChatApprovalAnswer | SideChatQuestionAnswer;

export interface ClientChannelRespondPayload {
  readonly epoch: string;
  readonly threadId: string;
  readonly requestId: string | number;
  readonly result: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isNativeApprovalRequest(pending: ClientInteraction): boolean {
  const method = pending.request.method;
  return (
    method === "item/commandExecution/requestApproval" ||
    method === "item/fileChange/requestApproval"
  );
}

/**
 * Disambiguates duplicate approval action labels with `(index + 1)`,
 * matching `ch-interactions.ts`.
 */
export function formatApprovalActionLabels(actions: readonly ClientApprovalAction[]): string[] {
  return actions.map((action, index) =>
    actions.filter((other) => other.label === action.label).length > 1
      ? `${action.label} (${index + 1})`
      : action.label,
  );
}

/**
 * Returns true if a question interaction contains a secret text field
 * (which Web UI should not silently downgrade to plain text).
 */
export function hasSecretQuestion(pending: ClientInteraction): boolean {
  if (pending.interaction.type !== "question") return false;
  return pending.interaction.questions.some(
    (question) => question.type === "text" && question.secret === true,
  );
}

/**
 * Converts a user's UI answer for an approval or question interaction into the exact
 * `result` object expected by `POST /api/ch/v1/respond`.
 */
export function buildInteractionResponseResult(
  pending: ClientInteraction,
  answer: SideChatInteractionAnswer | null,
): Record<string, unknown> {
  const interaction = pending.interaction;

  if (interaction.type === "approval") {
    const nativeApproval = isNativeApprovalRequest(pending);
    const isDismissed =
      answer === null ||
      (answer.kind === "approval" && (answer.dismiss === true || !answer.actionId));

    if (isDismissed) {
      if (nativeApproval) {
        const deny =
          interaction.actions.find((action) => action.id === "decline") ??
          interaction.actions.find((action) => action.id === "cancel");
        if (!deny) {
          throw new Error("Choose one of the native approval actions");
        }
        return { decision: deny.id };
      }
      return { action: "decline" };
    }

    if (answer.kind !== "approval") {
      throw new Error("Expected an approval answer for an approval interaction");
    }

    const action = interaction.actions.find((candidate) => candidate.id === answer.actionId);
    if (!action) {
      throw new Error("Choose one of the native approval actions");
    }

    if (nativeApproval) {
      return { decision: action.id };
    }

    const params = asRecord(pending.request.params);
    const requestedSchema = asRecord(params.requestedSchema);
    if ("actionId" in asRecord(requestedSchema.properties)) {
      return { action: "accept", content: { actionId: action.id } };
    }
    if (action.effect === "deny") {
      return { action: "decline" };
    }
    if (action.effect === "allowOnce") {
      return { action: "accept", content: {} };
    }
    if (action.effect === "allowForSession" || action.effect === "allowAlways") {
      return {
        action: "accept",
        content: {},
        _meta: { persist: action.effect === "allowAlways" ? "always" : "session" },
      };
    }

    throw new Error("Host approval action is unsupported by this client version");
  }

  // Question interaction
  if (answer === null) {
    return { answers: {} };
  }
  if (answer.kind !== "question") {
    throw new Error("Expected a question answer for a question interaction");
  }

  const answers: Record<string, { answers: string[] }> = {};
  for (const entry of answer.answers) {
    const question = interaction.questions.find((candidate) => candidate.id === entry.id);
    if (!question) {
      throw new Error("Unknown native question");
    }
    if (question.type === "choice" && entry.custom && !question.allowOther) {
      throw new Error("This native question only accepts its listed choices");
    }
    answers[entry.id] = {
      answers: [...(entry.selected ?? []), ...(entry.custom ? [entry.custom] : [])],
    };
  }
  return { answers };
}

/**
 * Builds the complete `POST /api/ch/v1/respond` body.
 */
export function buildRespondRequest(
  epoch: string,
  pending: ClientInteraction,
  answer: SideChatInteractionAnswer | null,
): ClientChannelRespondPayload {
  return {
    epoch,
    threadId: pending.threadId,
    requestId: pending.requestId,
    result: buildInteractionResponseResult(pending, answer),
  };
}
