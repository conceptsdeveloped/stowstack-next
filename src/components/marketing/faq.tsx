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
    q: "Is this an agency?",
    a: "No. An agency runs your ads under their brand and keeps the campaigns, landing pages, and creative in their accounts. StorageAds is software you sign up for — the ads, the pages, the tracking, everything lives in your dashboard. If you leave, the ad accounts and pages are still yours.",
  },
  {
    q: "Do I have to know anything about marketing?",
    a: "No. The system is built so you don't. You tell us about the facility, we run the ads and build the pages, and the dashboard tells you what's filling units. If you want to dig in, the data's all there. If you don't, the move-in count is the number that matters.",
  },
  {
    q: "How fast does it work?",
    a: "First leads inside seven days. Move-ins start landing in the second or third week as the campaigns gather data and the retargeting fires on the visitors who didn't reserve the first time.",
  },
  {
    q: "What if I'm already running ads with someone else?",
    a: "We'll audit what's there before we touch anything. If your current setup is producing move-ins, we'll tell you. If it's burning cash on clicks that don't convert, you'll have the proof in writing. No contract to leave them, no commitment to start with us.",
  },
  {
    q: "Why is the cost per move-in so low compared to SpareFoot?",
    a: "Because you're buying ads at media-cost, not paying a finder's fee. SpareFoot takes two months of rent per move-in, forever. We charge a flat fee and the ad spend goes to Meta and Google at cost. On a $150/mo unit at 10 move-ins per month, the math isn't close.",
  },
  {
    q: "Does it work for one facility or do I need a portfolio?",
    a: "One is fine. The system was built on a single facility (Two Paws in Paw Paw) and is run live on two of ours. There's a separate enterprise tier for ten or more, but everything below that is per-facility pricing.",
  },
  {
    q: "What happens to my storEDGE setup?",
    a: "Nothing changes. The landing pages embed the storEDGE reservation widget, so the renter books on your branded page and the reservation lands in storEDGE the same as a walk-in. Rates, availability, payment — all stays in your existing system.",
  },
  {
    q: "What if it doesn't work?",
    a: "If your move-in count hasn't moved in the right direction by the end of month three, month four is on us. No invoice. No fine print. We eat it.",
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
          style={{ marginBottom: 28 }}
        />

        <div
          className={`max-w-3xl mx-auto text-center mb-12 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            The stuff operators actually ask.
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
                  aria-expanded={isOpen}
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
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
                  </span>
                </button>
                <div
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
