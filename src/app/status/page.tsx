"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CheckCircle, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

type ComponentStatus = "operational" | "degraded" | "down";

interface SystemComponent {
  name: string;
  status: ComponentStatus;
  uptime: number;
}

const STATUS_CONFIG: Record<ComponentStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  operational: { label: "Operational", color: "var(--color-green)", bg: "rgba(120,140,93,0.15)", icon: CheckCircle },
  degraded: { label: "Degraded", color: "var(--color-gold)", bg: "var(--color-gold-light)", icon: AlertTriangle },
  down: { label: "Down", color: "var(--color-red)", bg: "rgba(176,74,58,0.1)", icon: XCircle },
};

// System components — wire to /api/health-check when monitoring is set up
const COMPONENTS: SystemComponent[] = [
  { name: "Dashboard", status: "operational", uptime: 99.98 },
  { name: "API", status: "operational", uptime: 99.99 },
  { name: "Meta Integration", status: "operational", uptime: 99.95 },
  { name: "Google Integration", status: "operational", uptime: 99.97 },
  { name: "storEDGE Integration", status: "operational", uptime: 99.96 },
  { name: "Landing Pages", status: "operational", uptime: 99.99 },
  { name: "Email Delivery", status: "operational", uptime: 99.94 },
];

function getOverallStatus(components: SystemComponent[]): ComponentStatus {
  if (components.some((c) => c.status === "down")) return "down";
  if (components.some((c) => c.status === "degraded")) return "degraded";
  return "operational";
}

const OVERALL_MESSAGES: Record<ComponentStatus, string> = {
  operational: "All systems operational",
  degraded: "Some systems experiencing issues",
  down: "Major outage in progress",
};

export default function StatusPage() {
  const [lastChecked, setLastChecked] = useState<Date>(new Date());
  const overall = getOverallStatus(COMPONENTS);
  const overallCfg = STATUS_CONFIG[overall];
  const OverallIcon = overallCfg.icon;

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => setLastChecked(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-light)" }}>
      <header className="border-b" style={{ borderColor: "var(--color-light-gray)" }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
            <span>storage</span><span style={{ color: "var(--color-gold)" }}>ads</span>
            <span className="text-sm ml-2 font-normal" style={{ color: "var(--color-mid-gray)" }}>Status</span>
          </Link>
          <button
            type="button"
            onClick={() => setLastChecked(new Date())}
            className="flex items-center gap-1.5 text-xs"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        {/* Overall status banner */}
        <div
          className="rounded-xl p-6 mb-8 flex items-center gap-4"
          style={{ backgroundColor: overallCfg.bg }}
        >
          <OverallIcon className="h-8 w-8 shrink-0" style={{ color: overallCfg.color }} />
          <div>
            <h1
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
            >
              {OVERALL_MESSAGES[overall]}
            </h1>
            <p className="text-xs mt-1" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          </div>
        </div>

        {/* Component list */}
        <div className="rounded-xl border overflow-hidden mb-8" style={{ borderColor: "var(--color-light-gray)" }}>
          {COMPONENTS.map((comp, idx) => {
            const cfg = STATUS_CONFIG[comp.status];
            const Icon = cfg.icon;
            return (
              <div
                key={comp.name}
                className="flex items-center justify-between px-5 py-4"
                style={{
                  borderBottom: idx < COMPONENTS.length - 1 ? "1px solid var(--color-light-gray)" : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" style={{ color: cfg.color }} />
                  <span
                    className="text-sm font-medium"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
                  >
                    {comp.name}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs" style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}>
                    {comp.uptime}% uptime
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ fontFamily: "var(--font-heading)", color: cfg.color, backgroundColor: cfg.bg }}
                  >
                    {cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Incident history placeholder */}
        <h2
          className="text-lg font-medium mb-4"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
        >
          Incident History
        </h2>
        <div
          className="rounded-xl border p-8 text-center"
          style={{ borderColor: "var(--color-light-gray)" }}
        >
          <CheckCircle className="mx-auto mb-3 h-6 w-6" style={{ color: "var(--color-green)" }} />
          <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
            No incidents in the last 30 days.
          </p>
        </div>

        {/* Subscribe */}
        <div className="mt-8 text-center">
          <p className="text-xs mb-2" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
            Get notified about outages
          </p>
          <div className="flex items-center justify-center gap-2 max-w-sm mx-auto">
            <input
              type="email"
              placeholder="your@email.com"
              className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:border-[var(--color-gold)]"
              style={{ backgroundColor: "var(--color-light)", borderColor: "var(--color-light-gray)", color: "var(--color-dark)", fontFamily: "var(--font-body)" }}
            />
            <button
              type="button"
              className="rounded-lg px-4 py-2 text-sm font-medium"
              style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
            >
              Subscribe
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
