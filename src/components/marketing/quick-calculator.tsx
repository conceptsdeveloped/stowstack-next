"use client";

import { useState } from "react";
import { Calculator, ArrowRight } from "lucide-react";
import { useInView } from "./use-in-view";

export default function QuickCalculator() {
  const { ref, isVisible } = useInView(0.15);
  const [totalUnits, setTotalUnits] = useState(150);
  const [occupancy, setOccupancy] = useState(78);

  const avgRate = 130;
  const vacantUnits = Math.round(totalUnits * (1 - occupancy / 100));
  const monthlyLoss = vacantUnits * avgRate;
  const annualLoss = monthlyLoss * 12;
  const stowstackCost = 999;
  const projectedMoveIns = 8;
  const projectedRecovery = projectedMoveIns * avgRate;
  const roi =
    stowstackCost + 1500 > 0
      ? Math.round((projectedRecovery / (stowstackCost + 1500)) * 10) / 10
      : 0;

  return (
    <section
      aria-label="Quick revenue calculator"
      className="section relative overflow-hidden"
      style={{ background: "var(--bg-elevated)" }}
    >
      <div ref={ref} className="section-content">
        <div
          className={`transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
              <Calculator size={14} /> Quick Revenue Calculator
            </div>
            <h2
              className="font-bold"
              style={{ fontSize: "var(--text-section-head)" }}
            >
              See What You&apos;re Losing in 10 Seconds
            </h2>
          </div>

          <div className="max-w-4xl mx-auto bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Units
                    </label>
                    <span className="text-sm font-bold text-blue-400">
                      {totalUnits}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={20}
                    max={600}
                    step={10}
                    value={totalUnits}
                    onChange={(e) => setTotalUnits(Number(e.target.value))}
                    aria-label="Total units"
                    className="w-full accent-blue-500 h-2"
                  />
                  <div className="flex justify-between mt-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      20
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      600
                    </span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className="text-sm font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Current Occupancy
                    </label>
                    <span
                      className={`text-sm font-bold ${
                        occupancy < 85 ? "text-red-400" : "text-blue-400"
                      }`}
                    >
                      {occupancy}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={40}
                    max={99}
                    step={1}
                    value={occupancy}
                    onChange={(e) => setOccupancy(Number(e.target.value))}
                    aria-label="Current occupancy percentage"
                    className="w-full accent-blue-500 h-2"
                  />
                  <div className="flex justify-between mt-1">
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      40%
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      99%
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                  <p
                    className="text-xs uppercase text-red-400 mb-1"
                    style={{ letterSpacing: "var(--tracking-wide)" }}
                  >
                    You&apos;re Losing
                  </p>
                  <p className="text-3xl font-black text-red-400">
                    ${monthlyLoss.toLocaleString()}
                    <span className="text-lg font-medium">/mo</span>
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {vacantUnits} vacant units × ${avgRate} avg rate = $
                    {annualLoss.toLocaleString()}/yr
                  </p>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                  <p
                    className="text-xs uppercase text-blue-400 mb-1"
                    style={{ letterSpacing: "var(--tracking-wide)" }}
                  >
                    StowStack Projects
                  </p>
                  <p className="text-3xl font-black text-blue-400">
                    {projectedMoveIns}{" "}
                    <span className="text-lg font-medium">move-ins/mo</span>
                  </p>
                  <p
                    className="text-xs mt-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    ${projectedRecovery.toLocaleString()}/mo recovered · {roi}x
                    ROI on Growth plan
                  </p>
                </div>

                <a
                  href="#cta"
                  className="btn-primary flex items-center justify-center gap-2 text-sm"
                >
                  See the Full Breakdown <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
