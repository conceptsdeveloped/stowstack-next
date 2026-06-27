/**
 * Shareable-URL helpers for the operator tools — pure, no DOM/React.
 *
 * Every calculator can serialize its current inputs into query params so an
 * operator (or a salesperson prepping a call) can copy a link that reopens the
 * tool with the same numbers. Encoding lives here so it's unit-testable and the
 * clients only handle the clipboard + the browser location.
 */

export type ParamValue = string | number;

/**
 * Build a shareable URL from a params map. Numbers are included as-is (zeros
 * too — a deliberately-entered 0 must survive a round-trip); empty strings and
 * non-finite numbers are dropped so the link stays clean.
 */
export function buildShareUrl(
  origin: string,
  pathname: string,
  params: Record<string, ParamValue | undefined>,
): string {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    if (typeof value === "number") {
      if (!Number.isFinite(value)) continue;
      q.set(key, String(value));
    } else {
      if (value === "") continue;
      q.set(key, value);
    }
  }
  const qs = q.toString();
  return qs ? `${origin}${pathname}?${qs}` : `${origin}${pathname}`;
}

/** Read a finite numeric query param, falling back when absent or invalid. */
export function numParam(
  params: URLSearchParams,
  key: string,
  fallback = 0,
): number {
  const raw = params.get(key);
  if (raw == null || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Read a string query param, falling back when absent. */
export function strParam(
  params: URLSearchParams,
  key: string,
  fallback = "",
): string {
  const raw = params.get(key);
  return raw == null ? fallback : raw;
}

/** True if any of the given keys are present in the params. */
export function hasAnyParam(params: URLSearchParams, keys: string[]): boolean {
  return keys.some((k) => params.has(k));
}
