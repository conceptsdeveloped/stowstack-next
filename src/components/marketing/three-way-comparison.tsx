"use client";

import { Check, X, Minus } from "lucide-react";
import { useInView } from "./use-in-view";

const ROWS = [
  {
    label: "Landing Pages",
    diy: "Your homepage (2% conv)",
    agency: "Generic template (3-4% conv)",
    storageads: "Ad-specific pages (8.7% conv)",
  },
  {
    label: "Rental Flow",
    diy: "Customer bounces to storEDGE",
    agency: "Same bounce, different URL",
    storageads: "Embedded on your branded page",
  },
  {
    label: "Attribution",
    diy: '"We got some calls this month"',
    agency: "Clicks and impressions (40% may be existing tenants)",
    storageads: "Cost per move-in by specific ad",
  },
  {
    label: "Ad Channels",
    diy: "Boosted Facebook post",
    agency: "Google or Facebook, not both",
    storageads: "Meta + Google PPC + Retargeting",
  },
  {
    label: "A/B Testing",
    diy: "None",
    agency: "Occasionally tests ad copy",
    storageads: "Tests pages, offers, creative on revenue",
  },
  {
    label: "Reporting",
    diy: "Nothing",
    agency: "Monthly PDF of vanity metrics",
    storageads: "Real-time: leads → reservations → move-ins",
  },
  {
    label: "Who Builds It",
    diy: "You, at 11pm after gate calls",
    agency: "Agency that also does dentists",
    storageads: "An operator who built this for his own facilities",
  },
  {
    label: "Time to Results",
    diy: "Months (if ever)",
    agency: "30-60 days (maybe)",
    storageads: "7 days to first leads",
  },
  {
    label: "Follow-Up",
    diy: "You forgot to call them back",
    agency: "Not their job",
    storageads: "Automated SMS + email nurture sequences",
  },
  {
    label: "Cost",
    diy: "Your time + wasted ad spend",
    agency: "$1,500-5,000/mo + ad spend (% of spend = misaligned)",
    storageads: "$499-1,499/mo + ad spend",
  },
];

export default function ThreeWayComparison() {
  const { ref, isVisible } = useInView();

  return (
    <section
      aria-label="Comparison of DIY, agency, and StorageAds approaches"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="section-content">
        <div
          className={`max-w-3xl mx-auto text-center mb-14 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            Doing It Yourself vs. Hiring an Agency vs.{" "}
            <span style={{ color: "var(--color-gold)" }}>Using a Demand Engine</span>
          </h2>
          <p
            className="mt-4 text-lg"
            style={{ color: "var(--text-secondary)" }}
          >
            Three approaches. Only one fills units and proves it.
          </p>
        </div>

        {/* Column headers */}
        <div
          className={`hidden md:grid grid-cols-4 gap-3 mb-4 px-2 transition-all duration-700 delay-100 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div />
          <div className="flex items-center gap-2 px-4">
            <div className="w-6 h-6 bg-[var(--color-dark)]/5 rounded-full flex items-center justify-center">
              <Minus size={12} className="text-stone-500" />
            </div>
            <span
              className="text-xs font-semibold uppercase"
              style={{
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              Do It Yourself
            </span>
          </div>
          <div className="flex items-center gap-2 px-4">
            <div className="w-6 h-6 bg-orange-500/10 rounded-full flex items-center justify-center">
              <X size={12} className="text-orange-500" />
            </div>
            <span
              className="text-xs font-semibold text-orange-800 uppercase"
              style={{ letterSpacing: "var(--tracking-wide)" }}
            >
              Ad Agency
            </span>
          </div>
          <div className="flex items-center gap-2 px-4">
            <div className="w-6 h-6 bg-[var(--color-gold)]/10 rounded-full flex items-center justify-center">
              <Check size={12} className="text-[var(--color-gold)]" />
            </div>
            <span
              className="text-xs font-semibold text-[var(--color-gold)] uppercase"
              style={{ letterSpacing: "var(--tracking-wide)" }}
            >
              StorageAds
            </span>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-2">
          {ROWS.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3 transition-all duration-500 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-4"
              }`}
              style={{ transitionDelay: `${200 + i * 50}ms` }}
            >
              <div className="flex items-center px-4 py-2">
                <span className="text-sm font-semibold text-[var(--color-dark)]">
                  {row.label}
                </span>
              </div>

              <div className="bg-[var(--color-light-gray)] border border-[var(--border-subtle)] rounded-xl px-4 py-3">
                <span
                  className="md:hidden text-[10px] font-semibold uppercase"
                  style={{
                    color: "var(--text-tertiary)",
                    letterSpacing: "var(--tracking-wide)",
                  }}
                >
                  DIY
                </span>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {row.diy}
                </p>
              </div>

              <div className="bg-orange-500/[0.05] border border-orange-500/10 rounded-xl px-4 py-3">
                <span
                  className="md:hidden text-[10px] font-semibold text-orange-800 uppercase"
                  style={{ letterSpacing: "var(--tracking-wide)" }}
                >
                  Agency
                </span>
                <p className="text-sm text-orange-800">{row.agency}</p>
              </div>

              <div className="bg-[var(--color-gold)]/[0.08] border border-[var(--color-gold)]/20 rounded-xl px-4 py-3">
                <span
                  className="md:hidden text-[10px] font-semibold text-[var(--color-gold)] uppercase"
                  style={{ letterSpacing: "var(--tracking-wide)" }}
                >
                  StorageAds
                </span>
                <p className="text-sm text-[var(--color-gold)] font-medium">
                  {row.storageads}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
