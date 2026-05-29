"use client";

import { MONO, Label, Dot, Display } from "@/components/mono";
import { useClock } from "@/hooks/use-live-data";
import Cite from "../cite";
import { useRevealCountUp, useFlashOnChange } from "./hooks";

type StatCard = {
  key: string;
  rawValue: number;
  format: "count" | "money";
  label: string;
  caption: string;
  hue: string;
  delta?: string;
  context?: string;
  // Optional suffix appended after the animated number, e.g. " pts" for the
  // REIT-vs-independent occupancy gap card. Keeps the existing animation
  // path (integer rawValue, Math.round per tick) intact.
  suffix?: string;
  // Optional source ids appended to the caption as a superscript footnote
  // ref. Wires the inline stat to the SourcesNote block at page bottom.
  cites?: number[];
};

function formatCount(n: number): string {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1000)
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

function StatCell({
  card,
  index,
  isVisible,
}: {
  card: StatCard;
  index: number;
  isVisible: boolean;
}) {
  const animated = useRevealCountUp(card.rawValue, isVisible, 1800);
  const flashing = useFlashOnChange(card.rawValue);
  const display =
    (card.format === "money" ? `$${formatCount(animated)}` : formatCount(animated)) +
    (card.suffix ?? "");

  return (
    <div
      className="stat-cell"
      style={{
        background: MONO.bgAlt,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        minWidth: 0,
        overflow: "hidden",
        animation: flashing ? "mono-flash 600ms ease-out" : undefined,
      }}
    >
      <div
        style={{
          display: "block",
          minWidth: 0,
        }}
      >
        {card.context && (
          <div
            style={{
              display: "block",
              marginBottom: 4,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <Label
              style={{
                color: MONO.textFaint,
                fontSize: 9,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
                maxWidth: "100%",
              }}
            >
              {card.context}
            </Label>
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <Label style={{ color: MONO.textFaint, fontSize: 9, flex: "0 0 auto" }}>
            #{String(index + 1).padStart(2, "0")}
          </Label>
          <Label
            style={{
              color: MONO.textDim,
              minWidth: 0,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              flex: "1 1 auto",
            }}
          >
            {card.label}
          </Label>
        </div>
      </div>
      <Display
        size={64}
        style={{
          color: card.hue,
          fontSize: "clamp(3rem, 6.5vw, 4.5rem)",
          lineHeight: 0.95,
        }}
      >
        {display}
      </Display>
      <div style={{ height: 1, background: MONO.lineDim, marginTop: 4 }} />
      {card.delta && (
        <Label
          style={{
            color: MONO.hueC,
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: "0.08em",
          }}
        >
          {card.delta}
        </Label>
      )}
      <span
        style={{
          fontFamily: MONO.serif,
          fontStyle: "italic",
          fontSize: 13,
          lineHeight: 1.5,
          color: MONO.textDim,
          maxWidth: "40ch",
        }}
      >
        {card.caption}
        {card.cites && <Cite n={card.cites} />}
      </span>
    </div>
  );
}

export function LiveStatsStrip({ isVisible }: { isVisible: boolean }) {
  const clock = useClock();

  // Industry + forecast cards only. The alpha portfolio numbers don't yet
  // reflect what's actually being built behind the scenes, so showing the
  // raw platform counts (60 ads / 7 audits) was misleading. Instead the
  // strip tells the "$50B market → here's what we're building toward"
  // story via two clearly-labeled data types:
  //   INDUSTRY (public, sourced) → hueB
  //   FORECAST (year-one targets) → hueC
  const cards: StatCard[] = [
    // ─── INDUSTRY · 2025 ─────────────────────────────────────────────
    // Sourced public figures, attributed inline. Full source list lives in
    // the <SourcesNote /> block before the footer so operators can verify.
    {
      key: "asset-class",
      rawValue: 432_000_000_000,
      format: "money",
      label: "U.S. storage asset class",
      caption:
        "Total value of U.S. self-storage real estate. NOI growth has beat inflation by 190 basis points a year since 2008.",
      hue: MONO.hueB,
      context: "INDUSTRY · 2025",
      cites: [4, 9],
    },
    {
      key: "occupancy-gap",
      rawValue: 5,
      format: "count",
      suffix: " pts",
      label: "Occupancy gap",
      caption:
        "REITs run 92.6% same-store occupancy. Independents average 87.2%. The space between is the lever, and it closes with marketing, not location.",
      hue: MONO.hueB,
      context: "INDUSTRY · 2025",
      cites: [1, 2],
    },
    {
      key: "revenue-in-the-building",
      rawValue: 72_000,
      format: "money",
      label: "Revenue in the building",
      caption:
        "What a 500-unit facility leaves in the building at the typical occupancy gap, $120 a unit. Roughly $1.3M in asset value at a 5.5% cap.",
      hue: MONO.hueB,
      context: "INDUSTRY · BENCHMARK",
      cites: [3],
    },

    // ─── FORECAST · YEAR 1 ───────────────────────────────────────────
    // Placeholder targets — replace with Blake's actual year-one goals.
    {
      key: "y1-spend",
      rawValue: 10_000_000,
      format: "money",
      label: "Ad spend goal",
      caption:
        "ad spend StorageAds will route through the platform by EOY. Every dollar working a slot in the funnel, not sitting in a vendor's queue.",
      hue: MONO.hueC,
      context: "FORECAST · YEAR 1",
    },
    {
      key: "y1-facilities",
      rawValue: 250,
      format: "count",
      label: "Facilities goal",
      caption:
        "operators live on the platform by EOY. Partner operators carry the growth.",
      hue: MONO.hueC,
      context: "FORECAST · YEAR 1",
    },
    {
      key: "y1-moveins",
      rawValue: 10_000,
      format: "count",
      label: "Move-ins generated",
      caption:
        "signed leases generated by StorageAds campaigns. Operators pay for outcomes, not vendor reports.",
      hue: MONO.hueC,
      context: "FORECAST · YEAR 1",
    },
  ];

  // 6 cards land at 3-col × 2-row on desktop, 2-col stack on mobile.
  // Hairline seams via 1px gap on a line-colored background.
  const gridClass = "grid grid-cols-2 md:grid-cols-3";

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(12px)",
        transition: "all 700ms",
        transitionDelay: "1600ms",
        border: `1px solid ${MONO.line}`,
        background: MONO.line, // hairline seam color showing through gaps
      }}
    >
      {/* Section header — § NN NUMBERS · LIVE ← kicker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: `1px solid ${MONO.line}`,
          gap: 12,
          background: MONO.bgAlt,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
          <Label style={{ color: MONO.accent, fontWeight: 500, whiteSpace: "nowrap" }}>§ 00 · NUMBERS</Label>
          <span className="hidden sm:inline" style={{ minWidth: 0, overflow: "hidden" }}>
            <Label
              style={{ color: MONO.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: "100%" }}
            >
              n = {cards.length} · industry · forecast
            </Label>
          </span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
          <Dot live color={MONO.accent} />
          <Label style={{ color: MONO.accent, fontWeight: 500, whiteSpace: "nowrap" }}>LIVE · {clock.hms}</Label>
        </div>
      </div>

      {/* Stat cells — hairline seams via 1px gap on line-colored background */}
      <div className={gridClass} style={{ gap: 1, background: MONO.line }}>
        {cards.map((c, i) => (
          <StatCell key={c.key} card={c} index={i} isVisible={isVisible} />
        ))}
      </div>
    </div>
  );
}
