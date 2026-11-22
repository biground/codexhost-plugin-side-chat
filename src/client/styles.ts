/**
 * Self-contained light/dark theme stylesheet injected via `<style id="...">`.
 * Uses `.csc-*` namespace classes and CodexHost `--dsw-alias-*` CSS tokens so
 * the standalone single-file `lib/client.js` bundle requires no CSS Modules loader.
 */

export const SIDE_CHAT_STYLE_ID = "codexhost-plugin-side-chat-styles";

export const SIDE_CHAT_CSS = `
.csc-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  color: var(--dsw-alias-label-primary, #111827);
  background: var(--dsw-alias-bg-layer-1, transparent);
  font-size: 13px;
  line-height: 1.5;
}

.csc-panel *, .csc-panel *::before, .csc-panel *::after {
  box-sizing: border-box;
}

/* Header toolbar */
.csc-header {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.2));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.04));
  flex: none;
}

.csc-header-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.csc-select {
  flex: 1;
  min-width: 0;
  height: 30px;
  padding: 0 8px;
  border-radius: var(--dsw-radius-md, 7px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.csc-select:focus-visible {
  border-color: #3b82f6;
}

.csc-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 30px;
  padding: 0 10px;
  border-radius: var(--dsw-radius-md, 7px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex: none;
  transition: background 0.12s ease, border-color 0.12s ease, opacity 0.12s ease;
}

.csc-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.12));
}

.csc-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.csc-btn-icon {
  padding: 0 7px;
}

.csc-btn-primary {
  background: #2563eb;
  border-color: #2563eb;
  color: #ffffff;
}

.csc-btn-primary:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
}

.csc-btn-danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #ffffff;
}

.csc-btn-danger:hover:not(:disabled) {
  background: #b91c1c;
  border-color: #b91c1c;
}

.csc-btn-ghost {
  border-color: transparent;
  background: transparent;
}

/* Permanent mode badge bar (persistent = emerald, ephemeral = amber; NO toggle) */
.csc-mode-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  border-radius: var(--dsw-radius-md, 8px);
  font-size: 11px;
  line-height: 1.4;
  min-width: 0;
}

.csc-mode-bar[data-csc-mode="persistent"] {
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.32);
  color: #047857;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="persistent"] {
  background: rgba(16, 185, 129, 0.14);
  border-color: rgba(52, 211, 153, 0.34);
  color: #6ee7b7;
}

.csc-mode-bar[data-csc-mode="ephemeral"] {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.36);
  color: #b45309;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="ephemeral"] {
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(251, 191, 36, 0.38);
  color: #fcd34d;
}

.csc-mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.01em;
  flex: none;
}

.csc-mode-bar[data-csc-mode="persistent"] .csc-mode-badge {
  background: rgba(16, 185, 129, 0.2);
  color: #065f46;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="persistent"] .csc-mode-badge {
  background: rgba(16, 185, 129, 0.26);
  color: #a7f3d0;
}

.csc-mode-bar[data-csc-mode="ephemeral"] .csc-mode-badge {
  background: rgba(245, 158, 11, 0.24);
  color: #92400e;
}

body[data-ds-dark-theme] .csc-mode-bar[data-csc-mode="ephemeral"] .csc-mode-badge {
  background: rgba(245, 158, 11, 0.28);
  color: #fde68a;
}

.csc-mode-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: none;
}

.csc-mode-subtitle {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  opacity: 0.92;
}

/* Alerts */
.csc-alert {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin: 8px 12px 0;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-md, 8px);
  font-size: 12px;
  line-height: 1.45;
  flex: none;
}

.csc-alert-error {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.28);
}

body[data-ds-dark-theme] .csc-alert-error {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(248, 113, 113, 0.34);
}

.csc-alert-warn {
  color: #92400e;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.32);
}

body[data-ds-dark-theme] .csc-alert-warn {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.16);
  border-color: rgba(251, 191, 36, 0.36);
}

.csc-alert-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: none;
}

/* Messages scroll viewport */
.csc-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.csc-empty {
  margin: auto;
  max-width: 320px;
  padding: 20px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  border-radius: var(--dsw-radius-lg, 12px);
  border: 1px dashed var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.04));
}

.csc-empty-icon {
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-empty-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-empty-body {
  margin: 0;
  font-size: 12px;
  line-height: 1.55;
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-load-older {
  align-self: center;
}

/* Turn items */
.csc-turn {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.csc-msg {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.csc-msg-user {
  align-self: flex-end;
  max-width: 90%;
  padding: 8px 12px;
  border-radius: 12px 12px 4px 12px;
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(37, 99, 235, 0.22);
  color: var(--dsw-alias-label-primary, inherit);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

body[data-ds-dark-theme] .csc-msg-user {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.3);
}

.csc-msg-assistant {
  align-self: stretch;
  padding: 2px 2px;
  color: var(--dsw-alias-label-primary, inherit);
  overflow-wrap: anywhere;
}

/* Safe Markdown styles */
.csc-md {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.csc-md p {
  margin: 0;
  white-space: pre-wrap;
}

.csc-md h1, .csc-md h2, .csc-md h3 {
  margin: 4px 0 0;
  font-weight: 600;
  line-height: 1.35;
}

.csc-md h1 { font-size: 15px; }
.csc-md h2 { font-size: 14px; }
.csc-md h3 { font-size: 13px; }

.csc-md ul, .csc-md ol {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.csc-md blockquote {
  margin: 0;
  padding: 4px 10px;
  border-left: 3px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.38));
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-md-inline-code {
  padding: 1px 5px;
  border-radius: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  background: rgba(128, 128, 128, 0.14);
}

.csc-md-link {
  color: #2563eb;
  text-decoration: underline;
  word-break: break-all;
}

body[data-ds-dark-theme] .csc-md-link {
  color: #60a5fa;
}

.csc-code-block {
  border-radius: var(--dsw-radius-md, 8px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.24));
  background: var(--dsw-alias-bg-layer-2, rgba(15, 23, 42, 0.05));
  overflow: hidden;
}

body[data-ds-dark-theme] .csc-code-block {
  background: rgba(0, 0, 0, 0.28);
}

.csc-code-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.18));
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-code-pre {
  margin: 0;
  padding: 8px 10px;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
  white-space: pre;
}

/* Collapsible reasoning & tool cards */
.csc-tool-card {
  border-radius: var(--dsw-radius-md, 8px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.22));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.05));
  overflow: hidden;
}

.csc-tool-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 6px 10px;
  border: none;
  background: transparent;
  color: var(--dsw-alias-label-secondary, #4b5563);
  font-size: 12px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}

.csc-tool-toggle:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08));
}

.csc-tool-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-tool-mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
}

.csc-status-pill {
  font-size: 10.5px;
  padding: 1px 6px;
  border-radius: 999px;
  flex: none;
  font-weight: 500;
}

.csc-status-pill[data-status="running"] {
  background: rgba(59, 130, 246, 0.16);
  color: #2563eb;
}

.csc-status-pill[data-status="succeeded"] {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.csc-status-pill[data-status="failed"] {
  background: rgba(239, 68, 68, 0.16);
  color: #dc2626;
}

.csc-status-pill[data-status="cancelled"] {
  background: rgba(107, 114, 128, 0.18);
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-tool-body {
  padding: 8px 10px;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.16));
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}

.csc-tool-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-tool-pre {
  margin: 0;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  line-height: 1.45;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.csc-diff-line-add {
  color: #16a34a;
}

.csc-diff-line-del {
  color: #dc2626;
}

body[data-ds-dark-theme] .csc-diff-line-add {
  color: #4ade80;
}

body[data-ds-dark-theme] .csc-diff-line-del {
  color: #f87171;
}

.csc-compaction {
  text-align: center;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  padding: 2px 0;
}

.csc-turn-status {
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(128, 128, 128, 0.08);
}

.csc-streaming {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #6b7280);
  padding: 2px 4px;
}

.csc-pulse-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3b82f6;
  animation: csc-pulse 1.2s ease-in-out infinite;
}

@keyframes csc-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.85); }
  50% { opacity: 1; transform: scale(1.1); }
}

/* Inline interaction cards (approval & question) */
.csc-interactions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px 0;
  flex: none;
  max-height: 46%;
  overflow-y: auto;
}

.csc-interaction-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--dsw-radius-lg, 10px);
  border: 1px solid rgba(59, 130, 246, 0.36);
  background: rgba(59, 130, 246, 0.06);
}

body[data-ds-dark-theme] .csc-interaction-card {
  background: rgba(59, 130, 246, 0.12);
  border-color: rgba(96, 165, 250, 0.38);
}

.csc-interaction-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-interaction-desc {
  margin: 0;
  font-size: 12px;
  color: var(--dsw-alias-label-secondary, #4b5563);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.csc-interaction-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.csc-question-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.csc-question-prompt {
  font-size: 12px;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, inherit);
}

.csc-question-optional {
  margin-left: 6px;
  font-size: 11px;
  font-weight: 400;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-option-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.csc-option {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  padding: 6px 8px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.24));
  background: var(--dsw-alias-bg-layer-1, transparent);
  cursor: pointer;
  font-size: 12px;
}

.csc-option:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08));
}

.csc-option input {
  margin-top: 2px;
  flex: none;
}

.csc-option-desc {
  display: block;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
}

.csc-input {
  width: 100%;
  padding: 6px 9px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 12px;
  font-family: inherit;
  outline: none;
}

.csc-input:focus-visible {
  border-color: #3b82f6;
}

/* Composer */
.csc-composer {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-top: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.2));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.03));
  flex: none;
}

.csc-textarea {
  width: 100%;
  min-height: 60px;
  max-height: 180px;
  resize: vertical;
  padding: 8px 10px;
  border-radius: var(--dsw-radius-md, 8px);
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.28));
  background: var(--dsw-alias-bg-layer-1, transparent);
  color: var(--dsw-alias-label-primary, inherit);
  font-size: 13px;
  line-height: 1.45;
  font-family: inherit;
  outline: none;
}

.csc-textarea:focus-visible {
  border-color: #3b82f6;
}

.csc-composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.csc-composer-hint {
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Guide entry card (mirrors host GuideBody capsule) */
.csc-guide-entry {
  display: flex;
  align-items: center;
  gap: 14px;
  box-sizing: border-box;
  width: 100%;
  min-height: 56px;
  padding: 14px 20px;
  color: var(--dsw-alias-label-primary, inherit);
  font: inherit;
  text-align: left;
  background: var(--dsw-alias-bg-layer-1, transparent);
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.26));
  border-radius: var(--dsl-guide-entry-radius, var(--dsw-radius-xl, 12px));
  cursor: pointer;
}

.csc-guide-entry:hover {
  background: var(--dsw-alias-interactive-bg-hover, rgba(128, 128, 128, 0.08));
}

.csc-guide-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  color: var(--dsw-alias-label-secondary, #6b7280);
}

.csc-guide-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.csc-guide-title {
  overflow: hidden;
  font-size: 14px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.csc-guide-desc {
  overflow: hidden;
  color: var(--dsw-alias-label-tertiary, #6b7280);
  font-size: 11px;
  line-height: 1.4;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.csc-guide-keys {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex: none;
}

.csc-kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 4px;
  border: 1px solid var(--dsw-alias-border-l2, rgba(128, 128, 128, 0.3));
  background: var(--dsw-alias-bg-layer-2, rgba(128, 128, 128, 0.08));
  color: var(--dsw-alias-label-secondary, #6b7280);
  font-size: 10px;
  font-family: inherit;
  line-height: 1;
}

/* Tab chip title */
.csc-tab-title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.csc-tab-title-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.csc-tab-title-input {
  width: 120px;
  min-width: 48px;
  max-width: 100%;
  padding: 0 4px;
  color: inherit;
  font: inherit;
  background: var(--dsw-alias-bg-l1, transparent);
  border: 0.5px solid var(--dsw-alias-border-l3, rgba(128, 128, 128, 0.35));
  border-radius: var(--dsw-radius-sm, 4px);
  outline: none;
}

.csc-tab-mode-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: none;
}

.csc-tab-mode-dot[data-csc-mode="persistent"] {
  background: #10b981;
}

.csc-tab-mode-dot[data-csc-mode="ephemeral"] {
  background: #f59e0b;
}
`;

export function ensureSideChatStyles(pluginName = "codexhost-plugin-side-chat"): () => void {
  if (typeof document === "undefined" || !document.head) {
    return () => {};
  }
  const existing = document.getElementById(SIDE_CHAT_STYLE_ID);
  if (existing) {
    return () => {};
  }
  const tag = document.createElement("style");
  tag.id = SIDE_CHAT_STYLE_ID;
  tag.dataset.plugin = pluginName;
  tag.textContent = SIDE_CHAT_CSS;
  document.head.appendChild(tag);
  return () => {
    tag.remove();
  };
}
