"use client";

import Cite from "@/components/marketing/cite";
import { Reveal, RevealStagger, RevealItem } from "@/components/motion/reveal";
import SectionFrame from "./section-frame";

/**
 * § 04 — capability contrast vs the three software categories an
 * operator could buy today. Every cell, detail line, and the footnote
 * are verbatim from the previous FourWayComparison.
 */

type Mark = "yes" | "limited" | "no";

const COLUMNS: Array<{ name: string; sub: string }> = [
  { name: "StorageAds", sub: "The whole system" },
  { name: "StorageRankers", sub: "SEO + websites" },
  { name: "Adverank", sub: "Google PPC automation" },
  { name: "SpareFoot", sub: "Pay-per-lead directory" },
];

const ROWS: Array<{ cap: string; detail: string; marks: [Mark, Mark, Mark, Mark] }> = [
  {
    cap: "Meta ads",
    detail: "Facebook + Instagram, the cheaper channel most operators skip",
    marks: ["yes", "no", "no", "no"],
  },
  {
    cap: "Google ads",
    detail: "Search + display, the channel renters are actively shopping in",
    marks: ["yes", "limited", "yes", "no"],
  },
  {
    cap: "Custom landing page per campaign",
    detail: "Each ad sends to its own page with its own offer, not your homepage",
    marks: ["yes", "limited", "no", "no"],
  },
  {
    cap: "storEDGE rental flow embedded",
    detail: "Renter reserves and pays without ever leaving your branded page",
    marks: ["yes", "no", "no", "no"],
  },
  {
    cap: "Every move-in tracked back to its ad",
    detail: "Not clicks. Not leads. The actual unit that got rented",
    marks: ["yes", "no", "limited", "no"],
  },
  {
    cap: "You own the leads",
    detail: "Tenants are yours from day one, not rented or resold",
    marks: ["yes", "yes", "yes", "no"],
  },
  {
    cap: "Built by a working storage operator",
    detail: "Tested on our own facilities before anyone else's",
    marks: ["yes", "no", "no", "no"],
  },
  {
    cap: "Free facility audit before you sign",
    detail: "See what's broken before you pay anyone a dollar",
    marks: ["yes", "no", "no", "no"],
  },
];

