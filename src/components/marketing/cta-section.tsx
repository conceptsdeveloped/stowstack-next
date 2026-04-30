"use client";

import { SectionHeader, SectionMeta } from "@/components/mono/section-header";

import { useState, useEffect, useRef } from "react";
import { ArrowRight, Check, Shield, Clock, Wrench, Zap, Calendar } from "lucide-react";
import { useInView } from "./use-in-view";

const CALCOM_SLUG = "storageads/30min";

const TRUST_SIGNALS = [
  { icon: Shield, text: "No contracts required" },
  { icon: Clock, text: "First leads within 7 days" },
  { icon: Wrench, text: "Built and run by a storage operator" },
  { icon: Zap, text: "storEDGE integrated" },
];

const OCCUPANCY_OPTIONS = [
  "Below 60%",
  "60-75%",
  "75-85%",
  "85-95%",
  "Above 95%",
];

export default function CTASection() {
  const { ref, isVisible } = useInView();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [calLoaded, setCalLoaded] = useState(false);
  const [mobileTab, setMobileTab] = useState<"audit" | "call">("audit");
  const calContainerRef = useRef<HTMLDivElement>(null);

  // Load Cal.com embed script
  useEffect(() => {
    if (calLoaded) return;

    const script = document.createElement("script");
    script.src = "https://app.cal.com/embed/embed.js";
    script.async = true;
    script.onload = () => {
      // @ts-expect-error Cal is injected globally by the embed script
      if (window.Cal) {
        // @ts-expect-error Cal is injected globally
        window.Cal("init", { origin: "https://cal.com" });
        // @ts-expect-error Cal is injected globally
        window.Cal("inline", {
          calLink: CALCOM_SLUG,
          elementOrSelector: "#cal-embed",
          config: { theme: "light", layout: "month_view" },
        });
        // @ts-expect-error Cal is injected globally
        window.Cal("ui", {
          theme: "light",
          styles: { branding: { brandColor: "var(--color-gold)" } },
          hideEventTypeDetails: false,
        });
        setCalLoaded(true);
      }
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup is intentionally omitted — Cal.com attaches globally once
    };
  }, [calLoaded]);

  async function handleFormSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch("/api/audit-form", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setIsSubmitted(true);
      }
    } catch {
      // Silently handle - user can retry
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      id="cta"
      aria-label="Request a free facility audit"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="section-content">
        <SectionHeader number="08" kicker="FREE AUDIT" right={<SectionMeta text="STEP · FINAL" />} style={{ marginBottom: 28 }} />
        <div
          className={`text-center mb-12 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-semibold max-w-3xl mx-auto"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            Your ads are going to the wrong page. Let&apos;s fix that.
          </h2>
          <p
            className="mt-4 max-w-2xl mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Get a free facility audit. We&apos;ll look at your current digital
            presence, ad spend, landing pages, rental flow, and competitive
            landscape: then show you exactly where you&apos;re losing move-ins.
          </p>
          <p
            className="mt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            No contracts. No commitment. Just a clear picture of what&apos;s
            costing you move-ins.
          </p>
        </div>

        {/* Mobile toggle tabs */}
        <div className="max-w-5xl mx-auto lg:hidden mb-4">
          <div className="flex rounded-xl overflow-hidden border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => setMobileTab("audit")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mobileTab === "audit"
                  ? "bg-[var(--color-gold)]/10 text-[var(--color-dark)]"
                  : "bg-[var(--color-light-gray)] text-[var(--color-muted)]"
              }`}
            >
              Get Your Audit
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("call")}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                mobileTab === "call"
                  ? "bg-[var(--color-gold)]/10 text-[var(--color-dark)]"
                  : "bg-[var(--color-light-gray)] text-[var(--color-muted)]"
              }`}
            >
              Book a Call
            </button>
          </div>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left — Audit Form */}
          <div
            className={`bg-[var(--color-light-gray)] border border-[var(--border-subtle)] rounded-2xl p-6 md:p-8 transition-all duration-700 delay-200 ${
              mobileTab !== "audit" ? "hidden lg:block" : ""
            } ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <h3 className="text-lg font-semibold text-[var(--color-dark)] mb-6">
              Tell us about your facility.
            </h3>

            {/* Deep Diagnostic CTA */}
            <a
              href="/diagnostic"
              className="mb-6 flex items-center gap-3 rounded-xl border border-[var(--color-gold)]/20 bg-[var(--color-gold)]/[0.06] p-4 transition-colors hover:bg-[var(--color-gold)]/[0.1]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-gold)]/20">
                <Zap size={18} className="text-[var(--color-gold)]" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-[var(--color-dark)]">Want an AI-Powered Deep Diagnostic?</p>
                <p className="text-xs text-[var(--color-muted)]">
                  5-minute form &rarr; Instant AI audit with scores, benchmarks &amp; action plan
                </p>
              </div>
              <ArrowRight size={16} className="text-[var(--color-gold)] shrink-0" />
            </a>

            {isSubmitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                  <Check size={32} className="text-green-400" />
                </div>
                <h4 className="text-xl font-semibold text-[var(--color-dark)] mb-2">
                  Audit requested
                </h4>
                <p style={{ color: "var(--text-secondary)" }}>
                  We&apos;ll get back to you within 24 hours with your
                  facility audit.
                </p>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5" role="form" aria-label="Free facility audit request">
                <input
                  name="name"
                  placeholder="Your name"
                  required
                  aria-required="true"
                  aria-label="Your name"
                  className="input-field"
                />
                <input
                  name="email"
                  type="email"
                  placeholder="Email address"
                  required
                  aria-required="true"
                  aria-label="Email address"
                  className="input-field"
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Phone number (optional)"
                  aria-label="Phone number (optional)"
                  className="input-field"
                />
                <input
                  name="facilityName"
                  placeholder="Facility name"
                  required
                  aria-required="true"
                  aria-label="Facility name"
                  className="input-field"
                />
                <input
                  name="location"
                  placeholder="Facility location (city, state)"
                  required
                  aria-required="true"
                  aria-label="Facility location (city, state)"
                  className="input-field"
                />
                <input
                  name="totalUnits"
                  placeholder="Number of units (approximate)"
                  aria-label="Number of units (approximate)"
                  className="input-field"
                />
                <select
                  name="occupancyRange"
                  className="input-field"
                  defaultValue=""
                  aria-label="Current occupancy range"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <option value="" disabled>
                    Current occupancy range
                  </option>
                  {OCCUPANCY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <select
                  name="runningAds"
                  className="input-field"
                  defaultValue=""
                  aria-label="Are you currently running paid ads?"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <option value="" disabled>
                    Are you currently running paid ads?
                  </option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                  <option value="not-sure">Not sure</option>
                </select>
                <textarea
                  name="biggestChallenge"
                  placeholder="What is your biggest challenge right now?"
                  rows={3}
                  aria-label="What is your biggest challenge right now?"
                  className="input-field resize-none"
                  style={{ borderBottom: "1px solid var(--border-medium)" }}
                />
                <input
                  name="howHeard"
                  placeholder="How did you hear about StorageAds? (optional)"
                  aria-label="How did you hear about StorageAds? (optional)"
                  className="input-field"
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary w-full"
                >
                  {isSubmitting ? "Sending..." : "Get My Free Audit"}
                </button>

                <div className="flex flex-wrap gap-4 justify-center pt-2">
                  {["Response within 24 hours.", "Free — no credit card required.", "Takes 2 minutes."].map(
                    (text) => (
                      <p
                        key={text}
                        className="text-xs flex items-center gap-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        <Check size={10} style={{ color: "var(--accent)" }} />
                        {text}
                      </p>
                    )
                  )}
                </div>
              </form>
            )}
          </div>

          {/* Right — Cal.com Full Embed */}
          <div
            className={`bg-[var(--color-light-gray)] border border-[var(--border-subtle)] rounded-2xl p-6 md:p-8 transition-all duration-700 delay-400 ${
              mobileTab !== "call" ? "hidden lg:block" : ""
            } ${
              isVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={20} style={{ color: "var(--accent)" }} />
              <h3 className="text-lg font-semibold text-[var(--color-dark)]">
                Book with me anytime
              </h3>
            </div>
            <p
              className="mb-6"
              style={{ color: "var(--text-secondary)" }}
            >
              30-minute strategy call. Operator to operator. No pitch deck.
              No account executives. Just Blake walking through your situation.
            </p>

            {/* Cal.com inline embed container */}
            <div
              ref={calContainerRef}
              id="cal-embed"
              className="w-full rounded-lg overflow-hidden"
              style={{ minHeight: 550 }}
            >
              {/* Cal.com embed script injects the booking UI here */}
              {!calLoaded && (
                <div className="flex flex-col items-center justify-center gap-4 py-16 animate-pulse">
                  <div className="w-14 h-14 rounded-full bg-[var(--color-dark)]/5 flex items-center justify-center">
                    <Calendar size={24} style={{ color: "var(--text-tertiary)" }} />
                  </div>
                  <div className="h-3 w-44 rounded bg-[var(--color-dark)]/5" />
                  <div className="h-3 w-32 rounded bg-[var(--color-dark)]/5" />
                  <div className="mt-4 grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 35 }).map((_, i) => (
                      <div key={i} className="w-7 h-7 rounded bg-[var(--color-dark)]/5" />
                    ))}
                  </div>
                  <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
                    Loading calendar...
                  </p>
                </div>
              )}
            </div>

            {/* Fallback direct link */}
            <a
              href={`https://cal.com/${CALCOM_SLUG}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm font-medium transition-colors hover:text-[var(--color-dark)]"
              style={{ color: "var(--text-secondary)" }}
            >
              Open in new tab <ArrowRight size={14} />
            </a>

            {/* Trust signals */}
            <div className="mt-6 space-y-3">
              {TRUST_SIGNALS.map((signal) => {
                const Icon = signal.icon;
                return (
                  <div
                    key={signal.text}
                    className="flex items-center gap-3"
                  >
                    <Icon
                      size={16}
                      style={{ color: "var(--text-tertiary)" }}
                    />
                    <span
                      className="text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {signal.text}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
