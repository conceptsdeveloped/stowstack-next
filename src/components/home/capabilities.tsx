"use client";

import { RevealStagger, RevealItem, Reveal } from "@/components/motion/reveal";

/**
 * The full capabilities grid — every cell verbatim from the previous
 * CapabilitiesGrid, descriptions always visible (the old hover-reveal
 * hid half the grid's content from pointer users until hover).
 */
const CAPABILITIES = [
  {
    label: "Market Intelligence",
    desc: "Competitor pricing, reviews, positioning, and trade area analysis. See the field before you spend a dollar.",
  },
  {
    label: "Ad Creator",
    desc: "Generate Meta and Google ads from facility data. Copy, headlines, creative.",
  },
  {
    label: "Publishing Manager",
    desc: "Publish to Meta and Google from one dashboard. Both channels, side by side.",
  },
  {
    label: "Landing Pages",
    desc: "A page for every campaign. storEDGE rental flow embedded so the renter books on your branded page.",
  },
  {
    label: "Organic Capture",
    desc: "Google Business Profile, review management, walk-in capture. The leads you already get, organized.",
  },
  {
    label: "Reservation Conversion",
    desc: "Automated follow-up that turns reservations into move-ins. Stop leaking revenue at the last step.",
  },
  {
    label: "A/B Testing",
    desc: "Headlines, offers, and pages scored by move-ins, not clicks.",
  },
  {
    label: "Revenue Intelligence",
    desc: "Rate moves, ancillary revenue, tax advantages, occupancy modeling. Every tenant worth more.",
  },
];

export default function Capabilities() {
  return (
    <section aria-label="Everything in the system: capabilities grid">
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pb-14 sm:pb-20">
        <Reveal>
          <div
            className="flex items-baseline justify-between gap-3"
            style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}
          >
            <h2 style={{ fontSize: "var(--type-h3)" }}>Everything in the system</h2>
            <span
              className="hidden sm:block"
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                color: "var(--text-faint)",
              }}
            >
              Modules · 8
            </span>
          </div>
        </Reveal>

        <RevealStagger
          stagger={0.04}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        >
          {CAPABILITIES.map((c, i) => (
            <RevealItem
              key={c.label}
              className="home-card py-5 sm:p-5"
              style={{
                borderBottom: "1px solid var(--line-dim)",
                borderRight: "1px solid var(--line-dim)",
                borderLeft: i % 4 === 0 ? "1px solid transparent" : undefined,
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
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 style={{ fontSize: 15, marginBottom: 6 }}>{c.label}</h3>
              <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text-dim)" }}>
                {c.desc}
              </p>
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <p
            className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1"
            style={{ fontSize: 14, color: "var(--text-dim)" }}
          >
            <span
              style={{
                fontFamily: "var(--mono)",
                fontSize: 10,
                letterSpacing: "var(--track-label)",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--text-accent)",
              }}
            >
              Self-serve or fully managed
            </span>
            Run it yourself or have us run it. Same system either way.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
