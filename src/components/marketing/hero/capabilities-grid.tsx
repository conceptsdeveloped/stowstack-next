"use client";

import { useState } from "react";
import { useStaggeredReveal } from "./hooks";
import { CAPABILITIES } from "./content";

export function CapabilitiesGrid({ isVisible }: { isVisible: boolean }) {
  const revealed = useStaggeredReveal(CAPABILITIES.length, isVisible, 200, 80);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CAPABILITIES.map((cap, i) => {
        const Icon = cap.icon;
        const isActive = activeIdx === i;
        return (
          <div
            key={cap.label}
            className="relative rounded-xl border p-3 sm:p-4 transition-all duration-400 cursor-default"
            style={{
              borderColor: isActive ? "rgba(181,139,63,0.3)" : "var(--border-subtle)",
              background: isActive ? "var(--bg-elevated)" : "transparent",
              opacity: revealed[i] ? 1 : 0,
              transform: revealed[i]
                ? isActive ? "translateY(-2px) scale(1.02)" : "translateY(0) scale(1)"
                : "translateY(12px) scale(0.95)",
              boxShadow: isActive ? "0 8px 24px rgba(0,0,0,0.06)" : "none",
            }}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-all duration-300"
              style={{
                background: `color-mix(in srgb, ${cap.color} 10%, transparent)`,
                transform: isActive ? "scale(1.15)" : "scale(1)",
              }}
            >
              <Icon size={15} style={{ color: cap.color, transition: "color 0.3s" }} />
            </div>
            <div className="text-[11px] sm:text-xs font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>
              {cap.label}
            </div>
            <div
              className="text-[10px] mt-0.5 leading-snug transition-all duration-300 overflow-hidden"
              style={{
                color: "var(--text-tertiary)",
                maxHeight: isActive ? "40px" : "0px",
                opacity: isActive ? 1 : 0,
              }}
            >
              {cap.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}
