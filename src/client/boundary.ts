/**
 * First-turn read-only context boundary injection & precise display stripping
 * for Side Chat user messages and previews.
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

/**
 * Returns true if `rawText` begins with a complete Side Chat v1 boundary block.
 */
export function hasSideChatBoundary(rawText: string): boolean {
  return BOUNDARY_DETECT_PATTERN.test(rawText);
}

/**
 * Prepends the Side Chat read-only context boundary to the first user message.
 * Idempotent: returns `userText` unchanged if the boundary block is already present.
 */
export function injectSideChatBoundary(userText: string): string {
  if (hasSideChatBoundary(userText)) return userText;
  return `${SIDE_CHAT_BOUNDARY_BLOCK}\n\n${userText}`;
}

/**
 * Removes the Side Chat boundary prefix from raw message text or server previews,
 * leaving only the user's original prompt text intact.
 */
export function stripSideChatBoundary(rawText: string): string {
  if (!rawText) return "";

  if (BOUNDARY_DETECT_PATTERN.test(rawText)) {
    return rawText.replace(BOUNDARY_STRIP_PATTERN, "");
  }

  // Handle server-truncated previews that begin with the start marker and got cut
  // before reaching the closing marker. Only strip if the remainder strictly matches
  // a prefix of the canonical boundary block so arbitrary user text is never dropped.
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

/**
 * Alias of `stripSideChatBoundary` for convenience and ticket contract compatibility.
 */
export const stripSideChatBoundaryPrefix = stripSideChatBoundary;

/**
 * Derives a compact, boundary-free single-line Side Chat title from user text or preview.
 */
export function deriveSideChatTitle(rawText: string, maxLength = 60): string {
  const clean = stripSideChatBoundary(rawText).replace(/\s+/gu, " ").trim();
  if (!clean) return "";
  const chars = Array.from(clean);
  return chars.length > maxLength ? `${chars.slice(0, maxLength).join("")}…` : clean;
}
