"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { SectionHeader, SectionMeta } from "@/components/mono/section-header";
import { useInView } from "./use-in-view";

/**
 * Homepage FAQ. The questions are phrased the way an operator would
 * actually ask them, not the way a marketing team would headline them.
 * Detailed billing / contract / ROI questions live on /pricing — these
 * are the eight things a curious operator wants answered before they
 * book a call.
 */

const FAQS: { q: string; a: string }[] = [
  {
    q: "We're not running any ads right now.",
    a: "Most independent operators aren't. The system is built for that starting point. Market mapping, ad creation, publishing, landing pages, and conversion tracking deploy from zero in the first week.",
  },
  {
    q: "What does the system include?",
    a: "Market intelligence. Ad creation and publishing to Meta and Google. Dedicated landing pages with storEDGE rental embedded. Retargeting. A/B testing scored by move-in outcome. Reservation-to-move-in conversion. Revenue intelligence. Organic capture. One dashboard.",
  },
  {
    q: "Do we need marketing experience to operate it?",
    a: "No. The Ad Creator generates campaigns from your facility data. The Publishing Manager deploys them. The system handles targeting, bidding, and creative rotation. Operators approve and monitor.",
  },
  {
    q: "What is the deployment timeline?",
    a: "Ads live in the first week. Move-ins begin in weeks two through three as the campaigns accumulate data and retargeting activates. Performance benchmarks are established by month three.",
  },
  {
    q: "How does the AI Creative Studio work?",
    a: "It generates ad copy, headlines, and landing page variants from your facility data — unit types, pricing, location, competitive positioning. You review and publish. New creative on demand without a retainer.",
  },
  {
    q: "Single-facility operators?",
    a: "The system was built on a single facility and runs on our own portfolio. One facility is the primary use case. Enterprise tiers exist for ten or more.",
  },
  {
    q: "storEDGE integration.",
    a: "Landing pages embed the storEDGE reservation widget. The renter books on your branded page. The reservation appears in storEDGE identically to a walk-in. Rates, availability, and payment processing remain in your existing system.",
  },
  {
    q: "Performance guarantee.",
    a: "If move-in volume has not improved by the end of month three, month four is complimentary. We deploy this system on our own facilities. Our interests are aligned.",
  },
];

export default function FAQ() {
  const { ref, isVisible } = useInView();
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-label="Frequently asked questions"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="section-content">
        <SectionHeader
          number="08"
          kicker="QUESTIONS"
          right={<SectionMeta text={`${FAQS.length} ANSWERS`} />}
          style={{ marginBottom: 24 }}
        />

        <div
          className={`max-w-3xl mx-auto text-center mb-10 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            Common questions from operators.
          </h2>
          <p className="mt-4 mx-auto max-w-xl" style={{ color: "var(--text-secondary)" }}>
            If yours isn&apos;t here, email{" "}
            <a
              href="mailto:blake@storageads.com"
              className="font-medium underline decoration-1 underline-offset-4 transition-colors hover:text-[var(--color-dark)]"
              style={{ color: "var(--color-dark)" }}
            >
              blake@storageads.com
            </a>
            . You&apos;ll get the founder, not a help desk.
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div
                key={faq.q}
                className={`border-b transition-all duration-700 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
                }`}
                style={{
                  borderColor: "var(--border-subtle)",
                  borderTop: i === 0 ? "1px solid var(--border-subtle)" : undefined,
                  transitionDelay: `${100 + i * 60}ms`,
                }}
              >
                <button
                  type="button"
                  id={`faq-btn-${i}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${i}`}
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="w-full flex items-start justify-between gap-6 text-left py-5 transition-colors hover:bg-[var(--color-light-gray)]/30 cursor-pointer"
                >
                  <h3
                    className="text-base sm:text-lg font-semibold flex-1"
                    style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}
                  >
                    {faq.q}
                  </h3>
                  <span
                    className="flex-shrink-0 w-6 h-6 flex items-center justify-center mt-1"
                    aria-hidden="true"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                <div
                  id={`faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`faq-btn-${i}`}
                  aria-hidden={!isOpen}
                  className="overflow-hidden transition-all duration-300"
                  style={{
                    maxHeight: isOpen ? 400 : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                >
                  <p
                    className="pb-5 pr-12 text-[15px]"
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: "var(--leading-normal)",
                    }}
                  >
                    {faq.a}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
