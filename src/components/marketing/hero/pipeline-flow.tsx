"use client";

import { useState, useEffect } from "react";
import { PIPELINE_STEPS } from "./content";

export function PipelineFlow({ isVisible }: { isVisible: boolean }) {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!isVisible) return;
    const timers = PIPELINE_STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i), 1200 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <div
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: "900ms" }}
    >
      <div className="flex items-center justify-between max-w-sm mx-auto lg:mx-0 relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px]" style={{ background: "var(--border-subtle)" }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--color-green))",
              width: activeStep >= 3 ? "100%" : activeStep >= 0 ? `${(activeStep + 1) * 33}%` : "0%",
              transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>

        {PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= activeStep;
          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center" style={{ width: "25%" }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500"
                style={{
                  background: isActive ? "var(--bg-elevated)" : "var(--color-light)",
                  borderColor: isActive ? "var(--accent)" : "var(--border-subtle)",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  boxShadow: isActive ? "0 4px 12px var(--accent-glow)" : "none",
                }}
              >
                <Icon size={16} style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)", transition: "color 0.3s" }} />
              </div>
              <span
                className="text-[11px] font-semibold mt-1.5 transition-colors duration-300"
                style={{ fontFamily: "var(--font-heading)", color: isActive ? "var(--color-dark)" : "var(--text-tertiary)" }}
              >
                {step.label}
              </span>
              <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>{step.sublabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
