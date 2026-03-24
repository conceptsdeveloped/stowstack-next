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

  /* ─── trend max for bar scaling ─── */

  const trendMax =
    data?.monthlyTrend?.reduce((m, t) => Math.max(m, t.spend, t.revenue), 0) || 1;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      {/* Header + range selector */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Campaign Performance</h2>
          <p className="text-sm text-[#9CA3AF]">Ad spend, leads, and attribution overview</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-black/[0.08] bg-white p-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.value
                  ? "bg-[#3B82F6] text-white"
                  : "text-[#6B7280] hover:text-[#111827]"
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
                className="rounded-xl border border-black/[0.08] bg-white p-4"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-[#3B82F6]" />
                  <span className="text-xs text-[#9CA3AF]">{kpi.label}</span>
                </div>
                <p className="text-xl font-bold text-[#111827]">{kpi.value}</p>
              </div>
            );
          })}
        </div>
      ) : !error ? (
        <div className="rounded-xl border border-black/[0.08] bg-white p-8 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[#9CA3AF]" />
          <p className="text-sm text-[#6B7280]">No campaign data for this period.</p>
        </div>
      ) : null}

      {/* Campaign Table */}
      {loading ? (
        <SectionSkeleton />
      ) : data?.hasData && data.campaigns.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
          <div className="border-b border-black/[0.08] px-5 py-4">
            <h3 className="text-sm font-semibold text-[#111827]">Campaigns</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.08] text-[#9CA3AF]">
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
                    className="border-b border-black/[0.06] last:border-0 hover:bg-black/[0.03]"
                  >
                    <td className="px-5 py-3 font-medium text-[#111827]">
                      {c.campaign || "Unattributed"}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
                      {fmtCurrency(c.spend)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
                      {fmt(c.impressions)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">{fmt(c.clicks)}</td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">{fmt(c.leads)}</td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
                      {fmt(c.move_ins)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
                      {fmtCurrency(c.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
                      {fmtCurrency(c.cpl)}
                    </td>
                    <td className="px-4 py-3 text-right text-[#6B7280]">
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
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#111827]">Monthly Trend</h3>
          <div className="space-y-3">
            {data.monthlyTrend.map((m) => (
              <div key={m.month} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#6B7280]">{m.month}</span>
                  <div className="flex gap-4">
                    <span className="text-[#9CA3AF]">
                      Spend: <span className="text-[#6B7280]">{fmtCurrency(m.spend)}</span>
                    </span>
                    <span className="text-[#9CA3AF]">
                      Rev: <span className="text-[#6B7280]">{fmtCurrency(m.revenue)}</span>
                    </span>
                    <span className="text-[#9CA3AF]">
                      Leads: <span className="text-[#6B7280]">{fmt(m.leads)}</span>
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {/* Spend bar */}
                  <div className="h-2 rounded-full bg-[#3B82F6]/30" style={{ width: `${Math.max((m.spend / trendMax) * 100, 2)}%` }} />
                  {/* Revenue bar */}
                  <div className="h-2 rounded-full bg-emerald-500/40" style={{ width: `${Math.max((m.revenue / trendMax) * 100, 2)}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex gap-4 text-[10px] text-[#9CA3AF]">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3B82F6]/30" />
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
