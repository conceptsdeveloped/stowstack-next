"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Users,
  Download,
  BarChart3,
  Package,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { usePortal } from "@/components/portal/portal-shell";
import {
  fmtCurrency,
  fmtPct,
  CardSkeleton,
  SectionSkeleton,
  ErrorState,
} from "@/lib/portal-helpers";

/* ─── types ─── */

interface OccupancySnapshot {
  total_units: number;
  occupied_units: number;
  occupancy_pct: number;
  move_ins_mtd: number;
  move_outs_mtd: number;
  delinquency_pct: number;
}

interface UnitMixRow {
  type: string;
  size: string;
  total: number;
  occupied: number;
  rate: number;
}

interface TrendPoint {
  date: string;
  occupancy_pct: number;
}

interface ReportData {
  occupancy?: OccupancySnapshot;
  unitMix?: UnitMixRow[];
  occupancyTrend?: TrendPoint[];
  signedAt?: string | null;
}

/* ─── page ─── */

export default function ReportsPage() {
  const { session, client } = usePortal();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/client-reports?accessCode=${session.accessCode}&email=${encodeURIComponent(session.email)}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch {
      setError("Unable to load report data.");
    } finally {
      setLoading(false);
    }
  }, [session.accessCode, session.email]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const occ = data?.occupancy;
  const unitMix = data?.unitMix;
  const trend = data?.occupancyTrend;
  const signedAt = data?.signedAt?.slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">Reports &amp; Analytics</h2>
          <p className="text-sm text-[var(--color-mid-gray)]">
            PMS data and unit performance for {client.facilityName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (!data) return;
            const jsonStr = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${client.facilityName || "report"}-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          disabled={!data}
          className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-4 py-2 text-xs font-medium text-[var(--color-body-text)] transition-colors hover:text-[var(--color-dark)] disabled:opacity-40"
        >
          <Download className="h-3.5 w-3.5" />
          Download Report
        </button>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchData} />}

      {/* Occupancy Trend Chart */}
      {!loading && trend && trend.length > 1 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--color-gold)]" />
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">Occupancy Trend</h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--color-mid-gray)" }}
                tickFormatter={(d: string) => d.slice(5)}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "var(--color-mid-gray)" }}
                tickFormatter={(v: number) => `${v}%`}
                width={45}
              />
              <Tooltip
                formatter={(v) => [`${Number(v).toFixed(1)}%`, "Occupancy"]}
                contentStyle={{ background: "var(--color-light)", border: "1px solid var(--color-light-gray)", borderRadius: "8px", fontSize: "12px" }}
              />
              {signedAt && (
                <ReferenceLine
                  x={signedAt}
                  stroke="var(--color-gold)"
                  strokeDasharray="4 4"
                  label={{ value: "StorageAds Started", position: "top", fontSize: 10, fill: "var(--color-gold)" }}
                />
              )}
              <Line
                type="monotone"
                dataKey="occupancy_pct"
                stroke="var(--color-gold)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-gold)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Occupancy Snapshot */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : occ ? (
        <>
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-dark)]">Occupancy Snapshot</h3>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {/* Occupancy */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[var(--color-gold)]" />
                  <span className="text-xs text-[var(--color-mid-gray)]">Occupancy</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-dark)]">{occ.occupancy_pct.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-[var(--color-mid-gray)]">
                  {occ.occupied_units} / {occ.total_units} units
                </p>
              </div>

              {/* Total Units */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-[var(--color-gold)]" />
                  <span className="text-xs text-[var(--color-mid-gray)]">Total Units</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-dark)]">{occ.total_units}</p>
              </div>

              {/* Occupied */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--color-gold)]" />
                  <span className="text-xs text-[var(--color-mid-gray)]">Occupied Units</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-dark)]">{occ.occupied_units}</p>
              </div>

              {/* Move-Ins MTD */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-[var(--color-mid-gray)]">Move-Ins (MTD)</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-dark)]">{occ.move_ins_mtd}</p>
              </div>

              {/* Move-Outs MTD */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-[var(--color-mid-gray)]">Move-Outs (MTD)</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-dark)]">{occ.move_outs_mtd}</p>
              </div>

              {/* Delinquency */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-[var(--color-mid-gray)]">Delinquency</span>
                </div>
                <p className="text-xl font-bold text-[var(--color-dark)]">{occ.delinquency_pct.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </>
      ) : !error ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-body-text)]">
            No PMS data available yet. Data will appear once your property management system is connected.
          </p>
        </div>
      ) : null}

      {/* Unit Mix Table */}
      {loading ? (
        <SectionSkeleton />
      ) : unitMix && unitMix.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">Unit Mix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[var(--color-mid-gray)]">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Size</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                  <th className="px-4 py-3 text-right font-medium">Occupied</th>
                  <th className="px-4 py-3 text-right font-medium">Occ %</th>
                  <th className="px-4 py-3 text-right font-medium">Rate</th>
                </tr>
              </thead>
              <tbody>
                {unitMix.map((row, i) => {
                  const occPct = row.total > 0 ? (row.occupied / row.total) * 100 : 0;
                  return (
                    <tr
                      key={i}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--color-light-gray)]/20"
                    >
                      <td className="px-5 py-3 font-medium text-[var(--color-dark)]">{row.type}</td>
                      <td className="px-4 py-3 text-[var(--color-body-text)]">{row.size}</td>
                      <td className="px-4 py-3 text-right text-[var(--color-body-text)]">{row.total}</td>
                      <td className="px-4 py-3 text-right text-[var(--color-body-text)]">{row.occupied}</td>
                      <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                        {occPct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right text-[var(--color-body-text)]">
                        {fmtCurrency(row.rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
