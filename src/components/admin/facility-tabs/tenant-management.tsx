"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Users,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  ShieldAlert,
  TrendingUp,
  DollarSign,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  RefreshCw,
  UserPlus,
  Download,
  ArrowUpDown,
  X,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  MoreHorizontal,
  Shield,
  Zap,
  Target,
  MessageSquare,
  ChevronUp,
} from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";

/* ─── types ─── */

interface Tenant {
  id: string;
  facility_id: string;
  external_id?: string;
  name: string;
  email?: string;
  phone?: string;
  unit_number: string;
  unit_size?: string;
  unit_type?: string;
  monthly_rate: number;
  move_in_date: string;
  lease_end_date?: string;
  autopay_enabled?: boolean;
  has_insurance?: boolean;
  insurance_monthly?: number;
  balance?: number;
  status?: string;
  days_delinquent?: number;
  last_payment_date?: string;
  moved_out_date?: string;
  move_out_reason?: string;
  created_at?: string;
  updated_at?: string;
  churn_predictions?: ChurnPrediction;
  delinquency_escalations?: Escalation[];
  upsell_opportunities?: UpsellOpportunity[];
  tenant_communications?: Communication[];
  tenant_payments?: Payment[];
  facilities?: { name: string };
}

interface ChurnPrediction {
  id: string;
  risk_score: number;
  risk_level: string;
  predicted_vacate?: string;
  factors: Record<string, number>;
  recommended_actions?: string[];
  retention_status?: string;
}

interface Escalation {
  id: string;
  stage: string;
  stage_entered_at: string;
  next_stage_at?: string;
  notes?: string;
  automated?: boolean;
}

interface UpsellOpportunity {
  id: string;
  type: string;
  title: string;
  description?: string;
  current_value?: number;
  proposed_value?: number;
  monthly_uplift?: number;
  confidence?: number;
  status?: string;
}

interface Communication {
  id: string;
  channel: string;
  direction: string;
  subject?: string;
  body?: string;
  sent_at?: string;
  created_at?: string;
}

interface Payment {
  id: string;
  amount: number;
  payment_date: string;
  method?: string;
  status?: string;
  notes?: string;
}

interface TenantStats {
  total: number;
  active: number;
  delinquent: number;
  movedOut: number;
  totalRevenue: number;
  avgRate: number;
  collectionRate: number;
  autopayRate: number;
}

interface TenantResponse {
  tenants: Tenant[];
  stats: {
    total: number;
    active: number;
    delinquent: number;
    moved_out: number;
    total_monthly_revenue: number;
    avg_rate: number;
    collection_rate: number;
    autopay_pct: number;
  };
}

type SortField = "name" | "unit_number" | "monthly_rate" | "balance" | "days_delinquent" | "move_in_date";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "delinquent" | "moved_out" | "notice";
type ViewMode = "list" | "detail" | "churn" | "retention";

/* ─── props ─── */

interface Props {
  facilityId: string;
  adminKey: string;
}

/* ─── main component ─── */

