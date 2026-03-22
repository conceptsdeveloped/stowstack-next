"use client";

import { useState, useCallback } from "react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import {
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  Mail,
  Filter,
  Gauge,
  MousePointerClick,
  ScrollText,
  Loader2,
} from "lucide-react";

interface RecoveryStats {
  pending: number;
  in_recovery: number;
  recovered: number;
  exhausted: number;
}

interface PartialLead {
  id: string;
  session_id: string;
  fields_completed: string[];
  scroll_depth: number;
  lead_score: number;
  status: "pending" | "in_recovery" | "recovered" | "exhausted";
  created_at: string;
  email?: string;
  name?: string;
}

const STATUS_FILTERS = ["all", "pending", "in_recovery", "recovered", "exhausted"] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: typeof Clock }> = {
  pending: { bg: "rgba(234,179,8,0.1)", text: "#EAB308", icon: Clock },
  in_recovery: { bg: "rgba(59,130,246,0.1)", text: "#3B82F6", icon: RotateCcw },
  recovered: { bg: "rgba(34,197,94,0.1)", text: "#22C55E", icon: CheckCircle },
  exhausted: { bg: "rgba(107,114,128,0.1)", text: "#6B7280", icon: XCircle },
};

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border p-5 animate-pulse"
          style={{ backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.06)" }}
        >
          <div className="h-3 w-20 rounded bg-white/5 mb-3" />
          <div className="h-8 w-12 rounded bg-white/5" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg animate-pulse" style={{ backgroundColor: "#111111" }} />
      ))}
    </div>
  );
}

export default function RecoveryPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (statusFilter !== "all") params.status = statusFilter;

  const { data: stats, loading: statsLoading } =
    useAdminFetch<RecoveryStats>("/api/partial-lead", { summary: "true" });

  const { data: leads, loading: leadsLoading, error, refetch } =
    useAdminFetch<PartialLead[]>("/api/partial-lead", params);

  const handleSendRecovery = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await adminFetch(`/api/partial-lead?id=${id}`, { method: "PATCH", body: JSON.stringify({ action: "recover" }) });
        refetch();
      } catch {
        // Handled silently
      } finally {
        setActionLoading(null);
      }
    },
    [refetch]
  );

  const handleExhaust = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await adminFetch(`/api/partial-lead?id=${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "exhausted" }),
        });
        refetch();
      } catch {
        // Handled silently
      } finally {
        setActionLoading(null);
      }
    },
    [refetch]
  );

  const statCards = stats
    ? [
        { label: "Pending", value: stats.pending, icon: Clock, color: "#EAB308" },
        { label: "In Recovery", value: stats.in_recovery, icon: RotateCcw, color: "#3B82F6" },
        { label: "Recovered", value: stats.recovered, icon: CheckCircle, color: "#22C55E" },
        { label: "Exhausted", value: stats.exhausted, icon: XCircle, color: "#6B7280" },
      ]
    : [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "#F5F5F7" }}>Lead Recovery</h1>
        <p className="text-sm mt-1" style={{ color: "#6E6E73" }}>
          Recover abandoned form submissions and partial leads
        </p>
      </div>

      {statsLoading ? (
        <StatsSkeleton />
      ) : stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="rounded-xl border p-5"
                style={{ backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={16} style={{ color: s.color }} />
                  <span className="text-xs font-medium" style={{ color: "#6E6E73" }}>{s.label}</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: "#F5F5F7" }}>{s.value}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <Filter size={14} style={{ color: "#6E6E73" }} />
        {STATUS_FILTERS.map((f) => {
          const isActive = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors capitalize"
              style={{
                backgroundColor: isActive ? "#3B82F6" : "rgba(255,255,255,0.05)",
                color: isActive ? "#fff" : "#6E6E73",
              }}
            >
              {f.replace(/_/g, " ")}
            </button>
          );
        })}
      </div>

      {error && (
        <div className="rounded-lg border p-4 text-sm" style={{ backgroundColor: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.2)", color: "#EF4444" }}>
          Failed to load partial leads: {error}
        </div>
      )}

      {leadsLoading ? (
        <TableSkeleton />
      ) : leads && leads.length > 0 ? (
        <div className="space-y-2">
          {leads.map((lead) => {
            const style = STATUS_STYLES[lead.status] || STATUS_STYLES.pending;
            const StatusIcon = style.icon;
            const isLoading = actionLoading === lead.id;

            return (
              <div
                key={lead.id}
                className="rounded-xl border p-4 transition-colors hover:bg-white/[0.01]"
                style={{ backgroundColor: "#111111", borderColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      {lead.name ? (
                        <span className="text-sm font-medium" style={{ color: "#F5F5F7" }}>{lead.name}</span>
                      ) : (
                        <span className="text-sm font-mono" style={{ color: "#A1A1A6" }}>
                          {lead.session_id.slice(0, 12)}...
                        </span>
                      )}
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded-full capitalize flex items-center gap-1"
                        style={{ backgroundColor: style.bg, color: style.text }}
                      >
                        <StatusIcon size={10} />
                        {lead.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "#6E6E73" }}>
                      {lead.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={10} />
                          {lead.email}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MousePointerClick size={10} />
                        {lead.fields_completed.length} fields
                      </span>
                      <span className="flex items-center gap-1">
                        <ScrollText size={10} />
                        {lead.scroll_depth}% scroll
                      </span>
                      <span className="flex items-center gap-1">
                        <Gauge size={10} />
                        Score: {lead.lead_score}
                      </span>
                      <span>{new Date(lead.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {(lead.status === "pending" || lead.status === "in_recovery") && (
                    <div className="flex items-center gap-1 shrink-0">
                      {lead.email && lead.status === "pending" && (
                        <button
                          onClick={() => handleSendRecovery(lead.id)}
                          disabled={isLoading}
                          className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          style={{ backgroundColor: "rgba(59,130,246,0.1)", color: "#3B82F6" }}
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                          Recover
                        </button>
                      )}
                      <button
                        onClick={() => handleExhaust(lead.id)}
                        disabled={isLoading}
                        className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        style={{ backgroundColor: "rgba(107,114,128,0.1)", color: "#6B7280" }}
                      >
                        <XCircle size={12} />
                        Exhaust
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <RotateCcw size={32} className="mx-auto mb-3" style={{ color: "#6E6E73" }} />
          <p className="text-sm" style={{ color: "#6E6E73" }}>
            {statusFilter === "all" ? "No partial leads found" : `No ${statusFilter.replace(/_/g, " ")} leads`}
          </p>
        </div>
      )}
    </div>
  );
}
