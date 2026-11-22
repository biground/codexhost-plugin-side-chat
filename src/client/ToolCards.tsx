/**
 * Compact collapsible cards for Side Chat reasoning and tool execution items.
 */
import { useState, type ReactNode } from "react";
import { ChevronIcon } from "./icons.tsx";
import type { SideChatTranslate } from "./locales.ts";
import type { SideChatItemStatus, SideChatMessageItem } from "./protocol.ts";

function formatJsonPreview(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusLabel(status: SideChatItemStatus, t: SideChatTranslate): string {
  switch (status) {
    case "running":
      return t("tool.status.running");
    case "succeeded":
      return t("tool.status.succeeded");
    case "failed":
      return t("tool.status.failed");
    case "cancelled":
      return t("tool.status.cancelled");
  }
}

function renderDiffLines(diff: string): ReactNode {
  const lines = diff.split("\n");
  return (
    <pre className="csc-tool-pre">
      {lines.map((line, index) => {
        const className =
          line.startsWith("+") && !line.startsWith("+++")
            ? "csc-diff-line-add"
            : line.startsWith("-") && !line.startsWith("---")
              ? "csc-diff-line-del"
              : undefined;
        return (
          <div key={index} className={className}>
            {line}
          </div>
        );
      })}
    </pre>
  );
}

export interface ToolItemCardProps {
  readonly item: Exclude<SideChatMessageItem, { kind: "userMessage" | "agentMessage" }>;
  readonly t: SideChatTranslate;
}

export function ToolItemCard({ item, t }: ToolItemCardProps): ReactNode {
  const [expanded, setExpanded] = useState(false);

  if (item.kind === "contextCompaction") {
    return (
      <div className="csc-compaction" data-csc-item="contextCompaction">
        {t("tool.compaction")}
        {item.errorMessage ? ` · ${item.errorMessage}` : ""}
      </div>
    );
  }

  if (item.kind === "reasoning") {
    const preview = (item.summary[0] ?? item.content[0] ?? "").trim();
    const headerTitle = preview
      ? `${t("tool.thinking")} · ${preview}`
      : t("tool.thinking");
    return (
      <div className="csc-tool-card" data-csc-item="reasoning" data-csc-collapsible="true">
        <button
          type="button"
          className="csc-tool-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronIcon expanded={expanded} />
          <span className="csc-tool-title">{headerTitle}</span>
        </button>
        {expanded && (
          <div className="csc-tool-body" data-csc-collapsible-body="true">
            <pre className="csc-tool-pre">{item.text}</pre>
          </div>
        )}
      </div>
    );
  }

  if (item.kind === "commandExecution") {
    return (
      <div
        className="csc-tool-card"
        data-csc-item="commandExecution"
        data-csc-collapsible="true"
      >
        <button
          type="button"
          className="csc-tool-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronIcon expanded={expanded} />
          <span className="csc-tool-title csc-tool-mono">
            {item.command || t("tool.command")}
          </span>
          {item.exitCode !== null && (
            <span className="csc-status-pill" data-status={item.status}>
              {t("tool.commandExit", { code: item.exitCode })}
            </span>
          )}
          <span className="csc-status-pill" data-status={item.status}>
            {statusLabel(item.status, t)}
          </span>
        </button>
        {expanded && (
          <div className="csc-tool-body" data-csc-collapsible-body="true">
            {item.cwd && (
              <div>
                <div className="csc-tool-label">{t("tool.cwd")}</div>
                <pre className="csc-tool-pre">{item.cwd}</pre>
              </div>
            )}
            <div>
              <div className="csc-tool-label">{t("tool.command")}</div>
              <pre className="csc-tool-pre">{item.command}</pre>
            </div>
            {item.output && (
              <div>
                <div className="csc-tool-label">{t("tool.output")}</div>
                <pre className="csc-tool-pre">{item.output}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (item.kind === "fileChange") {
    const firstPath = item.changes[0]?.path ?? "";
    const summaryLabel = firstPath
      ? `${t("tool.fileChange", { count: item.changes.length })} · ${firstPath}`
      : t("tool.fileChange", { count: item.changes.length });
    return (
      <div className="csc-tool-card" data-csc-item="fileChange" data-csc-collapsible="true">
        <button
          type="button"
          className="csc-tool-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronIcon expanded={expanded} />
          <span className="csc-tool-title csc-tool-mono">{summaryLabel}</span>
          <span className="csc-status-pill" data-status={item.status}>
            {statusLabel(item.status, t)}
          </span>
        </button>
        {expanded && (
          <div className="csc-tool-body" data-csc-collapsible-body="true">
            {item.changes.map((change, idx) => {
              const kindText =
                change.kind === "add"
                  ? t("tool.fileAdd")
                  : change.kind === "delete"
                    ? t("tool.fileDelete")
                    : t("tool.fileUpdate");
              return (
                <div key={`${change.path}-${idx}`}>
                  <div className="csc-tool-label">
                    [{kindText}] {change.path}
                  </div>
                  {change.unifiedDiff && renderDiffLines(change.unifiedDiff)}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (item.kind === "mcpToolCall") {
    const label = t("tool.mcp", { server: item.server || "mcp", tool: item.tool });
    return (
      <div className="csc-tool-card" data-csc-item="mcpToolCall" data-csc-collapsible="true">
        <button
          type="button"
          className="csc-tool-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronIcon expanded={expanded} />
          <span className="csc-tool-title csc-tool-mono">{label}</span>
          <span className="csc-status-pill" data-status={item.status}>
            {statusLabel(item.status, t)}
          </span>
        </button>
        {expanded && (
          <div className="csc-tool-body" data-csc-collapsible-body="true">
            <div>
              <div className="csc-tool-label">{t("tool.arguments")}</div>
              <pre className="csc-tool-pre">{formatJsonPreview(item.arguments)}</pre>
            </div>
            {(item.output || item.errorMessage) && (
              <div>
                <div className="csc-tool-label">{t("tool.output")}</div>
                <pre className="csc-tool-pre">{item.errorMessage ?? item.output}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (item.kind === "dynamicToolCall") {
    const label = t("tool.dynamic", { tool: item.tool });
    return (
      <div
        className="csc-tool-card"
        data-csc-item="dynamicToolCall"
        data-csc-collapsible="true"
      >
        <button
          type="button"
          className="csc-tool-toggle"
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <ChevronIcon expanded={expanded} />
          <span className="csc-tool-title csc-tool-mono">{label}</span>
          <span className="csc-status-pill" data-status={item.status}>
            {statusLabel(item.status, t)}
          </span>
        </button>
        {expanded && (
          <div className="csc-tool-body" data-csc-collapsible-body="true">
            <div>
              <div className="csc-tool-label">{t("tool.arguments")}</div>
              <pre className="csc-tool-pre">{formatJsonPreview(item.arguments)}</pre>
            </div>
            {item.output && (
              <div>
                <div className="csc-tool-label">{t("tool.output")}</div>
                <pre className="csc-tool-pre">{item.output}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // webSearch
  return (
    <div className="csc-tool-card" data-csc-item="webSearch" data-csc-collapsible="true">
      <button
        type="button"
        className="csc-tool-toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <ChevronIcon expanded={expanded} />
        <span className="csc-tool-title">
          {t("tool.webSearch")}
          {item.query ? ` · ${item.query}` : ""}
        </span>
        <span className="csc-status-pill" data-status={item.status}>
          {statusLabel(item.status, t)}
        </span>
      </button>
      {expanded && item.query && (
        <div className="csc-tool-body" data-csc-collapsible-body="true">
          <pre className="csc-tool-pre">{item.query}</pre>
        </div>
      )}
    </div>
  );
}
