"use client";

/**
 * LIVE MONITOR TRIPTYCH — three stacked/adjacent mini panels that make
 * the page feel like an operating environment, not a brochure.
 * Ported from design_handoff_storageads_theme/reference/src/mono-sections.jsx
 *
 *   1. <LiveChannelMini>    drifting channel spend table with bar meters
 *   2. <LiveMovesMini>      streaming move-in events tape
 *   3. <LiveAttrMini>       attribution % sparkline (SVG)
 *
 * Data flavor: synthetic on all three (plausible drift) because we don't
 * have a public real-time source wired yet. Same hook contract will
 * accept server-backed swaps later.
 */

import { useEffect, useState } from "react";
import { Panel, Label, Val, Tag, BarMeter, MONO } from "@/components/mono";
import {
  useLiveChannelsSynthetic,
  useMovesTapeSynthetic,
} from "@/hooks/use-live-data";

/* ─── Channel spend mini ─── */

export function LiveChannelMini() {
  const rows = useLiveChannelsSynthetic();
  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
  const hues = [MONO.accent, MONO.hueA, MONO.hueB, MONO.hueC, MONO.hueD, MONO.accent];
  return (
    <Panel label="CHANNEL · 24H" right={<Label style={{ color: MONO.textDim }}>USD</Label>}>
      <div style={{ padding: "6px 10px" }}>
        {rows.slice(0, 6).map((r, ri) => {
          const pct = (r.value / total) * 100;
          const hue = hues[ri % hues.length];
          return (
            <div
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "46px 1fr 52px 44px",
                gap: 6,
                padding: "3px 0",
                alignItems: "center",
                borderBottom: `1px dotted ${MONO.line}`,
                fontFamily: MONO.mono,
                fontSize: 11,
                animation:
                  r.flash === "up"
                    ? "mono-flash 600ms ease-out"
                    : r.flash === "down"
                    ? "mono-flash 600ms ease-out"
                    : "none",
              }}
            >
              <Label style={{ color: hue, fontWeight: 500 }}>{r.id}</Label>
              <BarMeter value={pct} max={60} width={16} color={hue} />
              <span style={{ color: MONO.text, textAlign: "right", whiteSpace: "nowrap" }}>
                ${(r.value / 1000).toFixed(1)}k
              </span>
              <span
                style={{
                  textAlign: "right",
                  color: r.delta >= 0 ? MONO.hueC : MONO.accent,
                  fontSize: 10,
                }}
              >
                {r.delta >= 0 ? "▲" : "▽"} {Math.abs(Math.round(r.delta))}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

/* ─── Move-in tape mini ─── */

export function LiveMovesMini() {
  const events = useMovesTapeSynthetic(6);
  return (
    <Panel label="MOVE-IN TAPE · T-5M" right={<Tag>STRM</Tag>}>
      <div style={{ padding: "6px 10px" }}>
        {events.map((e) => (
          <div
            key={e.id}
            style={{
              display: "grid",
              gridTemplateColumns: "48px 1fr 48px 44px",
              gap: 6,
              padding: "3px 0",
              borderBottom: `1px dotted ${MONO.line}`,
              fontFamily: MONO.mono,
              fontSize: 11,
            }}
          >
            <span style={{ color: MONO.textFaint }}>{e.t}</span>
            <span
              style={{
                color: MONO.text,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {e.fac} <span style={{ color: MONO.textDim }}>{e.unit}</span>
            </span>
            <span style={{ color: MONO.textDim, textAlign: "right" }}>{e.src}</span>
            <span style={{ color: MONO.text, textAlign: "right" }}>{e.rent}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ─── Attribution 90D sparkline ─── */

export function LiveAttrMini() {
  const N = 90;
  const [pts, setPts] = useState<number[]>(() => {
    const arr: number[] = [];
    let v = 92;
    for (let i = 0; i < N; i++) {
      v += (Math.random() - 0.5) * 0.6 + (92 - v) * 0.04;
      arr.push(v);
    }
    return arr;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setPts((prev) => {
        const last = prev[prev.length - 1];
        let next = last + (Math.random() - 0.5) * 0.5 + (92 - last) * 0.05;
        next = Math.max(84, Math.min(97, next));
        return [...prev.slice(1), next];
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  const W = 100;
  const H = 32;
  const max = Math.max(...pts) + 0.5;
  const min = Math.min(...pts) - 0.5;
  const range = max - min || 1;
  const coords = pts.map((v, i) => [
    (i / (pts.length - 1)) * W,
    H - ((v - min) / range) * (H - 4) - 2,
  ]);

  let d = `M ${coords[0][0].toFixed(2)} ${coords[0][1].toFixed(2)}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const p0 = coords[i - 1] || coords[i];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }

  const last = pts[pts.length - 1];
  const lastY = coords[coords.length - 1][1];

  return (
    <Panel
      label="ATTRIBUTION · 90D"
      right={<Val color={MONO.textAccent}>{last.toFixed(1)}%</Val>}
    >
      <div style={{ padding: "10px 10px 8px" }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          style={{ width: "100%", height: 58, display: "block" }}
        >
          {[8, 16, 24].map((y) => (
            <line
              key={y}
              x1="0"
              x2={W}
              y1={y}
              y2={y}
              stroke={MONO.line}
              strokeWidth="0.15"
              strokeDasharray="0.5 1"
            />
          ))}
          <path d={`${d} L ${W} ${H} L 0 ${H} Z`} fill={MONO.hueA} opacity="0.18" />
          <path
            d={d}
            fill="none"
            stroke={MONO.hueA}
            strokeWidth="0.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <circle cx={W} cy={lastY} r="0.8" fill={MONO.accent} />
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
          <Label>-90D</Label>
          <Label>NOW</Label>
        </div>
      </div>
    </Panel>
  );
}

/* ─── Triptych wrapper ─── */

export function LiveMonitorTriptych() {
  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3"
      style={{ gap: 0, borderTop: `1px solid ${MONO.line}`, borderBottom: `1px solid ${MONO.line}` }}
    >
      <div style={{ borderRight: `1px solid ${MONO.line}` }}>
        <LiveChannelMini />
      </div>
      <div style={{ borderRight: `1px solid ${MONO.line}` }}>
        <LiveMovesMini />
      </div>
      <LiveAttrMini />
    </div>
  );
}
