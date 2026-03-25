"use client";

import { useInView } from "./use-in-view";
import { Megaphone, FileText, CreditCard, BarChart3 } from "lucide-react";
import { useState, useEffect, useRef } from "react";

const STEPS = [
  {
    number: "01",
    icon: Megaphone,
    title: "We create demand.",
    body: "Meta ads reach people before they search. Google PPC captures people already looking. Retargeting brings back the ones who left. Most operators only do one of these. We run all three.",
  },
  {
    number: "02",
    icon: FileText,
    title: "Every ad gets its own landing page.",
    body: "Not your homepage. Not a generic rental page. A dedicated URL built for that specific campaign, with its own headline, its own offer, and its own tracking.",
    examples: [
      "storageads.com/climate-pawpaw-a — for the climate-controlled search ad",
      "storageads.com/10x10-offer-b — for the first-month-free Facebook ad",
      "storageads.com/finish-your-rental-c — for the retargeting campaign",
    ],
    kicker:
      "Different intent. Different pages. Different offers. That is how conversion rate goes up.",
  },
  {
    number: "03",
    icon: CreditCard,
    title: "The rental flow is embedded in the page.",
    body: "storEDGE handles real-time availability, reservation processing, and payment. But the customer never leaves your branded page. They see your facility. Your branding. Your offer. And they rent — right there.",
  },
  {
    number: "04",
    icon: BarChart3,
    title: "We tell you exactly which ad produced which move-in.",
    body: "Cost per reservation. Cost per move-in. Conversion rate by campaign, ad, audience, keyword, and creative. Not clicks. Not impressions. Revenue.",
  },
];

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div
      className="absolute left-[23px] top-0 bottom-0 w-px hidden md:block"
      style={{ background: "var(--border-subtle)" }}
    >
      <div
        className="w-full transition-all duration-1000 ease-out"
        style={{
          height: `${progress}%`,
          background: "var(--color-gold)",
        }}
      />
    </div>
  );
}

export default function HowItWorks() {
  const { ref, isVisible } = useInView(0.1);
  const sectionRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    function handleScroll() {
      if (!sectionRef.current) return;
      const rect = sectionRef.current.getBoundingClientRect();
      const sectionTop = rect.top;
      const sectionHeight = rect.height;
      const viewportHeight = window.innerHeight;

      // Progress from when section enters viewport to when it leaves
      const start = viewportHeight;
      const end = -sectionHeight;
      const current = sectionTop;
      const progress = Math.min(100, Math.max(0, ((start - current) / (start - end)) * 100));
      setScrollProgress(progress);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section
      id="how-it-works"
      aria-label="How StorageAds works in four steps"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div ref={ref} className="section-content">
        {/* Section header */}
        <div
          className={`text-center mb-20 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-4"
            style={{ color: "var(--color-gold)", letterSpacing: "var(--tracking-ultra)" }}
          >
            How it works
          </p>
          <h2
            className="font-bold max-w-4xl mx-auto"
            style={{
              fontSize: "var(--text-section-head)",
              lineHeight: "var(--leading-tight)",
              color: "var(--color-dark)",
            }}
          >
            From ad impression to signed lease.
            <br />
            <span style={{ color: "var(--color-gold)" }}>One system. Full visibility.</span>
          </h2>
          <p
            className="mt-6 mx-auto max-w-2xl"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--leading-relaxed)",
            }}
          >
            Four layers. Each feeds the next. Together they form a complete path
            from ad click to move-in — with full attribution at every step.
          </p>
        </div>

        {/* Steps with progress line */}
        <div ref={sectionRef} className="max-w-3xl mx-auto relative">
          <ProgressBar progress={scrollProgress} />

          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const delay = 200 + i * 200;

            return (
              <div
                key={step.number}
                className={`relative pl-0 md:pl-16 pb-16 last:pb-0 transition-all duration-700 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-8"
                }`}
                style={{ transitionDelay: `${delay}ms` }}
              >
                {/* Step icon — sits on the progress line */}
                <div
                  className="hidden md:flex absolute left-0 top-0 w-12 h-12 rounded-full items-center justify-center border-2 z-10 transition-all duration-500"
                  style={{
                    background: scrollProgress > (i * 25) + 10 ? "var(--color-gold)" : "var(--color-light)",
                    borderColor: scrollProgress > (i * 25) + 10 ? "var(--color-gold)" : "var(--border-medium)",
                    transitionDelay: `${delay + 100}ms`,
                  }}
                >
                  <Icon
                    size={20}
                    style={{
                      color: scrollProgress > (i * 25) + 10 ? "white" : "var(--color-mid-gray)",
                    }}
                  />
                </div>

                {/* Mobile icon */}
                <div
                  className="md:hidden flex items-center gap-3 mb-4"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center"
                    style={{ background: "var(--color-gold)", color: "white" }}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className="text-sm font-bold"
                    style={{
                      color: "var(--color-gold)",
                      fontFamily: "var(--font-mono-family, monospace)",
                    }}
                  >
                    Step {step.number}
                  </span>
                </div>

                {/* Content card */}
                <div
                  className="rounded-xl border p-6 sm:p-8 transition-all duration-300 hover:shadow-lg"
                  style={{
                    borderColor: "var(--border-subtle)",
                    background: "var(--bg-elevated)",
                  }}
                >
                  <div className="flex items-baseline gap-3 mb-3">
                    <span
                      className="text-xs font-bold uppercase tracking-widest hidden md:inline"
                      style={{
                        color: "var(--color-gold)",
                        fontFamily: "var(--font-mono-family, monospace)",
                      }}
                    >
                      {step.number}
                    </span>
                    <h3
                      className="font-bold"
                      style={{
                        fontSize: "var(--text-subhead)",
                        color: "var(--color-dark)",
                      }}
                    >
                      {step.title}
                    </h3>
                  </div>

                  <p
                    style={{
                      color: "var(--text-secondary)",
                      lineHeight: "var(--leading-normal)",
                      fontSize: "var(--text-body)",
                    }}
                  >
                    {step.body}
                  </p>

                  {step.examples && (
                    <div className="mt-6 space-y-2">
                      {step.examples.map((ex, j) => (
                        <p
                          key={j}
                          className="text-sm pl-4 border-l-2"
                          style={{
                            borderColor: "var(--color-gold)",
                            color: "var(--text-secondary)",
                            fontFamily: "var(--font-mono-family, monospace)",
                            fontSize: "var(--text-small)",
                          }}
                        >
                          {ex}
                        </p>
                      ))}
                      {step.kicker && (
                        <p
                          className="mt-4 font-semibold"
                          style={{
                            color: "var(--color-dark)",
                            fontSize: "var(--text-body)",
                          }}
                        >
                          {step.kicker}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
