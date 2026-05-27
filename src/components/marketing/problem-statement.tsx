"use client";

import { useInView } from "./use-in-view";
import { SectionHeader, SectionMeta } from "@/components/mono/section-header";

const PROBLEMS = [
  {
    heading: "Average tenant lifetime value: $1,820.",
    body: "14-month average tenure at $130/month. Acquisition cost on the StorageAds system: $41. The return profile on every incremental move-in is 44:1. This is the math the REITs run on. It works the same for 150 units as it does for 15,000.",
    highlight: "44:1",
  },
  {
    heading: "Revenue leakage compounds monthly.",
    body: "Reservations that don't convert. Competitors you haven't priced against. Reviews unanswered. Organic search uncaptured. Retargeting not deployed. Each one is a source of lost revenue that the system identifies and closes.",
    highlight: "identifies and closes",
  },
  {
    heading: "The infrastructure gap between REITs and independents is a strategy gap.",
    body: "Public Storage operates a marketing team, a creative studio, competitive intelligence, and dedicated landing pages per campaign. StorageAds delivers the same capabilities in a single system deployed to your facility.",
    highlight: "same capabilities",
  },
];

export default function ProblemStatement() {
  const { ref, isVisible } = useInView();

  return (
    <section
      id="problem"
      aria-label="The problem with current self-storage marketing"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="text-container">
        <SectionHeader number="04" kicker="THE PROBLEM" right={<SectionMeta text="TRUTH · 4" />} style={{ marginBottom: 24 }} />
        {/* Section headline */}
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
            The economics are simple. The infrastructure to act on them hasn&apos;t existed for independents. Until now.
          </h2>
          <p
            className="mt-6 mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
            }}
          >
            National occupancy is at 77%. Google CPCs are up 45%. Most operators
            can&apos;t tell which ads filled which units. Fewer than 5% of independent
            operators run Meta ads — yet Meta CPCs are 75–95% cheaper than Google.
          </p>
          <p
            className="mt-4 font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Here&apos;s what&apos;s actually happening.
          </p>
        </div>

        {/* Pain points */}
        <div className="space-y-0">
          {PROBLEMS.map((problem, i) => (
            <div key={i}>
              {/* Divider */}
              <div
                className={`h-px mx-auto transition-all duration-700 ${
                  isVisible ? "w-full" : "w-0"
                }`}
                style={{
                  background: "var(--border-subtle)",
                  transitionDelay: `${300 + i * 200}ms`,
                }}
              />

              <div
                className={`py-12 transition-all duration-700 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${400 + i * 200}ms` }}
              >
                <h3
                  className="font-semibold mb-4"
                  style={{
                    fontSize: "var(--text-subhead)",
                    color: "var(--text-primary)",
                  }}
                >
                  {problem.heading}
                </h3>
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "var(--text-body)",
                    lineHeight: "var(--leading-normal)",
                  }}
                >
                  {problem.body.split(problem.highlight).map((part, j) => (
                    <span key={j}>
                      {part}
                      {j === 0 && (
                        <span style={{ color: "var(--accent)" }}>
                          {problem.highlight}
                        </span>
                      )}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          ))}

          {/* Final divider */}
          <div
            className={`h-px mx-auto transition-all duration-700 ${
              isVisible ? "w-full" : "w-0"
            }`}
            style={{
              background: "var(--border-subtle)",
              transitionDelay: "900ms",
            }}
          />
        </div>

        {/* Kicker */}
        <div
          className={`text-center mt-12 transition-all duration-700 delay-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <p
            className="text-xl font-semibold"
            style={{ color: "var(--accent)" }}
          >
            You&apos;re not paying for marketing. You&apos;re paying for
            guesswork.
          </p>
        </div>
      </div>
    </section>
  );
}
