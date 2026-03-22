"use client";

import { useState } from "react";
import {
  Brain,
  Megaphone,
  FileText,
  ShoppingCart,
  BarChart3,
  RefreshCw,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { useInView } from "./use-in-view";

const COMPONENTS = [
  {
    id: "intelligence",
    icon: Brain,
    title: "Demand Intelligence",
    subtitle: "Know your market",
    color: "text-violet-400",
    bg: "bg-violet-500/10 border-violet-500/30",
    activeBg: "bg-violet-500/20 border-violet-400 shadow-violet-500/20",
    detail:
      "We analyze your market, competitors, pricing, occupancy, and demographics to find where demand exists and how to capture it.",
    bullets: [
      "Competitor pricing & review tracking",
      "Census demographics & renter data",
      "Search volume estimation for your area",
    ],
  },
  {
    id: "engine",
    icon: Megaphone,
    title: "Ad Engine",
    subtitle: "Create demand",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    activeBg: "bg-blue-500/20 border-blue-400 shadow-blue-500/20",
    detail:
      "Meta ads create new demand. Google PPC captures search intent. Retargeting brings back visitors. All three channels, managed together.",
    bullets: [
      "Facebook + Instagram ad campaigns",
      "Google Search & Display PPC",
      "Multi-window retargeting sequences",
    ],
  },
  {
    id: "pages",
    icon: FileText,
    title: "Landing Pages",
    subtitle: "Catch the click",
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    activeBg: "bg-blue-500/20 border-blue-400 shadow-blue-500/20",
    detail:
      "Every ad gets its own page with its own headline, offer, and tracking. Not your homepage. A conversion-optimized page built for that specific audience.",
    bullets: [
      "Ad-specific URLs with unique offers",
      "8.7% average conversion rate",
      "Mobile-first, fast-loading design",
    ],
  },
  {
    id: "conversion",
    icon: ShoppingCart,
    title: "Conversion Flow",
    subtitle: "Close the deal",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/30",
    activeBg: "bg-amber-500/20 border-amber-400 shadow-amber-500/20",
    detail:
      "Embedded storEDGE rental functionality. The customer reserves on YOUR branded page. No redirect. No off-brand experience. No friction.",
    bullets: [
      "Embedded reservation & move-in flow",
      "Customer stays on your branded page",
      "Real-time unit availability & pricing",
    ],
  },
  {
    id: "attribution",
    icon: BarChart3,
    title: "Attribution Layer",
    subtitle: "Prove it works",
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/30",
    activeBg: "bg-rose-500/20 border-rose-400 shadow-rose-500/20",
    detail:
      "Every move-in traces to the specific ad that produced it. Cost per reservation. Cost per move-in. ROAS by creative. Revenue, not clicks.",
    bullets: [
      "Ad → page → reservation → move-in tracking",
      "Cost per move-in by campaign",
      "ROAS by creative and audience",
    ],
  },
  {
    id: "optimize",
    icon: RefreshCw,
    title: "Optimization Loop",
    subtitle: "Get smarter",
    color: "text-cyan-400",
    bg: "bg-cyan-500/10 border-cyan-500/30",
    activeBg: "bg-cyan-500/20 border-cyan-400 shadow-cyan-500/20",
    detail:
      "A/B testing on headlines, offers, and layouts. Winners are picked by actual move-in behavior. The machine gets smarter every month.",
    bullets: [
      "Revenue-based A/B testing",
      "Creative performance scoring",
      "Compounding returns over time",
    ],
  },
];

export default function DemandEngineVisual() {
  const { ref, isVisible } = useInView();
  const [activeId, setActiveId] = useState<string | null>(null);

  const activeComponent = COMPONENTS.find((c) => c.id === activeId);

  return (
    <section
      id="demand-engine"
      aria-label="The six components of the StowStack demand engine"
      className="section relative overflow-hidden"
      style={{ background: "var(--bg-void)" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(59,130,246,0.06), transparent 70%)",
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm font-medium mb-6">
            This isn't an ad agency. This is a revenue machine.
          </div>
          <h2
            className="font-bold"
            style={{ fontSize: "var(--text-section-head)" }}
          >
            6 Systems Working Together to{" "}
            <span className="text-blue-400">Fill Your Units</span>
          </h2>
          <p className="mt-4 text-lg" style={{ color: "var(--text-secondary)" }}>
            Click any component to see how it works. Together, they form a
            closed-loop demand engine.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {COMPONENTS.map((comp, i) => {
            const Icon = comp.icon;
            const isActive = activeId === comp.id;
            return (
              <button
                key={comp.id}
                onClick={() => setActiveId(isActive ? null : comp.id)}
                aria-expanded={isActive}
                aria-label={`${comp.title}: ${comp.subtitle}`}
                className={`relative rounded-xl p-4 border text-center transition-all duration-300 cursor-pointer ${
                  isActive
                    ? `${comp.activeBg} shadow-lg`
                    : `${comp.bg} hover:border-white/20`
                } ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: `${200 + i * 80}ms` }}
              >
                <Icon size={24} className={`mx-auto mb-2 ${comp.color}`} />
                <p className="text-xs font-semibold text-white leading-tight">
                  {comp.title}
                </p>
                <p
                  className="text-[10px] mt-0.5"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {comp.subtitle}
                </p>
                {i < COMPONENTS.length - 1 && (
                  <ArrowRight
                    size={12}
                    className="absolute -right-2 top-1/2 -translate-y-1/2 text-stone-600 hidden lg:block"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div
          className={`hidden lg:flex items-center justify-center gap-1 mb-8 transition-all duration-700 delay-700 ${
            isVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {COMPONENTS.map((comp, i) => (
            <div key={comp.id} className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full ${comp.color.replace(
                  "text-",
                  "bg-"
                )} opacity-60`}
              />
              {i < COMPONENTS.length - 1 && (
                <div className="w-12 h-px bg-gradient-to-r from-white/10 to-white/10 mx-1" />
              )}
            </div>
          ))}
        </div>

        {activeComponent && (
          <div className="bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 transition-all duration-300">
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${activeComponent.bg} flex items-center justify-center flex-shrink-0`}
              >
                <activeComponent.icon
                  size={24}
                  className={activeComponent.color}
                />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">
                  {activeComponent.title}
                </h3>
                <p
                  className="text-sm mt-2 leading-relaxed"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {activeComponent.detail}
                </p>
                <ul className="mt-4 space-y-2">
                  {activeComponent.bullets.map((b, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      <div
                        className={`w-1.5 h-1.5 rounded-full ${activeComponent.color.replace(
                          "text-",
                          "bg-"
                        )}`}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {!activeId && (
          <p
            className={`text-center text-sm flex items-center justify-center gap-1 transition-all duration-500 delay-1000 ${
              isVisible ? "opacity-100" : "opacity-0"
            }`}
            style={{ color: "var(--text-tertiary)" }}
          >
            <ChevronDown size={14} className="animate-bounce" /> Click a
            component above to explore
          </p>
        )}
      </div>
    </section>
  );
}
