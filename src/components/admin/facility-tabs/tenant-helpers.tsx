"use client";

import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";
import type { Tenant, ChurnPrediction, SortField, SortDir } from "./tenant-management-types";

/* ── KPI card ── */

export function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
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

/* ── sortable table header ── */

export function SortableHeader({ label, field, current, dir, onSort }: {
  label: string;
  field: SortField;
  current: SortField;
  dir: SortDir;
  onSort: (f: SortField) => void;
}) {
  const active = current === field;
  return (
    <th className="px-4 py-3 text-left">
      <button onClick={() => onSort(field)} className="flex items-center gap-1 text-xs font-medium text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]">
        {label}
        {active ? (
          dir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
}

/* ── risk badge ── */

export function RiskBadge({ prediction }: { prediction?: ChurnPrediction }) {
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

/* ── tenant status badge ── */

export function TenantStatusBadge({ tenant }: { tenant: Tenant }) {
  if (tenant.status === "moved_out") return <span className="inline-flex items-center rounded-full bg-[var(--color-light-gray)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-mid-gray)]">Moved Out</span>;
  if ((tenant.days_delinquent || 0) > 0) return <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">{tenant.days_delinquent}d late</span>;
  return <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Current</span>;
}

/* ── tenant row ── */

export function TenantRow({ tenant, onClick, onEscalate, actionLoading }: {
  tenant: Tenant;
  onClick: () => void;
  onEscalate: () => void;
  actionLoading: string | null;
}) {
  return (
    <tr
      className="cursor-pointer border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--color-light-gray)]"
      onClick={onClick}
    >
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-[var(--color-dark)]">{tenant.name}</p>
          {tenant.email && <p className="text-[10px] text-[var(--color-mid-gray)]">{tenant.email}</p>}
        </div>
      </td>
      <td className="px-4 py-3 text-[var(--color-body-text)]">
        <div>
          <span>{tenant.unit_number}</span>
          {tenant.unit_size && <span className="ml-1 text-[10px] text-[var(--color-mid-gray)]">({tenant.unit_size})</span>}
        </div>
      </td>
      <td className="px-4 py-3 text-[var(--color-body-text)]">${Number(tenant.monthly_rate).toLocaleString()}</td>
      <td className="px-4 py-3">
        <span className={(Number(tenant.balance) || 0) > 0 ? "text-red-400" : "text-[var(--color-body-text)]"}>
          ${Number(tenant.balance || 0).toLocaleString()}
        </span>
      </td>
      <td className="px-4 py-3">
        <span className={(tenant.days_delinquent || 0) > 0 ? "font-medium text-red-400" : "text-[var(--color-body-text)]"}>
          {tenant.days_delinquent || 0}
        </span>
      </td>
      <td className="px-4 py-3"><RiskBadge prediction={tenant.churn_predictions} /></td>
      <td className="px-4 py-3"><TenantStatusBadge tenant={tenant} /></td>
      <td className="px-4 py-3 text-xs text-[var(--color-mid-gray)]">
        {new Date(tenant.move_in_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          {(tenant.days_delinquent || 0) > 0 && (
            <button
              onClick={onEscalate}
              disabled={actionLoading === tenant.id}
              className="rounded p-1.5 text-amber-400 hover:bg-amber-500/20 disabled:opacity-50"
              title="Escalate"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
            </button>
          )}
          <button className="rounded p-1.5 text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]" title="View details">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ── loading skeleton ── */

export function LoadingSkeleton() {
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
