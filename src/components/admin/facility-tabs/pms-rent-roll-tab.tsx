"use client";

import { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
} from "lucide-react";
import type { PmsData, RentRollRow, SortDir } from "./pms-dashboard-types";
import { fmtCurrency, fmtDate } from "./pms-dashboard-types";

export function RentRollTab({ data }: { data: PmsData }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<keyof RentRollRow>("unit");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const rows = data.rentRoll;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = rows;
    if (q) {
      result = result.filter(
        (r) =>
          r.unit.toLowerCase().includes(q) ||
          (r.tenant_name ?? "").toLowerCase().includes(q) ||
          (r.account ?? "").toLowerCase().includes(q) ||
          (r.size_label ?? "").toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number")
        return sortDir === "asc" ? av - bv : bv - av;
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return result;
  }, [rows, search, sortKey, sortDir]);

  const toggleSort = (key: keyof RentRollRow) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: keyof RentRollRow }) => {
    if (sortKey !== col)
      return <ArrowUpDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-[var(--color-gold)]" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[var(--color-gold)]" />
    );
  };

  // Totals
  const totalRent = filtered.reduce(
    (s, r) => s + (Number(r.rent_rate) || 0),
    0
  );
  const totalInsurance = filtered.reduce(
    (s, r) => s + (Number(r.insurance_premium) || 0),
    0
  );
  const totalDue = filtered.reduce(
    (s, r) => s + (Number(r.total_due) || 0),
    0
  );

  const columns: { key: keyof RentRollRow; label: string; align?: string }[] = [
    { key: "unit", label: "Unit" },
    { key: "size_label", label: "Size" },
    { key: "tenant_name", label: "Tenant" },
    { key: "account", label: "Account" },
    { key: "rental_start", label: "Rental Start" },
    { key: "paid_thru", label: "Paid Thru" },
    { key: "rent_rate", label: "Rent Rate", align: "right" },
    { key: "insurance_premium", label: "Insurance", align: "right" },
    { key: "total_due", label: "Total Due", align: "right" },
    { key: "days_past_due", label: "Days Past Due", align: "right" },
  ];

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-mid-gray)]" />
        <input
          type="text"
          placeholder="Search unit, tenant, account..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50"
        />
      </div>

      <div className="text-xs text-[var(--color-mid-gray)]">
        {filtered.length} of {rows.length} units
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-light-gray)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-3 py-2.5 text-xs font-medium text-[var(--color-mid-gray)] cursor-pointer hover:text-[var(--color-body-text)] select-none whitespace-nowrap ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    <SortIcon col={col.key} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {filtered.map((r) => (
              <tr
                key={r.id}
                className="hover:bg-[var(--color-light-gray)] transition"
              >
                <td className="px-3 py-2 text-[var(--color-dark)] font-mono text-xs">
                  {r.unit}
                </td>
                <td className="px-3 py-2 text-[var(--color-body-text)]">
                  {r.size_label ?? "—"}
                </td>
                <td className="px-3 py-2 text-[var(--color-dark)]">
                  {r.tenant_name || (
                    <span className="text-[var(--color-mid-gray)] italic">Vacant</span>
                  )}
                </td>
                <td className="px-3 py-2 text-[var(--color-body-text)] font-mono text-xs">
                  {r.account ?? "—"}
                </td>
                <td className="px-3 py-2 text-[var(--color-body-text)]">
                  {fmtDate(r.rental_start)}
                </td>
                <td className="px-3 py-2 text-[var(--color-body-text)]">
                  {fmtDate(r.paid_thru)}
                </td>
                <td className="px-3 py-2 text-right text-[var(--color-dark)]">
                  {fmtCurrency(r.rent_rate)}
                </td>
                <td className="px-3 py-2 text-right text-[var(--color-body-text)]">
                  {fmtCurrency(r.insurance_premium)}
                </td>
                <td className="px-3 py-2 text-right text-[var(--color-dark)] font-medium">
                  {fmtCurrency(r.total_due)}
                </td>
                <td
                  className={`px-3 py-2 text-right font-medium ${
                    (Number(r.days_past_due) || 0) > 0
                      ? "text-red-400"
                      : "text-green-400"
                  }`}
                >
                  {r.days_past_due ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="bg-[var(--color-light-gray)] border-t border-[var(--border-subtle)]">
              <td
                colSpan={6}
                className="px-3 py-2.5 text-xs font-medium text-[var(--color-body-text)]"
              >
                Totals ({filtered.length} units)
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-dark)]">
                {fmtCurrency(totalRent)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-body-text)]">
                {fmtCurrency(totalInsurance)}
              </td>
              <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-dark)]">
                {fmtCurrency(totalDue)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      {rows.length === 0 && (
        <div className="text-center py-12 text-[var(--color-mid-gray)]">
          <FileSpreadsheet className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No rent roll data yet.</p>
        </div>
      )}
    </div>
  );
}
