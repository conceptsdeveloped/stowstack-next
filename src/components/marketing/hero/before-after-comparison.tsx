"use client";

import { useStaggeredReveal } from "./hooks";
import { BEFORE_AFTER } from "./content";

export function BeforeAfterComparison({ isVisible }: { isVisible: boolean }) {
  const revealed = useStaggeredReveal(BEFORE_AFTER.length, isVisible, 400, 150);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {BEFORE_AFTER.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border p-4 transition-all duration-600"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--bg-elevated)",
            opacity: revealed[i] ? 1 : 0,
            transform: revealed[i] ? "translateX(0)" : i % 2 === 0 ? "translateX(-16px)" : "translateX(16px)",
          }}
        >
          <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
            {/* X icon for before */}
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(176,74,58,0.1)" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {/* Arrow down */}
            <div className="w-px h-3" style={{ background: "var(--border-medium)" }} />
            {/* Check icon for after */}
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(120,140,93,0.12)" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5.5L4 7.5L8 3"
                  stroke="var(--color-green)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 12,
                    strokeDashoffset: revealed[i] ? 0 : 12,
                    transition: "stroke-dashoffset 0.6s ease-out",
                    transitionDelay: `${600 + i * 150}ms`,
                  }}
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] line-through" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>
              {item.before}
            </div>
            <div className="text-[12px] font-semibold mt-1" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>
              {item.after}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
