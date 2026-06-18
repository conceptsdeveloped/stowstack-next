import type { CSSProperties } from "react";
import { DEMO, microLabel } from "./data";

/**
 * Stage 4 artifact: the loop closes. A facility grid with the filled
 * unit marked, and the ledger row that ties spend to the move-in.
 */

export function FacilityGrid({
  filledHighlight = true,
  style,
}: {
  filledHighlight?: boolean;
  style?: CSSProperties;
}) {
  const cols = 12;
  const rows = 5;
  // Deterministic vacancy pattern (no Math.random — stable SSR).
  const vacant = new Set([3, 9, 16, 22, 27, 35, 41, 48, 52, 57]);
  const target = 16; // the unit this ad filled
  return (
    <svg
      viewBox={`0 0 ${cols * 24} ${rows * 24}`}
      role="img"
      aria-label="Facility unit map with the newly filled unit highlighted"
      style={{ width: "100%", display: "block", ...style }}
    >
      {Array.from({ length: cols * rows }).map((_, i) => {
        const x = (i % cols) * 24;
        const y = Math.floor(i / cols) * 24;
        const isTarget = i === target;
        const isVacant = vacant.has(i) && !(isTarget && filledHighlight);
        return (
          <rect
            key={i}
            x={x + 2}
            y={y + 2}
            width={20}
            height={20}
            fill={
              isTarget && filledHighlight
                ? "var(--accent)"
                : isVacant
                  ? "transparent"
                  : "var(--ink-a16)"
            }
            stroke={isTarget && filledHighlight ? "var(--accent)" : "var(--line)"}
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
}

export default function LedgerFinale({ style }: { style?: CSSProperties }) {
  return (
    <div style={{ width: "100%", ...style }}>
      <FacilityGrid />
      <div
        className="flex items-stretch"
        style={{ border: "1px solid var(--line-hi)", marginTop: 12, background: "var(--bg)" }}
      >
        <div style={{ flex: 1, padding: "10px 12px" }}>
          <p style={{ ...microLabel, color: "var(--text-faint)" }}>Ad</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-accent)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Two Paws · {DEMO.campaign}
          </p>
        </div>
        <div
          aria-hidden="true"
          className="flex items-center"
          style={{
            padding: "0 10px",
            borderLeft: "1px solid var(--line-dim)",
            borderRight: "1px solid var(--line-dim)",
            color: "var(--accent)",
            fontFamily: "var(--mono)",
            fontSize: 14,
          }}
        >
          →
        </div>
        <div style={{ flex: 1, padding: "10px 12px" }}>
          <p style={{ ...microLabel, color: "var(--text-faint)" }}>Move-in</p>
          <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-accent)" }}>
            {DEMO.campaign} unit
          </p>
        </div>
        <div style={{ padding: "10px 12px", borderLeft: "1px solid var(--line-dim)", textAlign: "right" }}>
          <p style={{ ...microLabel, color: "var(--text-faint)" }}>Cost / MI</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
            {DEMO.costPerMoveIn}
          </p>
        </div>
      </div>
    </div>
  );
}
