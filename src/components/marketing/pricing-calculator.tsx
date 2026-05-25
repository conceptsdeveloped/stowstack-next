"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Calculator } from "lucide-react";

type Tier = "system" | "compound";

const TIER_FEE: Record<Tier, number> = {
  system: 749,
  compound: 1249,
};

const TIER_LABEL: Record<Tier, string> = {
  system: "System",
  compound: "Compound",
};

const AD_SPEND_FLOOR = 1000;
const AVG_TENURE_MONTHS = 14;
const SPAREFOOT_MULTIPLIER = 2;

export default function PricingCalculator() {
  const [facilities, setFacilities] = useState(1);
  const [unitRent, setUnitRent] = useState(150);
  const [moveIns, setMoveIns] = useState(8);
  const [tier, setTier] = useState<Tier>("system");

  const result = useMemo(() => {
    const moveInLtv = unitRent * AVG_TENURE_MONTHS;
    const annualMoveIns = moveIns * 12 * facilities;
    const annualRevenueLift = annualMoveIns * moveInLtv;

    const monthlyFee = TIER_FEE[tier] * facilities;
    const monthlyAdSpend = AD_SPEND_FLOOR * facilities;
    const annualCost = (monthlyFee + monthlyAdSpend) * 12;

    const netGain = annualRevenueLift - annualCost;
    const multiplier = annualCost > 0 ? annualRevenueLift / annualCost : 0;

    const sparefootCommissionPerMoveIn = unitRent * SPAREFOOT_MULTIPLIER;
    const sparefootAnnualCost = annualMoveIns * sparefootCommissionPerMoveIn;
    const sparefootDelta = sparefootAnnualCost - annualCost;
    const sparefootCrossoverMoveInsPerMonth =
      sparefootCommissionPerMoveIn > 0
        ? Math.ceil(annualCost / 12 / facilities / sparefootCommissionPerMoveIn)
        : 0;

    const breakevenMoveInsPerYear = Math.ceil(annualCost / moveInLtv);
    const breakevenMoveInsPerMonth = Math.max(
      1,
      Math.ceil(breakevenMoveInsPerYear / 12 / facilities)
    );

    return {
      moveInLtv,
      annualRevenueLift,
      annualCost,
      netGain,
      multiplier,
      sparefootAnnualCost,
      sparefootDelta,
      sparefootCrossoverMoveInsPerMonth,
      breakevenMoveInsPerMonth,
    };
  }, [facilities, unitRent, moveIns, tier]);

  const fmt = (n: number) =>
    `$${Math.round(n).toLocaleString("en-US")}`;

  return (
    <section
      id="calculator"
      className="py-20"
      style={{ background: "var(--color-light)" }}
    >
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-10">
          <div
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4"
            style={{
              background: "var(--color-light-gray)",
              color: "var(--color-dark)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <Calculator size={14} /> Run your facility
          </div>
          <h2
            className="font-semibold mb-3"
            style={{
              fontSize: "var(--text-section-head)",
              lineHeight: "var(--leading-tight)",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            What it pays back.
          </h2>
          <p
            className="mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
              maxWidth: "560px",
            }}
          >
            Move the sliders. The math runs on your numbers, not ours.
          </p>
        </div>

        <div
          className="rounded-2xl p-6 md:p-10"
          style={{
            background: "var(--color-light-gray)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div className="grid gap-10 md:grid-cols-2">
            <div className="space-y-8">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="calc-facilities"
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Facilities
                  </label>
                  <span
                    className="text-base font-semibold"
                    style={{ color: "var(--color-dark)" }}
                  >
                    {facilities}
                  </span>
                </div>
                <input
                  id="calc-facilities"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={facilities}
                  onChange={(e) => setFacilities(Number(e.target.value))}
                  className="w-full h-2"
                  style={{ accentColor: "var(--color-dark)" }}
                />
                <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="calc-rent"
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Average unit rent / month
                  </label>
                  <span
                    className="text-base font-semibold"
                    style={{ color: "var(--color-dark)" }}
                  >
                    ${unitRent}
                  </span>
                </div>
                <input
                  id="calc-rent"
                  type="range"
                  min={60}
                  max={300}
                  step={5}
                  value={unitRent}
                  onChange={(e) => setUnitRent(Number(e.target.value))}
                  className="w-full h-2"
                  style={{ accentColor: "var(--color-dark)" }}
                />
                <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span>$60 (rural 10x10)</span>
                  <span>$300 (climate-controlled urban)</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="calc-moveins"
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Extra move-ins / month per facility
                  </label>
                  <span
                    className="text-base font-semibold"
                    style={{ color: "var(--color-dark)" }}
                  >
                    {moveIns}
                  </span>
                </div>
                <input
                  id="calc-moveins"
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={moveIns}
                  onChange={(e) => setMoveIns(Number(e.target.value))}
                  className="w-full h-2"
                  style={{ accentColor: "var(--color-dark)" }}
                />
                <div className="flex justify-between mt-1 text-xs" style={{ color: "var(--text-tertiary)" }}>
                  <span>1</span>
                  <span>20</span>
                </div>
              </div>

              <div>
                <p
                  className="text-sm font-medium mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Tier
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {(["system", "compound"] as Tier[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className="rounded-md px-4 py-3 text-sm font-medium transition-colors"
                      style={{
                        background:
                          tier === t
                            ? "var(--color-dark)"
                            : "var(--color-light)",
                        color:
                          tier === t
                            ? "var(--color-light)"
                            : "var(--color-dark)",
                        border: "1px solid var(--color-dark)",
                      }}
                    >
                      {TIER_LABEL[t]} · ${TIER_FEE[t].toLocaleString()}/mo
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div
                className="rounded-xl p-5"
                style={{
                  background: "var(--color-dark)",
                  color: "var(--color-light)",
                }}
              >
                <p
                  className="text-xs uppercase mb-2"
                  style={{
                    letterSpacing: "var(--tracking-wide)",
                    opacity: 0.7,
                  }}
                >
                  Rent you capture this year
                </p>
                <p
                  className="text-4xl font-semibold"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(result.annualRevenueLift)}
                </p>
                <p className="text-xs mt-2" style={{ opacity: 0.7 }}>
                  {moveIns} extra moves/mo ×{" "}
                  {facilities === 1 ? "1 facility" : `${facilities} facilities`}{" "}
                  × {AVG_TENURE_MONTHS}-month average stay × ${unitRent} rent
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--color-light)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <p
                    className="text-xs uppercase mb-1"
                    style={{
                      letterSpacing: "var(--tracking-wide)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    What it costs / yr
                  </p>
                  <p
                    className="text-xl font-semibold"
                    style={{
                      color: "var(--color-dark)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt(result.annualCost)}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Fee + ${AD_SPEND_FLOOR.toLocaleString()}/mo ad spend
                  </p>
                </div>

                <div
                  className="rounded-xl p-4"
                  style={{
                    background: "var(--color-light)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <p
                    className="text-xs uppercase mb-1"
                    style={{
                      letterSpacing: "var(--tracking-wide)",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    What you keep / yr
                  </p>
                  <p
                    className="text-xl font-semibold"
                    style={{
                      color:
                        result.netGain >= 0
                          ? "var(--color-dark)"
                          : "var(--color-red)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {fmt(result.netGain)}
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {result.multiplier.toFixed(1)}× back on every dollar spent
                  </p>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--color-light)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  className="text-xs uppercase mb-2"
                  style={{
                    letterSpacing: "var(--tracking-wide)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  Versus SpareFoot / aggregator
                </p>
                <div className="space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
                  <div className="flex justify-between">
                    <span>SpareFoot at same volume (2× first rent)</span>
                    <span
                      className="font-semibold"
                      style={{
                        color: "var(--color-dark)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmt(result.sparefootAnnualCost)}/yr
                    </span>
                  </div>
                  <div
                    className="flex justify-between pt-1.5 border-t"
                    style={{ borderColor: "var(--border-subtle)" }}
                  >
                    <span>
                      {result.sparefootDelta >= 0
                        ? "StorageAds saves"
                        : "StorageAds costs more"}
                    </span>
                    <span
                      className="font-semibold"
                      style={{
                        color: "var(--color-dark)",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {fmt(Math.abs(result.sparefootDelta))}/yr
                    </span>
                  </div>
                  <p
                    className="text-xs pt-2"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {result.sparefootDelta >= 0
                      ? `Plus you keep the first month's rent SpareFoot would take — about ${fmt(result.sparefootAnnualCost)}/yr in retained revenue.`
                      : `StorageAds beats SpareFoot at ${result.sparefootCrossoverMoveInsPerMonth}+ move-ins/mo. Below that, the fixed cost works against you — and SpareFoot still takes your first month.`}
                  </p>
                </div>
              </div>

              <p
                className="text-xs text-center"
                style={{ color: "var(--text-tertiary)" }}
              >
                Break-even at {result.breakevenMoveInsPerMonth}{" "}
                {result.breakevenMoveInsPerMonth === 1 ? "move-in" : "move-ins"}
                /month per facility. Every move-in past that is yours.
              </p>

              <a
                href="#cta"
                className="btn-primary flex items-center justify-center gap-2 text-sm w-full"
              >
                Book a call to walk through your numbers
                <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
