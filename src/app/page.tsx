"use client";

import dynamic from "next/dynamic";
import Hero, {
  MobileLiveTicker,
  BecauseLetterboard,
  FeatureHighlights,
  CapabilitiesGrid,
  BeforeAfterComparison,
  LiveStatsStrip,
  ROITeaser,
  StatsBar,
} from "@/components/marketing/hero";
import ProblemStatement from "@/components/marketing/problem-statement";
import Nav from "@/components/marketing/nav";
import { LiveMonitorTriptych } from "@/components/marketing/live-monitors";
import { useInView } from "@/components/marketing/use-in-view";

const SystemOverview = dynamic(
  () => import("@/components/marketing/system-overview"),
);
const HowItWorks = dynamic(
  () => import("@/components/marketing/how-it-works"),
);
const FourWayComparison = dynamic(
  () => import("@/components/marketing/four-way-comparison"),
);
const InactionTimeline = dynamic(
  () => import("@/components/marketing/inaction-timeline"),
);
const QuickCalculator = dynamic(
  () => import("@/components/marketing/quick-calculator"),
);
const Results = dynamic(() => import("@/components/marketing/results"));
const CTASection = dynamic(
  () => import("@/components/marketing/cta-section"),
);
const FAQ = dynamic(() => import("@/components/marketing/faq"));
const DemandTriggers = dynamic(
  () => import("@/components/marketing/demand-triggers"),
);
const Footer = dynamic(() => import("@/components/marketing/footer"));

/* ───────────────────────────────────────────────────────────────────────────
 * Homepage IA — Product-first sequence (per Blake's reorder request)
 *
 *  Scroll  §   Component               Role
 *  ─────  ──  ──────────────────────   ──────────────────────────────────────
 *    1    —   <Hero />                 Hook + primary CTA (lean per spec)
 *    2    01  <HowItWorks />           How the product works (start here)
 *    —    —   <SolutionVisuals />      Pipeline + Feature highlight cards
 *    —    —   <DemandTriggers />       9 demand moments (operator cred, dark)
 *    3    02  <SystemOverview />       The system — 6 parts wired together
 *    —    —   <CapabilitiesSection />  Full platform capabilities grid
 *    4    03  <FourWayComparison />    StorageAds vs StorageRankers / Adverank / SpareFoot
 *    —    —   <BeforeAfterSection />   Before/after broken-workflow pairs
 *    5    04  <InactionTimeline />     Cost of inaction (6-month pain)
 *    6    05  <ProblemStatement />     The underlying problem
 *    —    —   <BecauseLetterboard />   Pain refrain (split-flap)
 *    7    06  <Results />              Operator case studies + ROI math
 *    —    —   <LiveStatsSection />     §00 NUMBERS industry/forecast strip
 *    —    —   <StatsBar />             4 hero-stat counters
 *    —    —   <ROISection />           90-day performance snapshot
 *    —    —   <MobileLiveTickerSection /> Mobile-only live activity ticker
 *    8    07  <QuickCalculator />      Revenue calculator (surfaces $749)
 *    9    08  <Faq />                  Objection handling (8 Q+A pairs)
 *   10    09  <CTASection />           Final CTA (audit form + Cal.com)
 *
 * Operator-credibility slot is covered by the Hero trust badge +
 * footer "Built by an operator" line.
 * ───────────────────────────────────────────────────────────────────────────
 */

/* ─── Slot 3 visuals — feature highlight cards.
       The pipeline flow + dashboard mockup that used to render here are
       now restored to Angelo's hero block above. ─── */
