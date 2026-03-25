"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  Loader2,
  Building2,
  Users,
  TrendingUp,
  DollarSign,
  Clock,
  Upload,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  BarChart3,
  PieChart,
  CalendarDays,
  RefreshCw,
  ChevronRight,
  Info,
} from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";

/* ══════════════════════════════════════════════════════════
   Types
══════════════════════════════════════════════════════════ */

interface Snapshot {
  id: string;
  snapshot_date: string;
  total_units: number | null;
  occupied_units: number | null;
  occupancy_pct: number | null;
  total_sqft: number | null;
  occupied_sqft: number | null;
  gross_potential: number | null;
  actual_revenue: number | null;
  delinquency_pct: number | null;
  move_ins_mtd: number | null;
  move_outs_mtd: number | null;
}

interface RentRollRow {
  id: string;
  unit: string;
  size_label: string | null;
  tenant_name: string | null;
  account: string | null;
  rental_start: string | null;
  paid_thru: string | null;
  rent_rate: number | null;
  insurance_premium: number | null;
  total_due: number | null;
  days_past_due: number | null;
}

interface AgingRow {
  id: string;
  unit: string;
  tenant_name: string | null;
  bucket_0_30: number | null;
  bucket_31_60: number | null;
  bucket_61_90: number | null;
  bucket_91_120: number | null;
  bucket_120_plus: number | null;
  total: number | null;
}

interface RevenueRow {
  id: string;
  year: number;
  month: string;
  revenue: number | null;
  monthly_tax: number | null;
  move_ins: number | null;
  move_outs: number | null;
}

interface LengthOfStayRow {
  id: string;
  tenant_name: string;
  latest_unit: string | null;
  move_in: string | null;
  move_out: string | null;
  days_in_unit: number | null;
  lead_source: string | null;
  lead_category: string | null;
}

interface PmsReport {
  id: string;
  report_type: string | null;
  file_name: string | null;
  uploaded_at: string | null;
}

interface PmsData {
  latestSnapshot: Snapshot | null;
  snapshotTrend: Snapshot[];
  rentRoll: RentRollRow[];
  aging: AgingRow[];
  revenueHistory: RevenueRow[];
  lengthOfStay: LengthOfStayRow[];
  pmsReports: PmsReport[];
}

type SubTab =
  | "overview"
  | "rent_roll"
  | "aging"
  | "revenue"
  | "length_of_stay"
  | "upload";

type SortDir = "asc" | "desc";

/* ══════════════════════════════════════════════════════════
   Helpers
══════════════════════════════════════════════════════════ */

