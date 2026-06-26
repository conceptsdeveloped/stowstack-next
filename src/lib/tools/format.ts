/**
 * Pure formatting + numeric helpers shared by the operator tools at /tools.
 *
 * No React here — these are imported by both the client field components
 * (src/components/tools/fields.tsx, which re-exports them) and the pure
 * calculation modules (src/lib/tools/*.ts), and exercised directly by the
 * unit tests in src/lib/__tests__.
 */

export const usd0 = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

export const usd2 = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(1)}%`;

export const num0 = (n: number) =>
  Math.round(Number.isFinite(n) ? n : 0).toLocaleString("en-US");

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Clamp a percentage to [0, 100]; non-finite → 0. */
export function clampPct(n: number) {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Coerce arbitrary input to a finite, non-negative number (0 otherwise). */
export function nonNeg(n: number) {
  return Number.isFinite(n) && n > 0 ? n : 0;
}
