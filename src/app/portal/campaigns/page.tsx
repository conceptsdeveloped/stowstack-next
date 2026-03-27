"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DollarSign,
  Users,
  Footprints,
  Target,
  TrendingUp,
  Loader2,
  BarChart3,
  Award,
  Lightbulb,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import {
  type AttributionData,
  fmtCurrency,
  fmt,
  fmtPct,
  dateRangeParams,
  CardSkeleton,
  SectionSkeleton,
  ErrorState,
} from "@/lib/portal-helpers";

/* ─── constants ─── */

const RANGES = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
  { label: "YTD", value: "ytd" },
] as const;

/* ─── page ─── */

export default function CampaignsPage() {
  const { session } = usePortal();
  const [range, setRange] = useState("30d");
  const [data, setData] = useState<AttributionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { start, end } = dateRangeParams(range);
      const res = await fetch(
        `/api/attribution?accessCode=${session.accessCode}&startDate=${start}&endDate=${end}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json: AttributionData = await res.json();
      setData(json);
    } catch {
      setError("Unable to load campaign data.");
    } finally {
      setLoading(false);
    }
  }, [session.accessCode, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── KPI cards ─── */

  const kpis = data
    ? [
        { label: "Total Spend", value: fmtCurrency(data.totals.spend), icon: DollarSign },
        { label: "Leads", value: fmt(data.totals.leads), icon: Users },
        { label: "Move-Ins", value: fmt(data.totals.move_ins), icon: Footprints },
        { label: "CPL", value: fmtCurrency(data.totals.cpl), icon: Target },
        { label: "ROAS", value: `${data.totals.roas.toFixed(1)}x`, icon: TrendingUp },
      ]
    : [];

  /* ─── campaign insights (client-side) ─── */

  const insights = (() => {
    if (!data?.hasData || !data.campaigns || data.campaigns.length === 0) return null;

    const campaignsWithSpend = data.campaigns.filter((c) => c.spend > 0);
    if (campaignsWithSpend.length === 0) return null;

    const bestRoas = campaignsWithSpend.reduce((best, c) =>
      c.roas > best.roas ? c : best
    );
    const highestSpend = campaignsWithSpend.reduce((top, c) =>
      c.spend > top.spend ? c : top
    );

    const bestName = bestRoas.campaign || "Unattributed";
    const spendName = highestSpend.campaign || "Unattributed";

    let tip = "";
    if (bestRoas.roas >= 2) {
      tip = `Your ${bestName} campaign has the best ROAS at ${bestRoas.roas.toFixed(1)}x \u2014 consider shifting more budget there.`;
    } else if (highestSpend.roas < 1) {
      tip = `Your highest-spend campaign (${spendName}) is underperforming on ROAS. Review targeting or creative to improve returns.`;
    } else {
      tip = `Campaigns are performing steadily. Monitor ${bestName} for continued strong results.`;
    }

    return { bestRoas, highestSpend, tip };
  })();

  /* ─── trend max for bar scaling ─── */

  const trendMax =
    data?.monthlyTrend?.reduce((m, t) => Math.max(m, t.spend, t.revenue), 0) || 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header + range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">Campaign Performance</h2>
          <p className="text-sm text-[var(--color-mid-gray)]">Ad spend, leads, and attribution overview</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.value
                  ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                  : "text-[var(--color-body-text)] hover:text-[var(--color-dark)]"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : data?.hasData ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[var(--color-gold)]" />
                  <span className="text-xs text-[var(--color-mid-gray)]">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-dark)]">{kpi.value}</p>
              </div>
            );
          })}
        </div>
      ) : !error ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-body-text)]">No campaign data for this period.</p>
        </div>
      ) : null}

      {/* Campaign Insights */}
      {!loading && insights && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[var(--color-dark)]">
            <TrendingUp className="h-4 w-4 text-[var(--color-gold)]" />
            Campaign Insights
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Best ROAS */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
              <div className="mb-1 flex items-center gap-2">
                <Award className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Best ROAS</span>
              </div>
              <p className="text-sm font-semibold text-[var(--color-dark)]">
                {insights.bestRoas.campaign || "Unattributed"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-body-text)]">
                <span className="font-semibold text-[var(--color-gold)]">
                  {insights.bestRoas.roas.toFixed(1)}x
                </span>{" "}
                return on ad spend
              </p>
            </div>

            {/* Highest spend */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)]/50 p-4">
              <div className="mb-1 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-[var(--color-gold)]" />
                <span className="text-xs font-medium text-[var(--color-body-text)]">Highest Spend</span>
              </div>
              <p className="text-sm font-semibold text-[var(--color-dark)]">
                {insights.highestSpend.campaign || "Unattributed"}
              </p>
              <p className="mt-0.5 text-xs text-[var(--color-body-text)]">
                <span className="font-semibold text-[var(--color-gold)]">
                  ${insights.highestSpend.spend.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>{" "}
                total spend
              </p>
            </div>

            {/* AI tip */}
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-gold-light)]/40 p-4 sm:col-span-2 lg:col-span-1">
              <div className="mb-1 flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-[var(--color-gold)]" />
                <span className="text-xs font-medium text-[var(--color-gold)]">Insight</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--color-body-text)]">
                {insights.tip}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Table */}
      {loading ? (
        <SectionSkeleton />
      ) : data?.hasData && data.campaigns.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">Campaigns</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--color-mid-gray)]">
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-4 py-3 text-right font-medium">Spend</th>
                  <th className="px-4 py-3 text-right font-medium">Impressions</th>
                  <th className="px-4 py-3 text-right font-medium">Clicks</th>
                  <th className="px-4 py-3 text-right font-medium">Leads</th>
                  <th className="px-4 py-3 text-right font-medium">Move-Ins</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                  <th className="px-4 py-3 text-right font-medium">CPL</th>
                  <th className="px-4 py-3 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c, i) => (
                  <tr
                    key={i}
                    className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-black/[0.02]"
                  >
                    <td className="px-5 py-3 font-medium text-[var(--color-dark)]">
                      {c.campaign || "Unattributed"}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                      {fmtCurrency(c.spend)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                      {fmt(c.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">{fmt(c.clicks)}</td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">{fmt(c.leads)}</td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                      {fmt(c.move_ins)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                      {fmtCurrency(c.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                      {fmtCurrency(c.cpl)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                      {c.roas.toFixed(1)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Monthly Trend */}
      {loading ? (
        <SectionSkeleton />
      ) : data?.hasData && data.monthlyTrend && data.monthlyTrend.length > 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
          <h3 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">Monthly Trend</h3>
          <div className="space-y-3">
            {data.monthlyTrend.map((m) => (
              <div key={m.month} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--color-body-text)]">{m.month}</span>
                  <div className="flex gap-4">
                    <span className="text-[var(--color-mid-gray)]">
                      Spend: <span className="text-[var(--color-body-text)]">{fmtCurrency(m.spend)}</span>
                    </span>
                    <span className="text-[var(--color-mid-gray)]">
                      Rev: <span className="text-[var(--color-body-text)]">{fmtCurrency(m.revenue)}</span>
                    </span>
                    <span className="text-[var(--color-mid-gray)]">
                      Leads: <span className="text-[var(--color-body-text)]">{fmt(m.leads)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {/* Spend bar */}
                  <div className="h-2 rounded-full bg-[var(--color-gold)]/30" style={{ width: `${Math.max((m.spend / trendMax) * 100, 2)}%` }} />
                  {/* Revenue bar */}
                  <div className="h-2 rounded-full bg-emerald-500/40" style={{ width: `${Math.max((m.revenue / trendMax) * 100, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-[10px] text-[var(--color-mid-gray)]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-gold)]/30" />
              Spend
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500/40" />
              Revenue
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
