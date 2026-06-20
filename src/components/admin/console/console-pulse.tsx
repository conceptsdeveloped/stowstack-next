"use client";

import type { PulseMetric, DeltaDirection } from "@/lib/console";
import { deltaColor } from "./signal";
import { ConsoleSparkline } from "./console-sparkline";

const FONT = "var(--font), var(--font-manrope), system-ui, sans-serif";
const CARET: Record<DeltaDirection, string> = { up: "▴", down: "▾", flat: "·" };

const wrap: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  border: "1px solid var(--bdr)",
  borderRadius: 10,
  background: "var(--card)",
  overflow: "hidden",
};
const cell: React.CSSProperties = { flex: "1 1 150px", minWidth: 130, padding: "11px 14px" };
const labelStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--ink3)",
  marginBottom: 5,
};
const valueStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: 19,
  fontWeight: 600,
  color: "var(--ink)",
  lineHeight: 1.1,
  fontVariantNumeric: "tabular-nums",
};

/** The Pulse row: portfolio or facility vitals as a divided editorial strip. */
export function ConsolePulse({ metrics, loading }: { metrics: PulseMetric[]; loading: boolean }) {
  if (loading) {
    return (
      <div style={wrap}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} style={{ ...cell, borderLeft: i === 0 ? "none" : "1px solid var(--bdr)" }}>
            <div className="animate-pulse" style={{ height: 9, width: "55%", background: "rgba(0,0,0,0.07)", borderRadius: 3, marginBottom: 9 }} />
            <div className="animate-pulse" style={{ height: 18, width: "42%", background: "rgba(0,0,0,0.07)", borderRadius: 3 }} />
          </div>
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div style={{ ...wrap, padding: "18px 16px" }}>
        <span style={{ fontFamily: FONT, fontSize: 13, color: "var(--ink3)" }}>
          No data for this scope yet.
        </span>
      </div>
    );
  }

  return (
    <div style={wrap}>
      {metrics.map((m, i) => (
        <div key={m.key} style={{ ...cell, borderLeft: i === 0 ? "none" : "1px solid var(--bdr)" }}>
          <div style={labelStyle}>{m.label}</div>
          <div style={valueStyle}>{m.value}</div>
          {m.delta ? (
            <div
              style={{
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 500,
                color: deltaColor(m.delta.tone),
                marginTop: 3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span aria-hidden="true">{CARET[m.delta.direction]} </span>
              {m.delta.value}
            </div>
          ) : m.hint ? (
            <div
              style={{
                fontFamily: FONT,
                fontSize: 11,
                fontWeight: 500,
                color: "var(--ink3)",
                marginTop: 3,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {m.hint}
            </div>
          ) : null}
          {m.spark && m.spark.length > 1 ? (
            <div style={{ marginTop: 6 }}>
              <ConsoleSparkline values={m.spark} />
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
