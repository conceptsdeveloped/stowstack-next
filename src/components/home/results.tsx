"use client";

import type { ReactNode } from "react";
import Cite from "@/components/marketing/cite";
import { CountUp } from "@/components/motion/count-up";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import SectionFrame from "./section-frame";

/**
 * § 05 — proof. Two dossiers from our own facilities, the ROI math,
 * and the four headline counters. All numbers verbatim from the
 * previous Results/StatsBar (portfolio data + cited benchmarks).
 */

type Stat = { value: ReactNode; label: string };

const CASES: Array<{
  name: string;
  location: string;
  desc: string;
  stats: Stat[];
  benchmark: ReactNode;
  cites: number[];
}> = [
  {
    name: "Midway Self Storage",
    location: "Cassopolis, MI",
    desc: "A 247-unit facility at 71% occupancy with no paid ads and a default storEDGE rental page. StorageAds launched a Meta campaign with 3 ad-specific landing pages targeting climate-controlled, vehicle storage, and first-month-free audiences.",
    stats: [
      { value: <CountUp to={34} />, label: "move-ins in 90 days" },
      { value: <CountUp to={41} prefix="$" />, label: "per move-in" },
      { value: "71% → 84%", label: "occupancy in one quarter" },
      { value: <CountUp to={35} suffix="x" />, label: "return on ad spend" },
    ],
    benchmark:
      "84% lands above the 87.2% independent average and within reach of the big operators' 92.6%. One quarter, one facility, no new units built.",
    cites: [1, 2],
  },
  {
    name: "Lakeshore Storage",
    location: "South Haven, MI",
    desc: "A seasonal market with 60% winter occupancy. StorageAds ran targeted campaigns for boat/RV storage and temperature-sensitive items during the fall shoulder season.",
    stats: [
      { value: <CountUp to={22} />, label: "move-ins in 60 days" },
      { value: <CountUp to={38} prefix="$" />, label: "per move-in" },
      { value: <CountUp to={74} suffix="%" />, label: "winter occupancy (vs 60% prior year)" },
      { value: <CountUp to={8.7} decimals={1} suffix="%" />, label: "of page visitors reserved (vs 2.1% industry)" },
    ],
    benchmark:
      "+14 points of winter occupancy in a market where the national web rate dropped 4.71% YoY. The renters were there. The system just had to reach them.",
    cites: [3],
  },
];

const HEADLINE_STATS: Stat[] = [
  { value: <CountUp to={34} />, label: "Move-ins, 90 days" },
  { value: <CountUp to={84} suffix="%" />, label: "Occupancy, one quarter" },
  { value: <CountUp to={8.7} decimals={1} suffix="%" />, label: "Page conversion rate" },
  { value: <CountUp to={35} suffix="x" />, label: "Return on ad spend" },
];

export default function Results() {
  return (
    <section
      id="results"
      aria-label="Case studies and operator results"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24">
        <SectionFrame
          number="05"
          kicker="Results"
          meta="Case studies"
          as="h2"
          lines={["We tested it on our own", "facilities first.", "Here's what happened."]}
          lede="Two facilities. Real campaigns. Numbers pulled directly from storEDGE and the StorageAds reporting layer. No case-study polish."
        />

        <RevealStagger className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
          {CASES.map((c) => (
            <RevealItem
              key={c.name}
              className="home-card"
              style={{ border: "1px solid var(--line)", background: "var(--bg-alt)" }}
            >
              <div
                className="flex items-baseline justify-between gap-3 flex-wrap"
                style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}
              >
                <h3 style={{ fontSize: 19 }}>{c.name}</h3>
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "var(--track-label)",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                  }}
                >
                  {c.location}
                </span>
              </div>
              <p style={{ padding: "14px 18px 0", fontSize: 13.5, lineHeight: 1.6, color: "var(--text-dim)" }}>
                {c.desc}
              </p>
              <div className="grid grid-cols-2" style={{ padding: "14px 18px" }}>
                {c.stats.map((s, i) => (
                  <div
                    key={s.label}
                    style={{
                      padding: "12px 14px 12px 0",
                      borderTop: i >= 2 ? "1px solid var(--line-dim)" : undefined,
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--serif)",
                        fontWeight: 800,
                        fontSize: "clamp(1.5rem, 1.1rem + 1.5vw, 2.25rem)",
                        letterSpacing: "var(--track-tighter)",
                        color: "var(--text-accent)",
                        lineHeight: 1.05,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {s.value}
                    </p>
                    <p style={{ fontSize: 11.5, color: "var(--text-faint)", marginTop: 4, lineHeight: 1.4 }}>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
              <div
                className="flex items-start gap-3"
                style={{ padding: "12px 18px", borderTop: "1px solid var(--line)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    border: "1px solid var(--line-hi)",
                    color: "var(--text-dim)",
                    padding: "2px 6px",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  Benchmark
                </span>
                <p style={{ fontSize: 12.5, lineHeight: 1.55, color: "var(--text-dim)" }}>
                  {c.benchmark}
                  <Cite n={c.cites} />
                </p>
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        {/* The math */}
        <Reveal className="mt-12" style={{ maxWidth: 760 }}>
          <p style={{ fontSize: "var(--type-lede)", lineHeight: 1.65, color: "var(--text-dim)" }}>
            <strong style={{ color: "var(--text-accent)", fontWeight: 700 }}>
              Here&apos;s the math.
            </strong>{" "}
            A move-in at a typical facility pays $130 a month and stays 14
            months. That&apos;s about $1,820 per move-in. Five to ten extra
            move-ins a month adds $9,000-18,000 in future rent every month.
            The System tier plus a typical ad budget runs about $1,750 a
            month. That&apos;s 5-10x before the system even starts tightening
            up.
          </p>
          <p className="mt-4" style={{ fontSize: "var(--type-lede)", lineHeight: 1.65, color: "var(--text-dim)" }}>
            And it compounds. As the move-in data stacks up over six months,
            what you pay for each move-in drops and the reserve rate climbs.
            The math only gets better with time.
          </p>
        </Reveal>

        {/* Headline counters */}
        <RevealStagger
          className="mt-12 grid grid-cols-2 lg:grid-cols-4"
          style={{ borderTop: "1px solid var(--line)" }}
        >
          {HEADLINE_STATS.map((s) => (
            <RevealItem
              key={s.label}
              className="py-7 px-2 sm:px-5"
              style={{ borderBottom: "1px solid var(--line-dim)", borderRight: "1px solid var(--line-dim)" }}
            >
              <p
                style={{
                  fontFamily: "var(--serif)",
                  fontWeight: 800,
                  fontSize: "var(--type-num)",
                  letterSpacing: "var(--track-tighter)",
                  lineHeight: 1,
                  color: "var(--text-accent)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}
              </p>
              <p
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 10,
                  letterSpacing: "var(--track-label)",
                  textTransform: "uppercase",
                  color: "var(--text-faint)",
                  marginTop: 8,
                }}
              >
                {s.label}
              </p>
            </RevealItem>
          ))}
        </RevealStagger>
      </div>
    </section>
  );
}
