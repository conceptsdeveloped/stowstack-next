"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { CAL_BOOKING_URL } from "@/lib/booking";
import ToolHeader, { ToolCta } from "@/components/tools/tool-header";
import RelatedTools from "@/components/tools/related-tools";
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
  clampPct,
} from "@/components/tools/fields";
import { deriveRateIncrease } from "@/lib/tools/rate-increase";

/* ──────────────────────────────────────────────────────────────────────────
   Existing-customer rate increase (ECRI) impact. Math lives in
   @/lib/tools/rate-increase (pure, unit-tested); this is the UI shell.
   ────────────────────────────────────────────────────────────────────────── */

export default function RateIncreaseClient() {
  const [occupied, setOccupied] = useState(0);
  const [currentRate, setCurrentRate] = useState(0);
  const [increasePct, setIncreasePct] = useState(8);
  const [churnPct, setChurnPct] = useState(4);
  const [capRatePct, setCapRatePct] = useState(6.5);

  const inc = clampPct(increasePct);
  const churn = clampPct(churnPct);
  const cap = clampPct(capRatePct);

  const {
    newRate,
    perUnitIncrease,
    staying,
    oldMonthlyRev,
    newMonthlyRev,
    netMonthlyLift,
    netAnnualLift,
    grossAnnualLift,
    breakEvenChurnPct: breakEvenChurn,
    valueLift,
  } = deriveRateIncrease({
    occupied,
    currentRate,
    increasePct,
    churnPct,
    capRatePct,
  });

  const hasInputs = occupied > 0 && currentRate > 0;

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
            Rate Increase (ECRI) Impact Calculator
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-body-text)" }}
          >
            Existing-customer rate increases are the fastest lever in storage —
            and the scariest, because of move-out risk. Model the net revenue an
            increase actually adds after churn, and see the break-even move-out
            rate: how many tenants could leave before the increase stops paying
            off. The math runs in your browser.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
          {/* Inputs */}
          <div className="flex flex-col gap-6">
            <SectionCard step="Step 1" title="Today">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <PlainNumber
                  label="Occupied units getting the increase"
                  value={occupied}
                  onChange={setOccupied}
                  help="Only the tenants you're actually raising. Skip recent move-ins if you exclude them."
                />
                <MoneyField
                  label="Average current monthly rate"
                  help="Blended monthly rent across those occupied units."
                  value={currentRate}
                  onChange={setCurrentRate}
                />
              </div>
            </SectionCard>

            <SectionCard
              step="Step 2"
              title="The increase"
              subtitle="Storage ECRIs commonly run 5–12% on a tenant who has been in place long enough to have high switching costs."
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <PercentField
                  label="Rate increase"
                  help="Percent bump applied to the current rate."
                  value={increasePct}
                  onChange={setIncreasePct}
                />
                <PercentField
                  label="Expected move-outs from the increase"
                  help="Share of these tenants you expect to leave because of it. Storage ECRI churn is often low — a few percent."
                  value={churnPct}
                  onChange={setChurnPct}
                />
              </div>
            </SectionCard>

            <SectionCard
              step="Step 3"
              title="Valuation (optional)"
              subtitle="A rate increase flows almost entirely to NOI. Enter your market cap rate to see what the lift is worth as asset value."
            >
              <div className="max-w-xs">
                <PercentField
                  label="Market cap rate"
                  value={capRatePct}
                  onChange={setCapRatePct}
                  help="Self-storage cap rates commonly run ~5.5–7.5%."
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
                Net annual revenue lift
              </span>
              <div className="mt-2 mb-1">
                <span
                  className="text-4xl font-bold tabular-nums"
                  style={{
                    color:
                      netAnnualLift < 0 ? "var(--color-red)" : "var(--color-light)",
                    letterSpacing: "-0.03em",
                  }}
                >
                  {usd0(netAnnualLift)}
                </span>
                <span
                  className="text-base font-medium ml-1.5"
                  style={{ color: "var(--color-mid-gray)" }}
                >
                  /yr
                </span>
              </div>
              <p className="text-sm" style={{ color: "var(--color-mid-gray)" }}>
                {usd0(netMonthlyLift)} per month, after {pct(churn)} move-outs
              </p>

              <div
                className="grid grid-cols-2 gap-px mt-6 rounded-xl overflow-hidden"
                style={{ background: "rgba(250,249,245,0.12)" }}
              >
                <MiniStat
                  label="New avg rate"
                  value={hasInputs ? usd2(newRate) : "—"}
                />
                <MiniStat
                  label="Increase / unit"
                  value={hasInputs ? `${usd2(perUnitIncrease)}/mo` : "—"}
                />
                <MiniStat
                  label="Break-even move-outs"
                  value={inc > 0 ? pct(breakEvenChurn) : "—"}
                />
                <MiniStat
                  label="Lift if 0 churn"
                  value={hasInputs ? `${usd0(grossAnnualLift)}/yr` : "—"}
                />
              </div>

              <div
                className="mt-5 pt-5"
                style={{ borderTop: "1px solid rgba(250,249,245,0.12)" }}
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-sm" style={{ color: "var(--color-mid-gray)" }}>
                    Implied value lift @ {pct(cap)} cap
                  </span>
                  <span className="text-xl font-bold tabular-nums">
                    {cap > 0 ? usd0(valueLift) : "—"}
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
                Backfill the move-outs
                <ArrowRight className="h-4 w-4" />
              </a>
              <p
                className="text-xs mt-3 leading-snug"
                style={{ color: "var(--color-mid-gray)" }}
              >
                The increase only stings if you can&apos;t replace the few who
                leave. Marketing that keeps the funnel full is what makes ECRIs
                safe to push.
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
              <ResultRow
                label="Current monthly revenue"
                value={usd0(oldMonthlyRev)}
              />
              <ResultRow
                label={`Units staying (after ${pct(churn)})`}
                value={`${Math.round(staying).toLocaleString()} of ${occupied.toLocaleString()}`}
                muted
              />
              <ResultRow label="New monthly revenue" value={usd0(newMonthlyRev)} />
              <div
                className="my-1.5"
                style={{ borderTop: "1px solid var(--color-light-gray)" }}
              />
              <ResultRow
                label="Net monthly lift"
                value={usd0(netMonthlyLift)}
                strong
                negative={netMonthlyLift < 0}
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
            How to read this
          </h2>
          <div className="flex flex-col gap-6">
            <Faq q="What's a break-even move-out rate?">
              It&apos;s the share of tenants who could leave before the increase
              nets you zero. For an X% increase it works out to X ÷ (100 + X). An
              8% increase break-evens at about 7.4% move-outs — so as long as
              fewer than ~7 in 100 leave, you&apos;re ahead.
            </Faq>
            <Faq q="Why does the model assume vacated units sit empty?">
              To keep the number conservative. In practice you backfill many
              vacated units at street rate — often higher than the rate the
              leaving tenant paid — so real lift usually beats this floor. We&apos;d
              rather under-promise.
            </Faq>
            <Faq q="Why do rate increases beat chasing new move-ins?">
              An increase has no acquisition cost and flows almost entirely to
              NOI. The risk is purely move-outs, which is why the safe way to push
              ECRIs harder is to keep your marketing funnel full enough to replace
              anyone who leaves.
            </Faq>
            <Faq q="How often can I raise rates?">
              Many operators run ECRIs on a rolling 6–12 month cadence per tenant,
              subject to your state&apos;s notice rules and any local caps. This
              tool models a single increase event; check local regulations before
              scheduling.
            </Faq>
          </div>

          <div className="mt-12">
            <ToolCta
              heading="Raise rates without bleeding occupancy"
              body="StorageAds keeps the funnel full so the handful of tenants who leave after an increase get replaced fast. Built by an operator, tested on our own facilities first."
            />
          </div>
        </div>

        <RelatedTools currentHref="/tools/rate-increase-calculator" />

        <p
          className="text-xs mt-12 max-w-2xl leading-relaxed"
          style={{ color: "var(--color-mid-gray)" }}
        >
          This calculator is an estimating tool for self-storage operators. It
          does not constitute financial, legal, or tax advice, and does not
          account for state or local rate-increase notice rules or caps. Confirm
          any pricing action against local regulations and your own data.
        </p>
      </main>
    </div>
  );
}
