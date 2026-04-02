"use client";

import { useMemo } from "react";
import { DollarSign, Users } from "lucide-react";
import type { PmsData } from "./pms-dashboard-types";
import { fmtCurrency, fmtPct, monthNum } from "./pms-dashboard-types";

export function RevenueTab({ data }: { data: PmsData }) {
  const rows = data.revenueHistory;

  // Sort chronologically for display
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return monthNum(a.month) - monthNum(b.month);
    });
  }, [rows]);

  const years = useMemo(() => {
    const s = new Set(rows.map((r) => r.year));
    return Array.from(s).sort((a, b) => b - a);
  }, [rows]);

  const maxRevenue = Math.max(
    ...sorted.map((r) => Number(r.revenue) || 0),
    1
  );
  const maxMoveIns = Math.max(
    ...sorted.map((r) => Math.max(Number(r.move_ins) || 0, Number(r.move_outs) || 0)),
    1
  );

  // YoY calculation
  const yoyData = useMemo(() => {
    if (years.length < 2) return null;
    const currentYear = years[0];
    const prevYear = years[1];
    const curRows = rows.filter((r) => r.year === currentYear);
    const prevRows = rows.filter((r) => r.year === prevYear);
    const curTotal = curRows.reduce(
      (s, r) => s + (Number(r.revenue) || 0),
      0
    );
    const prevTotal = prevRows.reduce(
      (s, r) => s + (Number(r.revenue) || 0),
      0
    );
    const pctChange =
      prevTotal > 0 ? ((curTotal - prevTotal) / prevTotal) * 100 : 0;
    return { currentYear, prevYear, curTotal, prevTotal, pctChange };
  }, [rows, years]);

  return (
    <div className="space-y-6">
      {/* YoY summary */}
      {yoyData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="text-xs text-[var(--color-mid-gray)] mb-1">
              {yoyData.currentYear} Revenue (YTD)
            </div>
            <div className="text-2xl font-semibold text-[var(--color-dark)]">
              {fmtCurrency(yoyData.curTotal)}
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="text-xs text-[var(--color-mid-gray)] mb-1">
              {yoyData.prevYear} Revenue
            </div>
            <div className="text-2xl font-semibold text-[var(--color-body-text)]">
              {fmtCurrency(yoyData.prevTotal)}
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="text-xs text-[var(--color-mid-gray)] mb-1">YoY Change</div>
            <div
              className={`text-2xl font-semibold ${
                yoyData.pctChange >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {yoyData.pctChange >= 0 ? "+" : ""}
              {fmtPct(yoyData.pctChange)}
            </div>
          </div>
        </div>
      )}

      {/* Revenue trend bars */}
      {sorted.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-[var(--color-green)]" />
            Monthly Revenue
          </h3>
          <div className="flex items-end gap-1.5 h-44 overflow-x-auto">
            {sorted.map((r, i) => {
              const rev = Number(r.revenue) || 0;
              const height = (rev / maxRevenue) * 100;
              return (
                <div
                  key={r.id || i}
                  className="flex-1 min-w-[28px] flex flex-col items-center gap-1"
                >
                  <span className="text-[9px] text-[var(--color-body-text)] truncate">
                    {fmtCurrency(rev)}
                  </span>
                  <div
                    className="w-full rounded-t transition-all bg-[var(--color-gold)]"
                    style={{
                      height: `${height}%`,
                      minHeight: rev > 0 ? "4px" : "0",
                    }}
                  />
                  <span className="text-[8px] text-[var(--color-mid-gray)] truncate w-full text-center">
                    {r.month.slice(0, 3)} {String(r.year).slice(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Move-in / Move-out comparison */}
      {sorted.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-[#8B5CF6]" />
            Move-Ins vs Move-Outs
          </h3>
          <div className="flex items-center gap-4 text-xs text-[var(--color-body-text)] mb-3">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-green-500" />
              Move-Ins
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-red-400" />
              Move-Outs
            </span>
          </div>
          <div className="flex items-end gap-1.5 h-32 overflow-x-auto">
            {sorted.map((r, i) => {
              const mi = Number(r.move_ins) || 0;
              const mo = Number(r.move_outs) || 0;
              const miH = maxMoveIns > 0 ? (mi / maxMoveIns) * 100 : 0;
              const moH = maxMoveIns > 0 ? (mo / maxMoveIns) * 100 : 0;
              return (
                <div
                  key={r.id || i}
                  className="flex-1 min-w-[28px] flex flex-col items-center gap-0.5"
                >
                  <div className="flex items-end gap-[2px] h-24 w-full">
                    <div
                      className="flex-1 bg-green-500 rounded-t transition-all"
                      style={{
                        height: `${miH}%`,
                        minHeight: mi > 0 ? "3px" : "0",
                      }}
                    />
                    <div
                      className="flex-1 bg-red-400 rounded-t transition-all"
                      style={{
                        height: `${moH}%`,
                        minHeight: mo > 0 ? "3px" : "0",
                      }}
                    />
                  </div>
                  <span className="text-[8px] text-[var(--color-mid-gray)] truncate w-full text-center">
                    {r.month.slice(0, 3)} {String(r.year).slice(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Revenue detail table */}
      {sorted.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-light-gray)]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                  Period
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  Revenue
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  Tax
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  Move-Ins
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  Move-Outs
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  Net
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {[...sorted].reverse().map((r) => {
                const net =
                  (Number(r.move_ins) || 0) - (Number(r.move_outs) || 0);
                return (
                  <tr
                    key={r.id}
                    className="hover:bg-[var(--color-light-gray)] transition"
                  >
                    <td className="px-3 py-2 text-[var(--color-dark)]">
                      {r.month} {r.year}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--color-dark)] font-medium">
                      {fmtCurrency(r.revenue)}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--color-body-text)]">
                      {fmtCurrency(r.monthly_tax)}
                    </td>
                    <td className="px-3 py-2 text-right text-green-400">
                      {r.move_ins ?? 0}
                    </td>
                    <td className="px-3 py-2 text-right text-red-400">
                      {r.move_outs ?? 0}
                    </td>
                    <td
                      className={`px-3 py-2 text-right font-medium ${
                        net >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {net >= 0 ? "+" : ""}
                      {net}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-12 text-[var(--color-mid-gray)]">
          <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No revenue data available yet.</p>
        </div>
      )}
    </div>
  );
}