function SolutionVisuals() {
  const { ref, isVisible } = useInView(0.08);
  return (
    <section
      ref={ref}
      aria-label="How the StorageAds system flows from ad to lease"
      className="relative border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-12 sm:py-16">
        <div
          className={`text-center mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
        >
          <h2
            className="text-lg sm:text-xl font-semibold"
            style={{
              fontFamily: "var(--serif)",
              letterSpacing: "-0.03em",
              color: "var(--color-dark)",
            }}
          >
            Everything you need to fill units.
          </h2>
          <p
            className="text-sm mt-1 mx-auto"
            style={{ color: "var(--text-secondary)", maxWidth: "480px" }}
          >
            First click to signed lease. Every step tracked. Every dollar accounted for.
          </p>
        </div>
        <FeatureHighlights isVisible={isVisible} />
      </div>
    </section>
  );
}

/* ─── Slot 4 — before/after extension ─── */
function BeforeAfterSection() {
  const { ref, isVisible } = useInView(0.1);
  return (
    <section
      ref={ref}
      aria-label="Before and after: replacing broken workflows"
      className="relative border-t"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-alt)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-12 sm:py-16">
        <div
          className={`text-center mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2
            className="text-lg sm:text-xl font-semibold"
            style={{
              fontFamily: "var(--serif)",
              letterSpacing: "-0.03em",
              color: "var(--color-dark)",
            }}
          >
            Stop guessing. Start knowing.
          </h2>
          <p
            className="text-sm mt-1 mx-auto"
            style={{ color: "var(--text-secondary)", maxWidth: "420px" }}
          >
            See how StorageAds replaces every broken workflow.
          </p>
        </div>
        <BeforeAfterComparison isVisible={isVisible} />
      </div>
    </section>
  );
}

/* ─── Slot 5 — capabilities grid ─── */
function CapabilitiesSection() {
  const { ref, isVisible } = useInView(0.1);
  return (
    <section
      ref={ref}
      aria-label="Full platform capabilities"
      className="relative border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-12 sm:py-16">
        <div
          className={`text-center mb-6 transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
        >
          <h2
            className="text-lg sm:text-xl font-semibold"
            style={{
              fontFamily: "var(--serif)",
              letterSpacing: "-0.03em",
              color: "var(--color-dark)",
            }}
          >
            Full platform capabilities
          </h2>
        </div>
        <CapabilitiesGrid isVisible={isVisible} />
      </div>
    </section>
  );
}

/* ─── Slot 6 — §00 NUMBERS strip + monitor triptych ─── */
function LiveStatsSection() {
  const { ref, isVisible } = useInView(0.1);
  return (
    <section
      ref={ref}
      aria-label="Industry and forecast numbers"
      className="relative border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-12 sm:py-16">
        <LiveStatsStrip isVisible={isVisible} />
        <div className="mt-8">
          <LiveMonitorTriptych />
        </div>
      </div>
    </section>
  );
}

/* ─── Slot 6 — 90-day ROI snapshot ─── */
function ROISection() {
  const { ref, isVisible } = useInView(0.1);
  return (
    <section
      ref={ref}
      aria-label="90-day performance snapshot"
      className="relative border-t"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-12 sm:py-16">
        <ROITeaser isVisible={isVisible} />
      </div>
    </section>
  );
}

/* ─── Slot 6 — mobile ticker (hidden on desktop — MobileLiveTicker
       itself is `sm:hidden`; wrapping section matches so it doesn't
       reserve vertical space on desktop). ─── */
function MobileLiveTickerSection() {
  const { ref, isVisible } = useInView(0.05);
  return (
    <section
      ref={ref}
      aria-label="Live activity ticker"
      className="relative sm:hidden"
    >
      <div className="max-w-[1280px] mx-auto px-5 py-6">
        <MobileLiveTicker isVisible={isVisible} />
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <Nav />
      <main id="main-content">
        {/* Hero (lean: H1, subhead, 2 CTAs, 1 trust badge) */}
        <Hero />

        {/* §01 — How it works (starts the page, per Blake) */}
        <HowItWorks />
        <SolutionVisuals />

        {/* Demand triggers — operator-credibility interlude before the system.
            "We see these triggers in our own facilities every week." */}
        <DemandTriggers />

        {/* §02 — The system (6 parts wired together) */}
        <SystemOverview />
        <CapabilitiesSection />

        {/* §03 — Differentiator vs alternatives */}
        <FourWayComparison />
        <BeforeAfterSection />

        {/* §04 — Cost of inaction */}
        <InactionTimeline />

        {/* §05 — The underlying problem */}
        <ProblemStatement />
        <BecauseLetterboard />

        {/* §06 — Proof / Angelo numbers (demoted from above-the-fold) */}
        <Results />
        <LiveStatsSection />
        <StatsBar />
        <ROISection />
        <MobileLiveTickerSection />

        {/* Slot 7 (Operator credibility) — covered by Hero badge + Footer */}

        {/* §07 — Pricing (partial fit; QuickCalculator surfaces $749) */}
        <QuickCalculator />

        {/* §08 — FAQ */}
        <FAQ />

        {/* §09 — Final CTA */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
