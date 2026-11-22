/**
 * Strict JSON serialization helpers for CodexHost ExtensionBackendProcess IPC.
 *
 * `packages/extension-backend` rejects ANY `undefined`, function, symbol, or non-finite
 * number anywhere inside a handler's return value (including object properties whose value
 * is `undefined`). Always sanitize outputs through `toStrictJson` before returning.
 */

export type StrictJsonPrimitive = string | number | boolean | null;
export type StrictJsonValue = StrictJsonPrimitive | StrictJsonObject | StrictJsonArray;
export interface StrictJsonObject {
  [key: string]: StrictJsonValue;
}
export type StrictJsonArray = StrictJsonValue[];

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Recursively strips `undefined` object keys, converts non-finite numbers to `null`,
 * and drops functions/symbols so the output strictly satisfies Host backend IPC checks.
 */
export function toStrictJson(value: unknown): StrictJsonValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (Array.isArray(value)) {
    const out: StrictJsonArray = [];
    for (const item of value) {
      out.push(toStrictJson(item));
    }
    return out;
  }
  if (typeof value === "object") {
    const out: StrictJsonObject = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (
        entry === undefined ||
        typeof entry === "function" ||
        typeof entry === "symbol"
      ) {
        continue;
      }
      out[key] = toStrictJson(entry);
    }
    return out;
  }
  return null;
}

export function okReply<T extends Record<string, unknown>>(payload: T): StrictJsonObject {
  return toStrictJson({ ok: true, ...payload }) as StrictJsonObject;
}

export function errorReply(
  code: number | string,
  message: string,
  extra?: Record<string, unknown>,
): StrictJsonObject {
  return toStrictJson({
    ok: false,
    ...(extra ?? {}),
    error: {
      code,
      message: message.trim() || "Side Chat backend error",
    },
  }) as StrictJsonObject;
}
