"use client";

import { useState, useEffect, useMemo } from "react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import {
  Users,
  TrendingUp,
  CheckCircle2,
  FileText,
  Percent,
  AlertTriangle,
  Search,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  RefreshCw,
  MapPin,
  Clock,
  StickyNote,
  ArrowRight,
  Kanban,
} from "lucide-react";
import Link from "next/link";

/* ─── Types ────────────────────────────────────────────────────── */

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  facilityName: string;
  location: string;
  occupancyRange: string;
  totalUnits: string;
  biggestIssue: string;
  formNotes: string | null;
  status: string;
  pmsUploaded: boolean;
  followUpDate: string | null;
  accessCode: string | null;
  notes: Array<{ text: string; at: string }>;
  createdAt: string;
  updatedAt: string;
}

interface LeadsResponse {
  leads: Lead[];
  auditCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface AnalyticsResponse {
  totalLeads: number;
  funnel: Record<string, number>;
  conversionRate: string;
  lostRate: string;
  stageDistribution: Record<string, number>;
  weeklyVelocity: Array<{ week: string; count: number }>;
}

/* ─── Constants ────────────────────────────────────────────────── */

const STATUSES = [
  "submitted",
  "form_sent",
  "form_completed",
  "audit_generated",
  "call_scheduled",
  "client_signed",
  "lost",
] as const;

const STATUS_LABELS: Record<string, string> = {
  diagnostic_submitted: "Diagnostic",
  submitted: "Submitted",
  audit_generated: "Audit Ready",
  audit_sent: "Audit Sent",
  form_sent: "Proposal Sent",
  form_completed: "Form Completed",
  call_scheduled: "Call Scheduled",
  client_signed: "Signed",
  lost: "Lost",
  overdue: "Overdue",
};

const STATUS_COLORS: Record<string, string> = {
  diagnostic_submitted: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  submitted: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  audit_generated: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  audit_sent: "bg-teal-500/20 text-teal-400 border-teal-500/30",
  form_sent: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  form_completed: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  call_scheduled: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  client_signed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
};

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "name", label: "Name A-Z" },
];

const FILTER_CHIPS = [
  "All",
  "diagnostic_submitted",
  "submitted",
  "audit_generated",
  "audit_sent",
  "form_sent",
  "form_completed",
  "call_scheduled",
  "client_signed",
  "lost",
];

/* ─── Helpers ──────────────────────────────────────────────────── */

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function leadScoreGrade(lead: Lead): { grade: string; color: string } {
  let score = 0;
  if (lead.name) score += 10;
  if (lead.email) score += 15;
  if (lead.phone) score += 15;
  if (lead.facilityName) score += 10;
  if (lead.location) score += 10;
  if (lead.totalUnits) score += 10;
  if (lead.occupancyRange) score += 10;
  if (lead.biggestIssue) score += 10;
  if (lead.pmsUploaded) score += 10;

  if (score >= 80) return { grade: "A", color: "text-emerald-400" };
  if (score >= 60) return { grade: "B", color: "text-blue-400" };
  if (score >= 40) return { grade: "C", color: "text-amber-400" };
  return { grade: "D", color: "text-red-400" };
}

function isOverdue(lead: Lead): boolean {
  if (!lead.followUpDate) return false;
  return new Date(lead.followUpDate).getTime() < Date.now();
}

/* ─── Skeleton Components ──────────────────────────────────────── */

function StatSkeleton() {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-5 animate-pulse">
      <div className="h-4 w-20 rounded bg-black/5 mb-3" />
      <div className="h-8 w-16 rounded bg-black/5 mb-2" />
      <div className="h-3 w-24 rounded bg-black/5" />
    </div>
  );
}

function LeadRowSkeleton() {
  return (
    <div className="border-b border-black/[0.08] p-4 animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-4 w-4 rounded bg-black/5" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-48 rounded bg-black/5" />
          <div className="h-3 w-32 rounded bg-black/5" />
        </div>
        <div className="h-6 w-20 rounded-full bg-black/5" />
      </div>
    </div>
  );
}

