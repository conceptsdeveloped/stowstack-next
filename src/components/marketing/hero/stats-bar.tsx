"use client";

import { useInView } from "../use-in-view";
import { useCountUp } from "./hooks";
import { STATS } from "./content";

function StatItem({ stat, active, delay }: { stat: (typeof STATS)[0]; active: boolean; delay: number }) {
  const count = useCountUp(stat.value, 2200, stat.decimals, active);
  const Icon = stat.icon;
  return (
    <div
      className="flex items-center gap-3 transition-all duration-700"
      style={{ transitionDelay: `${delay}ms`, opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(16px)" }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-glow)", border: "1px solid var(--border-medium)" }}>
        <Icon size={18} style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <div className="font-semibold leading-none" style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.03em", color: "var(--color-dark)" }}>
          {stat.prefix}{stat.decimals > 0 ? count.toFixed(stat.decimals) : Math.round(count)}{stat.suffix}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{stat.label}</div>
      </div>
    </div>
  );
}

export function StatsBar() {
  const { ref, isVisible } = useInView(0.1);
  return (
    <section ref={ref} aria-label="Key performance stats" className="relative border-t" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-10 sm:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {STATS.map((stat, i) => (
            <StatItem key={stat.label} stat={stat} active={isVisible} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}
