"use client";

import { useState } from "react";
import Cite from "@/components/marketing/cite";
import { Reveal } from "@/components/motion/reveal";
import SectionFrame from "./section-frame";
import AuditForm from "./cta/audit-form";
import CalCard from "./cta/cal-card";

/**
 * § 08 — the final ask, on the ink ground. One dominant action (the
 * audit form); the walkthrough sits beside it as the impatient path.
 * Mobile keeps the previous toggle tabs so neither path is buried.
 */
export default function CTA() {
  const [mobileTab, setMobileTab] = useState<"audit" | "call">("audit");

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: "12px 8px",
    fontFamily: "var(--mono)",
    fontSize: 11,
    letterSpacing: "var(--track-label)",
    textTransform: "uppercase",
    fontWeight: 700,
    cursor: "pointer",
    background: active ? "var(--bg)" : "transparent",
    color: active ? "var(--bg-ink)" : "var(--bg)",
    border: "none",
    minHeight: 44,
  });

  return (
    <section
      id="cta"
      aria-label="Request a free facility audit"
      className="ground-ink"
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-16 sm:py-24 lg:py-28">
        <SectionFrame
          number="08"
          kicker="Free audit"
          meta="Step · Final"
          as="h2"
          onInk
          lines={["Get your free", "facility audit."]}
          headlineWeight="thin"
          size="var(--type-display)"
          lede={
            <>
              Where you sit against the big operators&apos; 92.6% occupancy
              <Cite n={[1, 2]} />. Where revenue&apos;s leaking. What it takes
              to close the gap at your facility. Free, and yours to keep
              either way.
            </>
          }
          maxLedeWidth={620}
        />
        <Reveal delay={0.2}>
          <p
            className="mt-2"
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "var(--track-label)",
              textTransform: "uppercase",
              color: "var(--text-on-ink-dim)",
            }}
          >
            No commitment. No sales deck.
          </p>
        </Reveal>

        {/* Mobile toggle tabs */}
        <div className="lg:hidden mt-10">
          <div className="flex" style={{ border: "1px solid var(--line-on-ink-hi)" }}>
            <button type="button" onClick={() => setMobileTab("audit")} style={tabStyle(mobileTab === "audit")}>
              Get the audit
            </button>
            <button type="button" onClick={() => setMobileTab("call")} style={tabStyle(mobileTab === "call")}>
              Book a call
            </button>
          </div>
        </div>

        <div className="mt-5 lg:mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-[1080px]">
          {/* Audit form — the one action */}
          <Reveal
            delay={0.1}
            className={mobileTab !== "audit" ? "hidden lg:block" : ""}
          >
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "clamp(20px, 3vw, 32px)", position: "relative" }}>
              <h3 style={{ fontSize: 18, marginBottom: 20 }}>Facility information.</h3>
              <AuditForm />
            </div>
          </Reveal>

          {/* The impatient path */}
          <Reveal
            delay={0.18}
            className={mobileTab !== "call" ? "hidden lg:block" : ""}
          >
            <div style={{ background: "var(--bg)", border: "1px solid var(--line)", padding: "clamp(20px, 3vw, 32px)" }}>
              <CalCard />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