export default function TenantManagement({ facilityId, adminKey }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const pageSize = 25;

  /* ─── data fetch ─── */

  const { data, loading, error, refetch } = useAdminFetch<TenantResponse>(
    "/api/tenants",
    { facilityId, includeAnalytics: "true" }
  );

  const tenants = data?.tenants || [];
  const stats: TenantStats = useMemo(() => {
    if (!data?.stats) return { total: 0, active: 0, delinquent: 0, movedOut: 0, totalRevenue: 0, avgRate: 0, collectionRate: 0, autopayRate: 0 };
    const s = data.stats;
    return {
      total: s.total,
      active: s.active,
      delinquent: s.delinquent,
      movedOut: s.moved_out,
      totalRevenue: s.total_monthly_revenue,
      avgRate: s.avg_rate,
      collectionRate: s.collection_rate,
      autopayRate: s.autopay_pct,
    };
  }, [data?.stats]);

  /* ─── filtering / sorting / pagination ─── */

  const filtered = useMemo(() => {
    let result = [...tenants];

    // Status filter
    if (statusFilter === "active") result = result.filter(t => t.status === "active" && (!t.days_delinquent || t.days_delinquent === 0));
    else if (statusFilter === "delinquent") result = result.filter(t => (t.days_delinquent || 0) > 0 && t.status !== "moved_out");
    else if (statusFilter === "moved_out") result = result.filter(t => t.status === "moved_out");
    else if (statusFilter === "notice") result = result.filter(t => t.delinquency_escalations?.length);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.unit_number.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.phone && t.phone.includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "unit_number": cmp = a.unit_number.localeCompare(b.unit_number, undefined, { numeric: true }); break;
        case "monthly_rate": cmp = (Number(a.monthly_rate) || 0) - (Number(b.monthly_rate) || 0); break;
        case "balance": cmp = (Number(a.balance) || 0) - (Number(b.balance) || 0); break;
        case "days_delinquent": cmp = (a.days_delinquent || 0) - (b.days_delinquent || 0); break;
        case "move_in_date": cmp = new Date(a.move_in_date).getTime() - new Date(b.move_in_date).getTime(); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [tenants, statusFilter, searchQuery, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [statusFilter, searchQuery, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const openDetail = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setViewMode("detail");
  };

  /* ─── actions ─── */

  const runChurnScoring = async () => {
    setActionLoading("churn");
    try {
      await adminFetch("/api/churn-predictions", {
        method: "POST",
        body: JSON.stringify({ facilityId }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const recordPayment = async (tenantId: string, amount: number, method: string) => {
    setActionLoading(tenantId);
    try {
      await adminFetch("/api/tenants", {
        method: "PATCH",
        body: JSON.stringify({
          id: tenantId,
          action: "record_payment",
          amount,
          method,
          payment_date: new Date().toISOString().split("T")[0],
        }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const escalateTenant = async (tenantId: string) => {
    setActionLoading(tenantId);
    try {
      await adminFetch("/api/tenants", {
        method: "PATCH",
        body: JSON.stringify({ id: tenantId, action: "escalate" }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const moveOutTenant = async (tenantId: string, reason: string) => {
    setActionLoading(tenantId);
    try {
      await adminFetch("/api/tenants", {
        method: "PATCH",
        body: JSON.stringify({
          id: tenantId,
          action: "move_out",
          moved_out_date: new Date().toISOString().split("T")[0],
          move_out_reason: reason,
        }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  /* ─── render ─── */

  if (loading) return <LoadingSkeleton />;
  if (error) return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
      <XCircle className="h-5 w-5 text-red-400" />
      <p className="flex-1 text-sm text-red-300">Failed to load tenants</p>
      <button onClick={refetch} className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/30">
        <RefreshCw className="h-3 w-3" /> Retry
      </button>
    </div>
  );

  if (viewMode === "detail" && selectedTenant) {
    return (
      <TenantDetail
        tenant={selectedTenant}
        onBack={() => { setViewMode("list"); setSelectedTenant(null); }}
        onRecordPayment={recordPayment}
        onEscalate={escalateTenant}
        onMoveOut={moveOutTenant}
        actionLoading={actionLoading}
        refetch={refetch}
        facilityId={facilityId}
      />
    );
  }

  if (viewMode === "churn") {
    return <ChurnDashboard facilityId={facilityId} onBack={() => setViewMode("list")} />;
  }

  if (viewMode === "retention") {
    return <RetentionDashboard facilityId={facilityId} onBack={() => setViewMode("list")} />;
  }

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] p-1">
        {[
          { key: "list" as ViewMode, label: "Tenants", icon: <Users className="h-3.5 w-3.5" /> },
          { key: "churn" as ViewMode, label: "Churn Risk", icon: <ShieldAlert className="h-3.5 w-3.5" /> },
          { key: "retention" as ViewMode, label: "Retention", icon: <Target className="h-3.5 w-3.5" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setViewMode(tab.key)}
            className={`flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
              viewMode === tab.key ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]" : "text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard label="Total Tenants" value={stats.total} icon={<Users className="h-4 w-4" />} />
        <KPICard label="Active" value={stats.active} icon={<CheckCircle2 className="h-4 w-4" />} color="text-emerald-400" />
        <KPICard label="Delinquent" value={stats.delinquent} icon={<AlertTriangle className="h-4 w-4" />} color="text-amber-400" />
        <KPICard label="Monthly Revenue" value={`$${(stats.totalRevenue || 0).toLocaleString()}`} icon={<DollarSign className="h-4 w-4" />} color="text-[var(--color-gold)]" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPICard label="Avg Rate" value={`$${Math.round(stats.avgRate || 0)}`} icon={<TrendingUp className="h-4 w-4" />} />
        <KPICard label="Collection Rate" value={`${Math.round(stats.collectionRate || 0)}%`} icon={<CreditCard className="h-4 w-4" />} color={stats.collectionRate >= 90 ? "text-emerald-400" : "text-amber-400"} />
        <KPICard label="AutoPay Rate" value={`${Math.round(stats.autopayRate || 0)}%`} icon={<Zap className="h-4 w-4" />} />
        <KPICard label="Moved Out" value={stats.movedOut} icon={<XCircle className="h-4 w-4" />} color="text-[var(--color-mid-gray)]" />
      </div>

      {/* Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-mid-gray)]" />
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-2 pl-10 pr-4 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:border-[var(--color-gold)]/50 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          {(["all", "active", "delinquent", "moved_out", "notice"] as StatusFilter[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-2 text-xs font-medium capitalize transition-colors ${
                statusFilter === s
                  ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]"
                  : "text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
              }`}
            >
              {s === "moved_out" ? "Moved Out" : s === "notice" ? "On Notice" : s}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <button
          onClick={runChurnScoring}
          disabled={actionLoading === "churn"}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
        >
          {actionLoading === "churn" ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
          Score Churn Risk
        </button>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)]/20 px-3 py-2 text-xs font-medium text-[var(--color-gold)] hover:bg-[var(--color-gold)]/30"
        >
          <UserPlus className="h-3.5 w-3.5" /> Add Tenant
        </button>

        <button
          onClick={() => setShowImportModal(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-light-gray)] px-3 py-2 text-xs font-medium text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
        >
          <Upload className="h-3.5 w-3.5" /> Import CSV
        </button>
      </div>

      {/* Results info */}
      <div className="flex items-center justify-between text-xs text-[var(--color-mid-gray)]">
        <span>{filtered.length} tenant{filtered.length !== 1 ? "s" : ""} found</span>
        <span>Page {page} of {totalPages || 1}</span>
      </div>

      {/* Tenant Table */}
      <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)]">
              <SortableHeader label="Name" field="name" current={sortField} dir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Unit" field="unit_number" current={sortField} dir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Rate" field="monthly_rate" current={sortField} dir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Balance" field="balance" current={sortField} dir={sortDir} onSort={toggleSort} />
              <SortableHeader label="Days Late" field="days_delinquent" current={sortField} dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-mid-gray)]">Risk</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-[var(--color-mid-gray)]">Status</th>
              <SortableHeader label="Move-In" field="move_in_date" current={sortField} dir={sortDir} onSort={toggleSort} />
              <th className="px-4 py-3 text-right text-xs font-medium text-[var(--color-mid-gray)]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-sm text-[var(--color-mid-gray)]">
                  {searchQuery || statusFilter !== "all" ? "No tenants match your filters" : "No tenants yet — add one or import a CSV"}
                </td>
              </tr>
            ) : (
              paginated.map(tenant => (
                <TenantRow
                  key={tenant.id}
                  tenant={tenant}
                  onClick={() => openDetail(tenant)}
                  onEscalate={() => escalateTenant(tenant.id)}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`h-8 w-8 rounded-lg text-xs font-medium ${
                  p === page ? "bg-[var(--color-gold)] text-[var(--color-light)]" : "border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
                }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Add Tenant Modal */}
      {showAddModal && (
        <AddTenantModal
          facilityId={facilityId}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); refetch(); }}
        />
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <ImportCSVModal
          facilityId={facilityId}
          onClose={() => setShowImportModal(false)}
          onSuccess={() => { setShowImportModal(false); refetch(); }}
        />
      )}
    </div>
  );
}

/* ─── KPI card ─── */

function KPICard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color?: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div className="flex items-center gap-2">
        <div className={`${color || "text-[var(--color-body-text)]"}`}>{icon}</div>
        <span className="text-xs text-[var(--color-mid-gray)]">{label}</span>
      </div>
      <p className={`mt-2 text-xl font-bold ${color || "text-[var(--color-dark)]"}`}>{value}</p>
    </div>
  );
}

/* ─── sortable table header ─── */

function SortableHeader({ label, field, current, dir, onSort }: {
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

/* ─── risk badge ─── */

function RiskBadge({ prediction }: { prediction?: ChurnPrediction }) {
  if (!prediction) return <span className="text-xs text-[var(--color-mid-gray)]">—</span>;
  const colors: Record<string, string> = {
    low: "bg-emerald-500/20 text-emerald-400",
    medium: "bg-yellow-500/20 text-yellow-400",
    high: "bg-orange-500/20 text-orange-400",
    critical: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${colors[prediction.risk_level] || colors.low}`}>
      {prediction.risk_score} — {prediction.risk_level}
    </span>
  );
}

/* ─── tenant status badge ─── */

function TenantStatusBadge({ tenant }: { tenant: Tenant }) {
  if (tenant.status === "moved_out") return <span className="inline-flex items-center rounded-full bg-[var(--color-light-gray)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-mid-gray)]">Moved Out</span>;
  if ((tenant.days_delinquent || 0) > 0) return <span className="inline-flex items-center rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-400">{tenant.days_delinquent}d late</span>;
  return <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">Current</span>;
}

/* ─── tenant row ─── */

function TenantRow({ tenant, onClick, onEscalate, actionLoading }: {
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

/* ─── tenant detail view ─── */

function TenantDetail({ tenant, onBack, onRecordPayment, onEscalate, onMoveOut, actionLoading, refetch, facilityId }: {
  tenant: Tenant;
  onBack: () => void;
  onRecordPayment: (id: string, amount: number, method: string) => void;
  onEscalate: (id: string) => void;
  onMoveOut: (id: string, reason: string) => void;
  actionLoading: string | null;
  refetch: () => void;
  facilityId: string;
}) {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showMoveOutForm, setShowMoveOutForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(String(tenant.balance || ""));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [moveOutReason, setMoveOutReason] = useState("");

  const tenure = Math.round((Date.now() - new Date(tenant.move_in_date).getTime()) / (86400000 * 30));
  const prediction = tenant.churn_predictions;
  const escalations = tenant.delinquency_escalations || [];
  const upsells = tenant.upsell_opportunities || [];
  const comms = tenant.tenant_communications || [];
  const payments = tenant.tenant_payments || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 hover:bg-[var(--color-light-gray)]">
          <ChevronLeft className="h-4 w-4 text-[var(--color-body-text)]" />
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-[var(--color-dark)]">{tenant.name}</h2>
          <p className="text-xs text-[var(--color-mid-gray)]">Unit {tenant.unit_number}{tenant.unit_size ? ` • ${tenant.unit_size}` : ""}{tenant.unit_type ? ` • ${tenant.unit_type}` : ""}</p>
        </div>
        <TenantStatusBadge tenant={tenant} />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">Monthly Rate</p>
          <p className="mt-1 text-lg font-bold">${Number(tenant.monthly_rate).toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">Balance Due</p>
          <p className={`mt-1 text-lg font-bold ${(Number(tenant.balance) || 0) > 0 ? "text-red-400" : "text-emerald-400"}`}>
            ${Number(tenant.balance || 0).toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">Tenure</p>
          <p className="mt-1 text-lg font-bold">{tenure} mo</p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <p className="text-xs text-[var(--color-mid-gray)]">AutoPay</p>
          <p className={`mt-1 text-lg font-bold ${tenant.autopay_enabled ? "text-emerald-400" : "text-amber-400"}`}>
            {tenant.autopay_enabled ? "On" : "Off"}
          </p>
        </div>
      </div>

      {/* Contact & Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Contact Info</h3>
          <div className="space-y-2 text-sm">
            {tenant.email && (
              <a href={`mailto:${tenant.email}`} className="flex items-center gap-2 text-[var(--color-body-text)] hover:text-[var(--color-dark)]">
                <Mail className="h-3.5 w-3.5" /> {tenant.email}
              </a>
            )}
            {tenant.phone && (
              <a href={`tel:${tenant.phone}`} className="flex items-center gap-2 text-[var(--color-body-text)] hover:text-[var(--color-dark)]">
                <Phone className="h-3.5 w-3.5" /> {tenant.phone}
              </a>
            )}
            <div className="flex items-center gap-2 text-[var(--color-mid-gray)]">
              <Calendar className="h-3.5 w-3.5" /> Move-in: {new Date(tenant.move_in_date).toLocaleDateString()}
            </div>
            {tenant.lease_end_date && (
              <div className="flex items-center gap-2 text-[var(--color-mid-gray)]">
                <Calendar className="h-3.5 w-3.5" /> Lease ends: {new Date(tenant.lease_end_date).toLocaleDateString()}
              </div>
            )}
            {tenant.has_insurance && (
              <div className="flex items-center gap-2 text-emerald-400">
                <Shield className="h-3.5 w-3.5" /> Insurance: ${Number(tenant.insurance_monthly || 0)}/mo
              </div>
            )}
          </div>
        </div>

        {/* Churn Risk */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Churn Risk</h3>
          {prediction ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <RiskBadge prediction={prediction} />
                <span className="text-xs text-[var(--color-mid-gray)]">
                  Score: {prediction.risk_score}/100
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-light-gray)]">
                <div
                  className={`h-full rounded-full transition-all ${
                    prediction.risk_score >= 75 ? "bg-red-500" :
                    prediction.risk_score >= 50 ? "bg-orange-500" :
                    prediction.risk_score >= 25 ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${prediction.risk_score}%` }}
                />
              </div>
              {prediction.predicted_vacate && (
                <p className="text-xs text-red-400">
                  Predicted vacate: {new Date(prediction.predicted_vacate).toLocaleDateString()}
                </p>
              )}
              {prediction.factors && Object.keys(prediction.factors).length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-[var(--color-mid-gray)]">Risk Factors</p>
                  {Object.entries(prediction.factors).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs">
                      <span className="capitalize text-[var(--color-body-text)]">{k.replace(/_/g, " ")}</span>
                      <span className="text-[var(--color-mid-gray)]">+{v}</span>
                    </div>
                  ))}
                </div>
              )}
              {prediction.recommended_actions && prediction.recommended_actions.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-[var(--color-mid-gray)]">Recommended Actions</p>
                  {prediction.recommended_actions.map((a, i) => (
                    <p key={i} className="text-xs capitalize text-[var(--color-gold)]">{a.replace(/_/g, " ")}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-[var(--color-mid-gray)]">No churn score — run scoring to generate</p>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {tenant.status !== "moved_out" && (
          <>
            <button
              onClick={() => setShowPaymentForm(!showPaymentForm)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 px-3 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30"
            >
              <DollarSign className="h-3.5 w-3.5" /> Record Payment
            </button>
            <button
              onClick={() => onEscalate(tenant.id)}
              disabled={actionLoading === tenant.id}
              className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 px-3 py-2 text-xs font-medium text-amber-400 hover:bg-amber-500/30 disabled:opacity-50"
            >
              <AlertTriangle className="h-3.5 w-3.5" /> Escalate
            </button>
            <button
              onClick={() => setShowMoveOutForm(!showMoveOutForm)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-500/30"
            >
              <XCircle className="h-3.5 w-3.5" /> Move Out
            </button>
          </>
        )}
      </div>

      {/* Payment Form */}
      {showPaymentForm && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <h4 className="mb-3 text-sm font-semibold text-emerald-400">Record Payment</h4>
          <div className="flex flex-wrap gap-3">
            <div>
              <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Amount</label>
              <input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                className="w-32 rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-emerald-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Method</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-emerald-500/50 focus:outline-none"
              >
                <option value="cash">Cash</option>
                <option value="check">Check</option>
                <option value="card">Card</option>
                <option value="ach">ACH</option>
                <option value="online">Online</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  onRecordPayment(tenant.id, Number(paymentAmount), paymentMethod);
                  setShowPaymentForm(false);
                }}
                disabled={!paymentAmount || actionLoading === tenant.id}
                className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-50"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Out Form */}
      {showMoveOutForm && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4">
          <h4 className="mb-3 text-sm font-semibold text-red-400">Move Out Tenant</h4>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Reason</label>
              <select
                value={moveOutReason}
                onChange={e => setMoveOutReason(e.target.value)}
                className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-red-500/50 focus:outline-none"
              >
                <option value="">Select reason...</option>
                <option value="voluntary">Voluntary</option>
                <option value="non_payment">Non-Payment</option>
                <option value="lease_end">Lease End</option>
                <option value="relocation">Relocation</option>
                <option value="downsizing">Downsizing</option>
                <option value="upsizing">Upsizing</option>
                <option value="auction">Auction/Lien</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  onMoveOut(tenant.id, moveOutReason);
                  setShowMoveOutForm(false);
                }}
                disabled={!moveOutReason || actionLoading === tenant.id}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                Confirm Move-Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Escalation History */}
      {escalations.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Escalation History</h3>
          <div className="space-y-2">
            {escalations.map(esc => (
              <div key={esc.id} className="flex items-center justify-between rounded-lg bg-[var(--color-light-gray)] px-3 py-2">
                <div className="flex items-center gap-2">
                  <EscalationStageBadge stage={esc.stage} />
                  {esc.notes && <span className="text-xs text-[var(--color-mid-gray)]">{esc.notes}</span>}
                </div>
                <span className="text-[10px] text-[var(--color-mid-gray)]">
                  {new Date(esc.stage_entered_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upsell Opportunities */}
      {upsells.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-[var(--color-gold)]" /> Upsell Opportunities
          </h3>
          <div className="space-y-2">
            {upsells.map(u => (
              <div key={u.id} className="flex items-center justify-between rounded-lg bg-[var(--color-light-gray)] px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">{u.title}</p>
                  {u.description && <p className="text-xs text-[var(--color-mid-gray)]">{u.description}</p>}
                </div>
                <div className="text-right">
                  {u.monthly_uplift && (
                    <p className="text-sm font-medium text-emerald-400">+${Number(u.monthly_uplift)}/mo</p>
                  )}
                  <span className={`text-[10px] capitalize ${
                    u.status === "accepted" ? "text-emerald-400" :
                    u.status === "sent" ? "text-[var(--color-gold)]" :
                    u.status === "declined" ? "text-red-400" :
                    "text-[var(--color-mid-gray)]"
                  }`}>
                    {u.status || "identified"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      {payments.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 text-sm font-semibold">Payment History</h3>
          <div className="space-y-1">
            {payments.slice(0, 10).map(p => (
              <div key={p.id} className="flex items-center justify-between rounded-lg bg-[var(--color-light-gray)] px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3.5 w-3.5 text-[var(--color-mid-gray)]" />
                  <span className="font-medium text-emerald-400">${Number(p.amount).toLocaleString()}</span>
                  {p.method && <span className="text-[10px] capitalize text-[var(--color-mid-gray)]">{p.method}</span>}
                </div>
                <span className="text-xs text-[var(--color-mid-gray)]">{new Date(p.payment_date).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication Log */}
      {comms.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-[var(--color-gold)]" /> Communications
          </h3>
          <div className="space-y-2">
            {comms.slice(0, 10).map(c => (
              <div key={c.id} className="rounded-lg bg-[var(--color-light-gray)] px-3 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-medium uppercase ${
                      c.channel === "email" ? "text-[var(--color-gold)]" :
                      c.channel === "sms" ? "text-emerald-400" :
                      "text-[var(--color-body-text)]"
                    }`}>
                      {c.channel}
                    </span>
                    <span className="text-[10px] capitalize text-[var(--color-mid-gray)]">{c.direction}</span>
                  </div>
                  <span className="text-[10px] text-[var(--color-mid-gray)]">
                    {new Date(c.sent_at || c.created_at || "").toLocaleDateString()}
                  </span>
                </div>
                {c.subject && <p className="mt-1 text-xs font-medium text-[var(--color-dark)]">{c.subject}</p>}
                {c.body && <p className="mt-0.5 text-xs text-[var(--color-body-text)] line-clamp-2">{c.body}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── escalation stage badge ─── */

function EscalationStageBadge({ stage }: { stage: string }) {
  const stageColors: Record<string, string> = {
    late_notice: "bg-yellow-500/20 text-yellow-400",
    second_notice: "bg-orange-500/20 text-orange-400",
    final_notice: "bg-red-500/20 text-red-400",
    lien_filed: "bg-red-500/20 text-red-300",
    auction_scheduled: "bg-red-900/20 text-red-300",
    auction_complete: "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${stageColors[stage] || "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}>
      {stage.replace(/_/g, " ")}
    </span>
  );
}

/* ─── add tenant modal ─── */

function AddTenantModal({ facilityId, onClose, onSuccess }: { facilityId: string; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: "", email: "", phone: "", unit_number: "", unit_size: "", unit_type: "standard",
    monthly_rate: "", move_in_date: new Date().toISOString().split("T")[0],
    autopay_enabled: false, has_insurance: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!form.name || !form.unit_number || !form.monthly_rate) {
      setError("Name, unit number, and rate are required");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await adminFetch("/api/tenants", {
        method: "POST",
        body: JSON.stringify({
          facility_id: facilityId,
          ...form,
          monthly_rate: Number(form.monthly_rate),
        }),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add tenant");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-light)] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Add Tenant</h3>
          <button onClick={onClose} className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"><X className="h-5 w-5" /></button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name *" value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Field label="Email" value={form.email} onChange={v => setForm({ ...form, email: v })} />
          <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <Field label="Unit # *" value={form.unit_number} onChange={v => setForm({ ...form, unit_number: v })} />
          <Field label="Unit Size" value={form.unit_size} onChange={v => setForm({ ...form, unit_size: v })} placeholder="e.g. 10x10" />
          <div>
            <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Unit Type</label>
            <select value={form.unit_type} onChange={e => setForm({ ...form, unit_type: e.target.value })} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-[var(--color-gold)]/50 focus:outline-none">
              <option value="standard">Standard</option>
              <option value="climate">Climate Controlled</option>
              <option value="drive_up">Drive-Up</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor / Parking</option>
            </select>
          </div>
          <Field label="Monthly Rate *" value={form.monthly_rate} onChange={v => setForm({ ...form, monthly_rate: v })} type="number" />
          <Field label="Move-In Date" value={form.move_in_date} onChange={v => setForm({ ...form, move_in_date: v })} type="date" />
        </div>
        <div className="mt-3 flex gap-4">
          <label className="flex items-center gap-2 text-xs text-[var(--color-body-text)]">
            <input type="checkbox" checked={form.autopay_enabled} onChange={e => setForm({ ...form, autopay_enabled: e.target.checked })} className="rounded" />
            AutoPay
          </label>
          <label className="flex items-center gap-2 text-xs text-[var(--color-body-text)]">
            <input type="checkbox" checked={form.has_insurance} onChange={e => setForm({ ...form, has_insurance: e.target.checked })} className="rounded" />
            Insurance
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-hover)] disabled:opacity-50">
            {submitting ? "Adding..." : "Add Tenant"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── import csv modal ─── */

function ImportCSVModal({ facilityId, onClose, onSuccess }: { facilityId: string; onClose: () => void; onSuccess: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: number } | null>(null);
  const [error, setError] = useState("");

  const handleFile = (f: File) => {
    setFile(f);
    setError("");
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        if (lines.length < 2) { setError("CSV must have a header row and at least one data row"); return; }

        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));
        const rows = lines.slice(1, 6).map(line => {
          const values = line.split(",").map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] || ""; });
          return row;
        });
        setPreview(rows);
      } catch {
        setError("Could not parse CSV file");
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError("");

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split("\n").filter(l => l.trim());
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_"));

        const tenants = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] || ""; });

          return {
            name: row.name || row.tenant_name || row.tenant || "",
            email: row.email || row.tenant_email || "",
            phone: row.phone || row.tenant_phone || "",
            unit_number: row.unit_number || row.unit || row.space || row.unit_id || "",
            unit_size: row.unit_size || row.size || "",
            unit_type: row.unit_type || row.type || "standard",
            monthly_rate: Number(row.monthly_rate || row.rate || row.rent || 0),
            move_in_date: row.move_in_date || row.move_in || row.start_date || new Date().toISOString().split("T")[0],
            balance: Number(row.balance || row.amount_due || 0),
            autopay_enabled: ["true", "yes", "1"].includes((row.autopay || row.autopay_enabled || "").toLowerCase()),
            external_id: row.external_id || row.id || "",
          };
        }).filter(t => t.name && t.unit_number);

        const res = await adminFetch<{ imported: number; skipped: number; errors: number }>("/api/tenants", {
          method: "POST",
          body: JSON.stringify({ facility_id: facilityId, tenants }),
        });
        setResult(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      }
      setImporting(false);
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-2xl rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-light)] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Import Tenants from CSV</h3>
          <button onClick={onClose} className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

        {result ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-emerald-500/10 p-4 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-400" />
              <p className="mt-2 text-sm font-medium">Import Complete</p>
              <p className="mt-1 text-xs text-[var(--color-body-text)]">
                {result.imported} imported, {result.skipped} skipped, {result.errors} errors
              </p>
            </div>
            <div className="flex justify-end">
              <button onClick={onSuccess} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white">Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="mb-2 text-xs text-[var(--color-mid-gray)]">Expected columns: name, email, phone, unit_number, unit_size, monthly_rate, move_in_date, balance, autopay</p>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-[var(--border-medium)] p-8 transition-colors hover:border-[var(--color-gold)]/30">
                <Upload className="h-8 w-8 text-[var(--color-mid-gray)]" />
                <span className="text-sm text-[var(--color-body-text)]">{file ? file.name : "Click to select CSV file"}</span>
                <input type="file" accept=".csv" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
              </label>
            </div>

            {preview.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-xs font-medium text-[var(--color-mid-gray)]">Preview (first {preview.length} rows)</p>
                <div className="max-h-48 overflow-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[var(--border-subtle)]">
                        {Object.keys(preview[0]).slice(0, 6).map(h => (
                          <th key={h} className="px-2 py-1.5 text-left text-[var(--color-mid-gray)]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((row, i) => (
                        <tr key={i} className="border-b border-[var(--border-subtle)]">
                          {Object.values(row).slice(0, 6).map((v, j) => (
                            <td key={j} className="px-2 py-1.5 text-[var(--color-body-text)]">{v}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">Cancel</button>
              <button onClick={handleImport} disabled={!file || importing} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-hover)] disabled:opacity-50">
                {importing ? "Importing..." : "Import"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── form field helper ─── */

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder-[var(--color-mid-gray)] focus:border-[var(--color-gold)]/50 focus:outline-none"
      />
    </div>
  );
}

/* ─── churn dashboard ─── */

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

function ChurnDashboard({ facilityId, onBack }: { facilityId: string; onBack: () => void }) {
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
        <h2 className="flex-1 text-lg font-bold">Churn Risk Dashboard</h2>
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
                    <p className="text-lg font-bold">{count}</p>
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
            {predictions.length === 0 ? "No churn scores yet — click \"Run Churn Scoring\" to generate" : "No tenants match this filter"}
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            {filtered.sort((a, b) => b.risk_score - a.risk_score).map(pred => (
              <div key={pred.id} className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-dark)]">{pred.tenants?.name || "Unknown"}</p>
                  <p className="text-xs text-[var(--color-mid-gray)]">
                    Unit {pred.tenants?.unit_number} • ${Number(pred.tenants?.monthly_rate || 0).toLocaleString()}/mo
                    {(pred.tenants?.days_delinquent || 0) > 0 && (
                      <span className="text-red-400"> • {pred.tenants?.days_delinquent}d late</span>
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

/* ─── retention dashboard ─── */

interface RetentionCampaign {
  id: string;
  name: string;
  trigger_risk_level?: string;
  sequence_steps: Array<{ day: number; channel: string; template: string }>;
  active?: boolean;
  enrolled_count?: number;
  retained_count?: number;
  created_at?: string;
}

interface RetentionResponse {
  campaigns: RetentionCampaign[];
}

function RetentionDashboard({ facilityId, onBack }: { facilityId: string; onBack: () => void }) {
  const { data, loading, error, refetch } = useAdminFetch<RetentionResponse>(
    "/api/churn-predictions",
    { facilityId, resource: "campaigns" }
  );
  const [showCreate, setShowCreate] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const campaigns = data?.campaigns || [];

  const toggleCampaign = async (id: string, active: boolean) => {
    setActionLoading(id);
    try {
      await adminFetch("/api/churn-predictions", {
        method: "PATCH",
        body: JSON.stringify({ id, action: "toggle_campaign", active: !active }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const deleteCampaign = async (id: string) => {
    if (!confirm("Delete this retention campaign?")) return;
    setActionLoading(id);
    try {
      await adminFetch("/api/churn-predictions", {
        method: "DELETE",
        body: JSON.stringify({ id }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const enrollCampaign = async (id: string) => {
    setActionLoading(id);
    try {
      await adminFetch("/api/churn-predictions", {
        method: "POST",
        body: JSON.stringify({ action: "enroll_campaign", campaign_id: id }),
      });
      refetch();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-2 hover:bg-[var(--color-light-gray)]">
          <ChevronLeft className="h-4 w-4 text-[var(--color-body-text)]" />
        </button>
        <h2 className="flex-1 text-lg font-bold">Retention Campaigns</h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-xs font-medium text-white hover:bg-[var(--color-gold-hover)]"
        >
          <UserPlus className="h-3.5 w-3.5" /> Create Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-16 text-center">
          <Target className="mx-auto h-8 w-8 text-[var(--color-mid-gray)]" />
          <p className="mt-3 text-sm text-[var(--color-mid-gray)]">No retention campaigns yet</p>
          <p className="mt-1 text-xs text-[var(--color-mid-gray)]">Create a campaign to automatically engage at-risk tenants</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{c.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${c.active ? "bg-emerald-500/20 text-emerald-400" : "bg-[var(--color-light-gray)] text-[var(--color-mid-gray)]"}`}>
                      {c.active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--color-mid-gray)]">
                    Trigger: {c.trigger_risk_level || "high"} risk • {c.sequence_steps?.length || 0} steps
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => enrollCampaign(c.id)}
                    disabled={actionLoading === c.id || !c.active}
                    className="flex items-center gap-1 rounded-lg bg-[var(--color-gold)]/20 px-3 py-1.5 text-[10px] font-medium text-[var(--color-gold)] hover:bg-[var(--color-gold)]/30 disabled:opacity-50"
                  >
                    <Zap className="h-3 w-3" /> Enroll Tenants
                  </button>
                  <button
                    onClick={() => toggleCampaign(c.id, c.active || false)}
                    disabled={actionLoading === c.id}
                    className="rounded-lg bg-[var(--color-light-gray)] px-3 py-1.5 text-[10px] font-medium text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] disabled:opacity-50"
                  >
                    {c.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    onClick={() => deleteCampaign(c.id)}
                    disabled={actionLoading === c.id}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[10px] font-medium text-red-400 hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-[var(--color-light-gray)] p-2 text-center">
                  <p className="text-lg font-bold">{c.enrolled_count || 0}</p>
                  <p className="text-[10px] text-[var(--color-mid-gray)]">Enrolled</p>
                </div>
                <div className="rounded-lg bg-[var(--color-light-gray)] p-2 text-center">
                  <p className="text-lg font-bold text-emerald-400">{c.retained_count || 0}</p>
                  <p className="text-[10px] text-[var(--color-mid-gray)]">Retained</p>
                </div>
                <div className="rounded-lg bg-[var(--color-light-gray)] p-2 text-center">
                  <p className="text-lg font-bold">
                    {(c.enrolled_count || 0) > 0 ? Math.round(((c.retained_count || 0) / c.enrolled_count!) * 100) : 0}%
                  </p>
                  <p className="text-[10px] text-[var(--color-mid-gray)]">Retention Rate</p>
                </div>
              </div>
              {c.sequence_steps && c.sequence_steps.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {c.sequence_steps.map((step, i) => (
                    <div key={i} className="shrink-0 rounded-lg bg-[var(--color-light-gray)] px-3 py-1.5">
                      <p className="text-[10px] font-medium text-[var(--color-body-text)]">Day {step.day}</p>
                      <p className="text-[10px] capitalize text-[var(--color-mid-gray)]">{step.channel}: {step.template}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateCampaignModal
          facilityId={facilityId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); refetch(); }}
        />
      )}

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}

/* ─── create campaign modal ─── */

function CreateCampaignModal({ facilityId, onClose, onSuccess }: { facilityId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [triggerLevel, setTriggerLevel] = useState("high");
  const [steps, setSteps] = useState([
    { day: 1, channel: "email", template: "retention_check_in" },
    { day: 3, channel: "sms", template: "special_offer" },
    { day: 7, channel: "email", template: "personal_outreach" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const addStep = () => {
    const lastDay = steps.length > 0 ? steps[steps.length - 1].day : 0;
    setSteps([...steps, { day: lastDay + 3, channel: "email", template: "follow_up" }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const updateStep = (idx: number, field: string, value: string | number) => {
    setSteps(steps.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    if (!name.trim()) { setError("Campaign name is required"); return; }
    if (steps.length === 0) { setError("At least one step is required"); return; }
    setSubmitting(true);
    setError("");
    try {
      await adminFetch("/api/churn-predictions", {
        method: "POST",
        body: JSON.stringify({
          action: "create_campaign",
          facility_id: facilityId,
          name,
          trigger_risk_level: triggerLevel,
          sequence_steps: steps,
        }),
      });
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create campaign");
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--color-light)] p-6" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold">Create Retention Campaign</h3>
          <button onClick={onClose} className="text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"><X className="h-5 w-5" /></button>
        </div>

        {error && <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</p>}

        <div className="space-y-4">
          <Field label="Campaign Name" value={name} onChange={setName} placeholder="e.g. High Risk Personal Outreach" />

          <div>
            <label className="mb-1 block text-[10px] text-[var(--color-mid-gray)]">Trigger Risk Level</label>
            <select value={triggerLevel} onChange={e => setTriggerLevel(e.target.value)} className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] focus:border-[var(--color-gold)]/50 focus:outline-none">
              <option value="critical">Critical (75+)</option>
              <option value="high">High (50+)</option>
              <option value="medium">Medium (25+)</option>
            </select>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] text-[var(--color-mid-gray)]">Sequence Steps</label>
              <button onClick={addStep} className="text-[10px] text-[var(--color-gold)] hover:underline">+ Add Step</button>
            </div>
            <div className="space-y-2">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg bg-[var(--color-light-gray)] p-2">
                  <div className="w-16">
                    <label className="mb-0.5 block text-[9px] text-[var(--color-mid-gray)]">Day</label>
                    <input
                      type="number"
                      value={step.day}
                      onChange={e => updateStep(i, "day", Number(e.target.value))}
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--color-light)] px-2 py-1 text-xs text-[var(--color-dark)] focus:outline-none"
                    />
                  </div>
                  <div className="w-24">
                    <label className="mb-0.5 block text-[9px] text-[var(--color-mid-gray)]">Channel</label>
                    <select
                      value={step.channel}
                      onChange={e => updateStep(i, "channel", e.target.value)}
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--color-light)] px-2 py-1 text-xs text-[var(--color-dark)] focus:outline-none"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="call">Phone Call</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="mb-0.5 block text-[9px] text-[var(--color-mid-gray)]">Template</label>
                    <select
                      value={step.template}
                      onChange={e => updateStep(i, "template", e.target.value)}
                      className="w-full rounded border border-[var(--border-subtle)] bg-[var(--color-light)] px-2 py-1 text-xs text-[var(--color-dark)] focus:outline-none"
                    >
                      <option value="retention_check_in">Check-In</option>
                      <option value="special_offer">Special Offer</option>
                      <option value="personal_outreach">Personal Outreach</option>
                      <option value="payment_reminder">Payment Reminder</option>
                      <option value="autopay_incentive">AutoPay Incentive</option>
                      <option value="renewal_offer">Renewal Offer</option>
                      <option value="follow_up">Follow Up</option>
                    </select>
                  </div>
                  <button onClick={() => removeStep(i)} className="mt-3 text-[var(--color-mid-gray)] hover:text-red-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-gold-hover)] disabled:opacity-50">
            {submitting ? "Creating..." : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── loading skeleton ─── */

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
