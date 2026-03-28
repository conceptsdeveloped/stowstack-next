"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowRight, Share2, Check } from "lucide-react";

interface CalculatorInputs {
  totalUnits: number;
  occupancy: number;
  avgRate: number;
  monthlyBudget: number;
}

interface CalculatorOutputs {
  estMoveIns: number;
  additionalRevenue: number;
  roas: number;
  annualImpact: number;
}

const AVG_COST_PER_MOVE_IN = 14.2;

function calculate(inputs: CalculatorInputs): CalculatorOutputs {
  const estMoveIns = Math.round(inputs.monthlyBudget / AVG_COST_PER_MOVE_IN);
  const additionalRevenue = estMoveIns * inputs.avgRate;
  const roas = inputs.monthlyBudget > 0 ? additionalRevenue / inputs.monthlyBudget : 0;
  const annualImpact = additionalRevenue * 12;
  return { estMoveIns, additionalRevenue, roas, annualImpact };
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-xl p-5 text-center"
      style={{ backgroundColor: "var(--color-light)", border: "1px solid var(--color-light-gray)" }}
    >
      <p className="text-xs font-medium uppercase tracking-wider mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}>
        {label}
      </p>
      <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
        {value}
      </p>
      {sub && <p className="text-xs mt-1" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>{sub}</p>}
    </div>
  );
}

function SliderInput({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
          {label}
        </label>
        <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}>
          {format(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--color-gold)]"
      />
      <div className="flex justify-between text-xs mt-1" style={{ color: "var(--color-mid-gray)" }}>
        <span>{format(min)}</span>
        <span>{format(max)}</span>
      </div>
    </div>
  );
}

export default function CalculatorPage() {
  const [inputs, setInputs] = useState<CalculatorInputs>({
    totalUnits: 150,
    occupancy: 78,
    avgRate: 95,
    monthlyBudget: 1500,
  });
  const [copied, setCopied] = useState(false);

  const outputs = useMemo(() => calculate(inputs), [inputs]);

  const update = (key: keyof CalculatorInputs, val: number) => {
    setInputs((prev) => ({ ...prev, [key]: val }));
  };

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/calculator?units=${inputs.totalUnits}&occ=${inputs.occupancy}&rate=${inputs.avgRate}&budget=${inputs.monthlyBudget}`
    : "";

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-light)" }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: "var(--color-light-gray)" }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
            <span>storage</span><span style={{ color: "var(--color-gold)" }}>ads</span>
          </Link>
          <Link
            href="/demo"
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium"
            style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
          >
            Book a Call
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-semibold mb-3" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
            ROI Calculator
          </h1>
          <p className="text-base max-w-xl mx-auto" style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)" }}>
            See what StorageAds could deliver for your facility. Enter your numbers — we&apos;ll show you the math.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Inputs */}
          <div>
            <h2 className="text-lg font-medium mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
              Your Facility
            </h2>

            <SliderInput
              label="Total Units"
              value={inputs.totalUnits}
              onChange={(v) => update("totalUnits", v)}
              min={50}
              max={500}
              step={10}
              format={(v) => String(v)}
            />

            <SliderInput
              label="Current Occupancy"
              value={inputs.occupancy}
              onChange={(v) => update("occupancy", v)}
              min={50}
              max={100}
              step={1}
              format={(v) => `${v}%`}
            />

            <SliderInput
              label="Average Monthly Rate"
              value={inputs.avgRate}
              onChange={(v) => update("avgRate", v)}
              min={40}
              max={250}
              step={5}
              format={(v) => `$${v}`}
            />

            <SliderInput
              label="Monthly Ad Budget"
              value={inputs.monthlyBudget}
              onChange={(v) => update("monthlyBudget", v)}
              min={500}
              max={5000}
              step={100}
              format={(v) => `$${v.toLocaleString()}`}
            />
          </div>

          {/* Results */}
          <div>
            <h2 className="text-lg font-medium mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
              Projected Results
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <StatCard
                label="Est. Move-ins / Month"
                value={String(outputs.estMoveIns)}
                sub={`at $${AVG_COST_PER_MOVE_IN.toFixed(2)} per move-in`}
              />
              <StatCard
                label="Additional Revenue"
                value={`$${outputs.additionalRevenue.toLocaleString()}`}
                sub="per month"
              />
              <StatCard
                label="ROAS"
                value={`${outputs.roas.toFixed(1)}x`}
                sub="return on ad spend"
              />
              <StatCard
                label="Annual Impact"
                value={`$${outputs.annualImpact.toLocaleString()}`}
                sub="additional yearly revenue"
              />
            </div>

            {/* Assumptions */}
            <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "var(--color-light-gray)" }}>
              <p className="text-xs font-medium mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}>
                Assumptions
              </p>
              <ul className="space-y-1 text-xs" style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)" }}>
                <li>Average cost per move-in: $14.20 (based on our operator data)</li>
                <li>Assumes {100 - inputs.occupancy}% vacancy ({Math.round(inputs.totalUnits * (1 - inputs.occupancy / 100))} available units)</li>
                <li>Results are estimates. Actual performance varies by market.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href="/demo"
                className="flex-1 flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-medium"
                style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
              >
                Book a Call with Blake
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-lg border px-4 py-3 text-sm font-medium"
                style={{ fontFamily: "var(--font-heading)", color: "var(--color-body-text)", borderColor: "var(--color-light-gray)" }}
              >
                {copied ? <Check className="h-4 w-4" style={{ color: "var(--color-green)" }} /> : <Share2 className="h-4 w-4" />}
                {copied ? "Copied" : "Share"}
              </button>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <p className="text-center text-xs mt-16 max-w-lg mx-auto" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
          These projections are estimates based on StorageAds operator averages. Actual results depend on market conditions, facility quality, and competition. Not a guarantee.
        </p>
      </main>
    </div>
  );
}
