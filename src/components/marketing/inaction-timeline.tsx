"use client";

import { SectionHeader, SectionMeta } from "@/components/mono/section-header";

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
    title: "2 more move-outs, summer starts",
    detail: "Now 8 vacant. Your competitors fill up. You don\u2019t.",
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
    title: "10 vacant — occupancy below 80%",
    detail: "Rate cuts attract short-term tenants who churn. Revenue spiral.",
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
        <SectionHeader number="05" kicker="COST OF INACTION" right={<SectionMeta text="MONTHS · 6" />} style={{ marginBottom: 28 }} />
        <div
          className={`max-w-3xl mx-auto text-center mb-14 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <AlertTriangle size={14} /> The Cost of Doing Nothing
          </div>
          <h2 className="font-semibold text-2xl sm:text-3xl md:text-4xl leading-tight">
            Every month you wait costs more than StorageAds
          </h2>
          <p
            className="mt-4 text-base sm:text-lg mx-auto"
            style={{ color: "var(--text-secondary)" }}
          >
            Here&apos;s what happens over 6 months when you don&apos;t have a
            demand engine.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-red-500/20 via-red-500/40 to-red-500/60 hidden md:block" />

          <div className="space-y-3 sm:space-y-4">
            {MONTHS.map((m, i) => (
              <div
                key={m.month}
                className={`flex items-start gap-2.5 sm:gap-4 md:gap-6 transition-all duration-600 ${
                  isVisible
                    ? "opacity-100 translate-x-0"
                    : "opacity-0 -translate-x-4"
                }`}
                style={{ transitionDelay: `${200 + i * 120}ms` }}
              >
                <div
                  className={`w-10 h-10 sm:w-16 sm:h-16 rounded-full ${m.severity} flex items-center justify-center flex-shrink-0 border-2 border-red-500/30`}
                >
                  <div className="text-center">
                    <p className="text-[7px] sm:text-[10px] text-red-900 uppercase leading-none tracking-tight">
                      Mo
                    </p>
                    <p className="text-[13px] sm:text-lg font-semibold text-[var(--color-dark)] leading-none mt-0.5">
                      {m.month}
                    </p>
                  </div>
                </div>

                <div className="flex-1 min-w-0 bg-[var(--color-light-gray)] backdrop-blur-sm border border-[var(--border-subtle)] rounded-xl p-2.5 sm:p-4 hover:border-red-500/20 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-[13px] sm:text-base text-[var(--color-dark)] leading-snug">{m.title}</h3>
                      <p
                        className="text-[11px] sm:text-sm mt-1 leading-snug"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {m.detail}
                      </p>
                    </div>
                    <div className="sm:text-right shrink-0 flex flex-row sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-black/[0.04] sm:border-none">
                      <p className="text-[11px] sm:text-sm text-red-400 font-medium whitespace-nowrap">
                        -${m.loss.toLocaleString()}/mo
                      </p>
                      <p
                        className="text-[10px] sm:text-xs whitespace-nowrap"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        cum: -${m.cumulative.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-2.5 sm:mt-3 w-full h-1.5 sm:h-2 rounded-full bg-[var(--color-dark)]/5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.severity} transition-all duration-1000`}
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
          className={`mt-10 sm:mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-700 delay-1000 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 sm:p-6 text-center">
            <TrendingDown size={24} className="text-red-400 mx-auto mb-2" />
            <p
              className="text-xs uppercase mb-1 text-red-400"
              style={{ letterSpacing: "var(--tracking-wide)" }}
            >
              6-Month Inaction Cost
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-red-400">-$5,850</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Lost revenue that compounds every month
            </p>
          </div>
          <div className="bg-[var(--color-dark)]/5 border border-[var(--color-dark)]/10 rounded-2xl p-5 sm:p-6 text-center">
            <TrendingDown
              size={24}
              className="text-[var(--color-dark)] mx-auto mb-2 rotate-180"
            />
            <p
              className="text-xs uppercase mb-1 text-[var(--color-dark)]"
              style={{ letterSpacing: "var(--tracking-wide)" }}
            >
              6 Months with StorageAds
            </p>
            <p className="text-2xl sm:text-3xl font-semibold text-[var(--color-dark)]">+$43,200</p>
            <p
              className="text-sm mt-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Based on 8 move-ins/mo at $900 avg lifetime value per tenant
            </p>
          </div>
        </div>

        <div
          className={`mt-6 sm:mt-8 text-center transition-all duration-700 delay-1200 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <p className="text-base sm:text-lg font-medium mb-4" style={{ color: "var(--text-secondary)" }}>
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
