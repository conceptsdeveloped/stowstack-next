"use client";

import { useInView } from "./use-in-view";

const PROBLEMS = [
  {
    heading: "Every ad goes to the same page.",
    body: 'Your Google ads, your Facebook ads, your retargeting — all of it dumps traffic onto your homepage or a generic storEDGE rental page. A customer searching "climate controlled storage in Paw Paw" lands on the same page as someone clicking a "first month free" ad. Different intent — same dead-end experience.',
    highlight: "same dead-end experience",
  },
  {
    heading: "Your rental flow lives on someone else's page.",
    body: "When a customer finally decides to reserve, they get bounced to an off-brand system page that looks nothing like your facility. You lose trust. You lose conversions. You lose move-ins you already paid to attract.",
    highlight: "lose move-ins you already paid to attract",
  },
  {
    heading: "You can't tell what's working.",
    body: "Which ad produced that move-in last Tuesday? Which campaign is actually driving revenue? Which headline converts better? You don't know. Your agency doesn't know either. They're optimizing for clicks, not leases.",
    highlight: "optimizing for clicks, not leases",
  },
];

export default function ProblemStatement() {
  const { ref, isVisible } = useInView();

  return (
    <section
      aria-label="The problem with current self-storage marketing"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="text-container">
        {/* Section headline */}
        <div
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-bold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            You&apos;re spending money on ads. You have no idea which ones are
            filling units.
          </h2>
          <p
            className="mt-6 mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
            }}
          >
            National occupancy is at 77%. Google CPCs are up 45%. Up to 90% of
            lead conversions go unattributed. And fewer than 5% of independent
            operators run Meta ads — where CPCs are 75-95% cheaper than Google.
          </p>
          <p
            className="mt-4 font-medium"
            style={{ color: "var(--text-primary)" }}
          >
            Here is what is actually happening.
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
                  className="font-bold mb-4"
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
            className="text-xl font-bold"
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
