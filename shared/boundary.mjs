/**
 * First-turn read-only context boundary helpers (zero external dependencies).
 * Mirrors `src/client/boundary.ts` for Desktop & Web ESM surfaces.
 */

export const SIDE_CHAT_BOUNDARY_START = "<!-- codexhost-side-chat:boundary:v1 -->";
export const SIDE_CHAT_BOUNDARY_END = "<!-- /codexhost-side-chat:boundary:v1 -->";

export const SIDE_CHAT_BOUNDARY_BLOCK = [
  SIDE_CHAT_BOUNDARY_START,
  "[Side Chat Read-Only Context Boundary]",
  "Everything prior to this message is inherited history from the main conversation for read-only reference only.",
  "You are answering a side question in an isolated Side Chat branch. Unless the user explicitly asks you to make changes here, DO NOT modify workspace files, execute mutating commands, or start background tasks. Focus strictly on answering the user's side question below.",
  SIDE_CHAT_BOUNDARY_END,
].join("\n");

const NORMALIZED_BOUNDARY_BLOCK = SIDE_CHAT_BOUNDARY_BLOCK.replace(/\s+/gu, " ").trim();

const BOUNDARY_DETECT_PATTERN =
  /^\s*<!-- codexhost-side-chat:boundary:v1 -->[\s\S]*?<!-- \/codexhost-side-chat:boundary:v1 -->/u;

const BOUNDARY_STRIP_PATTERN =
  /^\s*<!-- codexhost-side-chat:boundary:v1 -->[\s\S]*?<!-- \/codexhost-side-chat:boundary:v1 -->(?:[ \t]*(?:\r?\n){1,2}|[ \t]+)?/u;

export function hasSideChatBoundary(rawText) {
  return typeof rawText === "string" && BOUNDARY_DETECT_PATTERN.test(rawText);
}

export function injectSideChatBoundary(userText) {
  const text = String(userText ?? "");
  if (hasSideChatBoundary(text)) return text;
  return `${SIDE_CHAT_BOUNDARY_BLOCK}\n\n${text}`;
}

export function stripSideChatBoundary(rawText) {
  if (typeof rawText !== "string" || !rawText) return "";

  if (BOUNDARY_DETECT_PATTERN.test(rawText)) {
    return rawText.replace(BOUNDARY_STRIP_PATTERN, "");
  }

  const trimmedStart = rawText.trimStart();
  if (trimmedStart.startsWith(SIDE_CHAT_BOUNDARY_START)) {
    const candidate = trimmedStart
      .replace(/(?:…|\.{3})\s*$/u, "")
      .replace(/\s+/gu, " ")
      .trim();
    if (NORMALIZED_BOUNDARY_BLOCK.startsWith(candidate)) {
      return "";
    }
  }

  return rawText;
}

export function deriveSideChatTitle(rawText, maxLength = 60) {
  const clean = stripSideChatBoundary(rawText).replace(/\s+/gu, " ").trim();
  if (!clean) return "";
  const chars = Array.from(clean);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}…` : clean;
}
