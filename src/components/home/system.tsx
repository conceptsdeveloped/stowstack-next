"use client";

import { m, useReducedMotion } from "framer-motion";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import { DUR, EASE, VIEWPORT } from "@/lib/motion";
import SectionFrame from "./section-frame";

/**
 * § 03 — The system, split into its two halves: the ads and the pages.
 * Six parts, all copy verbatim from the previous SystemOverview. The
 * full-width band beneath states the product truth: the loop only
 * closes with both halves running.
 */

type Part = { n: string; title: string; body: string; details: string[] };

const ADS_PARTS: Part[] = [
  {
    n: "01",
    title: "Your market, mapped",
    body: "We pull your competitors, their pricing, their reviews, and your trade area. You see what they're charging on the units you're competing for.",
    details: [
      "Competitor pricing and review tracking",
      "Census demographics for your trade area",
      "Search volume for storage in your zip code",
    ],
  },
  {
    n: "02",
    title: "Meta and Google ads",
    body: "Meta ads reach renters before they search. Google captures the ones already looking. Retargeting brings back the ones who left. All three from one dashboard.",
    details: [
      "Facebook and Instagram campaigns",
      "Google Search and Display",
      "Retargeting across both",
    ],
  },
];

const PAGES_PARTS: Part[] = [
  {
    n: "03",
    title: "Landing pages built for the ad",
    body: "Each ad gets its own page with your rates and your offer. Built around your storEDGE reserve button, so the renter books right on your branded page.",
    details: [
      "One page per ad, with the offer that ad promised",
      "8.7% average reservation rate",
      "Fast on mobile, built for the reserve button",
    ],
  },
  {
    n: "04",
    title: "Reserve right on the page",
    body: "storEDGE handles the unit, the rate, the reservation. The renter never leaves your page. The reservation lands in your storEDGE the same as a walk-in.",
    details: [
      "Embedded storEDGE reservation widget",
      "Renter stays on your branded page",
      "Live unit availability and pricing",
    ],
  },
];

const CLOSE_PARTS: Part[] = [
  {
    n: "05",
    title: "Ad → move-in tracking",
    body: "Every move-in traces back to the ad that produced it. What you spent. What you got. What each move-in cost. Numbers, not adjectives.",
    details: [
      "Click → page → reservation → move-in",
      "What each move-in cost, by campaign",
      "What you got back, by ad",
    ],
  },
  {
    n: "06",
    title: "Gets sharper every month",
    body: "A/B tests on headlines, offers, and pages. Winners get picked by move-ins, not clicks. The system you turn on this month is better six months from now.",
    details: [
      "Move-in based A/B testing",
      "Creative scored by what filled units",
      "Compounding returns over time",
    ],
  },
];

function PartBlock({ part }: { part: Part }) {
  return (
    <div className="py-6" style={{ borderTop: "1px solid var(--line-dim)" }}>
      <div className="flex items-baseline gap-3 mb-2.5">
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "var(--track-label)",
            fontWeight: 600,
            color: "var(--accent)",
          }}
        >
          {part.n}
        </span>
        <h3 style={{ fontSize: 17 }}>{part.title}</h3>
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-dim)", maxWidth: 480 }}>
        {part.body}
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {part.details.map((d) => (
          <li
            key={d}
            className="flex items-center gap-2"
            style={{ fontSize: 12.5, color: "var(--text-faint)" }}
          >
            <span aria-hidden="true" style={{ width: 4, height: 4, background: "var(--text-faint)", flexShrink: 0 }} />
            {d}
          </li>
        ))}
      </ul>
    </div>
  );
}

function HalfPanel({
  label,
  sub,
  parts,
}: {
  label: string;
  sub: string;
  parts: Part[];
}) {
  return (
    <RevealItem className="home-card" style={{ border: "1px solid var(--line)", background: "var(--bg-alt)" }}>
      <div
        className="flex items-baseline justify-between gap-3"
        style={{ padding: "12px 18px", borderBottom: "1px solid var(--line)" }}
      >
        <span
          style={{
            fontFamily: "var(--serif)",
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: "-0.025em",
            color: "var(--text-accent)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "var(--track-label)",
            textTransform: "uppercase",
            color: "var(--text-faint)",
          }}
        >
          {sub}
        </span>
      </div>
      <div style={{ padding: "0 18px 12px" }}>
        {parts.map((part) => (
          <PartBlock key={part.n} part={part} />
        ))}
      </div>
    </RevealItem>
  );
}

/** Hand-drawn loop glyph that draws itself on scroll. */
function LoopGlyph() {
  const reduce = useReducedMotion();
  return (
    <svg viewBox="0 0 120 56" aria-hidden="true" style={{ width: 96, display: "block" }}>
      <m.path
        d="M 30 28 C 30 12, 60 12, 60 28 C 60 44, 90 44, 90 28 C 90 12, 60 12, 60 28 C 60 44, 30 44, 30 28 Z"
        fill="none"
        stroke="var(--accent)"
        strokeWidth="2"
        initial={reduce ? undefined : { pathLength: 0 }}
        whileInView={reduce ? undefined : { pathLength: 1 }}
        viewport={VIEWPORT}
        transition={{ duration: DUR.max, ease: EASE.inOut }}
      />
    </svg>
  );
}

export default function System() {
  return (
    <section
      id="system"
      aria-label="The six parts of the StorageAds system"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24">
        <SectionFrame
          number="03"
          kicker="The system"
          meta="Components · 6"
          as="h2"
          lines={["Six parts, wired together,", "built to fill units."]}
          lede="Market intelligence, ads, pages, the reserve flow, and reservation follow-up. One system, wired together, that fills units and shows its work."
        />

        <RevealStagger className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-5">
          <HalfPanel label="The ads" sub="Reach the renter" parts={ADS_PARTS} />
          <HalfPanel label="The pages" sub="Close the renter" parts={PAGES_PARTS} />
        </RevealStagger>

        {/* The loop only closes with both */}
        <Reveal className="mt-12">
          <LoopGlyph />
          <p
            className="mt-4"
            style={{
              fontFamily: "var(--serif)",
              fontSize: "var(--type-h2)",
              lineHeight: 1.12,
              letterSpacing: "var(--track-display)",
              fontWeight: 200,
              color: "var(--text-dim)",
              maxWidth: 900,
              textWrap: "balance",
            }}
          >
            Ads without pages leak. Pages without ads sit empty.{" "}
            <strong
              style={{
                fontWeight: 800,
                letterSpacing: "var(--track-tighter)",
                color: "var(--text-accent)",
              }}
            >
              The loop only closes with both.
            </strong>
          </p>
        </Reveal>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-x-10">
          {CLOSE_PARTS.map((part) => (
            <Reveal key={part.n}>
              <PartBlock part={part} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
