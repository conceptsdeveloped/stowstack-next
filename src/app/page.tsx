"use client";

import dynamic from "next/dynamic";
import MotionProvider from "@/components/motion/provider";
import HomeNav from "@/components/home/nav";
import HomeHero from "@/components/home/hero";

/* ───────────────────────────────────────────────────────────────────────────
 * Homepage IA — "The Ledger" redesign (src/components/home/)
 *
 *  §   Component            Role
 *  ──  ───────────────────  ─────────────────────────────────────────
 *  —   <HomeHero />         Lockup + primary CTA + interactive demo (#hero)
 *  01  <Problem />          The four truths (#problem) + <Letterboard />
 *  02  <TheLoop />          CENTERPIECE — pinned ad→page→reserve→move-in
 *                           scene (#how-it-works), stacks <1024/reduced
 *  03  <System />           The ads / the pages split + loop statement
 *                           (#system) + <Capabilities /> grid
 *  04  <Comparison />       Vs the alternatives + before/after pairs
 *  05  <Results />          Case dossiers + ROI math + counters (#results)
 *  00  <NumbersStrip />     Industry numbers + labeled year-1 forecasts
 *  —   <DemandTriggers />   Operator-credibility interlude (#demand-triggers)
 *  06  <Calculator />       Revenue calculator, surfaces $749 (#calculator)
 *  07  <FAQ />              11 answers (#faq)
 *  08  <CTA />              Final ask on ink — audit form + Cal (#cta)
 *  —   <SourcesNote />      Citation disclosure (reused, untouched)
 *
 * Anchor contract preserved: #hero (+ a.btn-primary inside), #how-it-works,
 * #results, #calculator, #cta, #sources, #source-1..10, #cal-embed.
 * ─────────────────────────────────────────────────────────────────────────── */

const Problem = dynamic(() => import("@/components/home/problem"));
const Letterboard = dynamic(() => import("@/components/home/letterboard"));
const TheLoop = dynamic(() => import("@/components/home/the-loop"));
const System = dynamic(() => import("@/components/home/system"));
const Capabilities = dynamic(() => import("@/components/home/capabilities"));
const Comparison = dynamic(() => import("@/components/home/comparison"));
const Results = dynamic(() => import("@/components/home/results"));
const NumbersStrip = dynamic(() => import("@/components/home/numbers-strip"));
const DemandTriggers = dynamic(() => import("@/components/home/demand-triggers"));
const Calculator = dynamic(() => import("@/components/home/calculator"));
const FAQ = dynamic(() => import("@/components/home/faq"));
const CTA = dynamic(() => import("@/components/home/cta"));
const SourcesNote = dynamic(() => import("@/components/marketing/sources-note"));
const HomeFooter = dynamic(() => import("@/components/home/footer"));
// Sticky mobile CTA — unchanged plumbing. Mounts client-side only; shows
// after the hero CTA scrolls away and hides when #cta enters the viewport.
const StickyMobileCTA = dynamic(
  () => import("@/components/marketing/sticky-mobile-cta"),
  { ssr: false },
);

export default function HomePage() {
  return (
    <MotionProvider>
      <HomeNav />
      <main id="main-content">
        <HomeHero />

        {/* § 01 — the problem, then the refrain */}
        <Problem />
        <Letterboard />

        {/* § 02 — the closed loop (centerpiece) */}
        <TheLoop />

        {/* § 03 — the system, split into its two halves */}
        <System />
        <Capabilities />

        {/* § 04 — vs the alternatives */}
        <Comparison />

        {/* § 05 — proof */}
        <Results />
        <NumbersStrip />

        {/* Operator credibility before the ask */}
        <DemandTriggers />

        {/* § 06 — the calculator (surfaces $749) */}
        <Calculator />

        {/* § 07 — questions */}
        <FAQ />

        {/* § 08 — the final ask */}
        <CTA />

        {/* Source disclosure for every market stat cited above */}
        <SourcesNote />
      </main>
      <HomeFooter />
      <StickyMobileCTA />
    </MotionProvider>
  );
}
