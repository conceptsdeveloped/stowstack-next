"use client";

import { useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/motion/reveal";
import SectionFrame from "./section-frame";
import LoopPinned from "./loop/pinned";
import LoopStacked from "./loop/stacked";
import { MARKET_STEP, LOOP_KICKER, microLabel } from "./loop/data";

/**
 * § 02 — THE CENTERPIECE. One renter's path, ad → ad-matched page →
 * embedded storEDGE reservation → attributed move-in, as a pinned
 * scroll-driven scene (lg+). Stacks gracefully below 1024px and under
 * reduced motion. Anchored as #how-it-works (nav contract).
 */
export default function TheLoop() {
  const reduce = useReducedMotion();

  return (
    <section
      id="how-it-works"
      aria-label="How StorageAds works: from ad dollar to signed lease"
      style={{ borderTop: "1px solid var(--line)" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pt-14 sm:pt-20 lg:pt-24">
        <SectionFrame
          number="02"
          kicker="How it works"
          meta="One loop · 4 stages"
          as="h2"
          lines={["From ad dollar", "to signed lease."]}
          lede={
            <>
              Market intelligence, ads, landing pages, the storEDGE reserve
              flow, and follow-up that turns reservations into move-ins. One
              system, start to finish.
            </>
          }
        />

        {/* Step 00 — before the loop: the market map */}
        <Reveal delay={0.1}>
          <div
            className="mt-10 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 py-6"
            style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line-dim)" }}
          >
            <p className="md:col-span-3" style={{ ...microLabel, fontSize: 10, color: "var(--text-faint)" }}>
              Step 00 · Before a dollar moves
            </p>
            <div className="md:col-span-9 md:flex md:items-baseline md:gap-6">
              <h3 style={{ fontSize: 17, whiteSpace: "nowrap", marginBottom: 6 }}>
                {MARKET_STEP.title}
              </h3>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text-dim)", maxWidth: 560 }}>
                {MARKET_STEP.body}
              </p>
            </div>
          </div>
        </Reveal>
      </div>

      {/* The scene: pinned on lg+ with motion, stacked otherwise */}
      {reduce ? (
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
          <LoopStacked forceVisible />
        </div>
      ) : (
        <>
          <LoopPinned />
          <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
            <LoopStacked />
          </div>
        </>
      )}

      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 pb-14 sm:pb-20">
        <Reveal>
          <p
            className="mt-10"
            style={{
              fontFamily: "var(--serif)",
              fontWeight: 200,
              letterSpacing: "var(--track-display)",
              fontSize: "clamp(1.375rem, 1rem + 2vw, 2.25rem)",
              lineHeight: 1.25,
              color: "var(--text-accent)",
              maxWidth: 820,
              textWrap: "balance",
            }}
          >
            {LOOP_KICKER}
          </p>
          <p className="mt-3" style={{ fontSize: 12, color: "var(--text-faint)" }}>
            Example pages, one per campaign:{" "}
            <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
              [your-facility].storageads.com/climate-pawpaw
            </span>
            {" · "}
            <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
              /10x10-offer
            </span>
            {" · "}
            <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>
              /finish-your-rental
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
