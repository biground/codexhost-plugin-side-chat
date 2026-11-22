/**
 * Pure React Markdown renderer for Side Chat assistant messages.
 *
 * Renders headings, paragraphs, fenced code blocks with one-click copy, inline code,
 * bold/italic emphasis, safe http(s)/mailto links, blockquotes, and lists strictly
 * as React nodes (never `dangerouslySetInnerHTML`) to eliminate XSS risk.
 */
import { useState, type ReactNode } from "react";
import type { SideChatTranslate } from "./locales.ts";

type Block =
  | { readonly kind: "code"; readonly language: string; readonly code: string }
  | { readonly kind: "heading"; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly kind: "ul"; readonly items: readonly string[] }
  | { readonly kind: "ol"; readonly items: readonly string[] }
  | { readonly kind: "blockquote"; readonly text: string }
  | { readonly kind: "paragraph"; readonly text: string };

const SAFE_URL_PATTERN = /^(?:https?:\/\/|mailto:)/iu;

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/gu, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? "";

    // Blank separator line
    if (line.trim() === "") {
      i += 1;
      continue;
    }

    // Fenced code block
    const fenceMatch = /^\s*```([^\s`]*)\s*$/u.exec(line);
    if (fenceMatch) {
      const language = fenceMatch[1] ?? "";
      const codeLines: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```\s*$/u.test(lines[i] ?? "")) {
        codeLines.push(lines[i] ?? "");
        i += 1;
      }
      if (i < lines.length) i += 1; // skip closing fence
      blocks.push({ kind: "code", language, code: codeLines.join("\n") });
      continue;
    }

    // Heading (#, ##, ###)
    const headingMatch = /^(#{1,3})\s+(.*)$/u.exec(line);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1]!.length) as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, text: headingMatch[2]!.trim() });
      i += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/u.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^\s*>\s?/u.test(lines[i] ?? "")) {
        quoteLines.push((lines[i] ?? "").replace(/^\s*>\s?/u, ""));
        i += 1;
      }
      blocks.push({ kind: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/u.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/u.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*+]\s+/u, ""));
        i += 1;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/u.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/u.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/u, ""));
        i += 1;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph (coalesce contiguous plain lines)
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      (lines[i] ?? "").trim() !== "" &&
      !/^\s*```/u.test(lines[i] ?? "") &&
      !/^#{1,3}\s+/u.test(lines[i] ?? "") &&
      !/^\s*>\s?/u.test(lines[i] ?? "") &&
      !/^\s*[-*+]\s+/u.test(lines[i] ?? "") &&
      !/^\s*\d+\.\s+/u.test(lines[i] ?? "")
    ) {
      paraLines.push(lines[i] ?? "");
      i += 1;
    }
    blocks.push({ kind: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

const INLINE_TOKEN_PATTERN =
  /(`[^`\n]+`|\*\*[^*\n]+\*\*|\*[^*\n]+\*|\[([^\]\n]+)\]\(([^)\s]+)\))/gu;

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let tokenIndex = 0;

  INLINE_TOKEN_PATTERN.lastIndex = 0;
  let match = INLINE_TOKEN_PATTERN.exec(text);
  while (match !== null) {
    if (match.index > cursor) {
      nodes.push(text.slice(cursor, match.index));
    }
    const token = match[0];
    const key = `${keyPrefix}-${tokenIndex}`;
    tokenIndex += 1;

    if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={key} className="csc-md-inline-code">
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else if (match[2] !== undefined && match[3] !== undefined) {
      const label = match[2];
      const href = match[3];
      if (SAFE_URL_PATTERN.test(href)) {
        nodes.push(
          <a
            key={key}
            className="csc-md-link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {label}
          </a>,
        );
      } else {
        // Unsafe protocol (e.g. javascript:, data:) renders safely as plain text.
        nodes.push(label);
      }
    } else {
      nodes.push(token);
    }

    cursor = match.index + token.length;
    match = INLINE_TOKEN_PATTERN.exec(text);
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }
  return nodes;
}

async function copyCodeToClipboard(code: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch {
      // Fallback below
    }
  }
  if (typeof document === "undefined" || !document.body) return false;
  const textarea = document.createElement("textarea");
  textarea.value = code;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  try {
    textarea.select();
    return typeof document.execCommand === "function" ? document.execCommand("copy") : false;
  } finally {
    textarea.remove();
  }
}

function CodeBlockView({
  language,
  code,
  t,
}: {
  readonly language: string;
  readonly code: string;
  readonly t: SideChatTranslate;
}): ReactNode {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void copyCodeToClipboard(code).then((ok) => {
      if (!ok) return;
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="csc-code-block" data-csc-code-block>
      <div className="csc-code-head">
        <span>{language || "code"}</span>
        <button
          type="button"
          className="csc-btn csc-btn-ghost"
          style={{ height: 22, padding: "0 6px", fontSize: 11 }}
          onClick={handleCopy}
          data-csc-action="copy-code"
        >
          {copied ? t("code.copied") : t("code.copy")}
        </button>
      </div>
      <pre className="csc-code-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export interface MarkdownContentProps {
  readonly text: string;
  readonly t: SideChatTranslate;
}

export function MarkdownContent({ text, t }: MarkdownContentProps): ReactNode {
  const blocks = parseBlocks(text);
  if (blocks.length === 0) return null;

  return (
    <div className="csc-md">
      {blocks.map((block, index) => {
        const key = `blk-${index}`;
        switch (block.kind) {
          case "code":
            return (
              <CodeBlockView key={key} language={block.language} code={block.code} t={t} />
            );
          case "heading":
            if (block.level === 1) return <h1 key={key}>{renderInline(block.text, key)}</h1>;
            if (block.level === 2) return <h2 key={key}>{renderInline(block.text, key)}</h2>;
            return <h3 key={key}>{renderInline(block.text, key)}</h3>;
          case "blockquote":
            return <blockquote key={key}>{renderInline(block.text, key)}</blockquote>;
          case "ul":
            return (
              <ul key={key}>
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-li-${itemIdx}`}>{renderInline(item, `${key}-${itemIdx}`)}</li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={key}>
                {block.items.map((item, itemIdx) => (
                  <li key={`${key}-li-${itemIdx}`}>{renderInline(item, `${key}-${itemIdx}`)}</li>
                ))}
              </ol>
            );
          case "paragraph":
            return <p key={key}>{renderInline(block.text, key)}</p>;
        }
      })}
    </div>
  );
}
