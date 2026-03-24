"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Building2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Zap,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Users,
  TrendingUp,
  Target,
  BarChart3,
} from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";

/* ─── types ─── */

interface Facility {
  id: string;
  name: string;
  email: string;
  phone: string;
  facilityName: string;
  location: string;
  occupancyRange: string;
  totalUnits: string;
  biggestIssue: string;
  status: string;
  accessCode: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ─── stages ─── */

interface Stage {
  id: string;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  nextAction: string;
}

const STAGES: Stage[] = [
  {
    id: "diagnostic_submitted",
    label: "Diagnostic Submitted",
    color: "text-[#3B82F6]",
    bgColor: "bg-[#3B82F6]/[0.08]",
    borderColor: "border-[#3B82F6]/20",
    icon: <FileText className="h-4 w-4" />,
    nextAction: "Generate audit",
  },
  {
    id: "submitted",
    label: "Lead Submitted",
    color: "text-purple-400",
    bgColor: "bg-purple-500/[0.08]",
    borderColor: "border-purple-500/20",
    icon: <Users className="h-4 w-4" />,
    nextAction: "Send audit form",
  },
  {
    id: "audit_generated",
    label: "Audit Generated",
    color: "text-amber-400",
    bgColor: "bg-amber-500/[0.08]",
    borderColor: "border-amber-500/20",
    icon: <BarChart3 className="h-4 w-4" />,
    nextAction: "Review & send audit",
  },
  {
    id: "audit_sent",
    label: "Audit Sent",
    color: "text-orange-400",
    bgColor: "bg-orange-500/[0.08]",
    borderColor: "border-orange-500/20",
    icon: <Mail className="h-4 w-4" />,
    nextAction: "Follow up / schedule call",
  },
  {
    id: "call_scheduled",
    label: "Call Scheduled",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/[0.08]",
    borderColor: "border-cyan-500/20",
    icon: <Phone className="h-4 w-4" />,
    nextAction: "Close the deal",
  },
  {
    id: "form_sent",
    label: "Proposal Sent",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/[0.08]",
    borderColor: "border-indigo-500/20",
    icon: <FileText className="h-4 w-4" />,
    nextAction: "Waiting for signature",
  },
  {
    id: "client_signed",
    label: "Client Signed",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/[0.08]",
    borderColor: "border-emerald-500/20",
    icon: <CheckCircle2 className="h-4 w-4" />,
    nextAction: "Begin onboarding",
  },
];

const STAGE_MAP = new Map(STAGES.map((s) => [s.id, s]));

function getStage(status: string): Stage {
  return (
    STAGE_MAP.get(status) || {
      id: status,
      label: status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      color: "text-[#9CA3AF]",
      bgColor: "bg-black/[0.03]",
      borderColor: "border-black/[0.08]",
      icon: <Building2 className="h-4 w-4" />,
      nextAction: "Review",
    }
  );
}

/* ─── helpers ─── */

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function occupancyLabel(range: string): string {
  const map: Record<string, string> = {
    "below-60": "< 60%",
    "60-75": "60-75%",
    "75-85": "75-85%",
    "85-95": "85-95%",
    "above-95": "95%+",
  };
  return map[range] || range;
}

/* ─── components ─── */

function StageColumn({
  stage,
  facilities,
  onAdvance,
  advancing,
}: {
  stage: Stage;
  facilities: Facility[];
  onAdvance: (id: string, currentStage: string) => void;
  advancing: string | null;
}) {
  return (
    <div className="min-w-[300px] flex-1">
      {/* Column header */}
      <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 ${stage.borderColor} ${stage.bgColor}`}>
        <div className={stage.color}>{stage.icon}</div>
        <h3 className={`text-xs font-semibold ${stage.color}`}>{stage.label}</h3>
        <span className="ml-auto rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#6B7280]">
          {facilities.length}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {facilities.map((f) => (
          <div
            key={f.id}
            className="rounded-xl border border-black/[0.08] bg-white p-4 transition-colors hover:border-black/[0.1]"
          >
            <div className="mb-2 flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h4 className="truncate text-sm font-semibold text-[#111827]">
                  {f.facilityName || f.name || "Unnamed Facility"}
                </h4>
                {f.location && (
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#9CA3AF]">
                    <MapPin className="h-2.5 w-2.5" />
                    <span className="truncate">{f.location}</span>
                  </div>
                )}
              </div>
              <span className="shrink-0 text-[10px] text-[#9CA3AF]">
                {relativeTime(f.updatedAt || f.createdAt)}
              </span>
            </div>

            {/* Contact */}
            <div className="mb-3 space-y-1">
              {f.name && (
                <p className="text-xs text-[#6B7280]">{f.name}</p>
              )}
              {f.email && (
                <a
                  href={`mailto:${f.email}`}
                  className="flex items-center gap-1 text-[10px] text-[#9CA3AF] hover:text-[#3B82F6]"
                >
                  <Mail className="h-2.5 w-2.5" />
                  {f.email}
                </a>
              )}
              {f.phone && (
                <a
                  href={`tel:${f.phone}`}
                  className="flex items-center gap-1 text-[10px] text-[#9CA3AF] hover:text-[#3B82F6]"
                >
                  <Phone className="h-2.5 w-2.5" />
                  {f.phone}
                </a>
              )}
            </div>

            {/* Tags */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {f.occupancyRange && (
                <span className="rounded-md bg-black/[0.03] px-2 py-0.5 text-[10px] text-[#6B7280]">
                  {occupancyLabel(f.occupancyRange)}
                </span>
              )}
              {f.totalUnits && (
                <span className="rounded-md bg-black/[0.03] px-2 py-0.5 text-[10px] text-[#6B7280]">
                  {f.totalUnits} units
                </span>
              )}
              {f.biggestIssue && (
                <span className="rounded-md bg-black/[0.03] px-2 py-0.5 text-[10px] text-[#6B7280]">
                  {f.biggestIssue.replace(/-/g, " ")}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Advance button */}
              {stage.id !== "client_signed" && (
                <button
                  type="button"
                  onClick={() => onAdvance(f.id, f.status)}
                  disabled={advancing === f.id}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${stage.bgColor} ${stage.color} hover:opacity-80 disabled:opacity-50`}
                >
                  {advancing === f.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                  {stage.nextAction}
                </button>
              )}
              {stage.id === "client_signed" && (
                <span className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-500/[0.08] px-3 py-1.5 text-xs font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Active Client
                </span>
              )}
              {/* View audit link */}
              {(stage.id === "audit_generated" || stage.id === "audit_sent") && (
                <a
                  href={`/admin/audits`}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-black/[0.08] text-[#9CA3AF] hover:bg-black/[0.03] hover:text-[#111827]"
                  title="View audits"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}

        {facilities.length === 0 && (
          <div className="rounded-xl border border-dashed border-black/[0.08] p-6 text-center">
            <p className="text-xs text-[#9CA3AF]">No facilities at this stage</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── main page ─── */

export default function PipelinePage() {
  const { data, loading, error, refetch } = useAdminFetch<{
    leads: Facility[];
    total: number;
  }>("/api/admin-leads", { limit: "200" });
  const [advancing, setAdvancing] = useState<string | null>(null);
  const [view, setView] = useState<"board" | "list">("board");

  const facilities = data?.leads || [];

  // Group by stage
  const stageGroups = new Map<string, Facility[]>();
  for (const stage of STAGES) {
    stageGroups.set(stage.id, []);
  }
  for (const f of facilities) {
    const status = f.status || "submitted";
    const existing = stageGroups.get(status);
    if (existing) {
      existing.push(f);
    } else {
      // Unknown status — add to submitted
      stageGroups.get("submitted")?.push(f);
    }
  }

  // Stats
  const totalFacilities = facilities.length;
  const activePipeline = facilities.filter(
    (f) => f.status !== "client_signed" && f.status !== "lost"
  ).length;
  const signed = facilities.filter((f) => f.status === "client_signed").length;
  const diagnostics = facilities.filter(
    (f) => f.status === "diagnostic_submitted" || f.status === "audit_generated"
  ).length;
  const conversionRate =
    totalFacilities > 0 ? ((signed / totalFacilities) * 100).toFixed(1) : "0.0";

  // Advance to next stage
  const NEXT_STAGE: Record<string, string> = {
    diagnostic_submitted: "audit_generated",
    submitted: "form_sent",
    audit_generated: "audit_sent",
    audit_sent: "call_scheduled",
    call_scheduled: "form_sent",
    form_sent: "form_completed",
    form_completed: "client_signed",
  };

  async function handleAdvance(id: string, currentStage: string) {
    const next = NEXT_STAGE[currentStage];
    if (!next) return;

    setAdvancing(id);
    try {
      await adminFetch("/api/admin-leads", {
        method: "PATCH",
        body: JSON.stringify({ id, status: next }),
      });
      refetch();
    } catch (err) {
      console.error("Failed to advance:", err);
    } finally {
      setAdvancing(null);
    }
  }

  return (
    <div className="min-h-screen space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#111827]">
            Facility Pipeline
          </h1>
          <p className="text-sm text-[#9CA3AF]">
            Track facilities from diagnostic to active client
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/audits"
            className="flex items-center gap-2 rounded-lg border border-black/[0.08] bg-white px-4 py-2 text-xs font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
          >
            <FileText className="h-3.5 w-3.5" />
            Diagnostics
          </a>
          <a
            href="/diagnostic"
            target="_blank"
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-xs font-semibold text-[#111827] transition-colors hover:bg-[#E5E7EB]"
          >
            <Zap className="h-3.5 w-3.5" />
            Share Diagnostic Form
          </a>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-black/[0.08] bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-[#3B82F6]" />
            <span className="text-xs text-[#9CA3AF]">Total Facilities</span>
          </div>
          <p className="text-2xl font-bold text-[#111827]">
            {loading ? "—" : totalFacilities}
          </p>
        </div>
        <div className="rounded-xl border border-black/[0.08] bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-[#9CA3AF]">Active Pipeline</span>
          </div>
          <p className="text-2xl font-bold text-[#111827]">
            {loading ? "—" : activePipeline}
          </p>
        </div>
        <div className="rounded-xl border border-black/[0.08] bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-[#9CA3AF]">In Diagnostics</span>
          </div>
          <p className="text-2xl font-bold text-[#111827]">
            {loading ? "—" : diagnostics}
          </p>
        </div>
        <div className="rounded-xl border border-black/[0.08] bg-white p-4">
          <div className="mb-2 flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-[#9CA3AF]">Conversion Rate</span>
          </div>
          <p className="text-2xl font-bold text-[#111827]">
            {loading ? "—" : `${conversionRate}%`}
          </p>
          <p className="text-[10px] text-[#9CA3AF]">
            {signed} signed of {totalFacilities}
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] p-4 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            type="button"
            onClick={refetch}
            className="ml-auto text-xs underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#3B82F6]" />
        </div>
      )}

      {/* Board View */}
      {!loading && !error && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4" style={{ minWidth: `${STAGES.length * 316}px` }}>
            {STAGES.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                facilities={stageGroups.get(stage.id) || []}
                onAdvance={handleAdvance}
                advancing={advancing}
              />
            ))}
          </div>
        </div>
      )}

      {/* Funnel Visualization */}
      {!loading && !error && totalFacilities > 0 && (
        <div className="rounded-xl border border-black/[0.08] bg-white p-5">
          <h3 className="mb-4 text-sm font-semibold text-[#111827]">
            Conversion Funnel
          </h3>
          <div className="space-y-2">
            {STAGES.map((stage) => {
              const count = stageGroups.get(stage.id)?.length || 0;
              const pct =
                totalFacilities > 0
                  ? Math.max((count / totalFacilities) * 100, 2)
                  : 0;
              return (
                <div key={stage.id} className="flex items-center gap-3">
                  <div className="w-36 shrink-0">
                    <span className={`text-xs font-medium ${stage.color}`}>
                      {stage.label}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-md bg-black/[0.03]">
                      <div
                        className={`h-full rounded-md transition-all duration-500 ${stage.bgColor}`}
                        style={{ width: `${pct}%`, minWidth: count > 0 ? "24px" : "0" }}
                      >
                        <span className={`flex h-full items-center px-2 text-[10px] font-semibold ${stage.color}`}>
                          {count}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs text-[#9CA3AF]">
                    {totalFacilities > 0
                      ? `${((count / totalFacilities) * 100).toFixed(0)}%`
                      : "0%"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
