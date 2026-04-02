"use client";

import { useState } from "react";
import {
  ChevronLeft,
  Users,
  TrendingUp,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Target,
} from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import type { ChurnPrediction } from "./tenant-management-types";

/* ── types ── */

interface ChurnPredictionItem {
  id: string;
  tenant_id: string;
  risk_score: number;
  risk_level: string;
  predicted_vacate?: string;
  factors: Record<string, number>;
  recommended_actions?: string[];
  retention_status?: string;
  tenants?: { name: string; unit_number: string; email?: string; monthly_rate: number; days_delinquent?: number };
}

interface ChurnResponse {
  predictions: ChurnPredictionItem[];
  stats: {
    total_scored: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    enrolled: number;
    retained: number;
    churned: number;
    avg_risk_score: number;
  };
}

/* ── helpers ── */

function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center gap-2">
        <div className={`${color || "text-[var(--color-body-text)]"}`}>{icon}</div>
        <span className="text-xs text-[var(--color-mid-gray)]">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-semibold ${color || "text-[var(--color-dark)]"}`}>{value}</p>
    </div>
  );
}

function RiskBadge({ prediction }: { prediction?: ChurnPrediction }) {
  if (!prediction) return <span className="text-xs text-[var(--color-mid-gray)]">--</span>;
  const colors: Record<string, string> = {
    low: "bg-emerald-500/20 text-emerald-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${colors[prediction.risk_level] || colors.low}`}>
      {prediction.risk_score} -- {prediction.risk_level}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-[var(--color-light-gray)]" />
        ))}
      </div>
      <div className="h-10 animate-pulse rounded-lg bg-[var(--color-light-gray)]" />
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-[var(--color-light-gray)]" />
        ))}
      </div>
    </div>
  );
}

/* ── main component ── */

export function ChurnDashboard({ facilityId, onBack }: { facilityId: string; onBack: () => void }) {
  const { data, loading, error, refetch } = useAdminFetch<ChurnResponse>(
    "/api/churn-predictions",
    { facilityId }
  );
  const [scoring, setScoring] = useState(false);
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const runScoring = async () => {
    setScoring(true);
    try {
      await adminFetch("/api/churn-predictions", {
        method: "POST",
        body: JSON.stringify({ facilityId }),
      });
      refetch();
    } catch { /* ignore */ }
    setScoring(false);
  };

  const predictions = data?.predictions || [];
  const stats = data?.stats;

  const filtered = riskFilter === "all" ? predictions : predictions.filter(p => p.risk_level === riskFilter);

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 hover:bg-[var(--color-light-gray)]">
          <ChevronLeft className="h-4 w-4 text-[var(--color-body-text)]" />
        </button>
        <h2 className="flex-1 text-lg font-semibold">Churn Risk Dashboard</h2>
        <button
          onClick={runScoring}
          disabled={scoring}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
        >
          {scoring ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          {scoring ? "Scoring..." : "Run Churn Scoring"}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPICard label="Total Scored" value={stats.total_scored} icon={<Users className="h-4 w-4" />} />
            <KPICard label="Avg Risk Score" value={Math.round(stats.avg_risk_score)} icon={<TrendingUp className="h-4 w-4" />} color={stats.avg_risk_score >= 50 ? "text-red-400" : "text-emerald-400"} />
            <KPICard label="Enrolled (Retention)" value={stats.enrolled} icon={<Target className="h-4 w-4" />} color="text-[var(--color-gold)]" />
            <KPICard label="Retained" value={stats.retained} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-400" />
          </div>

          {/* Risk Distribution */}
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
            <h3 className="mb-3 text-sm font-semibold">Risk Distribution</h3>
            <div className="flex gap-2">
              {[
                { level: "critical", count: stats.critical, color: "bg-red-500", label: "Critical" },
                { level: "high", count: stats.high, color: "bg-orange-500", label: "High" },
                { level: "medium", count: stats.medium, color: "bg-yellow-500", label: "Medium" },
                { level: "low", count: stats.low, color: "bg-emerald-500", label: "Low" },
              ].map(({ level, count, color, label }) => {
                const pct = stats.total_scored > 0 ? (count / stats.total_scored) * 100 : 0;
                return (
                  <button
                    key={level}
                    onClick={() => setRiskFilter(riskFilter === level ? "all" : level)}
                    className={`flex-1 rounded-lg p-3 text-center transition-colors ${
                      riskFilter === level ? "ring-2 ring-[var(--color-gold)]" : ""
                    } bg-[var(--color-light-gray)] hover:bg-[var(--color-light-gray)]`}
                  >
                    <div className={`mx-auto mb-1 h-2 w-12 rounded-full ${color}`} style={{ opacity: 0.3 + (pct / 100) * 0.7 }} />
                    <p className="text-lg font-semibold">{count}</p>
                    <p className="text-[10px] text-[var(--color-mid-gray)]">{label} ({Math.round(pct)}%)</p>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* At-Risk Tenant List */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <div className="border-b border-[var(--border-subtle)] px-4 py-3">
          <h3 className="text-sm font-semibold">
            {riskFilter === "all" ? "All Scored Tenants" : `${riskFilter.charAt(0).toUpperCase() + riskFilter.slice(1)} Risk Tenants`}
            <span className="ml-2 text-xs text-[var(--color-mid-gray)]">({filtered.length})</span>
          </h3>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--color-mid-gray)]">
            {predictions.length === 0 ? "No churn scores yet -- click \"Run Churn Scoring\" to generate" : "No tenants match this filter"}
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            {filtered.sort((a, b) => b.risk_score - a.risk_score).map(pred => (
              <div key={pred.id} className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-dark)]">{pred.tenants?.name || "Unknown"}</p>
                  <p className="text-xs text-[var(--color-mid-gray)]">
                    Unit {pred.tenants?.unit_number} {"\u2022"} ${Number(pred.tenants?.monthly_rate || 0).toLocaleString()}/mo
                    {(pred.tenants?.days_delinquent || 0) > 0 && (
                      <span className="text-red-400"> {"\u2022"} {pred.tenants?.days_delinquent}d late</span>
                    )}
                  </p>
                </div>
                <RiskBadge prediction={pred} />
                {pred.predicted_vacate && (
                  <span className="text-[10px] text-red-400">
                    Vacate: {new Date(pred.predicted_vacate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
                <span className={`text-[10px] capitalize ${
                  pred.retention_status === "enrolled" ? "text-[var(--color-gold)]" :
                  pred.retention_status === "retained" ? "text-emerald-400" :
                  pred.retention_status === "churned" ? "text-red-400" :
                  "text-[var(--color-mid-gray)]"
                }`}>
                  {pred.retention_status || "none"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}
