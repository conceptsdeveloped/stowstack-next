"use client";

import { useInView } from "./use-in-view";

const CASE_STUDIES = [
  {
    name: "Midway Self Storage: Cassopolis, MI",
    context:
      "A 247-unit facility at 71% occupancy with no paid ads and a default storEDGE rental page. StorageAds launched a Meta campaign with 3 ad-specific landing pages targeting climate-controlled, vehicle storage, and first-month-free audiences.",
    stats: [
      { value: "34", label: "move-ins in 90 days" },
      { value: "$41", label: "cost per move-in" },
      { value: "71% → 84%", label: "occupancy in one quarter" },
      { value: "35x", label: "return on ad spend" },
    ],
  },
  {
    name: "Lakeshore Storage: South Haven, MI",
    context:
      "A seasonal market with 60% winter occupancy. StorageAds ran targeted campaigns for boat/RV storage and temperature-sensitive items during the fall shoulder season.",
    stats: [
      { value: "22", label: "move-ins in 60 days" },
      { value: "$38", label: "cost per move-in" },
      { value: "74%", label: "winter occupancy (vs 60% prior year)" },
      { value: "8.7%", label: "LP conversion (vs 2.1% homepage)" },
    ],
  },
];

export default function Results() {
  const { ref, isVisible } = useInView();

  return (
    <section
      id="results"
      aria-label="Case studies and operator results"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="section-content">
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            We tested it on our own facilities first. Here&apos;s what happened.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {CASE_STUDIES.map((study, i) => (
            <div
              key={study.name}
              className={`bg-[var(--color-light-gray)] border border-[var(--border-subtle)] rounded-2xl p-6 md:p-8 transition-all duration-700 ${
                isVisible
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
              style={{ transitionDelay: `${200 + i * 200}ms` }}
            >
              <h3 className="text-lg font-semibold text-[var(--color-dark)] mb-3">
                {study.name}
              </h3>
              <p
                className="text-sm mb-6"
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: "var(--leading-normal)",
                }}
              >
                {study.context}
              </p>

              <div className="grid grid-cols-2 gap-4">
                {study.stats.map((stat) => (
                  <div key={stat.label} className="text-center">
                    <p
                      className="text-2xl font-semibold text-[var(--color-gold)]"
                      style={{ fontFamily: "var(--font-mono-family)" }}
                    >
                      {stat.value}
                    </p>
                    <p
                      className="text-xs mt-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ROI math */}
        <div
          className={`max-w-3xl mx-auto mt-16 text-container transition-all duration-700 delay-500 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            <strong className="text-[var(--color-dark)]">Here&apos;s the math.</strong> A
            single move-in at a typical facility is worth $100-150/mo in
            recurring revenue. At a 12-month average tenant stay, that&apos;s
            $1,200-1,800 in lifetime value per move-in. If StorageAds&apos;s
            Growth tier produces 5-10 incremental move-ins per month, you&apos;re
            generating $6,000-18,000 in annualized revenue from a $1,500/mo
            investment. That&apos;s a 4-12x return before the system even starts
            optimizing.
          </p>
          <p
            className="text-sm leading-relaxed mt-4"
            style={{ color: "var(--text-secondary)" }}
          >
            As A/B testing and attribution data compound over 6+ months, cost
            per move-in drops and conversion rate climbs. The ROI only gets
            better with time.
          </p>
        </div>
      </div>
    </section>
  );
}
