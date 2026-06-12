import type { CSSProperties } from "react";
import { DEMO, microLabel } from "./data";

/**
 * Stage 1 artifact: a social ad card built in JSX/SVG (never a fake
 * screenshot). The same element persists into the landing-page frame —
 * that hand-off IS the "ad-matched page" pitch.
 */

export function DoorsIllustration({ height = 88 }: { height?: number }) {
  return (
    <svg
      viewBox="0 0 280 88"
      role="img"
      aria-label="Illustration of a row of storage unit doors"
      style={{ width: "100%", height, display: "block" }}
    >
      <rect x="0" y="0" width="280" height="88" fill="var(--bg-hi)" />
      <rect x="0" y="74" width="280" height="14" fill="var(--ink-a10)" />
      {[0, 1, 2, 3].map((i) => {
        const x = 12 + i * 66;
        const highlight = i === 1;
        return (
          <g key={i}>
            <rect
              x={x}
              y={14}
              width={56}
              height={60}
              fill={highlight ? "var(--accent-a24)" : "var(--ink-a06)"}
              stroke={highlight ? "var(--accent)" : "var(--line-hi)"}
              strokeWidth={highlight ? 1.5 : 1}
            />
            {[0, 1, 2, 3, 4].map((l) => (
              <line
                key={l}
                x1={x + 5}
                x2={x + 51}
                y1={24 + l * 10}
                y2={24 + l * 10}
                stroke={highlight ? "var(--accent)" : "var(--line-hi)"}
                strokeOpacity={highlight ? 0.55 : 0.7}
                strokeWidth={1}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export default function AdCard({ style }: { style?: CSSProperties }) {
  return (
    <div
      style={{
        width: "100%",
        background: "var(--bg)",
        border: "1px solid var(--line-hi)",
        ...style,
      }}
    >
      {/* Platform chrome */}
      <div
        className="flex items-center gap-2"
        style={{ padding: "8px 10px", borderBottom: "1px solid var(--line-dim)" }}
      >
        <span
          aria-hidden="true"
          className="flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            background: "var(--text)",
            color: "var(--bg)",
            fontFamily: "var(--mono)",
            fontSize: 9,
            fontWeight: 700,
          }}
        >
          {DEMO.facilityShort}
        </span>
        <div className="min-w-0">
          <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-accent)", lineHeight: 1.2 }}>
            {DEMO.facility}
          </p>
          <p style={{ ...microLabel, color: "var(--text-faint)" }}>Sponsored</p>
        </div>
        <span style={{ ...microLabel, color: "var(--text-faint)", marginLeft: "auto" }}>
          Meta
        </span>
      </div>

      {/* Creative */}
      <div style={{ position: "relative" }}>
        <DoorsIllustration />
        <span
          style={{
            ...microLabel,
            position: "absolute",
            left: 8,
            bottom: 8,
            background: "var(--text)",
            color: "var(--bg)",
            padding: "2px 6px",
          }}
        >
          {DEMO.campaign}
        </span>
      </div>

      {/* Copy + CTA */}
      <div
        className="flex items-center justify-between gap-2"
        style={{ padding: "9px 10px" }}
      >
        <div className="min-w-0">
          <p style={{ fontSize: 13, fontWeight: 800, color: "var(--text-accent)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
            {DEMO.creative}
          </p>
          <p style={{ fontSize: 10, color: "var(--text-dim)" }}>
            Climate-controlled units near you
          </p>
        </div>
        <span
          style={{
            ...microLabel,
            border: "1px solid var(--text)",
            color: "var(--text)",
            padding: "5px 8px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Reserve
        </span>
      </div>
    </div>
  );
}
