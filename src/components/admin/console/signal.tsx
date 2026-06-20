"use client";

import type { Severity, DeltaTone } from "@/lib/console";

/**
 * Semantic signal palette for the Console. Brand-allowed trio only
 * (green / blue / red — no amber, which would collide with the brand-locked
 * sienna gold). Values are the documented brand tokens; they are inlined as
 * constants because `--t-*` admin tokens are too vivid for the editorial
 * surface and `--color-*` are scope-polluted inside `.admin-theme`.
 */
export const SIGNAL = {
  red: "#B04A3A",
  blue: "#6a9bcc",
  green: "#788c5d",
} as const;

export function severityColor(severity: Severity): string {
  return severity === "info" ? SIGNAL.blue : SIGNAL.red;
}

export function deltaColor(tone: DeltaTone): string {
  if (tone === "positive") return SIGNAL.green;
  if (tone === "negative") return SIGNAL.red;
  return "var(--ink3)";
}

/**
 * Severity is encoded by colour AND shape so it survives colour-blindness and
 * stays within the red/blue trio: critical = filled red, warning = hollow red
 * ring, info = filled blue.
 */
export function SeverityDot({ severity }: { severity: Severity }) {
  const filled = severity !== "warning";
  const color = severityColor(severity);
  return (
    <span
      aria-hidden="true"
      style={{
        width: 7,
        height: 7,
        borderRadius: "50%",
        flexShrink: 0,
        boxSizing: "border-box",
        background: filled ? color : "transparent",
        border: filled ? "none" : `1.5px solid ${color}`,
      }}
    />
  );
}
