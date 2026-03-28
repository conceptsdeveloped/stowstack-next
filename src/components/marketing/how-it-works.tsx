"use client";

import { useInView } from "./use-in-view";

const STEPS = [
  {
    number: "01",
    title: "We create demand.",
    body: "Meta ads reach people before they search. Google PPC captures people already looking. Retargeting brings back the ones who left. Most operators only do one of these. We run all three.",
  },
  {
    number: "02",
    title: "Every ad gets its own landing page.",
    body: "Not your homepage. Not a generic rental page. A dedicated URL built for that specific campaign, with its own headline, its own offer, and its own tracking.",
    examples: [
      "[your-facility].storageads.com/climate-pawpaw: for the climate-controlled search ad",
      "[your-facility].storageads.com/10x10-offer: for the first-month-free Facebook ad",
      "[your-facility].storageads.com/finish-your-rental: for the retargeting campaign",
    ],
    kicker:
      "Different intent. Different pages. Different offers. That's how conversion rate goes up.",
  },
  {
    number: "03",
    title: "The rental flow is embedded in the page.",
    body: "storEDGE handles real-time availability, reservation processing, and payment. But the customer never leaves your branded page. They see your facility. Your branding. Your offer. And they rent: right there.",
  },
  {
    number: "04",
    title: "We tell you exactly which ad produced which move-in.",
    body: "Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, audience, keyword, and creative. Not clicks. Not impressions. Revenue.",
  },
];

export default function HowItWorks() {
  const { ref, isVisible } = useInView();

  return (
    <section
      id="how-it-works"
      aria-label="How StorageAds works in four steps"
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
            className="font-semibold max-w-3xl mx-auto"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            From ad impression to signed lease. One system. Full visibility.
          </h2>
          <p
            className="mt-4 mx-auto max-w-2xl"
            style={{ color: "var(--text-secondary)" }}
          >
            Every step connects. The ad drives the click, the landing page
            converts it, the rental flow closes it, and attribution tells you
            which ad deserves the credit.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-0">
          {STEPS.map((step, i) => (
            <div key={step.number}>
              <div
                className={`h-px mx-auto transition-all duration-700 ${
                  isVisible ? "w-full" : "w-0"
                }`}
                style={{
                  background: "var(--border-subtle)",
                  transitionDelay: `${200 + i * 150}ms`,
                }}
              />

              <div
                className={`py-12 transition-all duration-700 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: `${300 + i * 150}ms` }}
              >
                <div className="flex items-start gap-6">
                  <span
                    className="text-3xl font-semibold flex-shrink-0"
                    style={{
                      color: "var(--accent)",
                      fontFamily: "var(--font-mono-family)",
                    }}
                  >
                    {step.number}
                  </span>
                  <div>
                    <h3
                      className="font-semibold mb-3"
                      style={{ fontSize: "var(--text-subhead)" }}
                    >
                      {step.title}
                    </h3>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        lineHeight: "var(--leading-normal)",
                      }}
                    >
                      {step.body}
                    </p>

                    {step.examples && (
                      <div className="mt-4 space-y-2">
                        {step.examples.map((ex, j) => (
                          <p
                            key={j}
                            className="text-sm pl-4 border-l-2"
                            style={{
                              borderColor: "var(--accent)",
                              color: "var(--text-secondary)",
                              fontFamily: "var(--font-mono-family)",
                              fontSize: "var(--text-small)",
                            }}
                          >
                            {ex}
                          </p>
                        ))}
                        {step.kicker && (
                          <p
                            className="mt-3 font-medium"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {step.kicker}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
