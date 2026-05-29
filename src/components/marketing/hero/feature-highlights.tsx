"use client";

import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { useStaggeredReveal } from "./hooks";
import { FEATURE_HIGHLIGHTS } from "./content";

export function FeatureHighlights({ isVisible }: { isVisible: boolean }) {
  const revealed = useStaggeredReveal(FEATURE_HIGHLIGHTS.length, isVisible, 200, 120);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {FEATURE_HIGHLIGHTS.map((feat, i) => {
        const Icon = feat.icon;
        const isHovered = hoveredIdx === i;
        return (
          <div
            key={feat.title}
            className="relative rounded-2xl border p-5 transition-all duration-500 cursor-default group"
            style={{
              borderColor: isHovered ? "var(--accent)" : "var(--border-subtle)",
              background: "var(--bg-alt)",
              opacity: revealed[i] ? 1 : 0,
              transform: revealed[i]
                ? isHovered ? "translateY(-4px)" : "translateY(0)"
                : "translateY(20px) scale(0.95)",
              boxShadow: isHovered
                ? "0 12px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(181,139,63,0.1)"
                : "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
            onClick={() => setHoveredIdx((prev) => (prev === i ? null : i))}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-500"
              style={{
                background: isHovered ? "rgba(181,139,63,0.12)" : "rgba(181,139,63,0.06)",
                border: "1px solid rgba(181,139,63,0.15)",
                transform: isHovered ? "scale(1.1) rotate(-3deg)" : "scale(1)",
              }}
            >
              <Icon size={18} style={{ color: "var(--color-gold)" }} />
            </div>

            {/* Stat badge */}
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 transition-all duration-300"
              style={{
                background: "rgba(181,139,63,0.08)",
                color: "var(--color-gold)",
                fontFamily: "var(--font-heading)",
                transform: isHovered ? "translateX(2px)" : "translateX(0)",
              }}
            >
              {feat.stat}
            </div>

            {/* Title */}
            <h3
              className="text-sm font-semibold mb-1"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
            >
              {feat.title}
            </h3>

            {/* Description */}
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "none" }}>
              {feat.desc}
            </p>

            {/* Arrow — always visible on touch devices, hover-only on pointer */}
            <div
              className="absolute top-4 right-4 transition-all duration-300"
              style={{
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? "translate(0, 0)" : "translate(-4px, 4px)",
              }}
            >
              <ArrowUpRight size={14} style={{ color: "var(--color-gold)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
