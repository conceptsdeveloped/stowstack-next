"use client";

import { ArrowRight, TrendingDown, AlertTriangle } from "lucide-react";
import { useInView } from "./use-in-view";

const MONTHS = [
  {
    month: 1,
    title: "3 vacant units",
    detail: "$450/mo walking out the door",
    loss: 450,
    cumulative: 450,
    severity: "bg-red-400/60",
  },
  {
    month: 2,
    title: "Competitor launches Google Ads",
    detail: "They're now capturing search demand you're invisible to",
    loss: 600,
    cumulative: 1050,
    severity: "bg-red-400/70",
  },
  {
    month: 3,
    title: "5 move-outs, 2 move-ins",
    detail: "Net loss of 3 units: now 6 vacant",
    loss: 900,
    cumulative: 1950,
    severity: "bg-red-500/70",
  },
  {
    month: 4,
    title: "Summer moving season starts",
    detail: "Your competitors fill up. You don't.",
    loss: 1200,
    cumulative: 3150,
    severity: "bg-red-500/80",
  },
  {
    month: 5,
    title: "8 vacant units",
    detail: "$1,200/mo lost: competitor raises rates (you can't)",
    loss: 1200,
    cumulative: 4350,
    severity: "bg-red-500/90",
  },
  {
    month: 6,
    title: "Occupancy below 80%",
    detail: "Revenue spiral: cutting rates to attract tenants",
    loss: 1500,
    cumulative: 5850,
    severity: "bg-red-600",
  },
];

export default function InactionTimeline() {
  const { ref, isVisible } = useInView();

  return (
    <section
      aria-label="The cost of inaction over six months"
      className="section relative overflow-hidden"
      style={{ background: "var(--color-light)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at bottom, rgba(239,68,68,0.06), transparent 70%)",
        }}
      />

      <div ref={ref} className="section-content relative">
        <div
          className={`max-w-3xl mx-auto text-center mb-14 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium mb-6">
            <AlertTriangle size={14} /> The Cost of Doing Nothing
          </div>
          <h2
            className="font-semibold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            Every month you wait costs more than StorageAds
          </h2>
          <p
            className="mt-4 text-lg mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Here&apos;s what happens over 6 months when you don&apos;t have a
            demand engine.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/20 via-red-500/40 to-red-500/60 hidden md:block" />

          <div className="space-y-4">
            {MONTHS.map((m, i) => (
              <div
                key={m.month}
                className={`flex items-start gap-4 md:gap-6 transition-all duration-600 ${
                  isVisible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4"
                }`}
                style={{ transitionDelay: `${200 + i * 120}ms` }}
              >
                <div
                  className={`w-16 h-16 rounded-full ${m.severity} flex items-center justify-center flex-shrink-0 border-2 border-red-500/30`}
                >
                  <div className="text-center">
                    <p className="text-[10px] text-red-900 uppercase leading-none">
                      Month
                    </p>
                    <p className="text-lg font-semibold text-[var(--color-dark)] leading-none">
                      {m.month}
                    </p>
                  </div>
                </div>

                <div className="flex-1 bg-[var(--color-light-gray)] backdrop-blur-sm border border-[var(--border-subtle)] rounded-xl p-4 hover:border-red-500/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-[var(--color-dark)]">{m.title}</h3>
                      <p
                        className="text-sm mt-0.5"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {m.detail}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm text-red-400 font-medium">
                        -${m.loss.toLocaleString()}/mo
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        cumulative: -${m.cumulative.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 w-full h-2 rounded-full bg-[var(--color-dark)]/5 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${m.severity} transition-all duration-1000`}
                      style={{
                        width: isVisible
                          ? `${(m.cumulative / 5850) * 100}%`
                          : "0%",
                        transitionDelay: `${500 + i * 120}ms`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          className={`mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700 delay-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
            <TrendingDown size={24} className="text-red-400 mx-auto mb-2" />
            <p
              className="text-xs uppercase mb-1 text-red-400"
              style={{ letterSpacing: "var(--tracking-wide)" }}
            >
              6-Month Inaction Cost
            </p>
            <p className="text-3xl font-semibold text-red-400">-$5,850</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Lost revenue that compounds every month
            </p>
          </div>
          <div className="bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-6 text-center">
            <TrendingDown
              size={24}
              className="text-[var(--color-gold)] mx-auto mb-2 rotate-180"
            />
            <p
              className="text-xs uppercase mb-1 text-[var(--color-gold)]"
              style={{ letterSpacing: "var(--tracking-wide)" }}
            >
              6 Months with StorageAds
            </p>
            <p className="text-3xl font-semibold text-[var(--color-gold)]">+$43,200</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Based on $41 cost-per-move-in at 8 move-ins/mo (Growth plan)
            </p>
          </div>
        </div>

        <div
          className={`mt-8 text-center transition-all duration-700 delay-1200 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-lg font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
            The math isn&apos;t complicated. Inaction is the most expensive
            option.
          </p>
          <a href="#cta" className="btn-primary inline-flex items-center gap-2">
            Get Your Free Revenue Audit <ArrowRight size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
