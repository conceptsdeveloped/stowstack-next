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
} from "lucide-react";
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

interface ReportData {
  occupancy?: OccupancySnapshot;
  unitMix?: UnitMixRow[];
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
        `/api/client-reports?code=${session.accessCode}&email=${encodeURIComponent(session.email)}`
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

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#111827]">Reports &amp; Analytics</h2>
          <p className="text-sm text-[#9CA3AF]">
            PMS data and unit performance for {client.facilityName}
          </p>
        </div>
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-xs font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
        >
          <Download className="h-3.5 w-3.5" />
          Download Report
        </button>
      </div>

      {/* Error */}
      {error && <ErrorState message={error} onRetry={fetchData} />}

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
            <h3 className="mb-3 text-sm font-semibold text-[#111827]">Occupancy Snapshot</h3>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {/* Occupancy */}
              <div className="rounded-xl border border-black/[0.08] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#3B82F6]" />
                  <span className="text-xs text-[#9CA3AF]">Occupancy</span>
                </div>
                <p className="text-xl font-bold text-[#111827]">{occ.occupancy_pct.toFixed(1)}%</p>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  {occ.occupied_units} / {occ.total_units} units
                </p>
              </div>

              {/* Total Units */}
              <div className="rounded-xl border border-black/[0.08] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#3B82F6]" />
                  <span className="text-xs text-[#9CA3AF]">Total Units</span>
                </div>
                <p className="text-xl font-bold text-[#111827]">{occ.total_units}</p>
              </div>

              {/* Occupied */}
              <div className="rounded-xl border border-black/[0.08] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-[#3B82F6]" />
                  <span className="text-xs text-[#9CA3AF]">Occupied Units</span>
                </div>
                <p className="text-xl font-bold text-[#111827]">{occ.occupied_units}</p>
              </div>

              {/* Move-Ins MTD */}
              <div className="rounded-xl border border-black/[0.08] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-[#9CA3AF]">Move-Ins (MTD)</span>
                </div>
                <p className="text-xl font-bold text-[#111827]">{occ.move_ins_mtd}</p>
              </div>

              {/* Move-Outs MTD */}
              <div className="rounded-xl border border-black/[0.08] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-[#9CA3AF]">Move-Outs (MTD)</span>
                </div>
                <p className="text-xl font-bold text-[#111827]">{occ.move_outs_mtd}</p>
              </div>

              {/* Delinquency */}
              <div className="rounded-xl border border-black/[0.08] bg-white p-4">
                <div className="mb-2 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-amber-400" />
                  <span className="text-xs text-[#9CA3AF]">Delinquency</span>
                </div>
                <p className="text-xl font-bold text-[#111827]">{occ.delinquency_pct.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </>
      ) : !error ? (
        <div className="rounded-xl border border-black/[0.08] bg-white p-8 text-center">
          <BarChart3 className="mx-auto mb-3 h-8 w-8 text-[#9CA3AF]" />
          <p className="text-sm text-[#6B7280]">
            No PMS data available yet. Data will appear once your property management system is connected.
          </p>
        </div>
      ) : null}

      {/* Unit Mix Table */}
      {loading ? (
        <SectionSkeleton />
      ) : unitMix && unitMix.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white">
          <div className="border-b border-black/[0.08] px-5 py-4">
            <h3 className="text-sm font-semibold text-[#111827]">Unit Mix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.08] text-[#9CA3AF]">
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
                      className="border-b border-black/[0.06] last:border-0 hover:bg-black/[0.03]"
                    >
                      <td className="px-5 py-3 font-medium text-[#111827]">{row.type}</td>
                      <td className="px-4 py-3 text-[#6B7280]">{row.size}</td>
                      <td className="px-4 py-3 text-right text-[#6B7280]">{row.total}</td>
                      <td className="px-4 py-3 text-right text-[#6B7280]">{row.occupied}</td>
                      <td className="px-4 py-3 text-right text-[#6B7280]">
                        {occPct.toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-right text-[#6B7280]">
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
