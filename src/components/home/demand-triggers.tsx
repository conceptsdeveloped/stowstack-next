"use client";

import Cite from "@/components/marketing/cite";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";

/**
 * Operator-credibility interlude before the conversion ask. All copy
 * verbatim from the previous DemandTriggers.
 */

const DEMAND_MIX: Array<{ pct: number; label: string }> = [
  { pct: 57, label: "Not enough space at home" },
  { pct: 45, label: "Downsizing or decluttering" },
  { pct: 34, label: "During a move" },
  { pct: 30, label: "Change in household size" },
  { pct: 15, label: "Home renovation" },
  { pct: 5, label: "Business and e-commerce" },
];

const TRIGGERS: Array<{ title: string; body: string }> = [
  {
    title: "Moving & Relocation",
    body: "Local and long-distance moves. We know this demand from running U-Haul dealerships and a moving company.",
  },
  {
    title: "Divorce & Life Disruption",
    body: "Someone needs their stuff out of the house this week. They rent fast, and the first facility in front of them usually wins.",
  },
  {
    title: "Downsizing",
    body: "Moving to a smaller place means the overflow has to go somewhere. These tenants stay for years.",
  },
  {
    title: "Estate Cleanouts",
    body: "Sorting a family member's belongings takes months. Big units, real urgency. Agencies miss this demand because they've never run a facility.",
  },
  {
    title: "Remodeling & Renovation",
    body: "Clearing rooms for a home project. Predictable and seasonal, so we run the campaigns before the season hits.",
  },
  {
    title: "Business Overflow",
    body: "Contractors, e-commerce sellers, and small businesses that need somewhere to stage inventory. Commercial tenants stay longer and pay on time.",
  },
  {
    title: "College Transitions",
    body: "Students cycling in and out between semesters. Repeatable annual demand we build campaign calendars around.",
  },
  {
    title: "Vehicle / RV / Boat Storage",
    body: "Seasonal vehicle storage at premium rates. We built and operate heated indoor vehicle storage ourselves.",
  },
  {
    title: "Seasonal & Overflow",
    body: "Holiday items, sports gear, off-season belongings. Consistent base demand that fills standard units year-round.",
  },
];

export default function DemandTriggers() {
  return (
    <section
      id="demand-triggers"
      aria-label="Storage demand triggers we target with Meta ads"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20">
        <Reveal>
          <h2
            style={{
              fontSize: "var(--type-h2)",
              fontWeight: 200,
              letterSpacing: "var(--track-display)",
              lineHeight: 1.12,
              maxWidth: 980,
              textWrap: "balance",
            }}
            className="hx-thin"
          >
            We understand storage demand because we see these triggers in our
            own facilities every week.
          </h2>
          <p className="mt-5" style={{ fontSize: "var(--type-lede)", lineHeight: 1.6, color: "var(--text-dim)", maxWidth: 640 }}>
            This isn&apos;t research from an agency deck. We watch these
            triggers hit our own gates in real time, and Meta puts your facility
            in front of these renters before they ever open Google.
          </p>
        </Reveal>

        {/* Demand mix ledger */}
        <Reveal className="mt-10">
          <div
            className="flex items-baseline justify-between gap-3"
            style={{ borderBottom: "1px solid var(--line)", paddingBottom: 8 }}
          >
            <h3 style={{ fontSize: 15 }}>Why renters get a unit</h3>
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                color: "var(--text-faint)",
              }}
            >
              Multi-select · n = 6 · SSA Demand Study
              <Cite n={5} />
            </span>
          </div>
          <div className="mt-2">
            {DEMAND_MIX.map((d) => (
              <div
                key={d.label}
                className="grid items-center gap-3 py-2"
                style={{
                  gridTemplateColumns: "3.2rem 1fr minmax(80px, 38%)",
                  borderBottom: "1px dotted var(--line-dim)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--serif)",
                    fontWeight: 800,
                    fontSize: 17,
                    color: "var(--text-accent)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {d.pct}%
                </span>
                <span style={{ fontSize: 13.5, color: "var(--text-dim)" }}>{d.label}</span>
                <span aria-hidden="true" className="hidden sm:block" style={{ height: 8, background: "var(--ink-a06)", position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: `${(d.pct / 57) * 100}%`,
                      background: "var(--text)",
                      opacity: 0.85,
                    }}
                  />
                </span>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Trigger field notes */}
        <RevealStagger stagger={0.04} className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {TRIGGERS.map((t, i) => (
            <RevealItem
              key={t.title}
              className="py-5 sm:p-5"
              style={{
                borderBottom: "1px solid var(--line-dim)",
                borderRight: "1px solid var(--line-dim)",
              }}
            >
              <p
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 9,
                  letterSpacing: "0.12em",
                  color: "var(--text-faint)",
                  marginBottom: 8,
                }}
              >
                T-{String(i + 1).padStart(2, "0")}
              </p>
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>{t.title}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-dim)" }}>{t.body}</p>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
