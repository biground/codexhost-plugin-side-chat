/**
 * Inline interactive approval (`approval`) and question (`question`) cards
 * rendered directly above the Side Chat composer so pending tool interactions
 * never deadlock a Side Chat turn.
 */
import { useState, type ReactNode } from "react";
import {
  formatApprovalActionLabels,
  type ClientInteraction,
  type ClientQuestion,
  type SideChatInteractionAnswer,
  type SideChatQuestionEntryAnswer,
} from "./interactions.ts";
import type { SideChatTranslate } from "./locales.ts";

function formatApprovalSubject(subject: unknown): string | null {
  if (subject === undefined || subject === null) return null;
  if (typeof subject === "string") return subject.trim() || null;
  try {
    return JSON.stringify(subject, null, 2);
  } catch {
    return String(subject);
  }
}

interface ApprovalCardProps {
  readonly pending: ClientInteraction;
  readonly busy: boolean;
  readonly onRespond: (
    pending: ClientInteraction,
    answer: SideChatInteractionAnswer | null,
  ) => Promise<void> | void;
  readonly t: SideChatTranslate;
}

function ApprovalInteractionCard({
  pending,
  busy,
  onRespond,
  t,
}: ApprovalCardProps): ReactNode {
  if (pending.interaction.type !== "approval") return null;
  const { title, description, subject, actions } = pending.interaction;
  const labels = formatApprovalActionLabels(actions);
  const subjectText = formatApprovalSubject(subject);

  return (
    <section
      className="csc-interaction-card"
      data-csc-interaction="approval"
      data-csc-request-id={String(pending.requestId)}
      aria-label={title || t("interaction.approvalTitle")}
    >
      <div className="csc-interaction-head">{title || t("interaction.approvalTitle")}</div>
      {description && <p className="csc-interaction-desc">{description}</p>}
      {subjectText && <pre className="csc-tool-pre">{subjectText}</pre>}
      <div className="csc-interaction-actions">
        {actions.map((action, index) => {
          const isAllow = action.effect !== "deny";
          const btnClass = isAllow ? "csc-btn csc-btn-primary" : "csc-btn";
          return (
            <button
              key={action.id}
              type="button"
              className={btnClass}
              disabled={busy}
              data-csc-approval-action={action.id}
              onClick={() => {
                void onRespond(pending, { kind: "approval", actionId: action.id });
              }}
            >
              {labels[index] ?? action.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

interface QuestionDraftEntry {
  readonly selected: readonly string[];
  readonly custom: string;
}

function QuestionInteractionCard({
  pending,
  busy,
  onRespond,
  t,
}: ApprovalCardProps): ReactNode {
  if (pending.interaction.type !== "question") return null;
  const { title, questions } = pending.interaction;
  const [drafts, setDrafts] = useState<Record<string, QuestionDraftEntry>>(() => {
    const initial: Record<string, QuestionDraftEntry> = {};
    for (const question of questions) {
      initial[question.id] = { selected: [], custom: "" };
    }
    return initial;
  });
  const [validationError, setValidationError] = useState<string | null>(null);

  const updateQuestion = (
    questionId: string,
    updater: (prev: QuestionDraftEntry) => QuestionDraftEntry,
  ) => {
    setValidationError(null);
    setDrafts((prev) => {
      const current = prev[questionId] ?? { selected: [], custom: "" };
      return { ...prev, [questionId]: updater(current) };
    });
  };

  const handleChoiceToggle = (question: Extract<ClientQuestion, { type: "choice" }>, value: string) => {
    updateQuestion(question.id, (prev) => {
      if (question.multiple) {
        const exists = prev.selected.includes(value);
        return {
          ...prev,
          selected: exists
            ? prev.selected.filter((item) => item !== value)
            : [...prev.selected, value],
        };
      }
      return { ...prev, selected: [value] };
    });
  };

  const handleSubmit = () => {
    const answers: SideChatQuestionEntryAnswer[] = [];
    for (const question of questions) {
      const entry = drafts[question.id] ?? { selected: [], custom: "" };
      const custom = entry.custom.trim();
      const selected = entry.selected;
      const hasAnswer =
        question.type === "text"
          ? custom.length > 0
          : selected.length > 0 || (question.allowOther && custom.length > 0);
      if (!question.optional && !hasAnswer) {
        setValidationError(t("interaction.requiredError"));
        return;
      }
      if (question.type === "text") {
        answers.push({
          id: question.id,
          ...(custom.length > 0 ? { custom } : {}),
        });
      } else {
        answers.push({
          id: question.id,
          selected,
          ...(question.allowOther && custom.length > 0 ? { custom } : {}),
        });
      }
    }
    setValidationError(null);
    void onRespond(pending, { kind: "question", answers });
  };

  return (
    <section
      className="csc-interaction-card"
      data-csc-interaction="question"
      data-csc-request-id={String(pending.requestId)}
      aria-label={title || t("interaction.questionTitle")}
    >
      <div className="csc-interaction-head">{title || t("interaction.questionTitle")}</div>
      {questions.map((question) => {
        const entry = drafts[question.id] ?? { selected: [], custom: "" };
        return (
          <div
            key={question.id}
            className="csc-question-group"
            data-csc-question-id={question.id}
          >
            <div className="csc-question-prompt">
              {question.prompt}
              {question.optional && (
                <span className="csc-question-optional">({t("interaction.optional")})</span>
              )}
            </div>

            {question.type === "choice" ? (
              <>
                <div className="csc-option-list">
                  {question.options.map((option) => {
                    const checked = entry.selected.includes(option.value);
                    return (
                      <label key={option.value} className="csc-option">
                        <input
                          type={question.multiple ? "checkbox" : "radio"}
                          name={`csc-q-${String(pending.requestId)}-${question.id}`}
                          value={option.value}
                          checked={checked}
                          disabled={busy}
                          onChange={() => handleChoiceToggle(question, option.value)}
                        />
                        <span>
                          <span>{option.label}</span>
                          {option.description && (
                            <span className="csc-option-desc">{option.description}</span>
                          )}
                        </span>
                      </label>
                    );
                  })}
                </div>
                {question.allowOther && (
                  <input
                    type="text"
                    className="csc-input"
                    disabled={busy}
                    value={entry.custom}
                    placeholder={t("interaction.otherPlaceholder")}
                    data-csc-question-other={question.id}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      updateQuestion(question.id, (prev) => ({ ...prev, custom: nextValue }));
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <input
                  type={question.secret ? "password" : "text"}
                  className="csc-input"
                  disabled={busy}
                  value={entry.custom}
                  placeholder={t("interaction.textPlaceholder")}
                  data-csc-question-text={question.id}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    updateQuestion(question.id, (prev) => ({ ...prev, custom: nextValue }));
                  }}
                />
                {question.secret && (
                  <span className="csc-option-desc">{t("interaction.secretNote")}</span>
                )}
              </>
            )}
          </div>
        );
      })}

      {validationError && (
        <div className="csc-alert csc-alert-error" style={{ margin: 0 }} role="alert">
          {validationError}
        </div>
      )}

      <div className="csc-interaction-actions">
        <button
          type="button"
          className="csc-btn csc-btn-primary"
          disabled={busy}
          data-csc-action="submit-question"
          onClick={handleSubmit}
        >
          {busy ? t("interaction.submitting") : t("interaction.submit")}
        </button>
        <button
          type="button"
          className="csc-btn"
          disabled={busy}
          data-csc-action="dismiss-question"
          onClick={() => {
            void onRespond(pending, null);
          }}
        >
          {t("interaction.dismiss")}
        </button>
      </div>
    </section>
  );
}

export interface InteractionCardsProps {
  readonly interactions: readonly ClientInteraction[];
  readonly respondingRequestIds: readonly (string | number)[];
  readonly onRespond: (
    pending: ClientInteraction,
    answer: SideChatInteractionAnswer | null,
  ) => Promise<void> | void;
  readonly t: SideChatTranslate;
}

export function InteractionCards({
  interactions,
  respondingRequestIds,
  onRespond,
  t,
}: InteractionCardsProps): ReactNode {
  if (interactions.length === 0) return null;

  return (
    <div className="csc-interactions" data-csc-interactions>
      {interactions.map((pending) => {
        const busy = respondingRequestIds.includes(pending.requestId);
        if (pending.interaction.type === "approval") {
          return (
            <ApprovalInteractionCard
              key={String(pending.requestId)}
              pending={pending}
              busy={busy}
              onRespond={onRespond}
              t={t}
            />
          );
        }
        return (
          <QuestionInteractionCard
            key={String(pending.requestId)}
            pending={pending}
            busy={busy}
            onRespond={onRespond}
            t={t}
          />
        );
      })}
    </div>
  );
}
