/**
 * XSS-safe DOM Markdown renderer for Side Chat assistant replies.
 * Builds every element via `doc.createElement` + `textContent` (never uses `innerHTML`).
 */

function appendInlineNodes(doc, parent, text) {
  const pattern =
    /(`[^`\n]+`|\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\))/gu;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parent.append(doc.createTextNode(text.slice(lastIndex, match.index)));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      const code = doc.createElement("code");
      code.className = "sc-inline-code";
      code.textContent = token.slice(1, -1);
      parent.append(code);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const strong = doc.createElement("strong");
      strong.textContent = token.slice(2, -2);
      parent.append(strong);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const em = doc.createElement("em");
      em.textContent = token.slice(1, -1);
      parent.append(em);
    } else if (match[2] && match[3]) {
      const link = doc.createElement("a");
      link.className = "sc-md-link";
      link.href = match[3];
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = match[2];
      parent.append(link);
    } else {
      parent.append(doc.createTextNode(token));
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parent.append(doc.createTextNode(text.slice(lastIndex)));
  }
}

function renderCodeBlock(doc, language, codeText, t) {
  const wrapper = doc.createElement("div");
  wrapper.className = "sc-code-block";

  const bar = doc.createElement("div");
  bar.className = "sc-code-header";

  const langEl = doc.createElement("span");
  langEl.className = "sc-code-lang";
  langEl.textContent = language || "text";
  bar.append(langEl);

  const copyBtn = doc.createElement("button");
  copyBtn.type = "button";
  copyBtn.className = "sc-code-copy";
  copyBtn.textContent = t ? t("code.copy") : "Copy";
  copyBtn.addEventListener("click", () => {
    const clip = doc.defaultView?.navigator?.clipboard;
    if (clip && typeof clip.writeText === "function") {
      void clip.writeText(codeText).catch(() => undefined);
    }
    copyBtn.textContent = t ? t("code.copied") : "Copied";
    setTimeout(() => {
      copyBtn.textContent = t ? t("code.copy") : "Copy";
    }, 1500);
  });
  bar.append(copyBtn);

  const pre = doc.createElement("pre");
  pre.className = "sc-code-pre";
  const code = doc.createElement("code");
  code.textContent = codeText;
  pre.append(code);

  wrapper.append(bar, pre);
  return wrapper;
}

export function renderMarkdown(doc, rawText, t) {
  const frag = doc.createDocumentFragment();
  const text = String(rawText ?? "").replace(/\r\n/gu, "\n");
  if (!text.trim()) return frag;

  const lines = text.split("\n");
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    // Fenced code block
    const fenceMatch = /^```([^\s`]*)\s*$/u.exec(line.trim());
    if (fenceMatch) {
      const lang = fenceMatch[1] ?? "";
      const bodyLines = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/u.test(lines[index].trim())) {
        bodyLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      frag.append(renderCodeBlock(doc, lang, bodyLines.join("\n"), t));
      continue;
    }

    // Heading (# .. ###)
    const headingMatch = /^(#{1,3})\s+(.+)$/u.exec(line);
    if (headingMatch) {
      const level = Math.min(3, headingMatch[1].length);
      const heading = doc.createElement(`h${level + 2}`);
      heading.className = `sc-md-h sc-md-h${level}`;
      appendInlineNodes(doc, heading, headingMatch[2].trim());
      frag.append(heading);
      index += 1;
      continue;
    }

    // Blockquote
    if (/^\s*>\s?/u.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^\s*>\s?/u.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^\s*>\s?/u, ""));
        index += 1;
      }
      const bq = doc.createElement("blockquote");
      bq.className = "sc-md-quote";
      appendInlineNodes(doc, bq, quoteLines.join("\n"));
      frag.append(bq);
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/u.test(line)) {
      const ul = doc.createElement("ul");
      ul.className = "sc-md-list";
      while (index < lines.length && /^\s*[-*+]\s+/u.test(lines[index])) {
        const li = doc.createElement("li");
        appendInlineNodes(doc, li, lines[index].replace(/^\s*[-*+]\s+/u, ""));
        ul.append(li);
        index += 1;
      }
      frag.append(ul);
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/u.test(line)) {
      const ol = doc.createElement("ol");
      ol.className = "sc-md-list";
      while (index < lines.length && /^\s*\d+\.\s+/u.test(lines[index])) {
        const li = doc.createElement("li");
        appendInlineNodes(doc, li, lines[index].replace(/^\s*\d+\.\s+/u, ""));
        ol.append(li);
        index += 1;
      }
      frag.append(ol);
      continue;
    }

    // Paragraph (join contiguous plain lines)
    const paraLines = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^```/u.test(lines[index].trim()) &&
      !/^#{1,3}\s+/u.test(lines[index]) &&
      !/^\s*>\s?/u.test(lines[index]) &&
      !/^\s*[-*+]\s+/u.test(lines[index]) &&
      !/^\s*\d+\.\s+/u.test(lines[index])
    ) {
      paraLines.push(lines[index]);
      index += 1;
    }
    const p = doc.createElement("p");
    p.className = "sc-md-p";
    for (let i = 0; i < paraLines.length; i += 1) {
      if (i > 0) p.append(doc.createElement("br"));
      appendInlineNodes(doc, p, paraLines[i]);
    }
    frag.append(p);
  }

  return frag;
}