/* ─── KPI Card ─────────────────────────────────────────────────── */

function StatCard({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-5 hover:border-black/[0.12] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-[#9CA3AF]" />
        <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="text-2xl font-bold text-[#111827]">{value}</div>
      {subtitle && (
        <div className="text-xs text-[#9CA3AF] mt-1">{subtitle}</div>
      )}
    </div>
  );
}

/* ─── Conversion Funnel ────────────────────────────────────────── */

function ConversionFunnel({ funnel }: { funnel: Record<string, number> }) {
  const stages = STATUSES.filter((s) => s !== "lost");
  const maxCount = Math.max(...stages.map((s) => funnel[s] || 0), 1);

  return (
    <div className="rounded-xl border border-black/[0.08] bg-white p-6">
      <h3 className="text-sm font-semibold text-[#111827] mb-4">
        Conversion Funnel
      </h3>
      <div className="space-y-3">
        {stages.map((stage, i) => {
          const count = funnel[stage] || 0;
          const nextCount = i < stages.length - 1 ? funnel[stages[i + 1]] || 0 : 0;
          const pct = count > 0 ? ((nextCount / count) * 100).toFixed(0) : "0";
          const width = Math.max((count / maxCount) * 100, 4);

          return (
            <div key={stage}>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[#6B7280] w-32 shrink-0 truncate">
                  {STATUS_LABELS[stage]}
                </span>
                <div className="flex-1 h-7 bg-black/[0.03] rounded-md overflow-hidden">
                  <div
                    className="h-full bg-blue-500/30 rounded-md flex items-center px-2 transition-all duration-500"
                    style={{ width: `${width}%` }}
                  >
                    <span className="text-xs font-medium text-blue-300 whitespace-nowrap">
                      {count}
                    </span>
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="flex items-center gap-3 ml-32 pl-3 py-1">
                  <ArrowRight className="w-3 h-3 text-[#9CA3AF]" />
                  <span className="text-[10px] text-[#9CA3AF]">{pct}%</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Status Badge ─────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const colors = STATUS_COLORS[status] || "bg-black/5 text-[#6B7280]";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors}`}
    >
      {STATUS_LABELS[status] || status}
    </span>
  );
}

/* ─── Lead Expanded Row ────────────────────────────────────────── */

function LeadExpandedRow({
  lead,
  onUpdate,
}: {
  lead: Lead;
  onUpdate: () => void;
}) {
  const [newNote, setNewNote] = useState("");
  const [newStatus, setNewStatus] = useState(lead.status);
  const [followUp, setFollowUp] = useState(lead.followUpDate?.slice(0, 10) || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const body: Record<string, string> = { id: lead.id };
      if (newStatus !== lead.status) body.status = newStatus;
      if (newNote.trim()) body.note = newNote.trim();
      if (followUp !== (lead.followUpDate?.slice(0, 10) || ""))
        body.followUpDate = followUp || "";

      await adminFetch("/api/admin-leads", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setNewNote("");
      onUpdate();
    } catch {
      /* error handled silently, refetch shows current state */
    } finally {
      setSaving(false);
    }
  }

  function copyAccessCode() {
    if (lead.accessCode) {
      navigator.clipboard.writeText(lead.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="border-t border-black/[0.08] bg-[#F3F4F6] px-4 py-4 sm:px-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Details */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-[#9CA3AF] block text-xs mb-0.5">Email</span>
              <span className="text-[#6B7280]">{lead.email || "---"}</span>
            </div>
            <div>
              <span className="text-[#9CA3AF] block text-xs mb-0.5">Phone</span>
              <span className="text-[#6B7280]">{lead.phone || "---"}</span>
            </div>
            <div>
              <span className="text-[#9CA3AF] block text-xs mb-0.5">
                Occupancy
              </span>
              <span className="text-[#6B7280]">
                {lead.occupancyRange || "---"}
              </span>
            </div>
            <div>
              <span className="text-[#9CA3AF] block text-xs mb-0.5">Units</span>
              <span className="text-[#6B7280]">
                {lead.totalUnits || "---"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[#9CA3AF] block text-xs mb-0.5">
                Biggest Issue
              </span>
              <span className="text-[#6B7280]">
                {lead.biggestIssue || "---"}
              </span>
            </div>
          </div>

          {/* Access Code */}
          {lead.accessCode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9CA3AF]">Access Code:</span>
              <code className="bg-black/[0.04] px-2 py-1 rounded text-xs text-[#111827] font-mono">
                {lead.accessCode}
              </code>
              <button
                onClick={copyAccessCode}
                className="p-1 rounded hover:bg-black/[0.04] transition-colors"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-[#9CA3AF]" />
                )}
              </button>
            </div>
          )}

          {/* PMS Indicator */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#9CA3AF]">PMS Upload:</span>
            <span
              className={
                lead.pmsUploaded ? "text-emerald-400" : "text-[#9CA3AF]"
              }
            >
              {lead.pmsUploaded ? "Uploaded" : "Not uploaded"}
            </span>
          </div>
        </div>

        {/* Right Column - Actions */}
        <div className="space-y-4">
          {/* Status Change */}
          <div>
            <label className="text-xs text-[#9CA3AF] block mb-1">Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full bg-[#F3F4F6] border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-blue-500/50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="text-xs text-[#9CA3AF] block mb-1">
              Follow-up Date
            </label>
            <input
              type="date"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className="w-full bg-[#F3F4F6] border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[#111827] focus:outline-none focus:border-blue-500/50 [color-scheme:dark]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[#9CA3AF] block mb-1">
              Add Note
            </label>
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Type a note..."
              rows={2}
              className="w-full bg-[#F3F4F6] border border-black/[0.08] rounded-lg px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500/50 resize-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Existing Notes */}
      {lead.notes.length > 0 && (
        <div className="mt-4 pt-4 border-t border-black/[0.08]">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span className="text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
              Notes ({lead.notes.length})
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {lead.notes.map((n, i) => (
              <div
                key={i}
                className="text-sm text-[#6B7280] bg-black/[0.02] rounded-lg px-3 py-2"
              >
                <span>{n.text}</span>
                <span className="text-[#9CA3AF] text-xs ml-2">
                  {timeAgo(n.at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */

export default function AdminPipelinePage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("newest");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const leadsParams = useMemo(
    () => ({
      page: String(page),
      limit: "50",
      status: statusFilter,
      search,
      sort,
    }),
    [page, statusFilter, search, sort]
  );

  const {
    data: leadsData,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useAdminFetch<LeadsResponse>("/api/admin-leads", leadsParams);

  const {
    data: analytics,
    loading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useAdminFetch<AnalyticsResponse>("/api/lead-analytics");

  const leads = leadsData?.leads || [];
  const pagination = leadsData?.pagination;
  const auditCount = leadsData?.auditCount || 0;

  // Compute overdue count from current page
  const overdueCount = useMemo(
    () => leads.filter(isOverdue).length,
    [leads]
  );

  const activePipeline = useMemo(() => {
    if (!analytics?.funnel) return 0;
    const { client_signed, lost, ...active } = analytics.funnel;
    return Object.values(active).reduce((a, b) => a + b, 0);
  }, [analytics]);

  function handleRefresh() {
    refetchLeads();
    refetchAnalytics();
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === leads.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(leads.map((l) => l.id)));
    }
  }

  async function handleBulkAction() {
    if (!bulkStatus || selectedIds.size === 0) return;
    setBulkSaving(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          adminFetch("/api/admin-leads", {
            method: "PATCH",
            body: JSON.stringify({ id, status: bulkStatus }),
          })
        )
      );
      setSelectedIds(new Set());
      setBulkStatus("");
      refetchLeads();
      refetchAnalytics();
    } catch {
      /* individual failures are acceptable */
    } finally {
      setBulkSaving(false);
    }
  }

  async function handleExportCsv() {
    const key = localStorage.getItem("stowstack_admin_key") || "";
    const res = await fetch("/api/export-leads", {
      headers: { "X-Admin-Key": key },
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stowstack-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827]">
      {/* Header */}
      <div className="border-b border-black/[0.08] bg-[#F9FAFB]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Lead Pipeline</h1>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Manage and track incoming leads
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/kanban"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-black/[0.08] rounded-lg hover:bg-black/[0.03] transition-colors"
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Kanban</span>
            </Link>
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-black/[0.08] rounded-lg hover:bg-black/[0.03] transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#6B7280] hover:text-[#111827] border border-black/[0.08] rounded-lg hover:bg-black/[0.03] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* KPI Stats */}
        {analyticsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <StatSkeleton key={i} />
            ))}
          </div>
        ) : analyticsError ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center justify-between">
            <span className="text-sm text-red-400">
              Failed to load analytics
            </span>
            <button
              onClick={refetchAnalytics}
              className="text-xs text-red-400 underline"
            >
              Retry
            </button>
          </div>
        ) : analytics ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard
              icon={Users}
              label="Total Leads"
              value={analytics.totalLeads}
            />
            <StatCard
              icon={TrendingUp}
              label="Active Pipeline"
              value={activePipeline}
            />
            <StatCard
              icon={CheckCircle2}
              label="Signed Clients"
              value={analytics.funnel.client_signed || 0}
            />
            <StatCard
              icon={FileText}
              label="Audits"
              value={auditCount}
            />
            <StatCard
              icon={Percent}
              label="Conversion"
              value={`${analytics.conversionRate}%`}
              subtitle={`${analytics.lostRate}% lost`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Overdue"
              value={overdueCount}
            />
          </div>
        ) : null}

        {/* Conversion Funnel */}
        {analytics?.funnel && <ConversionFunnel funnel={analytics.funnel} />}

        {/* Filter Bar */}
        <div className="space-y-3">
          {/* Status chips */}
          <div className="flex flex-wrap gap-2">
            {FILTER_CHIPS.map((chip) => {
              const isAll = chip === "All";
              const active = isAll ? !statusFilter : statusFilter === chip;
              return (
                <button
                  key={chip}
                  onClick={() => {
                    setStatusFilter(isAll ? "" : chip);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    active
                      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                      : "bg-transparent text-[#9CA3AF] border-black/[0.08] hover:border-black/[0.12] hover:text-[#6B7280]"
                  }`}
                >
                  {isAll ? "All" : STATUS_LABELS[chip] || chip}
                </button>
              );
            })}
          </div>

          {/* Search & Sort */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, facility, location, email..."
                className="w-full bg-white border border-black/[0.08] rounded-lg pl-9 pr-4 py-2.5 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="bg-white border border-black/[0.08] rounded-lg px-3 py-2.5 text-sm text-[#6B7280] focus:outline-none focus:border-blue-500/50"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-lg px-4 py-3">
            <span className="text-sm text-blue-400">
              {selectedIds.size} selected
            </span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="bg-[#F3F4F6] border border-black/[0.08] rounded-lg px-3 py-1.5 text-sm text-[#111827] focus:outline-none focus:border-blue-500/50"
            >
              <option value="">Change status to...</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              onClick={handleBulkAction}
              disabled={!bulkStatus || bulkSaving}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg px-4 py-1.5 transition-colors"
            >
              {bulkSaving ? "Applying..." : "Apply"}
            </button>
          </div>
        )}

        {/* Lead List */}
        <div className="rounded-xl border border-black/[0.08] bg-white overflow-hidden">
          {/* Table Header */}
          <div className="hidden sm:flex items-center gap-4 px-4 py-3 border-b border-black/[0.08] text-xs font-medium text-[#9CA3AF] uppercase tracking-wider">
            <div className="w-5">
              <input
                type="checkbox"
                checked={leads.length > 0 && selectedIds.size === leads.length}
                onChange={toggleSelectAll}
                className="rounded border-white/20 bg-transparent accent-blue-500"
              />
            </div>
            <div className="w-5" />
            <div className="flex-1">Name / Facility</div>
            <div className="w-36">Location</div>
            <div className="w-28">Status</div>
            <div className="w-12 text-center">Score</div>
            <div className="w-20 text-right">Created</div>
          </div>

          {leadsLoading ? (
            <div>
              {Array.from({ length: 8 }).map((_, i) => (
                <LeadRowSkeleton key={i} />
              ))}
            </div>
          ) : leadsError ? (
            <div className="p-12 text-center">
              <p className="text-sm text-red-400 mb-3">
                Failed to load leads
              </p>
              <button
                onClick={refetchLeads}
                className="text-sm text-blue-400 underline"
              >
                Retry
              </button>
            </div>
          ) : leads.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-sm text-[#6B7280]">No leads found</p>
              <p className="text-xs text-[#9CA3AF] mt-1">
                {search
                  ? "Try adjusting your search or filters"
                  : "New leads will appear here when submitted"}
              </p>
            </div>
          ) : (
            <div>
              {leads.map((lead) => {
                const expanded = expandedId === lead.id;
                const selected = selectedIds.has(lead.id);
                const grade = leadScoreGrade(lead);
                const overdue = isOverdue(lead);

                return (
                  <div key={lead.id}>
                    {/* Row */}
                    <div
                      className={`flex items-center gap-4 px-4 py-3 border-b border-black/[0.08] hover:bg-black/[0.03] transition-colors cursor-pointer ${
                        expanded ? "bg-black/[0.02]" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className="w-5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(lead.id)}
                          className="rounded border-white/20 bg-transparent accent-blue-500"
                        />
                      </div>

                      {/* Expand toggle */}
                      <button
                        onClick={() =>
                          setExpandedId(expanded ? null : lead.id)
                        }
                        className="w-5 shrink-0 text-[#9CA3AF] hover:text-[#6B7280]"
                      >
                        {expanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Name / Facility */}
                      <div
                        className="flex-1 min-w-0"
                        onClick={() =>
                          setExpandedId(expanded ? null : lead.id)
                        }
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[#111827] truncate">
                            {lead.name || "Unnamed"}
                          </span>
                          {overdue && (
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                          )}
                        </div>
                        <span className="text-xs text-[#9CA3AF] truncate block">
                          {lead.facilityName || "---"}
                        </span>
                      </div>

                      {/* Location (hidden on mobile) */}
                      <div className="hidden sm:flex items-center gap-1 w-36 shrink-0">
                        <MapPin className="w-3 h-3 text-[#9CA3AF] shrink-0" />
                        <span className="text-xs text-[#6B7280] truncate">
                          {lead.location || "---"}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="w-28 shrink-0">
                        <StatusBadge status={lead.status} />
                      </div>

                      {/* Score (hidden on mobile) */}
                      <div className="hidden sm:block w-12 text-center shrink-0">
                        <span
                          className={`text-sm font-bold ${grade.color}`}
                        >
                          {grade.grade}
                        </span>
                      </div>

                      {/* Created (hidden on mobile) */}
                      <div className="hidden sm:flex items-center gap-1 w-20 shrink-0 justify-end">
                        <Clock className="w-3 h-3 text-[#9CA3AF]" />
                        <span className="text-xs text-[#9CA3AF]">
                          {timeAgo(lead.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Expanded */}
                    {expanded && (
                      <LeadExpandedRow
                        lead={lead}
                        onUpdate={() => {
                          refetchLeads();
                          refetchAnalytics();
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#9CA3AF]">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total}{" "}
              leads)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1.5 text-sm border border-black/[0.08] rounded-lg text-[#6B7280] hover:bg-black/[0.03] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
                disabled={page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm border border-black/[0.08] rounded-lg text-[#6B7280] hover:bg-black/[0.03] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