function fmt(n: number | null | undefined, decimals = 0): string {
  if (n == null) return "—";
  return Number(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtCurrency(n: number | null | undefined): string {
  if (n == null) return "—";
  return "$" + fmt(n, 2);
}

function fmtPct(n: number | null | undefined): string {
  if (n == null) return "—";
  return fmt(n, 1) + "%";
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtShortDate(d: string | null | undefined): string {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    year: "2-digit",
  });
}

const MONTH_ORDER: Record<string, number> = {
  January: 1, February: 2, March: 3, April: 4, May: 5, June: 6,
  July: 7, August: 8, September: 9, October: 10, November: 11, December: 12,
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
  "01": 1, "02": 2, "03": 3, "04": 4, "05": 5, "06": 6,
  "07": 7, "08": 8, "09": 9, "10": 10, "11": 11, "12": 12,
};

function monthNum(m: string): number {
  return MONTH_ORDER[m] ?? (parseInt(m, 10) || 0);
}

/* ══════════════════════════════════════════════════════════
   Sub-tab navigation config
══════════════════════════════════════════════════════════ */

const SUB_TABS: { key: SubTab; label: string; icon: typeof Building2 }[] = [
  { key: "overview", label: "Occupancy Overview", icon: Building2 },
  { key: "rent_roll", label: "Rent Roll", icon: FileSpreadsheet },
  { key: "aging", label: "Aging", icon: AlertTriangle },
  { key: "revenue", label: "Revenue", icon: DollarSign },
  { key: "length_of_stay", label: "Length of Stay", icon: Clock },
  { key: "upload", label: "Upload", icon: Upload },
];

/* ══════════════════════════════════════════════════════════
   Component
══════════════════════════════════════════════════════════ */

interface Props {
  facilityId: string;
  adminKey: string;
}

export default function PmsDashboard({ facilityId }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>("overview");

  const { data, loading, error, refetch } = useAdminFetch<PmsData>(
    "/api/pms-data",
    { facilityId }
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-gold)]" />
        <span className="ml-3 text-[var(--color-body-text)]">Loading PMS data...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <AlertTriangle className="w-8 h-8 text-red-400" />
        <p className="text-red-400">{error}</p>
        <button
          onClick={refetch}
          className="px-4 py-2 bg-[var(--color-gold)] text-[var(--color-light)] rounded-lg text-sm hover:bg-[var(--color-gold)]/80 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-[var(--border-subtle)]">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg whitespace-nowrap transition ${
                active
                  ? "bg-[var(--color-light-gray)] text-[var(--color-dark)] border-b-2 border-[var(--color-gold)]"
                  : "text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={refetch}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition"
          title="Refresh data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "overview" && <OverviewTab data={data} />}
      {activeTab === "rent_roll" && <RentRollTab data={data} />}
      {activeTab === "aging" && <AgingTab data={data} />}
      {activeTab === "revenue" && <RevenueTab data={data} />}
      {activeTab === "length_of_stay" && <LengthOfStayTab data={data} />}
      {activeTab === "upload" && (
        <UploadTab facilityId={facilityId} onImported={refetch} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   1. Occupancy Overview
══════════════════════════════════════════════════════════ */

function OverviewTab({ data }: { data: PmsData }) {
  const s = data.latestSnapshot;
  const trend = data.snapshotTrend;

  const kpis = [
    {
      label: "Total Units",
      value: fmt(s?.total_units),
      icon: Building2,
      color: "var(--color-gold)",
    },
    {
      label: "Occupied",
      value: fmt(s?.occupied_units),
      icon: Users,
      color: "var(--color-green)",
    },
    {
      label: "Occupancy",
      value: fmtPct(s?.occupancy_pct),
      icon: PieChart,
      color: "#8B5CF6",
    },
    {
      label: "Gross Potential",
      value: fmtCurrency(s?.gross_potential),
      icon: TrendingUp,
      color: "#F59E0B",
    },
    {
      label: "Actual Revenue",
      value: fmtCurrency(s?.actual_revenue),
      icon: DollarSign,
      color: "var(--color-green)",
    },
    {
      label: "Delinquency",
      value: fmtPct(s?.delinquency_pct),
      icon: AlertTriangle,
      color:
        s?.delinquency_pct && Number(s.delinquency_pct) > 10
          ? "#EF4444"
          : "#F59E0B",
    },
  ];

  const maxOcc = Math.max(
    ...trend.map((t) => Number(t.occupancy_pct ?? 0)),
    100
  );

  return (
    <div className="space-y-6">
      {/* Snapshot date badge */}
      {s && (
        <div className="flex items-center gap-2 text-xs text-[var(--color-mid-gray)]">
          <CalendarDays className="w-3.5 h-3.5" />
          Snapshot: {fmtDate(s.snapshot_date)}
          {s.move_ins_mtd != null && (
            <span className="ml-4 text-green-400">
              +{s.move_ins_mtd} move-ins MTD
            </span>
          )}
          {s.move_outs_mtd != null && (
            <span className="text-red-400">
              -{s.move_outs_mtd} move-outs MTD
            </span>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: kpi.color }} />
                <span className="text-xs text-[var(--color-mid-gray)]">{kpi.label}</span>
              </div>
              <div className="text-xl font-semibold text-[var(--color-dark)]">
                {kpi.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* Trend chart */}
      {trend.length > 1 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[var(--color-gold)]" />
            Occupancy Trend (Last {trend.length} Snapshots)
          </h3>
          <div className="flex items-end gap-2 h-40">
            {trend.map((t, i) => {
              const pct = Number(t.occupancy_pct ?? 0);
              const height = maxOcc > 0 ? (pct / maxOcc) * 100 : 0;
              return (
                <div
                  key={t.id || i}
                  className="flex-1 flex flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-[var(--color-body-text)]">
                    {fmtPct(pct)}
                  </span>
                  <div
                    className="w-full rounded-t transition-all"
                    style={{
                      height: `${height}%`,
                      backgroundColor:
                        pct >= 90
                          ? "var(--color-green)"
                          : pct >= 75
                            ? "#F59E0B"
                            : "#EF4444",
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-[9px] text-[var(--color-mid-gray)] truncate w-full text-center">
                    {fmtShortDate(t.snapshot_date)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!s && (
        <div className="text-center py-12 text-[var(--color-mid-gray)]">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No PMS snapshot data available yet.</p>
          <p className="text-xs mt-1">
            Upload a rent roll in the Upload tab to get started.
          </p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   2. Rent Roll
══════════════════════════════════════════════════════════ */

function RentRollTab({ data }: { data: PmsData }) {
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

/* ══════════════════════════════════════════════════════════
   3. Aging Receivables
══════════════════════════════════════════════════════════ */

function AgingTab({ data }: { data: PmsData }) {
  const rows = data.aging;

  const buckets = useMemo(() => {
    const b = {
      b0_30: 0,
      b31_60: 0,
      b61_90: 0,
      b91_120: 0,
      b120_plus: 0,
      total: 0,
    };
    for (const r of rows) {
      b.b0_30 += Number(r.bucket_0_30) || 0;
      b.b31_60 += Number(r.bucket_31_60) || 0;
      b.b61_90 += Number(r.bucket_61_90) || 0;
      b.b91_120 += Number(r.bucket_91_120) || 0;
      b.b120_plus += Number(r.bucket_120_plus) || 0;
      b.total += Number(r.total) || 0;
    }
    return b;
  }, [rows]);

  const maxBucket = Math.max(
    buckets.b0_30,
    buckets.b31_60,
    buckets.b61_90,
    buckets.b91_120,
    buckets.b120_plus,
    1
  );

  const bucketData = [
    { label: "0-30 days", value: buckets.b0_30, color: "var(--color-green)" },
    { label: "31-60 days", value: buckets.b31_60, color: "#F59E0B" },
    { label: "61-90 days", value: buckets.b61_90, color: "#F97316" },
    { label: "91-120 days", value: buckets.b91_120, color: "#EF4444" },
    { label: "120+ days", value: buckets.b120_plus, color: "#DC2626" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">
            Total Outstanding
          </div>
          <div className="text-2xl font-bold text-[var(--color-dark)]">
            {fmtCurrency(buckets.total)}
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">
            Delinquent Accounts
          </div>
          <div className="text-2xl font-bold text-[var(--color-dark)]">
            {rows.length}
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">
            Avg Outstanding
          </div>
          <div className="text-2xl font-bold text-[var(--color-dark)]">
            {rows.length > 0
              ? fmtCurrency(buckets.total / rows.length)
              : "—"}
          </div>
        </div>
      </div>

      {/* Bucket distribution bars */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--color-gold)]" />
          Aging Distribution
        </h3>
        <div className="space-y-3">
          {bucketData.map((b) => {
            const pct = maxBucket > 0 ? (b.value / maxBucket) * 100 : 0;
            return (
              <div key={b.label} className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-body-text)] w-24 shrink-0">
                  {b.label}
                </span>
                <div className="flex-1 h-6 bg-[var(--color-light-gray)] rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: b.color,
                      minWidth: b.value > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="text-xs text-[var(--color-dark)] font-medium w-24 text-right">
                  {fmtCurrency(b.value)}
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
                  Unit
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-medium text-[var(--color-mid-gray)]">
                  Tenant
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  0-30
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  31-60
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  61-90
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  91-120
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  120+
                </th>
                <th className="px-3 py-2.5 text-right text-xs font-medium text-[var(--color-mid-gray)]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--color-light-gray)] transition">
                  <td className="px-3 py-2 text-[var(--color-dark)] font-mono text-xs">
                    {r.unit}
                  </td>
                  <td className="px-3 py-2 text-[var(--color-dark)]">
                    {r.tenant_name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-body-text)]">
                    {fmtCurrency(r.bucket_0_30)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-body-text)]">
                    {fmtCurrency(r.bucket_31_60)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-body-text)]">
                    {fmtCurrency(r.bucket_61_90)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-body-text)]">
                    {fmtCurrency(r.bucket_91_120)}
                  </td>
                  <td className="px-3 py-2 text-right text-red-400">
                    {fmtCurrency(r.bucket_120_plus)}
                  </td>
                  <td className="px-3 py-2 text-right text-[var(--color-dark)] font-medium">
                    {fmtCurrency(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--color-light-gray)] border-t border-[var(--border-subtle)]">
                <td
                  colSpan={2}
                  className="px-3 py-2.5 text-xs font-medium text-[var(--color-body-text)]"
                >
                  Totals
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-body-text)]">
                  {fmtCurrency(buckets.b0_30)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-body-text)]">
                  {fmtCurrency(buckets.b31_60)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-body-text)]">
                  {fmtCurrency(buckets.b61_90)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-[var(--color-body-text)]">
                  {fmtCurrency(buckets.b91_120)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-semibold text-red-400">
                  {fmtCurrency(buckets.b120_plus)}
                </td>
                <td className="px-3 py-2.5 text-right text-sm font-bold text-[var(--color-dark)]">
                  {fmtCurrency(buckets.total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <div className="text-center py-12 text-[var(--color-mid-gray)]">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No aging data available yet.</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   4. Revenue
══════════════════════════════════════════════════════════ */

function RevenueTab({ data }: { data: PmsData }) {
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
            <div className="text-2xl font-bold text-[var(--color-dark)]">
              {fmtCurrency(yoyData.curTotal)}
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="text-xs text-[var(--color-mid-gray)] mb-1">
              {yoyData.prevYear} Revenue
            </div>
            <div className="text-2xl font-bold text-[var(--color-body-text)]">
              {fmtCurrency(yoyData.prevTotal)}
            </div>
          </div>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
            <div className="text-xs text-[var(--color-mid-gray)] mb-1">YoY Change</div>
            <div
              className={`text-2xl font-bold ${
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

/* ══════════════════════════════════════════════════════════
   5. Length of Stay
══════════════════════════════════════════════════════════ */

function LengthOfStayTab({ data }: { data: PmsData }) {
  const rows = data.lengthOfStay;

  // Distribution buckets
  const bucketDefs = [
    { label: "< 30 days", min: 0, max: 30 },
    { label: "1-3 months", min: 30, max: 90 },
    { label: "3-6 months", min: 90, max: 180 },
    { label: "6-12 months", min: 180, max: 365 },
    { label: "1-2 years", min: 365, max: 730 },
    { label: "2-3 years", min: 730, max: 1095 },
    { label: "3+ years", min: 1095, max: Infinity },
  ];

  const distribution = useMemo(() => {
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
          <div className="text-2xl font-bold text-[var(--color-dark)]">
            {stats.total}
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">
            Average Stay
          </div>
          <div className="text-2xl font-bold text-[var(--color-gold)]">
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
          <div className="text-2xl font-bold text-[#8B5CF6]">
            {fmt(stats.median)} days
          </div>
          <div className="text-xs text-[var(--color-mid-gray)] mt-0.5">
            ~{fmt(stats.median / 30)} months
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-4">
          <div className="text-xs text-[var(--color-mid-gray)] mb-1">Active / Moved Out</div>
          <div className="text-2xl font-bold text-[var(--color-dark)]">
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

/* ══════════════════════════════════════════════════════════
   6. Upload
══════════════════════════════════════════════════════════ */

type UploadType = "rent_roll" | "aging" | "revenue";

const UPLOAD_TYPES: { key: UploadType; label: string; desc: string }[] = [
  {
    key: "rent_roll",
    label: "Rent Roll",
    desc: "unit, size_label, tenant_name, account, rental_start, paid_thru, rent_rate, insurance_premium, total_due, days_past_due",
  },
  {
    key: "aging",
    label: "Aging Receivables",
    desc: "unit, tenant_name, bucket_0_30, bucket_31_60, bucket_61_90, bucket_91_120, bucket_120_plus, total",
  },
  {
    key: "revenue",
    label: "Revenue History",
    desc: "year, month, revenue, monthly_tax, move_ins, move_outs",
  },
];

const EXPECTED_COLUMNS: Record<UploadType, string[]> = {
  rent_roll: [
    "unit",
    "size_label",
    "tenant_name",
    "account",
    "rental_start",
    "paid_thru",
    "rent_rate",
    "insurance_premium",
    "total_due",
    "days_past_due",
  ],
  aging: [
    "unit",
    "tenant_name",
    "bucket_0_30",
    "bucket_31_60",
    "bucket_61_90",
    "bucket_91_120",
    "bucket_120_plus",
    "total",
  ],
  revenue: ["year", "month", "revenue", "monthly_tax", "move_ins", "move_outs"],
};

function UploadTab({
  facilityId,
  onImported,
}: {
  facilityId: string;
  onImported: () => void;
}) {
  const [uploadType, setUploadType] = useState<UploadType>("rent_roll");
  const [snapshotDate, setSnapshotDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState<File | null>(null);
  const [parsedHeaders, setParsedHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (f: File) => {
      setFile(f);
      setResult(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (!text) return;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) return;

        // Parse headers
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        setParsedHeaders(headers);

        // Auto-map columns
        const expected = EXPECTED_COLUMNS[uploadType];
        const autoMap: Record<string, string> = {};
        for (const exp of expected) {
          const normalized = exp.toLowerCase().replace(/[_\s]/g, "");
          const match = headers.find((h) => {
            const hn = h.toLowerCase().replace(/[_\s]/g, "");
            return hn === normalized || hn.includes(normalized) || normalized.includes(hn);
          });
          if (match) {
            autoMap[exp] = match;
          }
        }
        setColumnMap(autoMap);

        // Parse rows (limit preview to 200)
        const dataRows: Record<string, string>[] = [];
        for (let i = 1; i < Math.min(lines.length, 201); i++) {
          const vals = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((h, j) => {
            row[h] = vals[j] ?? "";
          });
          dataRows.push(row);
        }
        setParsedRows(dataRows);
      };
      reader.readAsText(f);
    },
    [uploadType]
  );

  const handleImport = async () => {
    if (!parsedRows.length) return;
    setImporting(true);
    setResult(null);

    const expected = EXPECTED_COLUMNS[uploadType];
    const mappedRows = parsedRows.map((row) => {
      const out: Record<string, string> = {};
      for (const exp of expected) {
        const srcCol = columnMap[exp];
        out[exp] = srcCol ? row[srcCol] ?? "" : "";
      }
      return out;
    });

    // Read ALL rows from the file (not just preview)
    // Re-read from file for full data
    let allRows = mappedRows;
    if (file) {
      try {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        allRows = [];
        for (let i = 1; i < lines.length; i++) {
          const vals = parseCSVLine(lines[i]);
          const row: Record<string, string> = {};
          headers.forEach((h, j) => {
            row[h] = vals[j] ?? "";
          });
          const mapped: Record<string, string> = {};
          for (const exp of expected) {
            const srcCol = columnMap[exp];
            mapped[exp] = srcCol ? row[srcCol] ?? "" : "";
          }
          allRows.push(mapped);
        }
      } catch {
        // Fall back to preview rows
      }
    }

    try {
      const actionMap: Record<UploadType, string> = {
        rent_roll: "import_rent_roll",
        aging: "import_aging",
        revenue: "import_revenue",
      };

      const body: Record<string, unknown> = {
        action: actionMap[uploadType],
        facility_id: facilityId,
        rows: allRows,
      };
      if (uploadType !== "revenue") {
        body.snapshot_date = snapshotDate;
      }

      const res = await adminFetch<{ ok: boolean; imported?: number; upserted?: number }>(
        "/api/pms-data",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      );

      const count = res.imported ?? res.upserted ?? allRows.length;
      setResult({
        ok: true,
        message: `Successfully imported ${count} rows.`,
      });
      onImported();
    } catch (err) {
      setResult({
        ok: false,
        message:
          err instanceof Error ? err.message : "Import failed",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setParsedHeaders([]);
    setParsedRows([]);
    setColumnMap({});
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const expected = EXPECTED_COLUMNS[uploadType];
  const allMapped = expected.every((e) => !!columnMap[e]);

  return (
    <div className="space-y-6">
      {/* Upload type selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {UPLOAD_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setUploadType(t.key);
              handleReset();
            }}
            className={`p-4 rounded-xl border text-left transition ${
              uploadType === t.key
                ? "bg-[var(--color-gold)]/10 border-[var(--color-gold)]/30 text-[var(--color-dark)]"
                : "bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--color-body-text)] hover:border-[var(--border-medium)]"
            }`}
          >
            <div className="text-sm font-medium">{t.label}</div>
            <div className="text-xs text-[var(--color-mid-gray)] mt-1">{t.desc}</div>
          </button>
        ))}
      </div>

      {/* Date picker (for rent_roll and aging) */}
      {uploadType !== "revenue" && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--color-body-text)]">Snapshot Date:</label>
          <input
            type="date"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            className="px-3 py-2 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]/50"
          />
        </div>
      )}

      {/* File upload */}
      <div
        className="border-2 border-dashed border-[var(--border-medium)] rounded-xl p-8 text-center hover:border-[var(--color-gold)]/30 transition cursor-pointer"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
        {file ? (
          <div className="space-y-2">
            <FileSpreadsheet className="w-8 h-8 mx-auto text-[var(--color-gold)]" />
            <p className="text-sm text-[var(--color-dark)] font-medium">{file.name}</p>
            <p className="text-xs text-[var(--color-mid-gray)]">
              {parsedRows.length} rows parsed |{" "}
              {parsedHeaders.length} columns detected
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReset();
              }}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Remove file
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Upload className="w-8 h-8 mx-auto text-[var(--color-mid-gray)]" />
            <p className="text-sm text-[var(--color-body-text)]">
              Click or drag a CSV file here
            </p>
            <p className="text-xs text-[var(--color-mid-gray)]">
              Supports .csv files
            </p>
          </div>
        )}
      </div>

      {/* Column mapping */}
      {parsedHeaders.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-[var(--color-gold)]" />
            Column Mapping
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {expected.map((exp) => (
              <div key={exp} className="flex items-center gap-3">
                <span className="text-xs text-[var(--color-body-text)] w-36 shrink-0 font-mono">
                  {exp}
                </span>
                <ChevronRight className="w-3 h-3 text-[var(--color-mid-gray)] shrink-0" />
                <select
                  value={columnMap[exp] ?? ""}
                  onChange={(e) =>
                    setColumnMap((m) => ({ ...m, [exp]: e.target.value }))
                  }
                  className="flex-1 px-2 py-1.5 bg-[var(--color-light)] border border-[var(--border-subtle)] rounded text-sm text-[var(--color-dark)] focus:outline-none focus:border-[var(--color-gold)]/50"
                >
                  <option value="">— select —</option>
                  {parsedHeaders.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                {columnMap[exp] ? (
                  <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {parsedRows.length > 0 && (
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4">
            Preview (first {Math.min(parsedRows.length, 5)} rows)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[var(--color-light-gray)]">
                  {expected.map((col) => (
                    <th
                      key={col}
                      className="px-2 py-1.5 text-left font-medium text-[var(--color-mid-gray)] whitespace-nowrap"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {parsedRows.slice(0, 5).map((row, i) => (
                  <tr key={i}>
                    {expected.map((exp) => {
                      const srcCol = columnMap[exp];
                      return (
                        <td
                          key={exp}
                          className="px-2 py-1.5 text-[var(--color-body-text)] whitespace-nowrap max-w-[150px] truncate"
                        >
                          {srcCol ? row[srcCol] ?? "" : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Import button */}
      {parsedRows.length > 0 && (
        <div className="flex items-center gap-4">
          <button
            onClick={handleImport}
            disabled={importing || !allMapped}
            className="px-6 py-2.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold)]/80 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Import {parsedRows.length} Rows
              </>
            )}
          </button>
          {!allMapped && (
            <span className="text-xs text-yellow-400">
              Map all columns before importing
            </span>
          )}
        </div>
      )}

      {/* Result message */}
      {result && (
        <div
          className={`p-4 rounded-xl border ${
            result.ok
              ? "bg-green-500/10 border-green-500/20 text-green-400"
              : "bg-red-500/10 border-red-500/20 text-red-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {result.ok ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertTriangle className="w-4 h-4" />
            )}
            <span className="text-sm">{result.message}</span>
          </div>
        </div>
      )}

      {/* Recent uploads */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl p-6">
        <h3 className="text-sm font-medium text-[var(--color-dark)] mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-[var(--color-mid-gray)]" />
          Recent PMS Report Uploads
        </h3>
        <RecentUploads facilityId={facilityId} />
      </div>
    </div>
  );
}

function RecentUploads({ facilityId }: { facilityId: string }) {
  const { data } = useAdminFetch<PmsData>("/api/pms-data", { facilityId });
  const reports = data?.pmsReports ?? [];

  if (reports.length === 0) {
    return (
      <p className="text-xs text-[var(--color-mid-gray)]">No uploads found.</p>
    );
  }

  return (
    <div className="space-y-2">
      {reports.map((r) => (
        <div
          key={r.id}
          className="flex items-center gap-3 px-3 py-2 bg-[var(--color-light-gray)] rounded-lg"
        >
          <FileSpreadsheet className="w-4 h-4 text-[var(--color-mid-gray)]" />
          <span className="text-sm text-[var(--color-dark)] flex-1">
            {r.file_name ?? "report.csv"}
          </span>
          <span className="text-xs text-[var(--color-mid-gray)] px-2 py-0.5 bg-[var(--color-light-gray)] rounded">
            {r.report_type ?? "unknown"}
          </span>
          <span className="text-xs text-[var(--color-mid-gray)]">
            {fmtDate(r.uploaded_at)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CSV Parser (handles quoted fields)
══════════════════════════════════════════════════════════ */

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}
