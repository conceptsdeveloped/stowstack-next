"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CAL_BOOKING_URL } from "@/lib/booking";
import ToolHeader, { ToolCta } from "@/components/tools/tool-header";
import {
  MoneyField,
  PercentField,
  PlainNumber,
  SectionCard,
  ResultRow,
  MiniStat,
  Faq,
  usd0,
  usd2,
  pct,
} from "@/components/tools/fields";
import { deriveValuation, type SolveFor } from "@/lib/tools/valuation";

/* ──────────────────────────────────────────────────────────────────────────
   Storage valuation by cap rate.   value = NOI / cap rate
   Math lives in @/lib/tools/valuation (pure, unit-tested); this is the UI shell.
   ────────────────────────────────────────────────────────────────────────── */

const SOLVE_OPTIONS: { key: SolveFor; label: string }[] = [
  { key: "value", label: "Value" },
  { key: "cap", label: "Cap rate" },
  { key: "noi", label: "NOI" },
];

export default function ValuationClient() {
  const [solveFor, setSolveFor] = useState<SolveFor>("value");
  const [noi, setNoi] = useState(0); // annual
  const [value, setValue] = useState(0);
  const [capPct, setCapPct] = useState(6.5);
  const [units, setUnits] = useState(0);
  const [sqft, setSqft] = useState(0);

  const {
    noi: rNoi,
    value: rValue,
    capPct: rCap,
    valuePerUnit,
    valuePerSqft,
    noiMonthly,
  } = deriveValuation({ solveFor, noi, value, capPct, units, sqft });

  const answer =
    solveFor === "value"
      ? usd0(rValue)
      : solveFor === "cap"
        ? pct(rCap)
        : usd0(rNoi);
  const answerLabel =
    solveFor === "value"
      ? "Implied facility value"
      : solveFor === "cap"
        ? "Implied cap rate"
        : "Implied annual NOI";

  return (
    <div className="min-h-screen" style={{ background: "var(--color-light)" }}>
      <ToolHeader backHref="/tools" />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-2xl mb-8">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-mid-gray)" }}
          >
            Free operator tool
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold mt-2 mb-3"
            style={{ color: "var(--color-dark)", letterSpacing: "-0.03em" }}
          >
            Storage Valuation & Cap Rate Calculator
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-body-text)" }}
          >
            Storage trades on a cap rate: value equals NOI divided by the cap
            rate. Know any two of value, cap rate, and NOI, and this solves the
            third — plus value per unit and per square foot. Pair it with the{" "}
            <a
              href="/tools/noi-calculator"
              className="font-medium underline underline-offset-2"
              style={{ color: "var(--color-dark)" }}
            >
              NOI calculator
            </a>{" "}
            if you need the NOI first.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
          {/* Inputs */}
          <div className="flex flex-col gap-6">
            <SectionCard
              step="Step 1"
              title="What do you want to solve for?"
              subtitle="Pick the unknown. Enter the other two below and we'll compute it."
            >
              <div
                className="inline-flex rounded-lg p-1 w-full sm:w-auto"
                style={{ background: "var(--color-light-gray)" }}
              >
                {SOLVE_OPTIONS.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => setSolveFor(o.key)}
                    className="px-4 py-1.5 text-sm font-medium rounded-md transition-all flex-1 sm:flex-none"
                    style={{
                      background:
                        solveFor === o.key ? "var(--color-light)" : "transparent",
                      color:
                        solveFor === o.key
                          ? "var(--color-dark)"
                          : "var(--color-mid-gray)",
                      boxShadow:
                        solveFor === o.key
                          ? "0 1px 2px rgba(20,20,19,0.08)"
                          : "none",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </SectionCard>

            <SectionCard step="Step 2" title="The known numbers">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {solveFor !== "noi" && (
                  <MoneyField
                    label="Annual NOI"
                    help="Net operating income for the year. Use the NOI calculator if you need it."
                    value={noi}
                    onChange={setNoi}
                  />
                )}
                {solveFor !== "value" && (
                  <MoneyField
                    label="Facility value / price"
                    help="Asking price or your value estimate."
                    value={value}
                    onChange={setValue}
                  />
                )}
                {solveFor !== "cap" && (
                  <PercentField
                    label="Cap rate"
                    help="Market capitalization rate. Storage commonly runs ~5.5–7.5%."
                    value={capPct}
                    onChange={setCapPct}
                  />
                )}
              </div>
            </SectionCard>

            <SectionCard
              step="Step 3"
              title="Per-unit detail (optional)"
              subtitle="Add units and rentable square footage to get value per unit and per square foot — useful comps when you're buying or selling."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <PlainNumber label="Total units" value={units} onChange={setUnits} />
                <PlainNumber
                  label="Rentable sq ft"
                  value={sqft}
                  onChange={setSqft}
                />
              </div>
            </SectionCard>
          </div>

          {/* Results */}
          <div className="lg:sticky lg:top-20">
            <div
              className="rounded-2xl p-6 sm:p-7"
              style={{ background: "var(--color-dark)", color: "var(--color-light)" }}
            >
              <span
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--color-mid-gray)" }}
              >
                {answerLabel}
              </span>
              <div className="mt-2 mb-1">
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{ color: "var(--color-light)", letterSpacing: "-0.03em" }}
                >
                  {answer}
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-mid-gray)" }}>
                {solveFor === "noi"
                  ? `${usd0(noiMonthly)} per month`
                  : `value = NOI ÷ cap rate`}
              </p>

              <div
                className="grid grid-cols-2 gap-px mt-6 rounded-xl overflow-hidden"
                style={{ background: "rgba(250,249,245,0.12)" }}
              >
                <MiniStat label="Annual NOI" value={rNoi > 0 ? usd0(rNoi) : "—"} />
                <MiniStat label="Cap rate" value={rCap > 0 ? pct(rCap) : "—"} />
                <MiniStat
                  label="Value / unit"
                  value={units > 0 && rValue > 0 ? usd0(valuePerUnit) : "add units"}
                />
                <MiniStat
                  label="Value / sq ft"
                  value={sqft > 0 && rValue > 0 ? usd2(valuePerSqft) : "add sq ft"}
                />
              </div>

              <div
                className="mt-5 pt-5"
                style={{ borderTop: "1px solid rgba(250,249,245,0.12)" }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm" style={{ color: "var(--color-mid-gray)" }}>
                    Facility value
                  </span>
                  <span className="text-xl font-bold tabular-nums">
                    {rValue > 0 ? usd0(rValue) : "—"}
                  </span>
                </div>
              </div>

              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: "var(--color-light)", color: "var(--color-dark)" }}
              >
                Build the NOI that builds value
                <ArrowRight className="h-4 w-4" />
              </a>
              <p
                className="text-xs mt-3 leading-snug"
                style={{ color: "var(--color-mid-gray)" }}
              >
                At a 6.5% cap, every $10,000 of added annual NOI is worth about
                $154,000 of value. Marketing that fills units compounds.
              </p>
            </div>

            {/* breakdown */}
            <div
              className="rounded-2xl p-6 mt-6"
              style={{
                background: "var(--color-light)",
                border: "1px solid var(--color-light-gray)",
              }}
            >
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: "var(--color-dark)" }}
              >
                The math
              </h3>
              <ResultRow label="Annual NOI" value={rNoi > 0 ? usd0(rNoi) : "—"} />
              <ResultRow
                label="Cap rate"
                value={rCap > 0 ? pct(rCap) : "—"}
                muted
              />
              <div
                className="my-1.5"
                style={{ borderTop: "1px solid var(--color-light-gray)" }}
              />
              <ResultRow
                label="Facility value"
                value={rValue > 0 ? usd0(rValue) : "—"}
                strong
              />
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mt-16">
          <h2
            className="text-2xl font-bold mb-6"
            style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}
          >
            How storage valuation works
          </h2>
          <div className="flex flex-col gap-6">
            <Faq q="What is a cap rate?">
              The capitalization rate is the annual NOI as a percentage of the
              price. A facility with $300,000 NOI selling at a 6% cap is worth
              $5,000,000 ($300,000 ÷ 0.06). Lower cap rate = higher price for the
              same NOI.
            </Faq>
            <Faq q="Why does a lower cap rate mean a higher value?">
              Cap rate is the buyer&apos;s required yield. When buyers accept a
              lower yield — because the market is hot or the asset is strong —
              they pay more for each dollar of NOI, so value rises.
            </Faq>
            <Faq q="What cap rate should I use?">
              Use what comparable facilities in your market are actually trading
              at. Storage broadly runs in the mid-5% to mid-7% range, but it moves
              with interest rates, asset quality, and location. A broker&apos;s
              recent comps beat a rule of thumb.
            </Faq>
            <Faq q="How do I grow the value?">
              Grow NOI. At a fixed cap rate, value moves one-for-one with NOI, and
              NOI grows when you fill units and hold rate. That is the entire case
              for treating marketing as a value-creation lever, not a cost.
            </Faq>
          </div>

          <div className="mt-12">
            <ToolCta
              heading="Value is just NOI with a multiplier"
              body="Every unit you fill and every rate you hold compounds into asset value at your cap rate. StorageAds runs the ads that move NOI. Built by an operator, tested on our own facilities first."
            />
          </div>
        </div>

        <p
          className="text-xs mt-12 max-w-2xl leading-relaxed"
          style={{ color: "var(--color-mid-gray)" }}
        >
          This calculator is an estimating tool and does not constitute an
          appraisal or investment advice. Cap-rate valuation is a simplification;
          actual transaction value depends on comps, condition, lease-up, and
          terms. Confirm with a broker or appraiser before transacting.
        </p>
      </main>
    </div>
  );
}
