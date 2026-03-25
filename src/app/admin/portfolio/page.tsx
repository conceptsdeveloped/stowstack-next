"use client";

import { useCallback, useMemo } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  DollarSign,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

/* ---------- types ---------- */

interface Lead {
  id: string;
  clientId?: string;
  status?: string;
  facilityName?: string;
  facilityId?: string;
  createdAt?: string;
}

interface Campaign {
  id: string;
  clientId: string;
  clientName?: string;
  facilityName?: string;
  month: string;
  spend: number;
  leads: number;
  moveIns: number;
}

interface CampaignAlert {
  id: string;
  severity: "critical" | "warning" | "info";
  message: string;
  clientName?: string;
  createdAt?: string;
}

/* ---------- helpers ---------- */

function currency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function currencyDecimal(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/* ---------- skeleton helpers ---------- */

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
      <div className="mb-3 h-4 w-24 animate-pulse rounded bg-[var(--color-light-gray)]" />
      <div className="h-8 w-32 animate-pulse rounded bg-[var(--color-light-gray)]" />
    </div>
  );
}

function SkeletonTable() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-12 w-full animate-pulse rounded bg-[var(--color-light-gray)]"
        />
      ))}
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="h-72 w-full animate-pulse rounded-xl bg-[var(--color-light-gray)]" />
  );
}

/* ---------- error banner ---------- */

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
      <XCircle className="h-5 w-5 shrink-0 text-red-400" />
      <p className="flex-1 text-sm text-red-300">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
      >
        <RefreshCw className="h-3 w-3" />
        Retry
      </button>
    </div>
  );
}

/* ---------- kpi card ---------- */

interface KPICardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent?: boolean;
  change?: number;
}

