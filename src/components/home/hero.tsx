"use client";

import { useRef } from "react";
import { m, useInView, useReducedMotion } from "framer-motion";
import { DashboardMockup } from "@/components/marketing/hero";
import Cite from "@/components/marketing/cite";
import { CAL_BOOKING_URL } from "@/lib/booking";
import { DUR, EASE } from "@/lib/motion";
import { MaskedText } from "@/components/motion/masked-text";
import HeroStatusStrip from "./hero-status-strip";
import Typewriter from "./typewriter";

/**
 * The positioning moment. One typographic statement at two weights:
 * "Ad spend in." at Manrope 200 (the input, thin air) over
 * "Move-ins out." at Manrope 800 (the output, landed). Product truth on
 * the right: the existing interactive 6-month campaign demo, reused
 * behaviorally untouched inside a ledger frame.
 *
 * Entrance choreography ends < 1.2s. Reduced motion renders static.
 */

const TRUST_BADGES = [
  "Built and tested on our own facilities",
  "storEDGE rental built in",
  "Ads live in your first week",
];

function Enter({
  children,
  delay,
  className,
  style,
}: {
  children: React.ReactNode;
  delay: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <div className={className} style={style}>{children}</div>;
  }
  return (
    <m.div
      className={className}
      style={style}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DUR.base, delay, ease: EASE.out }}
    >
      {children}
    </m.div>
  );
}

export default function HomeHero() {
  const demoRef = useRef<HTMLDivElement>(null);
  // Drives the demo's autoplay gate the same way the old hero did
  // (useInView 0.02): playback arms once the panel is actually seen.
  const demoInView = useInView(demoRef, { once: true, amount: 0.05 });

  return (
    <section
      id="hero"
      aria-label="StorageAds: predictable move-ins for independent storage. Ad spend in. Move-ins out."
      className="relative"
      style={{ paddingTop: "calc(var(--nav-height) + env(safe-area-inset-top, 0px))" }}
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10">
        <Enter delay={0}>
          <HeroStatusStrip />
        </Enter>

        {/* ── The lockup ── */}
        <div className="pt-8 sm:pt-12 lg:pt-16">
          <Enter delay={0.05}>
            <p
              style={{
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "var(--track-label-wide)",
                textTransform: "uppercase",
                fontWeight: 600,
                color: "var(--text-dim)",
                marginBottom: "clamp(14px, 2.5vw, 24px)",
              }}
            >
              REIT-grade marketing for independents
            </p>
          </Enter>

          <MaskedText
            as="h1"
            onLoad
            delay={0.12}
            lines={["Ad spend in.", "Move-ins out."]}
            style={{
              fontSize: "clamp(2.7rem, 1rem + 8.6vw, 8rem)",
              color: "var(--text-accent)",
              margin: 0,
            }}
            lineStyle={(i) =>
              i === 0
                ? {
                    fontWeight: 200,
                    letterSpacing: "var(--track-display)",
                    lineHeight: 1.04,
                    color: "var(--text-dim)",
                    whiteSpace: "nowrap",
                  }
                : {
                    fontWeight: 800,
                    letterSpacing: "var(--track-tighter)",
                    lineHeight: 1.04,
                    marginLeft: "clamp(1.5rem, 9vw, 11rem)",
                    whiteSpace: "nowrap",
                  }
            }
          />
        </div>

        {/* ── Two columns: pitch left, proof right ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 pt-9 sm:pt-12 pb-12 sm:pb-16 items-start">
          <div className="lg:col-span-5 max-w-[560px]">
            <Enter delay={0.3}>
              <Typewriter style={{ marginBottom: 18 }} />
              <p
                style={{
                  fontSize: "var(--type-lede)",
                  lineHeight: 1.6,
                  color: "var(--text-dim)",
                }}
              >
                Public Storage and Extra Space run this exact machine to hit
                92.6% occupancy
                <Cite n={1} />. We built the same system for our own
                facilities, then turned it into software you can plug in. Meta
                and Google ads, a landing page per ad, reservations that become
                signed leases, and an audit that finds where you&apos;re
                leaking revenue.
              </p>
            </Enter>

            <Enter delay={0.42} className="mt-7 flex flex-col sm:flex-row gap-3">
              <a href="#cta" className="btn-primary">
                Get your free facility audit
                <span aria-hidden="true">→</span>
              </a>
              <a
                href={CAL_BOOKING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary"
              >
                Book a 30-minute walkthrough
              </a>
            </Enter>

            <Enter delay={0.5}>
              <p
                className="mt-3"
                style={{ fontSize: 13, color: "var(--text-faint)" }}
              >
                No contracts. <strong style={{ color: "var(--text-dim)", fontWeight: 600 }}>Cancel anytime.</strong>
              </p>

              <div
                className="mt-7 flex flex-col gap-2.5 pt-5"
                style={{ borderTop: "1px solid var(--line-dim)" }}
              >
                {TRUST_BADGES.map((badge) => (
                  <p
                    key={badge}
                    className="flex items-center gap-2.5"
                    style={{ fontSize: 13, color: "var(--text-dim)" }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        display: "inline-block",
                        width: 6,
                        height: 6,
                        background: "var(--text)",
                        flexShrink: 0,
                      }}
                    />
                    {badge}
                  </p>
                ))}
              </div>
            </Enter>
          </div>

          {/* Product truth — the interactive demo, framed */}
          <Enter delay={0.38} className="lg:col-span-7 min-w-0">
            {/* Keeps the document outline contiguous: the reused demo
                mockup renders its own h3 ("Campaign performance"). */}
            <h2 className="sr-only">Interactive campaign demo</h2>
            <div ref={demoRef} style={{ border: "1px solid var(--line)", background: "var(--bg-alt)" }}>
              <div
                className="flex items-center justify-between gap-3"
                style={{ padding: "7px 12px", borderBottom: "1px solid var(--line)" }}
              >
                <span
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10,
                    letterSpacing: "var(--track-label)",
                    textTransform: "uppercase",
                    fontWeight: 600,
                    color: "var(--accent)",
                  }}
                >
                  § Demo
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
                  6-month campaign · interactive
                </span>
              </div>
              <div style={{ padding: "clamp(8px, 1.5vw, 14px)" }}>
                <DashboardMockup isVisible={demoInView} />
              </div>
            </div>
          </Enter>
        </div>

        {/* Scroll cue */}
        <a
          href="#how-it-works"
          aria-label="Scroll to learn more"
          className="hidden lg:inline-flex items-center gap-2 pb-8 home-link"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "var(--track-label)",
            textTransform: "uppercase",
            color: "var(--text-faint)",
          }}
        >
          Learn more <span aria-hidden="true">↓</span>
        </a>
      </div>
    </section>
  );
}
