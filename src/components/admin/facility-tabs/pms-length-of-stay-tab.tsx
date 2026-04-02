"use client";

import { useMemo } from "react";
import { Clock } from "lucide-react";
import type { PmsData } from "./pms-dashboard-types";
import { fmt, fmtDate } from "./pms-dashboard-types";

export function LengthOfStayTab({ data }: { data: PmsData }) {
  const rows = data.lengthOfStay;

  // Distribution buckets
  const distribution = useMemo(() => {
    const bucketDefs = [
      { label: "< 30 days", min: 0, max: 30 },
      { label: "1-3 months", min: 30, max: 90 },
      { label: "3-6 months", min: 90, max: 180 },
      { label: "6-12 months", min: 180, max: 365 },
      { label: "1-2 years", min: 365, max: 730 },
      { label: "2-3 years", min: 730, max: 1095 },
      { label: "3+ years", min: 1095, max: Infinity },
    ];
    return bucketDefs.map((b) => ({
      ...b,
      count: rows.filter((r) => {
        const d = r.days_in_unit ?? 0;
        return d >= b.min && d < b.max;
      }).length,
    }));
  }, [rows]);

  const maxCount = Math.max(...distribution.map((d) => d.count), 1);

  // Stats
  const stats = useMemo(() => {
    const days = rows
      .map((r) => r.days_in_unit ?? 0)
      .filter((d) => d > 0)
      .sort((a, b) => a - b);
    if (days.length === 0) return { avg: 0, median: 0, total: 0 };
    const avg = days.reduce((s, d) => s + d, 0) / days.length;
    const mid = Math.floor(days.length / 2);
    const median =
      days.length % 2 === 0
        ? (days[mid - 1] + days[mid]) / 2
        : days[mid];
    return { avg, median, total: days.length };
  }, [rows]);

  const activeCount = rows.filter((r) => !r.move_out).length;
  const movedOutCount = rows.filter((r) => !!r.move_out).length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">Total Records</div>
          <div className="text-2xl font-semibold text-[var(--color-dark)]">
            {stats.total}
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">
            Average Stay
          </div>
          <div className="text-2xl font-semibold text-[var(--color-gold)]">
            {fmt(stats.avg)} days
          </div>
          <div className="text-xs text-[var(--color-mid-gray)] mt-0.5">
            ~{fmt(stats.avg / 30)} months
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">
            Median Stay
          </div>
          <div className="text-2xl font-semibold text-[#8B5CF6]">
            {fmt(stats.median)} days
          </div>
          <div className="text-xs text-[var(--color-mid-gray)] mt-0.5">
            ~{fmt(stats.median / 30)} months
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">Active / Moved Out</div>
          <div className="text-2xl font-semibold text-[var(--color-dark)]">
            <span className="text-green-400">{activeCount}</span>
            <span className="text-[var(--color-mid-gray)] mx-1">/</span>
            <span className="text-red-400">{movedOutCount}</span>
          </div>
        </div>
      </div>

      {/* Distribution bars */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#8B5CF6]" />
          Stay Duration Distribution
        </h3>
        <div className="space-y-3">
          {distribution.map((b) => {
            const pct = (b.count / maxCount) * 100;
            return (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-body-text)] w-28 shrink-0">
                  {b.label}
                </span>
                <div className="flex-1 h-6 bg-[var(--color-light-gray)] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all bg-[#8B5CF6]"
                    style={{
                      width: `${pct}%`,
                      minWidth: b.count > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--color-dark)] font-medium w-12 text-right">
                  {b.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail table */}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--color-light-gray)]">
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                  Tenant
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                  Unit
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                  Move In
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                  Move Out
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  Days
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.slice(0, 100).map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-light-gray)] transition">
                  <td className="px-3 py-2 text-[var(--color-dark)]">
                    {r.tenant_name}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-body-text)] font-mono text-xs">
                    {r.latest_unit ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-body-text)]">
                    {fmtDate(r.move_in)}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-body-text)]">
                    {r.move_out ? (
                      fmtDate(r.move_out)
                    ) : (
                      <span className="text-green-400 text-xs">Active</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-dark)] font-medium">
                    {fmt(r.days_in_unit)}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-mid-gray)] text-xs">
                    {r.lead_source ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > 100 && (
            <div className="px-3 py-2 text-xs text-[var(--color-mid-gray)] bg-[var(--color-light-gray)]">
              Showing first 100 of {rows.length} records
            </div>
          )}
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-12 text-[var(--color-mid-gray)]">
          <Clock className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No length of stay data available yet.</p>
        </div>
      )}
    </div>
  );
}