function MarkCell({ mark, hero }: { mark: Mark; hero?: boolean }) {
  if (mark === "yes") {
    return (
      <svg
        viewBox="0 0 14 14"
        role="img"
        aria-label="Included"
        style={{ width: 14, height: 14, display: "inline-block" }}
      >
        <rect
          x="0.5"
          y="0.5"
          width="13"
          height="13"
          fill={hero ? "var(--accent)" : "var(--text)"}
        />
        <path
          d="M3.5 7.2 L6 9.7 L10.5 4.6"
          fill="none"
          stroke="var(--bg)"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (mark === "limited") {
    return (
      <span
        style={{
          fontFamily: "var(--mono)",
          fontSize: 9,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          border: "1px solid var(--line-hi)",
          color: "var(--text-dim)",
          padding: "2px 5px",
        }}
      >
        Limited
      </span>
    );
  }
  return (
    <span role="img" aria-label="Not offered" style={{ color: "var(--text-faint)", fontSize: 13 }}>
      —
    </span>
  );
}

const BEFORE_AFTER: Array<{ before: string; after: string }> = [
  { before: "No ads running", after: "Meta and Google ads live in your trade area" },
  { before: "No idea what competitors charge", after: "Market map with pricing, reviews, and positioning" },
  { before: "Every ad dumps onto the homepage", after: "A branded page per campaign with storEDGE built in" },
  { before: "Reservations that never move in", after: "Automated follow-up from reservation to signed lease" },
];

export default function Comparison() {
  return (
    <section
      aria-label="StorageAds vs StorageRankers, Adverank, and SpareFoot"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24">
        <SectionFrame
          number="04"
          kicker="Vs the alternatives"
          meta="Matrix · 4×8"
          as="h2"
          lines={["Everyone else does one slice.", "We do the whole thing."]}
          headlineWeight="thin"
          size="var(--type-h2)"
          lede={
            <>
              Three categories of marketing software you could buy today. None
              of them takes a renter all the way from ad to signed lease.
              Closing the 5-point gap to the 92.6% REIT band
              <Cite n={[1, 2]} />{" "}takes the whole system. Picking one slice
              below leaves the rest uncovered.
            </>
          }
          maxLedeWidth={680}
        />

        {/* Desktop table */}
        <Reveal className="mt-10 hidden md:block">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <caption className="sr-only">
              Capability comparison: StorageAds vs StorageRankers, Adverank, and SpareFoot
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="text-left"
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "var(--track-label)",
                    textTransform: "uppercase",
                    color: "var(--text-faint)",
                    fontWeight: 500,
                    padding: "10px 12px 10px 0",
                    borderBottom: "1px solid var(--line)",
                    width: "34%",
                  }}
                >
                  Capability
                </th>
                {COLUMNS.map((c, i) => (
                  <th
                    key={c.name}
                    scope="col"
                    style={{
                      padding: "10px 12px",
                      borderBottom: "1px solid var(--line)",
                      background: i === 0 ? "var(--bg-ink)" : undefined,
                      textAlign: "center",
                    }}
                  >
                    <span
                      style={{
                        display: "block",
                        fontSize: 14,
                        fontWeight: 800,
                        letterSpacing: "-0.02em",
                        color: i === 0 ? "var(--bg)" : "var(--text-accent)",
                      }}
                    >
                      {c.name}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontFamily: "var(--mono)",
                        fontSize: 9,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        fontWeight: 400,
                        marginTop: 2,
                        color: i === 0 ? "var(--text-on-ink-dim)" : "var(--text-faint)",
                      }}
                    >
                      {c.sub}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.cap}>
                  <th
                    scope="row"
                    className="text-left"
                    style={{ padding: "12px 12px 12px 0", borderBottom: "1px solid var(--line-dim)", fontWeight: 400 }}
                  >
                    <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-accent)" }}>
                      {row.cap}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: "var(--text-faint)", marginTop: 2, lineHeight: 1.5 }}>
                      {row.detail}
                    </span>
                  </th>
                  {row.marks.map((mark, i) => (
                    <td
                      key={i}
                      style={{
                        textAlign: "center",
                        padding: "12px",
                        borderBottom: "1px solid var(--line-dim)",
                        background: i === 0 ? "var(--ink-a03)" : undefined,
                        borderLeft: i === 0 ? "1px solid var(--line)" : "1px solid var(--line-dim)",
                        borderRight: i === 0 ? "1px solid var(--line)" : undefined,
                      }}
                    >
                      <MarkCell mark={mark} hero={i === 0} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>

        {/* Mobile stacked cards */}
        <RevealStagger className="mt-8 md:hidden flex flex-col gap-3">
          {ROWS.map((row) => (
            <RevealItem
              key={row.cap}
              style={{ border: "1px solid var(--line-dim)", background: "var(--bg-alt)", padding: 14 }}
            >
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-accent)" }}>{row.cap}</p>
              <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2, lineHeight: 1.5 }}>
                {row.detail}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {COLUMNS.map((c, i) => (
                  <div
                    key={c.name}
                    className="flex items-center justify-between gap-2"
                    style={{
                      border: "1px solid var(--line-dim)",
                      padding: "6px 8px",
                      background: i === 0 ? "var(--ink-a06)" : "transparent",
                    }}
                  >
                    <span style={{ fontFamily: "var(--mono)", fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                      {c.name}
                    </span>
                    <MarkCell mark={row.marks[i]} hero={i === 0} />
                  </div>
                ))}
              </div>
            </RevealItem>
          ))}
        </RevealStagger>

        <Reveal>
          <p className="mt-5" style={{ fontSize: 11.5, lineHeight: 1.6, color: "var(--text-faint)", maxWidth: 720 }}>
            Competitor capabilities reflect publicly published product pages as
            of 2025. &ldquo;Limited&rdquo; means the vendor offers a partial
            version of the feature (one channel, generic template, no embedded
            rental). If something here is wrong, email blake@storageads.com
            and we&apos;ll fix it.
          </p>
        </Reveal>

        {/* Before / after — replacing the hand-run workflows */}
        <div className="mt-16">
          <Reveal>
            <div
              className="flex items-baseline justify-between gap-3"
              style={{ borderBottom: "1px solid var(--line)", paddingBottom: 10 }}
            >
              <h3 style={{ fontSize: "var(--type-h3)" }}>Stop waiting. Start filling.</h3>
              <span className="hidden sm:block" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "var(--track-label)", textTransform: "uppercase", color: "var(--text-faint)" }}>
                Workflows · 4
              </span>
            </div>
            <p className="mt-3" style={{ fontSize: 14, color: "var(--text-dim)", maxWidth: 460 }}>
              How StorageAds replaces the workflows operators are still running
              by hand.
            </p>
          </Reveal>
          <RevealStagger className="mt-4">
            {BEFORE_AFTER.map((pair) => (
              <RevealItem
                key={pair.before}
                className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-8 py-4"
                style={{ borderBottom: "1px solid var(--line-dim)" }}
              >
                <p
                  style={{
                    fontSize: 15,
                    color: "var(--text-faint)",
                    textDecoration: "line-through",
                    textDecorationColor: "var(--accent)",
                    textDecorationThickness: 1,
                  }}
                >
                  {pair.before}
                </p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-accent)" }}>
                  <span aria-hidden="true" style={{ color: "var(--hue-c)", marginRight: 8 }}>→</span>
                  {pair.after}
                </p>
              </RevealItem>
            ))}
          </RevealStagger>
        </div>
      </div>
    </section>
  );
}
