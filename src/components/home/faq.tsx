"use client";

import { useState, type ReactNode } from "react";
import Cite from "@/components/marketing/cite";
import { RevealStagger, RevealItem } from "@/components/motion/reveal";
import SectionFrame from "./section-frame";

/**
 * § 07 — objection handling. All 11 Q&A pairs verbatim from the
 * previous FAQ, same aria wiring (faq-btn-N / faq-panel-N), first item
 * open by default.
 */

const FAQS: Array<{ q: string; a: ReactNode }> = [
  {
    q: "We're not running any ads right now.",
    a: "Most independent operators aren't. The system is built for that starting point. Market mapping, ads, landing pages, and follow-up all deploy from zero in the first week.",
  },
  {
    q: "What does the system include?",
    a: "Market intelligence. Ad creation and publishing to Meta and Google. Dedicated landing pages with storEDGE rental embedded. Retargeting. A/B testing scored by move-in outcome. Reservation-to-move-in conversion. Revenue intelligence. Organic capture. One dashboard.",
  },
  {
    q: "Do we need marketing experience to run it?",
    a: "No. The Ad Creator builds campaigns from your facility data. The Publishing Manager puts them live. The system handles targeting, bidding, and creative rotation. You approve and watch the numbers.",
  },
  {
    q: "How fast is it live?",
    a: "Ads are live in the first week. Move-ins start in weeks two through three as the campaigns gather data and retargeting kicks in. By month three you have a real baseline.",
  },
  {
    q: "How does the AI Creative Studio work?",
    a: "It generates ad copy, headlines, and landing page variants from your facility data: unit types, pricing, location, competitive positioning. You review and publish. New creative on demand without a retainer.",
  },
  {
    q: "We already get plenty of walk-ins and Google traffic.",
    a: (
      <>
        Good. That puts you ahead of most independents. The catch is
        Google&apos;s local algorithm weights proximity and review recency
        over brand size, which is the one place independents can outrank REIT
        locations. If you&apos;re not actively managing Google Business
        Profile, reviews, and retargeting the visitors you already get,
        you&apos;re sitting on the lever that costs the REITs $250M a year to
        operate at scale.
        <Cite n={6} />{" "}The audit shows you which side of that gap you&apos;re
        on.
      </>
    ),
  },
  {
    q: "We're in Texas (or Florida, or a Sun Belt metro). The market is rough.",
    a: (
      <>
        It is. San Antonio added roughly 656,000 square feet of new supply in
        2026. Houston added 430,000.
        <Cite n={10} />{" "}National supply growth is still slowing to 1.5% a year
        through 2027, but the oversupplied metros are absorbing first. You
        can&apos;t make new supply disappear. You can control how your
        facility prices against competitors, how fast you respond to leads,
        how your reviews read, and how the page performs at 11pm on a Sunday.
        That&apos;s the lever, and it&apos;s what the system runs.
      </>
    ),
  },
  {
    q: "California passed SB 709. Should we worry about ECRI legislation?",
    a: (
      <>
        If you&apos;re in California, yes: SB 709 caps annual
        existing-customer rate increases at the lower of 5% + CPI or 10% as of
        January 2026.
        <Cite n={[7, 8]} />{" "}Twenty-four states introduced storage pricing
        bills in 2025. The NYC Department of Consumer and Worker Protection
        has an active case against Extra Space over the bait-and-switch ECRI
        playbook. The era of low introductory rate plus aggressive ECRI is
        closing. Operators who can&apos;t run real demand generation get
        squeezed first. The system is built so new-customer acquisition is
        your durable lever, not pricing tactics regulators are killing.
      </>
    ),
  },
  {
    q: "We only have one facility. Is this for us?",
    a: "Yes. The system was built on a single facility and runs on our own portfolio. One facility is the primary use case. Enterprise tiers exist for ten or more.",
  },
  {
    q: "How does the storEDGE integration work?",
    a: "Landing pages embed the storEDGE reservation widget. The renter books on your branded page, and the reservation lands in storEDGE the same as a walk-in. Rates, availability, and payments stay in your existing system.",
  },
  {
    q: "What if it doesn't work?",
    a: "If move-ins haven't improved by the end of month three, month four is free. We run this same system on our own facilities. We're in the same boat.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-14 sm:py-20 lg:py-24">
        <SectionFrame
          number="07"
          kicker="Questions"
          meta={`${FAQS.length} answers`}
          as="h2"
          lines={["Common questions", "from operators."]}
          size="var(--type-h2)"
          lede={
            <>
              If yours isn&apos;t here, email{" "}
              <a
                href="mailto:blake@storageads.com"
                className="home-link"
                style={{ color: "var(--text)", fontWeight: 600 }}
              >
                blake@storageads.com
              </a>
              . You&apos;ll get the founder, not a help desk.
            </>
          }
        />

        <RevealStagger stagger={0.03} className="mt-10 max-w-[880px]" style={{ borderTop: "1px solid var(--line)" }}>
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <RevealItem key={f.q} style={{ borderBottom: "1px solid var(--line-dim)" }}>
                <h3 style={{ margin: 0 }}>
                  <button
                    id={`faq-btn-${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="w-full flex items-baseline gap-4 text-left"
                    style={{
                      padding: "18px 2px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      minHeight: 44,
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        letterSpacing: "0.1em",
                        color: isOpen ? "var(--accent)" : "var(--text-faint)",
                        flexShrink: 0,
                        width: 22,
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="flex-1"
                      style={{
                        fontSize: 16,
                        fontWeight: isOpen ? 700 : 600,
                        letterSpacing: "-0.015em",
                        color: "var(--text-accent)",
                        lineHeight: 1.4,
                      }}
                    >
                      {f.q}
                    </span>
                    <span
                      aria-hidden="true"
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 15,
                        color: isOpen ? "var(--accent)" : "var(--text-faint)",
                        flexShrink: 0,
                      }}
                    >
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  aria-hidden={!isOpen}
                  style={{
                    display: "grid",
                    gridTemplateRows: isOpen ? "1fr" : "0fr",
                    transition: "grid-template-rows 300ms cubic-bezier(0.22,1,0.36,1)",
                  }}
                >
                  <div style={{ overflow: "hidden" }}>
                    <p
                      style={{
                        fontSize: 14.5,
                        lineHeight: 1.65,
                        color: "var(--text-dim)",
                        padding: "0 28px 18px 38px",
                        maxWidth: 720,
                        opacity: isOpen ? 1 : 0,
                        transition: "opacity 240ms ease",
                      }}
                    >
                      {f.a}
                    </p>
                  </div>
                </div>
              </RevealItem>
            );
          })}
        </RevealStagger>
      </div>
    </section>
  );
}
