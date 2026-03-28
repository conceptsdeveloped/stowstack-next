"use client";

import { useState } from "react";
import { useInView } from "./use-in-view";

const COMPONENTS = [
  {
    id: "intelligence",
    number: "01",
    title: "Demand Intelligence",
    summary:
      "We analyze your market, competitors, pricing, occupancy, and demographics to find where demand exists and how to capture it.",
    detail: [
      "Competitor pricing and review tracking",
      "Census demographics and renter data",
      "Search volume estimation for your area",
    ],
  },
  {
    id: "engine",
    number: "02",
    title: "Ad Engine",
    summary:
      "Meta ads create new demand. Google PPC captures search intent. Retargeting brings back visitors. All three channels, managed together.",
    detail: [
      "Facebook + Instagram ad campaigns",
      "Google Search and Display PPC",
      "Multi-window retargeting sequences",
    ],
  },
  {
    id: "pages",
    number: "03",
    title: "Landing Pages",
    summary:
      "Every ad gets its own page with its own headline, offer, and tracking. Not your homepage. A conversion-optimized page built for that specific audience.",
    detail: [
      "Ad-specific URLs with unique offers",
      "8.7% average conversion rate",
      "Mobile-first, fast-loading design",
    ],
  },
  {
    id: "conversion",
    number: "04",
    title: "Conversion Flow",
    summary:
      "Embedded storEDGE rental functionality. The customer reserves on YOUR branded page: no redirect, no friction. They stay on your site the entire time.",
    detail: [
      "Embedded reservation and move-in flow",
      "Customer stays on your branded page",
      "Real-time unit availability and pricing",
    ],
  },
  {
    id: "attribution",
    number: "05",
    title: "Attribution",
    summary:
      "Every move-in traces to the specific ad that produced it. Cost per reservation. Cost per move-in. ROAS by creative. Revenue, not clicks.",
    detail: [
      "Ad \u2192 page \u2192 reservation \u2192 move-in tracking",
      "Cost per move-in by campaign",
      "ROAS by creative and audience",
    ],
  },
  {
    id: "optimize",
    number: "06",
    title: "Optimization Loop",
    summary:
      "A/B testing on headlines, offers, and layouts. Winners are picked by actual move-in behavior. The system gets smarter every month.",
    detail: [
      "Revenue-based A/B testing",
      "Creative performance scoring",
      "Compounding returns over time",
    ],
  },
];

export default function DemandEngineVisual() {
  const { ref, isVisible } = useInView();
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <section
      id="demand-engine"
      aria-label="The six components of the StorageAds demand engine"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="text-container">
        <div
          className={`max-w-3xl mx-auto text-center mb-16 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            One engine. Six capabilities.{" "}
            <span style={{ color: "var(--color-gold)" }}>Every move-in attributed.</span>
          </h2>
          <p
            className="mt-4"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
            }}
          >
            Ads, pages, attribution, optimization: all connected. Not an
            agency guessing on your behalf. A system that shows you what&apos;s working and what isn&apos;t.
          </p>
        </div>

        <div className="space-y-0">
          {COMPONENTS.map((comp, i) => {
            const isActive = activeId === comp.id;
            return (
              <div key={comp.id}>
                {/* Divider */}
                <div
                  className={`h-px transition-all duration-700 ${
                    isVisible ? "w-full" : "w-0"
                  }`}
                  style={{
                    background: "var(--border-subtle)",
                    transitionDelay: `${200 + i * 100}ms`,
                  }}
                />

                <button
                  onClick={() => setActiveId(isActive ? null : comp.id)}
                  aria-expanded={isActive}
                  className={`w-full text-left py-8 transition-all duration-500 cursor-pointer ${
                    isVisible
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${300 + i * 100}ms` }}
                >
                  <div className="flex items-baseline gap-4 md:gap-6">
                    <span
                      className="text-sm font-semibold tabular-nums flex-shrink-0"
                      style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)" }}
                    >
                      {comp.number}
                    </span>
                    <div className="flex-1">
                      <div className="flex items-baseline justify-between gap-4">
                        <h3
                          className="font-semibold"
                          style={{
                            fontSize: "var(--text-subhead)",
                            color: "var(--text-primary)",
                          }}
                        >
                          {comp.title}
                        </h3>
                        <span
                          className="text-sm flex-shrink-0 hidden md:block"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {isActive ? "\u2212" : "+"}
                        </span>
                      </div>
                      <p
                        className="mt-1 text-sm"
                        style={{
                          color: "var(--text-secondary)",
                          maxWidth: "580px",
                        }}
                      >
                        {comp.summary}
                      </p>

                      {/* Expandable detail */}
                      <div
                        className="overflow-hidden transition-all duration-300"
                        style={{
                          maxHeight: isActive ? "200px" : "0",
                          opacity: isActive ? 1 : 0,
                        }}
                      >
                        <ul className="mt-4 space-y-2">
                          {comp.detail.map((item, j) => (
                            <li
                              key={j}
                              className="flex items-center gap-3 text-sm"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              <span
                                className="w-1 h-1 rounded-full flex-shrink-0"
                                style={{ background: "var(--color-gold)" }}
                              />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            );
          })}

          {/* Final divider */}
          <div
            className={`h-px transition-all duration-700 ${
              isVisible ? "w-full" : "w-0"
            }`}
            style={{
              background: "var(--border-subtle)",
              transitionDelay: "800ms",
            }}
          />
        </div>
      </div>
    </section>
  );
}
