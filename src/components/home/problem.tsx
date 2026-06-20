"use client";

import type { ReactNode } from "react";
import Cite from "@/components/marketing/cite";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import SectionFrame from "./section-frame";

/**
 * § 01 — The problem. The four truths typeset as muted ledger entries
 * (the old way reads flat on purpose); the section turns on the heavy
 * "Until now." and the accent kicker.
 */

function Hi({ children }: { children: ReactNode }) {
  return (
    <strong style={{ color: "var(--accent)", fontWeight: 600 }}>{children}</strong>
  );
}

const PROBLEMS: Array<{
  heading: string;
  cites?: number[];
  body: ReactNode;
}> = [
  {
    heading: "The occupancy gap with the big operators is 5+ points.",
    cites: [1, 2, 3],
    body: (
      <>
        Extra Space ran 92.6% occupancy in Q4 2025. The independent
        average sits at 87.2% across a panel of 70,000+ properties. At a
        500-unit facility, that gap is around <Hi>$72,000 a year</Hi>{" "}in
        revenue you&apos;re not collecting, and around $1.3M of asset value at
        a 5.5% cap. The gap closes with marketing infrastructure, not a
        renovation, a new sign, or a better location.
      </>
    ),
  },
  {
    heading: "Independents are outspent 1,000-to-1 on Google search.",
    cites: [6],
    body: (
      <>
        The top REITs spend $250M+ a year on digital marketing and handle 85%
        of customer interactions digitally. The independent down the road is
        competing for the same renter with no ads running, a default rental
        page, and a Google Business Profile no one is tending. The good news:
        Google weighs proximity and review recency over brand size in local
        search. The lever exists. Most operators just aren&apos;t pulling it.
      </>
    ),
  },
  {
    heading: "Revenue leakage compounds monthly.",
    body: (
      <>
        Reservations that never move in. Competitors you haven&apos;t priced
        against. Reviews unanswered. Google traffic uncaptured. Visitors who
        leave and never come back. Each one is money leaking out of the
        building. The system <Hi>finds the leaks and plugs them</Hi>.
      </>
    ),
  },
  {
    heading: "The economics still work at independent scale.",
    cites: [3],
    body: (
      <>
        A storage tenant is worth $1,820 over an average 14-month stay at $130
        a month. Landing that tenant on the StorageAds system costs $41.
        That&apos;s <Hi>44-to-1</Hi>{" "}on every extra move-in, the same math the
        national chains run on. It works the same for 150 units as it does for 15,000.
      </>
    ),
  },
];

export default function Problem() {
  return (
    <section
      id="problem"
      aria-label="The problem with current self-storage marketing"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24">
        <SectionFrame
          number="01"
          kicker="The problem"
          meta="Truth · 4"
          as="h2"
          lines={[
            "The economics are simple.",
            "The infrastructure to act on them",
            "hasn't existed for independents.",
            "Until now.",
          ]}
          size="var(--type-h2)"
          headlineWeight="thin"
        />

        <Reveal delay={0.15}>
          <p
            className="mt-6"
            style={{
              fontSize: "var(--type-lede)",
              lineHeight: 1.6,
              color: "var(--text-dim)",
              maxWidth: 720,
            }}
          >
            REITs hit 92.6% occupancy
            <Cite n={1} />. Independents average 87.2%
            <Cite n={2} />. The gap is worth around $72,000 a year at a
            500-unit facility, and around $1.3M in asset value at a 5.5% cap
            <Cite n={3} />. Most operators can&apos;t tell which ads filled
            which units. Most aren&apos;t running ads at all.
          </p>
          <p
            className="mt-8"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "var(--track-label)",
              textTransform: "uppercase",
              fontWeight: 600,
              color: "var(--text-accent)",
            }}
          >
            Here&apos;s what&apos;s actually happening.
          </p>
        </Reveal>

        <RevealStagger className="mt-6 grid grid-cols-1 md:grid-cols-2" style={{ borderTop: "1px solid var(--line)" }}>
          {PROBLEMS.map((p, i) => (
            <RevealItem
              key={p.heading}
              className="py-7 md:p-8"
              style={{
                borderBottom: "1px solid var(--line-dim)",
                borderRight:
                  i % 2 === 0 ? "1px solid var(--line-dim)" : undefined,
              }}
            >
              <p
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "var(--track-label)",
                  textTransform: "uppercase",
                  color: "var(--text-faint)",
                  marginBottom: 12,
                }}
              >
                Truth {String(i + 1).padStart(2, "0")}
              </p>
              <h3
                style={{
                  fontSize: "var(--type-h3)",
                  marginBottom: 12,
                  maxWidth: 460,
                }}
              >
                {p.heading}
                {p.cites && <Cite n={p.cites} />}
              </h3>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: "var(--text-dim)", maxWidth: 520 }}>
                {p.body}
              </p>
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal delay={0.1}>
          <p
            className="mt-10"
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 200,
              letterSpacing: "var(--track-display)",
              fontSize: "clamp(1.5rem, 1rem + 2.6vw, 2.875rem)",
              lineHeight: 1.2,
              color: "var(--accent)",
              maxWidth: 880,
              textWrap: "balance",
            }}
          >
            Every month you wait, the REIT down the road fills the units you
            didn&apos;t.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
