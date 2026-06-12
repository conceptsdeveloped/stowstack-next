"use client";

import { useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import SectionFrame from "./section-frame";

/**
 * § 06 — the revenue calculator. Math constants and every figure are
 * identical to the previous QuickCalculator ($130 avg rate, 14-month
 * tenure, $749 System plan, $1,000 ad-spend floor, ~20% recovery).
 * Adds a quiet pricing teaser into /pricing (the homepage's only
 * public price is the $749 figure shown here).
 */
export default function Calculator() {
  const [totalUnits, setTotalUnits] = useState(150);
  const [occupancy, setOccupancy] = useState(78);

  const avgRate = 130;
  const avgTenureMonths = 14;
  const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100));
  const monthlyLoss = vacantUnits * avgRate;
  const annualLoss = monthlyLoss * 12;
  const storageadsCost = 749;
  const adSpendFloor = 1000;
  const projectedMoveIns = Math.max(2, Math.min(30, Math.round(vacantUnits * 0.2)));
  const projectedRecovery = projectedMoveIns * avgRate;
  const annualRevenueLift = projectedMoveIns * 12 * avgRate * avgTenureMonths;
  const annualAllInCost = (storageadsCost + adSpendFloor) * 12;
  const roi =
    annualAllInCost > 0
      ? Math.round((annualRevenueLift / annualAllInCost) * 10) / 10
      : 0;

  const sliderLabel: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-dim)",
  };

  return (
    <section
      id="calculator"
      aria-label="Quick revenue calculator"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24">
        <SectionFrame
          number="06"
          kicker="Revenue calculator"
          meta="Ledger · Live"
          as="h2"
          lines={["What your empty units", "cost you."]}
        />

        <Reveal className="mt-10">
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{ border: "1px solid var(--line)", background: "var(--bg-alt)" }}
          >
            {/* Inputs */}
            <div className="p-6 md:p-8 flex flex-col gap-8" style={{ borderBottom: "1px solid var(--line)" }}>
              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <label htmlFor="slider-total-units" style={sliderLabel}>
                    Total Units
                  </label>
                  <span
                    style={{
                      fontFamily: "var(--serif)",
                      fontWeight: 800,
                      fontSize: 26,
                      color: "var(--text-accent)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {totalUnits}
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={600}
                  step={10}
                  value={totalUnits}
                  onChange={(e) => setTotalUnits(Number(e.target.value))}
                  id="slider-total-units"
                  aria-label="Total units"
                  aria-valuenow={totalUnits}
                  aria-valuemin={20}
                  aria-valuemax={600}
                  aria-valuetext={`${totalUnits} units`}
                  className="w-full h-2"
                  style={{ accentColor: "var(--accent)" }}
                />
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-faint)" }}>20</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-faint)" }}>600</span>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-3">
                  <label htmlFor="slider-occupancy" style={sliderLabel}>
                    Current Occupancy
                  </label>
                  <span
                    style={{
                      fontFamily: "var(--serif)",
                      fontWeight: 800,
                      fontSize: 26,
                      color: occupancy < 85 ? "var(--accent)" : "var(--text-accent)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {occupancy}%
                  </span>
                </div>
                <input
                  type="range"
                  min={40}
                  max={99}
                  step={1}
                  value={occupancy}
                  onChange={(e) => setOccupancy(Number(e.target.value))}
                  id="slider-occupancy"
                  aria-label="Current occupancy percentage"
                  aria-valuenow={occupancy}
                  aria-valuemin={40}
                  aria-valuemax={99}
                  aria-valuetext={`${occupancy}% occupancy`}
                  className="w-full h-2"
                  style={{ accentColor: "var(--accent)" }}
                />
                <div className="flex justify-between mt-1">
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-faint)" }}>40%</span>
                  <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--text-faint)" }}>99%</span>
                </div>
              </div>

              <p style={{ fontSize: 11, lineHeight: 1.6, color: "var(--text-faint)", marginTop: "auto" }}>
                Assumes $130/mo avg unit rate · $749/mo System plan · $1,000/mo
                ad spend floor · ~20% vacancy recovery rate
              </p>
            </div>

            {/* Output ledger */}
            <div className="flex flex-col lg:border-l" style={{ borderColor: "var(--line)" }}>
              <div className="p-6 md:p-8" style={{ borderBottom: "1px solid var(--line)" }}>
                <p
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "var(--track-label)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  You&apos;re Losing
                </p>
                <p
                  aria-live="polite"
                  style={{
                    fontFamily: "var(--serif)",
                    fontWeight: 800,
                    fontSize: "var(--type-num)",
                    letterSpacing: "var(--track-tighter)",
                    lineHeight: 1.05,
                    color: "var(--accent)",
                    fontVariantNumeric: "tabular-nums",
                    marginTop: 6,
                  }}
                >
                  ${monthlyLoss.toLocaleString()}
                  <span style={{ fontSize: "0.4em", fontWeight: 600 }}>/mo</span>
                </p>
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                  {vacantUnits} vacant units × ${avgRate} avg rate = $
                  {annualLoss.toLocaleString()}/yr
                </p>
              </div>

              <div className="p-6 md:p-8">
                <p
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "var(--track-label)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--hue-c)",
                  }}
                >
                  With StorageAds
                </p>
                <p
                  aria-live="polite"
                  style={{
                    fontFamily: "var(--serif)",
                    fontWeight: 800,
                    fontSize: "var(--type-num)",
                    letterSpacing: "var(--track-tighter)",
                    lineHeight: 1.05,
                    color: "var(--hue-c)",
                    fontVariantNumeric: "tabular-nums",
                    marginTop: 6,
                  }}
                >
                  {projectedMoveIns}
                  <span style={{ fontSize: "0.4em", fontWeight: 600 }}> move-ins/mo</span>
                </p>
                <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                  ${projectedRecovery.toLocaleString()}/mo recovered · {roi}x
                  annual return on System plan (at {avgTenureMonths}-mo avg tenure)
                </p>
              </div>

              <div
                className="mt-auto p-6 md:p-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <a href="#cta" className="btn-primary flex-shrink-0">
                  Get your free facility audit <span aria-hidden="true">→</span>
                </a>
                <p style={{ fontSize: 12.5, color: "var(--text-dim)" }}>
                  The System plan is $749/mo per facility.{" "}
                  <Link href="/pricing" className="home-link" style={{ color: "var(--text)", fontWeight: 600 }}>
                    See pricing
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
