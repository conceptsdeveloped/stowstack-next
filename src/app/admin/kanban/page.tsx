"use client";

import { useState, useRef, useMemo } from "react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import {
  MapPin,
  Clock,
  RefreshCw,
  LayoutDashboard,
  GripVertical,
} from "lucide-react";
import Link from "next/link";

/* ─── Types ────────────────────────────────────────────────────── */

interface Lead {
  id: string;
  name: string;
  facilityName: string;
  location: string;
  status: string;
  createdAt: string;
}

interface LeadsResponse {
  leads: Lead[];
  pagination: { total: number };
}

/* ─── Constants ────────────────────────────────────────────────── */

const COLUMNS = [
  "diagnostic_submitted",
  "submitted",
  "audit_generated",
  "audit_sent",
  "form_sent",
  "form_completed",
  "call_scheduled",
  "client_signed",
  "lost",
] as const;

const COLUMN_LABELS: Record<string, string> = {
  diagnostic_submitted: "Diagnostic",
  submitted: "Submitted",
  audit_generated: "Audit Ready",
  audit_sent: "Audit Sent",
  form_sent: "Proposal Sent",
  form_completed: "Form Done",
  call_scheduled: "Call Booked",
  client_signed: "Signed",
  lost: "Lost",
};

const COLUMN_HEADER_COLORS: Record<string, string> = {
  diagnostic_submitted: "bg-indigo-500/20 text-indigo-400",
  submitted: "bg-blue-500/20 text-blue-400",
  audit_generated: "bg-cyan-500/20 text-cyan-400",
  audit_sent: "bg-teal-500/20 text-teal-400",
  form_sent: "bg-amber-500/20 text-amber-400",
  form_completed: "bg-purple-500/20 text-purple-400",
  call_scheduled: "bg-orange-500/20 text-orange-400",
  client_signed: "bg-emerald-500/20 text-emerald-400",
  lost: "bg-red-500/20 text-red-400",
};

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

/* ─── Skeleton ─────────────────────────────────────────────────── */

