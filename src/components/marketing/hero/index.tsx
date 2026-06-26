"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronDown,
  Star,
  Layers,
  Globe,
  TrendingUp,
} from "lucide-react";
import Cite from "../cite";
import { useInView } from "../use-in-view";
import { useTypewriter } from "./hooks";
import { TYPEWRITER_WORDS } from "./content";
import { CAL_BOOKING_URL } from "@/lib/booking";
import { HeroStyles } from "./hero-styles";
import { DotGrid } from "./dot-grid";
import { HeroStatusStrip } from "./hero-status-strip";
import { DashboardMockup } from "./dashboard-mockup";

export { PipelineFlow } from "./pipeline-flow";
export { FeatureHighlights } from "./feature-highlights";
export { BeforeAfterComparison } from "./before-after-comparison";
export { CapabilitiesGrid } from "./capabilities-grid";
export { BecauseLetterboard } from "./because-letterboard";
export { LiveStatsStrip } from "./live-stats-strip";
export { StatsBar } from "./stats-bar";

const CALCOM_URL = CAL_BOOKING_URL;

export default function Hero() {
  const { ref, isVisible } = useInView(0.02);
  const typedText = useTypewriter(TYPEWRITER_WORDS, isVisible);

  return (
    <section id="hero" aria-label="StorageAds: predictable move-ins for independent storage. Ad spend in. Move-ins out." className="relative overflow-hidden" style={{ background: "var(--color-light)" }}>
      <HeroStyles />
      <DotGrid />
      <HeroStatusStrip />

      {/* ── Hero content ── */}
      {/* Mobile rhythm tuned for FB IAB on iPhone 17 Pro Max: viewport is
          ~820px raw, but the FB chrome chews ~170px so the effective
          above-the-fold is ~650px. Every reclaimed pixel pushes the trust
          line + dashboard proof higher. pt-5 (20px) is a deliberate, tight
          breathing band — the strip's bottom border already creates a clear
          edge so we don't need extra cushion. sm:+ keeps the editorial
          generosity on larger surfaces. */}
      <div ref={ref} className="relative w-full pt-5 sm:pt-12 lg:pt-20 pb-6 sm:pb-10 lg:pb-14 px-5 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-6 sm:gap-8 lg:gap-14 items-center max-w-[1280px] mx-auto">

          {/* ── Left column ── */}
          <div className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            {/* Eyebrow — names the audience + outcome promise so the H1
                stays the punchy equation. SaaS hierarchy: who-it's-for first,
                hook second, explanation third. */}
            <p
              className={`text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] mb-2 sm:mb-3 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-heading)",
              }}
            >
              REIT-grade marketing for independent storage
            </p>

            {/* Headline — the equation. The eyebrow above does the promise
                framing so this can stay the punchy hook. */}
            <h1
              className={`font-semibold transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{
                fontSize: "clamp(1.75rem, 5.5vw, 3.25rem)",
                lineHeight: 1.1,
                letterSpacing: "-0.03em",
                fontFamily: "var(--serif)",
                textWrap: "balance",
                transitionDelay: "100ms",
              }}
            >
              {/* Non-breaking spaces keep each side of the equation intact so
                  on narrow viewports the H1 breaks cleanly between the two
                  halves (e.g. iPhone 17 Pro Max ~440px / Safari) rather than
                  stranding the "=" or "out." on a line of their own. */}
              Ad&nbsp;spend&nbsp;in.{" "}
              <span className="whitespace-nowrap">Move-ins&nbsp;out.</span>
            </h1>

            {/* Typewriter — reserves 2 lines on mobile because the longest
                phrases ("Create demand. Capture demand. Recapture demand.",
                "Stop leaking revenue at every step of the funnel.") wrap on
                iPhone-class widths. Previously h-7 clipped to 28px and the
                wrapped 2nd line overflowed onto the body paragraph below.
                sm:+ stays single-line where the phrases fit. */}
            <div
              className={`mt-2 sm:mt-3 min-h-7 sm:min-h-8 leading-snug transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ transitionDelay: "200ms" }}
            >
              <span className="text-lg sm:text-xl font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--serif)", letterSpacing: "-0.03em" }}>{typedText}</span>
              {/* Cursor: was var(--color-gold); CLAUDE.md bans sienna gold
                  everywhere except the logo "ads" letters (var(--brand-gold)).
                  Charcoal matches the editorial monochrome palette. */}
              <span className="inline-block w-0.5 h-5 ml-0.5 align-middle rounded-full" style={{ background: "var(--color-dark)", animation: "hero-pulse 1s ease-in-out infinite" }} />
            </div>

            {/* Subheadline — operator voice. Productized REIT system, full
                funnel, demand-engine framing. No em-dashes (Blake rule).

                Mobile gets a 20-word version because the 80% of traffic
                arriving via the Facebook in-app browser on iPhone-class
                devices has ~720px of usable height. The long paragraph ate
                ~180px on mobile and pushed the CTAs to the bottom edge of
                the fold. Full version still renders on sm:+ where there's
                room for the REIT framing + capability list. */}
            <p
              className={`sm:hidden mt-2 text-[15px] transition-all duration-1000 mx-auto ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                transitionDelay: "300ms",
                maxWidth: "480px",
                textWrap: "pretty",
              }}
            >
              The REIT marketing playbook, productized for independent operators. Tested on our own facilities first.
            </p>
            <p
              className={`hidden sm:block mt-3 text-base transition-all duration-1000 mx-auto lg:mx-0 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{
                color: "var(--text-secondary)",
                lineHeight: 1.5,
                transitionDelay: "300ms",
                maxWidth: "480px",
                textWrap: "pretty",
              }}
            >
              The equation Public Storage, Extra Space, and U-Haul have run on to hit 92.6% same-store occupancy<Cite n={1} />. StorageAds productizes that infrastructure for independent operators: a system that creates, captures, and recaptures every renter in your trade area. Market intelligence, paid acquisition, landing pages, reservation conversion, and the audit work to find where you&apos;re leaking revenue. Tested on our own portfolio first.
            </p>

            {/* CTAs */}
            <div className={`mt-5 sm:mt-6 flex flex-col sm:flex-row items-stretch sm:items-center lg:items-start gap-2 sm:gap-3 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: "400ms" }}>
              <a href="#cta" className="btn-primary group">
                Request a facility audit
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
              </a>
              <a
                href={CALCOM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary group"
              >
                Schedule a walkthrough
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5 shrink-0" />
              </a>
            </div>

            {/* Reassurance + trust strip */}
            <div className={`mt-3 sm:mt-4 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "450ms" }}>
              <p
                className="text-[11px] sm:text-xs font-medium mb-2.5"
                style={{
                  color: "var(--text-tertiary)",
                  fontFamily: "var(--font-heading)",
                  letterSpacing: "0.02em",
                }}
              >
                No contracts.{" "}
                <span style={{ color: "var(--color-dark)", fontWeight: 700 }}>Cancel anytime.</span>
              </p>
              <div className="flex items-center gap-x-3 gap-y-1.5 sm:gap-4 justify-center lg:justify-start flex-wrap">
                {([
                  { icon: Star, text: "Built by operators, for operators", mobile: true },
                  { icon: Layers, text: "storEDGE rental embedded", mobile: false },
                  { icon: Globe, text: "Benchmarked against the 92.6% REIT band", cites: [1, 2], mobile: false },
                  { icon: TrendingUp, text: "Tested on our own facilities first", mobile: false },
                ] as Array<{ icon: typeof Star; text: string; cites?: number[]; mobile: boolean }>).map((badge, i) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={badge.text} className={`${badge.mobile ? "flex" : "hidden sm:flex"} items-center gap-1.5 text-[11px] sm:text-xs transition-all duration-500`} style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)", transitionDelay: `${500 + i * 100}ms`, opacity: isVisible ? 1 : 0 }}>
                      {/* Icon: was var(--color-gold) at 0.7 opacity; CLAUDE.md
                          bans gold accents. Matching the text color keeps the
                          row reading as a quiet editorial bullet. */}
                      <BadgeIcon size={12} style={{ color: "var(--text-tertiary)", opacity: 0.85 }} />
                      {badge.text}
                      {badge.cites && <Cite n={badge.cites} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column — Dashboard (desktop) ── */}
          <div className="hidden lg:block">
            <DashboardMockup isVisible={isVisible} />
          </div>

          {/* ── Mobile dashboard proof ── */}
          {/* Condensed stat snapshot so mobile visitors see the same "this
              is real software" signal the desktop dashboard delivers. Shows
              the final-month numbers from the same HERO_DEMO_MONTHS data. */}
          <div
            className={`lg:hidden w-full transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
            style={{ transitionDelay: "700ms" }}
          >
            <div
              className="border overflow-hidden"
              style={{
                borderColor: "var(--line-dim)",
                background: "var(--bg-alt)",
              }}
            >
              {/* Header bar */}
              <div
                className="flex items-center justify-between px-4 py-2.5 border-b"
                style={{ borderColor: "var(--line-dim)", background: "var(--bg)" }}
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-5 h-5 flex items-center justify-center"
                    style={{ background: "var(--bg-ink)", border: "1px solid var(--line)" }}
                  >
                    <span className="text-[8px] font-bold" style={{ color: "var(--bg)", fontFamily: "var(--mono)" }}>SA</span>
                  </div>
                  <span className="text-[11px] font-semibold" style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>
                    Midway Self Storage · 6 months
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1.5 h-1.5"
                    style={{ background: "var(--hue-c)", borderRadius: "50%" }}
                  />
                  <span className="text-[10px] font-medium" style={{ color: "var(--text-dim)", fontFamily: "var(--mono)" }}>
                    Our facility
                  </span>
                </div>
              </div>

              {/* Stat grid — mirrors final month of HERO_DEMO_MONTHS */}
              <div className="grid grid-cols-2 sm:grid-cols-4">
                {[
                  { label: "Move-ins", value: "85", delta: "+85 from zero", deltaColor: "var(--hue-c)" },
                  { label: "Cost / move-in", value: "$127", delta: "−$98 from month 1", deltaColor: "var(--hue-c)" },
                  { label: "Occupancy", value: "89%", delta: "+21 pts", deltaColor: "var(--hue-c)" },
                  { label: "Total spend", value: "$13.8k", delta: "6 months", deltaColor: "var(--text-faint)" },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="px-4 py-3 border-b sm:border-r last:border-r-0"
                    style={{
                      borderColor: "var(--line-dim)",
                      borderRight: i % 2 === 0 ? "1px solid var(--line-dim)" : undefined,
                    }}
                  >
                    <div className="text-[10px] uppercase tracking-wide" style={{ color: "var(--text-faint)", fontFamily: "var(--mono)" }}>
                      {s.label}
                    </div>
                    <div className="text-lg font-semibold mt-0.5 tabular-nums" style={{ color: "var(--text)", fontFamily: "var(--mono)" }}>
                      {s.value}
                    </div>
                    <div className="text-[10px] mt-0.5 font-medium" style={{ color: s.deltaColor }}>
                      {s.delta}
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini campaign table — 2 rows to prove it's real data */}
              <div className="px-4 py-3">
                <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Campaign", "Move-ins", "Cost/MI"].map((h) => (
                        <th
                          key={h}
                          className="text-[9px] uppercase tracking-wide pb-2 font-semibold"
                          style={{ color: "var(--text-faint)", fontFamily: "var(--mono)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: "Two Paws · 10x10 Climate", mi: "9", cpm: "$94" },
                      { name: "Midway · Drive-up", mi: "7", cpm: "$87" },
                    ].map((row) => (
                      <tr key={row.name} style={{ borderTop: "1px solid var(--line-dim)" }}>
                        <td className="py-2 text-[11px] font-medium" style={{ color: "var(--text)" }}>
                          <span className="truncate block max-w-[180px]">{row.name}</span>
                        </td>
                        <td className="py-2 text-[11px] tabular-nums font-semibold" style={{ color: "var(--text)" }}>
                          {row.mi}
                        </td>
                        <td className="py-2 text-[11px] tabular-nums" style={{ color: "var(--text-dim)" }}>
                          {row.cpm}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer link */}
              <div className="px-4 py-2.5 border-t flex items-center justify-between" style={{ borderColor: "var(--line-dim)" }}>
                <span className="text-[10px]" style={{ color: "var(--text-faint)", fontFamily: "var(--mono)" }}>
                  From our own facilities · Midway &amp; Two Paws
                </span>
                <Link
                  href="/demo"
                  className="text-[10px] font-semibold flex items-center gap-1"
                  style={{ color: "var(--text)", fontFamily: "var(--mono)" }}
                >
                  Full demo <ArrowUpRight size={10} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator — hidden on mobile. iPhone users in FB IAB already
          have a "swipe up to scroll" affordance built into the OS chrome,
          and the extra row eats ~40px of above-the-fold real estate without
          delivering signal that's not already implied. Desktop keeps it. */}
      <div className={`hidden sm:flex justify-center pb-3 sm:pb-4 transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1500ms" }}>
        <a href="#how-it-works" className="flex flex-col items-center gap-1 group" aria-label="Scroll to learn more">
          <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>Learn more</span>
          <ChevronDown size={16} style={{ color: "var(--text-tertiary)", animation: "hero-scroll-bounce 2s ease-in-out infinite" }} />
        </a>
      </div>
    </section>
  );
}
