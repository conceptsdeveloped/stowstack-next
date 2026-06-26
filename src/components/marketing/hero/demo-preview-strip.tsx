"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import {
  HERO_DEMO_MONTHS,
  HERO_DEMO_STARTING_OCCUPANCY,
  HERO_DEMO_LEADS,
  HERO_DEMO_LEAD_STATUS,
} from "./content";

type DemoPreviewStripProps = {
  activeMonth: number;
  cumulative: (typeof HERO_DEMO_MONTHS)[number][];
  current: (typeof HERO_DEMO_MONTHS)[number];
};

export function DemoPreviewStrip({
  activeMonth,
  cumulative,
  current,
}: DemoPreviewStripProps) {
  // Occupancy curve points — starts at HERO_DEMO_STARTING_OCCUPANCY,
  // walks through each completed month. Mapped into a 100×30 SVG box.
  const occPoints = [
    HERO_DEMO_STARTING_OCCUPANCY,
    ...cumulative.map((m) => m.occupancy),
  ];
  const occMin = HERO_DEMO_STARTING_OCCUPANCY - 4;
  const occMax = 95;
  const occRange = occMax - occMin;
  const occW = 100;
  const occH = 30;
  const occCoords = occPoints
    .map((v, i) => {
      const x = (i / (HERO_DEMO_MONTHS.length)) * occW;
      const y = occH - ((v - occMin) / occRange) * occH;
      return [x, y];
    });
  const occLine = occCoords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`)
    .join(" ");
  const lastOccCoord = occCoords[occCoords.length - 1];
  const occFill =
    occLine +
    ` L ${lastOccCoord[0].toFixed(1)} ${occH} L 0 ${occH} Z`;

  // Lead feed window — two most-recent leads cycle as months advance.
  // Modulo wraps so every month surfaces a different pair.
  const leadStart = activeMonth % HERO_DEMO_LEADS.length;
  const visibleLeads = [
    HERO_DEMO_LEADS[leadStart],
    HERO_DEMO_LEADS[(leadStart + 1) % HERO_DEMO_LEADS.length],
  ];

  const tiles = [
    {
      key: "occupancy",
      label: "Occupancy",
      sub: `${HERO_DEMO_STARTING_OCCUPANCY}% → ${current.occupancy}%`,
      visual: (
        <svg
          viewBox={`0 0 ${occW} ${occH}`}
          preserveAspectRatio="none"
          className="w-full h-7"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="hero-occ-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-green)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-green)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={occFill} fill="url(#hero-occ-fill)" />
          <path
            d={occLine}
            fill="none"
            stroke="var(--color-green)"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "d 600ms cubic-bezier(0.16,1,0.3,1)",
            }}
          />
          {/* Marker on the latest point */}
          {lastOccCoord && (
            <circle
              cx={lastOccCoord[0]}
              cy={lastOccCoord[1]}
              r="1.6"
              fill="var(--color-green)"
              stroke="var(--color-light)"
              strokeWidth="0.8"
            />
          )}
        </svg>
      ),
    },
    {
      key: "leads",
      label: "Live lead feed",
      sub: `${current.leads} this month`,
      visual: (
        <div className="space-y-1 pt-0.5">
          {visibleLeads.map((lead, i) => {
            const status = HERO_DEMO_LEAD_STATUS[lead.status];
            return (
              <div
                key={`${activeMonth}-${i}-${lead.name}`}
                className="flex items-center gap-1.5 text-[10px]"
                style={{
                  animation: i === 0 ? "hero-value-flash 700ms ease-out" : undefined,
                }}
              >
                <span
                  className="w-1 h-1 rounded-full flex-shrink-0"
                  style={{ background: status.color }}
                  aria-hidden="true"
                />
                <span
                  className="font-medium truncate flex-1"
                  style={{ color: "var(--color-dark)" }}
                >
                  {lead.name}
                </span>
                <span
                  className="text-[9px] font-semibold uppercase tracking-wide flex-shrink-0"
                  style={{ color: status.color, letterSpacing: "0.04em" }}
                >
                  {status.label}
                </span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      key: "intel",
      label: "Campaign intelligence",
      sub: `Top: ${current.topAudience}`,
      visual: (
        <div className="pt-0.5">
          <div
            key={`intel-aud-${activeMonth}`}
            className="text-[10px] font-medium truncate"
            style={{
              color: "var(--color-dark)",
              animation: "hero-value-flash 700ms ease-out",
            }}
          >
            {current.topAudience}
          </div>
          <div
            key={`intel-cre-${activeMonth}`}
            className="text-[10px] mt-0.5 truncate"
            style={{
              color: "var(--text-secondary)",
              fontStyle: "normal",
              animation: "hero-value-flash 700ms ease-out",
            }}
          >
            “{current.topCreative}”
          </div>
        </div>
      ),
    },
  ];

  return (
    <div
      className="hidden lg:grid mt-3 grid-cols-3 gap-2"
      role="list"
      aria-label="More dashboard modules in the full demo"
    >
      {tiles.map((tile) => (
        <Link
          key={tile.key}
          href="/demo"
          role="listitem"
          className="group block rounded-xl border bg-[var(--color-light)] p-3 transition-all hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-light)]"
          style={{ borderColor: "var(--border-subtle)" }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="text-[9px] uppercase tracking-wide font-semibold"
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-heading)",
                letterSpacing: "0.06em",
              }}
            >
              {tile.label}
            </span>
            <ArrowUpRight
              size={10}
              className="opacity-30 group-hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            />
          </div>
          <div className="min-h-[42px]">{tile.visual}</div>
          <div
            className="text-[10px] mt-1.5 font-medium tabular-nums"
            style={{ color: "var(--text-secondary)" }}
          >
            {tile.sub}
          </div>
        </Link>
      ))}
    </div>
  );
}