function ColumnSkeleton() {
  return (
    <div className="flex-shrink-0 w-72 bg-[#111] rounded-xl border border-white/[0.06] overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <div className="h-4 w-28 rounded bg-white/10" />
      </div>
      <div className="p-3 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg bg-white/[0.04] p-3 space-y-2">
            <div className="h-4 w-32 rounded bg-white/10" />
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-3 w-20 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Kanban Card ──────────────────────────────────────────────── */

function KanbanCard({
  lead,
  onDragStart,
}: {
  lead: Lead;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="group rounded-lg bg-[#0A0A0A] border border-white/[0.06] p-3 cursor-grab active:cursor-grabbing hover:border-white/[0.12] transition-all active:opacity-60"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#F5F5F7] truncate">
            {lead.name || "Unnamed"}
          </p>
          {lead.facilityName && (
            <p className="text-xs text-[#6E6E73] truncate mt-0.5">
              {lead.facilityName}
            </p>
          )}
        </div>
        <GripVertical className="w-4 h-4 text-[#6E6E73] opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
      </div>

      <div className="mt-2 flex items-center justify-between">
        {lead.location ? (
          <div className="flex items-center gap-1 min-w-0">
            <MapPin className="w-3 h-3 text-[#6E6E73] shrink-0" />
            <span className="text-xs text-[#6E6E73] truncate">
              {lead.location}
            </span>
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          <Clock className="w-3 h-3 text-[#6E6E73]" />
          <span className="text-[10px] text-[#6E6E73]">
            {timeAgo(lead.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Kanban Column ────────────────────────────────────────────── */

function KanbanColumn({
  status,
  leads,
  onDragStart,
  onDrop,
  dragOverStatus,
  onDragOver,
  onDragLeave,
}: {
  status: string;
  leads: Lead[];
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, status: string) => void;
  dragOverStatus: string | null;
  onDragOver: (e: React.DragEvent, status: string) => void;
  onDragLeave: () => void;
}) {
  const isOver = dragOverStatus === status;
  const headerColor = COLUMN_HEADER_COLORS[status] || "bg-white/10 text-[#A1A1A6]";

  return (
    <div
      className={`flex-shrink-0 w-72 rounded-xl border overflow-hidden flex flex-col max-h-[calc(100vh-180px)] transition-colors ${
        isOver
          ? "border-blue-500/40 bg-blue-500/5"
          : "border-white/[0.06] bg-[#111]"
      }`}
      onDragOver={(e) => onDragOver(e, status)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, status)}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between shrink-0">
        <span className="text-sm font-semibold text-[#F5F5F7]">
          {COLUMN_LABELS[status]}
        </span>
        <span
          className={`text-xs font-medium px-2 py-0.5 rounded-full ${headerColor}`}
        >
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {leads.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-[#6E6E73]">No leads</p>
          </div>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */

export default function AdminKanbanPage() {
  const {
    data,
    loading,
    error,
    refetch,
  } = useAdminFetch<LeadsResponse>("/api/admin-leads", { limit: "500" });

  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const draggedIdRef = useRef<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<string, string>
  >({});

  const leads = data?.leads || [];

  const columnData = useMemo(() => {
    const columns: Record<string, Lead[]> = {};
    for (const col of COLUMNS) {
      columns[col] = [];
    }
    for (const lead of leads) {
      const effectiveStatus = optimisticUpdates[lead.id] || lead.status;
      if (columns[effectiveStatus]) {
        columns[effectiveStatus].push({ ...lead, status: effectiveStatus });
      } else {
        columns.submitted.push(lead);
      }
    }
    return columns;
  }, [leads, optimisticUpdates]);

  function handleDragStart(e: React.DragEvent, id: string) {
    draggedIdRef.current = id;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  }

  function handleDragOver(e: React.DragEvent, status: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }

  function handleDragLeave() {
    setDragOverStatus(null);
  }

  async function handleDrop(e: React.DragEvent, targetStatus: string) {
    e.preventDefault();
    setDragOverStatus(null);

    const id = draggedIdRef.current;
    if (!id) return;
    draggedIdRef.current = null;

    const lead = leads.find((l) => l.id === id);
    const currentStatus = optimisticUpdates[id] || lead?.status;
    if (!lead || currentStatus === targetStatus) return;

    // Optimistic update
    setOptimisticUpdates((prev) => ({ ...prev, [id]: targetStatus }));

    try {
      await adminFetch("/api/admin-leads", {
        method: "PATCH",
        body: JSON.stringify({ id, status: targetStatus }),
      });
      // Clear optimistic update and refetch for fresh data
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      refetch();
    } catch {
      // Revert optimistic update on failure
      setOptimisticUpdates((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F7]">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0A0A0A]/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Kanban Board</h1>
            <p className="text-xs text-[#6E6E73] mt-0.5">
              Drag leads between stages to update status
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#A1A1A6] hover:text-[#F5F5F7] border border-white/[0.06] rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Pipeline</span>
            </Link>
            <button
              onClick={refetch}
              className="flex items-center gap-2 px-3 py-2 text-sm text-[#A1A1A6] hover:text-[#F5F5F7] border border-white/[0.06] rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <ColumnSkeleton key={col} />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-12 text-center max-w-md mx-auto">
            <p className="text-sm text-red-400 mb-3">Failed to load leads</p>
            <button
              onClick={refetch}
              className="text-sm text-blue-400 underline"
            >
              Retry
            </button>
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-[#111] p-12 text-center max-w-md mx-auto">
            <p className="text-sm text-[#A1A1A6]">No leads in pipeline</p>
            <p className="text-xs text-[#6E6E73] mt-1">
              New leads will appear here when submitted
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col}
                status={col}
                leads={columnData[col]}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                dragOverStatus={dragOverStatus}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
