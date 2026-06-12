"use client";

import { useEffect, useState } from "react";
import Cite from "@/components/marketing/cite";

/**
 * Thin ledger ribbon at the very top of the hero: document register on
 * the left, the occupancy-gap tile in the center (lg+), revision stamp
 * with a 1Hz clock on the right. Copy carried over from the previous
 * HeroStatusStrip (the unverified "SOC2" tag was dropped).
 */
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    time: now
      ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
      : "--:--:--",
    date: now
      ? `${pad(now.getMonth() + 1)}/${pad(now.getDate())}/${String(now.getFullYear()).slice(2)}`
      : "--/--/--",
  };
}

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--mono)",
  fontSize: 10,
  letterSpacing: "var(--track-label)",
  textTransform: "uppercase",
  color: "var(--text-dim)",
  whiteSpace: "nowrap",
};

export default function HeroStatusStrip() {
  const { time, date } = useClock();
  return (
    <div
      className="flex items-center justify-between gap-4"
      style={{
        borderTop: "1px solid var(--line)",
        borderBottom: "1px solid var(--line-dim)",
        padding: "8px 0",
      }}
    >
      <span className="flex items-center gap-2 min-w-0" style={labelStyle}>
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            background: "var(--hue-c)",
            animation: "mono-pulse 1.6s ease-in-out infinite",
            flexShrink: 0,
          }}
        />
        <span className="sm:hidden">Marketing infrastructure</span>
        <span className="hidden sm:inline">
          Marketing infrastructure · Built for self-storage
        </span>
      </span>

      <span className="hidden lg:flex items-center gap-2" style={labelStyle}>
        <span style={{ color: "var(--text-faint)" }}>OCC GAP</span>
        <span style={{ color: "var(--text-accent)", fontWeight: 700 }}>5 PTS</span>
        <span style={{ color: "var(--text-faint)" }}>· REIT 92.6 / IND 87.2</span>
        <Cite n={[1, 2]} />
      </span>

      <span style={labelStyle}>
        <span className="sm:hidden">REV {date}</span>
        <span className="hidden sm:inline">
          REV {date} · {time} CT
        </span>
      </span>
    </div>
  );
}