function KPICard({ label, value, icon, accent, change }: KPICardProps) {
  return (
    <div
      className={`rounded-xl border p-5 ${
        accent
          ? "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/[0.08]"
          : "border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-[var(--color-mid-gray)]">{label}</span>
        <span className={accent ? "text-[var(--color-gold)]" : "text-[var(--color-body-text)]"}>
          {icon}
        </span>
      </div>
      <p
        className={`text-2xl font-bold ${
          accent ? "text-[var(--color-gold)]" : "text-[var(--color-dark)]"
        }`}
      >
        {value}
      </p>
      {change !== undefined && (
        <div className="mt-2 flex items-center gap-1">
          {change >= 0 ? (
            <ArrowUp className="h-3 w-3 text-emerald-400" />
          ) : (
            <ArrowDown className="h-3 w-3 text-red-400" />
          )}
          <span
            className={`text-xs ${
              change >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {Math.abs(change).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- custom tooltip ---------- */

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--color-light-gray)] px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-[var(--color-mid-gray)]">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-sm">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[var(--color-body-text)]">{entry.name}:</span>
          <span className="font-medium text-[var(--color-dark)]">
            {entry.name === "Spend" ? currency(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ---------- main page ---------- */

export default function PortfolioPage() {
  const {
    data: leadsRaw,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useAdminFetch<{ leads: Lead[]; auditCount: number; pagination: unknown }>("/api/admin-leads");
  const leads = leadsRaw?.leads ?? [];

  const {
    data: campaignsRaw,
    loading: campaignsLoading,
    error: campaignsError,
    refetch: refetchCampaigns,
  } = useAdminFetch<{ campaigns: Campaign[] }>("/api/client-campaigns");
  const campaigns = campaignsRaw?.campaigns ?? [];

  const {
    data: alertsRaw,
    loading: alertsLoading,
    error: alertsError,
    refetch: refetchAlerts,
  } = useAdminFetch<{ alerts: CampaignAlert[]; clientAlerts: unknown; summary: unknown }>("/api/campaign-alerts");
  const alerts = alertsRaw?.alerts ?? [];

  const loading = leadsLoading || campaignsLoading;

  /* derived metrics */
  const metrics = useMemo(() => {
    if (!leadsRaw || !campaignsRaw) return null;

    const signedClients = new Set(
      leads
        .filter((l) => l.status === "signed" || l.clientId)
        .map((l) => l.clientId),
    );

    const totalSpend = campaigns.reduce((s, c) => s + (c.spend || 0), 0);
    const totalLeads = campaigns.reduce((s, c) => s + (c.leads || 0), 0);
    const totalMoveIns = campaigns.reduce((s, c) => s + (c.moveIns || 0), 0);
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;
    const costPerMoveIn = totalMoveIns > 0 ? totalSpend / totalMoveIns : 0;

    return {
      activeClients: signedClients.size || leads.length,
      totalSpend,
      totalLeads,
      totalMoveIns,
      avgCPL,
      costPerMoveIn,
    };
  }, [leads, campaigns, leadsRaw, campaignsRaw]);

  /* monthly chart data */
  const monthlyData = useMemo(() => {
    if (!campaignsRaw) return [];

    const byMonth = new Map<
      string,
      { spend: number; leads: number; moveIns: number }
    >();

    for (const c of campaigns) {
      const key = c.month?.slice(0, 7) || "unknown";
      const existing = byMonth.get(key) || { spend: 0, leads: 0, moveIns: 0 };
      existing.spend += c.spend || 0;
      existing.leads += c.leads || 0;
      existing.moveIns += c.moveIns || 0;
      byMonth.set(key, existing);
    }

    return Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, d]) => ({
        month: new Date(month + "-01").toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        }),
        Spend: d.spend,
        Leads: d.leads,
        "Move-Ins": d.moveIns,
      }));
  }, [campaigns, campaignsRaw]);

  /* client rankings */
  const clientRankings = useMemo(() => {
    if (!campaignsRaw) return [];

    const byClient = new Map<
      string,
      {
        client: string;
        facility: string;
        spend: number;
        leads: number;
        moveIns: number;
      }
    >();

    for (const c of campaigns) {
      const key = c.clientId || c.clientName || "Unknown";
      const existing = byClient.get(key) || {
        client: c.clientName || key,
        facility: c.facilityName || "-",
        spend: 0,
        leads: 0,
        moveIns: 0,
      };
      existing.spend += c.spend || 0;
      existing.leads += c.leads || 0;
      existing.moveIns += c.moveIns || 0;
      byClient.set(key, existing);
    }

    return Array.from(byClient.values())
      .map((r) => ({
        ...r,
        cpl: r.leads > 0 ? r.spend / r.leads : 0,
        roas: r.spend > 0 ? (r.moveIns * 1200) / r.spend : 0,
      }))
      .sort((a, b) => b.moveIns - a.moveIns);
  }, [campaigns, campaignsRaw]);

  const retryAll = useCallback(() => {
    refetchLeads();
    refetchCampaigns();
    refetchAlerts();
  }, [refetchLeads, refetchCampaigns, refetchAlerts]);

  /* critical alerts */
  const criticalAlerts = useMemo(
    () =>
      alerts.filter(
        (a) => a.severity === "critical" || a.severity === "warning",
      ),
    [alerts],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* campaign alerts banner */}
      {!alertsLoading && criticalAlerts.length > 0 && (
        <div className="space-y-2">
          {criticalAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
                alert.severity === "critical"
                  ? "border-red-500/20 bg-red-500/10"
                  : "border-yellow-500/20 bg-yellow-500/10"
              }`}
            >
              <AlertTriangle
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  alert.severity === "critical"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              />
              <div className="flex-1">
                <p
                  className={`text-sm font-medium ${
                    alert.severity === "critical"
                      ? "text-red-300"
                      : "text-yellow-300"
                  }`}
                >
                  {alert.clientName && (
                    <span className="mr-1 font-bold">{alert.clientName}:</span>
                  )}
                  {alert.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {alertsError && (
        <ErrorBanner message="Failed to load alerts" onRetry={refetchAlerts} />
      )}

      {/* error states */}
      {(leadsError || campaignsError) && (
        <ErrorBanner
          message={leadsError || campaignsError || "Failed to load data"}
          onRetry={retryAll}
        />
      )}

      {/* KPI cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : metrics ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <KPICard
            label="Active Clients"
            value={metrics.activeClients.toLocaleString()}
            icon={<Users className="h-5 w-5" />}
          />
          <KPICard
            label="Total Ad Spend"
            value={currency(metrics.totalSpend)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            label="Total Leads"
            value={metrics.totalLeads.toLocaleString()}
            icon={<MousePointerClick className="h-5 w-5" />}
          />
          <KPICard
            label="Total Move-Ins"
            value={metrics.totalMoveIns.toLocaleString()}
            icon={<TrendingUp className="h-5 w-5" />}
            accent
          />
          <KPICard
            label="Avg CPL"
            value={currencyDecimal(metrics.avgCPL)}
            icon={<DollarSign className="h-5 w-5" />}
          />
          <KPICard
            label="Cost Per Move-In"
            value={currencyDecimal(metrics.costPerMoveIn)}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
          <p className="text-[var(--color-mid-gray)]">No portfolio data available yet.</p>
        </div>
      )}

      {/* charts */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* monthly performance area chart */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">
            Monthly Campaign Performance
          </h2>
          {loading ? (
            <SkeletonChart />
          ) : monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={288}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-gold)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-gold)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient
                    id="gradMoveIns"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="var(--color-green)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-green)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--color-mid-gray)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--color-mid-gray)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ stroke: "var(--color-light-gray)" }}
                />
                <Legend
                  wrapperStyle={{ color: "var(--color-body-text)", fontSize: 12 }}
                />
                <Area
                  type="monotone"
                  dataKey="Leads"
                  stroke="var(--color-gold)"
                  fill="url(#gradLeads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Move-Ins"
                  stroke="var(--color-green)"
                  fill="url(#gradMoveIns)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-72 items-center justify-center">
              <p className="text-sm text-[var(--color-mid-gray)]">
                No monthly data available.
              </p>
            </div>
          )}
        </div>

        {/* spend bar chart */}
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
          <h2 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">
            Monthly Ad Spend
          </h2>
          {loading ? (
            <SkeletonChart />
          ) : monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={288}>
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--color-mid-gray)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--color-mid-gray)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  cursor={{ fill: "var(--color-light-gray)" }}
                />
                <Bar
                  dataKey="Spend"
                  fill="#6366F1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-72 items-center justify-center">
              <p className="text-sm text-[var(--color-mid-gray)]">
                No spend data available.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* client rankings */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5">
        <h2 className="mb-4 text-sm font-semibold text-[var(--color-dark)]">
          Client Rankings
        </h2>
        {loading ? (
          <SkeletonTable />
        ) : clientRankings.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-left text-[var(--color-mid-gray)]">
                  <th className="pb-3 pr-4 font-medium">#</th>
                  <th className="pb-3 pr-4 font-medium">Client</th>
                  <th className="pb-3 pr-4 font-medium">Facility</th>
                  <th className="pb-3 pr-4 text-right font-medium">Spend</th>
                  <th className="pb-3 pr-4 text-right font-medium">Leads</th>
                  <th className="pb-3 pr-4 text-right font-medium">
                    Move-Ins
                  </th>
                  <th className="pb-3 pr-4 text-right font-medium">CPL</th>
                  <th className="pb-3 text-right font-medium">ROAS</th>
                </tr>
              </thead>
              <tbody>
                {clientRankings.map((row, i) => (
                  <tr
                    key={row.client}
                    className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--color-light-gray)]"
                  >
                    <td className="py-3 pr-4 text-[var(--color-mid-gray)]">{i + 1}</td>
                    <td className="py-3 pr-4 font-medium text-[var(--color-dark)]">
                      {row.client}
                    </td>
                    <td className="py-3 pr-4 text-[var(--color-body-text)]">
                      {row.facility}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--color-body-text)]">
                      {currency(row.spend)}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--color-body-text)]">
                      {row.leads}
                    </td>
                    <td className="py-3 pr-4 text-right font-medium text-[var(--color-gold)]">
                      {row.moveIns}
                    </td>
                    <td className="py-3 pr-4 text-right text-[var(--color-body-text)]">
                      {currencyDecimal(row.cpl)}
                    </td>
                    <td className="py-3 text-right text-[var(--color-body-text)]">
                      {row.roas.toFixed(1)}x
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--color-mid-gray)]">
              No client data available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
