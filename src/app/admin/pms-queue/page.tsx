"use client";

import { useState } from "react";
import {
  Loader2,
  FileSpreadsheet,
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Filter,
  Inbox,
  ExternalLink,
} from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";

/* ── types ── */

interface QueueReport {
  id: string;
  facility_id: string;
  facility_name: string | null;
  email: string | null;
  report_type: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  status: string;
  notes: string | null;
  processed_at: string | null;
  processed_by: string | null;
  uploaded_at: string | null;
}

/* ── helpers ── */

function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isCSV(mime: string | null, name: string | null) {
  return mime === "text/csv" || name?.toLowerCase().endsWith(".csv");
}

const STATUS_OPTIONS = ["all", "uploaded", "processing", "processed", "error"] as const;

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    uploaded: "bg-[var(--color-light-gray)] text-[var(--color-body-text)]",
    processing: "bg-[var(--color-gold-light)] text-[var(--color-gold)]",
    processed: "bg-[var(--color-green)]/10 text-[var(--color-green)]",
    error: "bg-[var(--color-red)]/10 text-[var(--color-red)]",
  };
  const icons: Record<string, React.ReactNode> = {
    uploaded: <Clock className="h-3 w-3" />,
    processing: <Loader2 className="h-3 w-3 animate-spin" />,
    processed: <CheckCircle2 className="h-3 w-3" />,
    error: <AlertTriangle className="h-3 w-3" />,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
        styles[status] ?? styles.uploaded
      }`}
    >
      {icons[status]}
      {status}
    </span>
  );
}

/* ── page ── */

export default function PmsQueuePage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (statusFilter !== "all") params.status = statusFilter;

  const { data, loading, error, refetch } = useAdminFetch<{ reports: QueueReport[] }>(
    "/api/admin-pms-queue",
    params,
  );

  const reports = (data?.reports ?? []).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.facility_name?.toLowerCase().includes(q) ||
      r.file_name?.toLowerCase().includes(q) ||
      r.email?.toLowerCase().includes(q)
    );
  });

  const updateStatus = async (id: string, status: string, notes?: string) => {
    setUpdating(id);
    try {
      await adminFetch("/api/admin-pms-queue", {
        method: "PATCH",
        body: JSON.stringify({ id, status, notes, processed_by: "admin" }),
      });
      refetch();
    } catch (err) {
      console.error("Failed to update:", err);
    } finally {
      setUpdating(null);
    }
  };

  const pendingCount = (data?.reports ?? []).filter(
    (r) => r.status === "uploaded"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--color-dark)] flex items-center gap-2">
            <Inbox className="h-5 w-5 text-[var(--color-gold)]" />
            PMS Upload Queue
          </h1>
          <p className="text-sm text-[var(--color-mid-gray)]">
            Client-uploaded PMS reports across all facilities
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-[var(--color-gold-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-gold)]">
                {pendingCount} pending
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--color-mid-gray)]" />
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-1">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition capitalize ${
                  statusFilter === s
                    ? "bg-[var(--color-gold)]/10 text-[var(--color-gold)]"
                    : "text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <input
          type="text"
          placeholder="Search facility, file, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 sm:max-w-xs"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[var(--color-gold)]" />
          <span className="ml-3 text-sm text-[var(--color-body-text)]">
            Loading queue...
          </span>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <AlertTriangle className="mx-auto mb-2 h-6 w-6 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={refetch}
            className="mt-3 rounded-lg bg-[var(--color-gold)] px-4 py-2 text-sm text-[var(--color-light)] hover:bg-[var(--color-gold-hover)]"
          >
            Retry
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-12 text-center">
          <Inbox className="mx-auto mb-3 h-10 w-10 text-[var(--color-mid-gray)]" />
          <p className="text-sm text-[var(--color-body-text)]">
            {statusFilter === "all"
              ? "No PMS reports have been uploaded yet."
              : `No reports with status "${statusFilter}".`}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-[var(--color-mid-gray)]">
                <th className="px-5 py-3 font-medium">Facility</th>
                <th className="px-4 py-3 font-medium">File</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--color-light-gray)]/20"
                >
                  <td className="px-5 py-3">
                    <a
                      href={`/admin/facilities?id=${r.facility_id}&tab=pms`}
                      className="text-sm font-medium text-[var(--color-dark)] hover:text-[var(--color-gold)] transition flex items-center gap-1"
                    >
                      {r.facility_name ?? "Unknown"}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </a>
                    {r.email && (
                      <p className="text-xs text-[var(--color-mid-gray)]">{r.email}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {isCSV(r.mime_type, r.file_name) ? (
                        <FileSpreadsheet className="h-4 w-4 text-[var(--color-green)] shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-[var(--color-blue)] shrink-0" />
                      )}
                      <span className="truncate max-w-[180px] text-[var(--color-dark)]">
                        {r.file_name ?? "report"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-body-text)]">
                    {fmtSize(r.file_size)}
                  </td>
                  <td className="px-4 py-3 text-[var(--color-body-text)]">
                    {fmtDate(r.uploaded_at)}
                  </td>
                  <td className="px-4 py-3">{statusBadge(r.status)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.file_url && (
                        <a
                          href={r.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[var(--color-mid-gray)] hover:text-[var(--color-dark)] transition"
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      {r.status === "uploaded" && (
                        <button
                          onClick={() => updateStatus(r.id, "processed")}
                          disabled={updating === r.id}
                          className="rounded-md border border-[var(--color-green)]/30 px-2.5 py-1 text-xs font-medium text-[var(--color-green)] hover:bg-[var(--color-green)]/10 transition disabled:opacity-50"
                        >
                          {updating === r.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Mark Done"
                          )}
                        </button>
                      )}
                      {r.status === "uploaded" && (
                        <a
                          href={`/admin/facilities?id=${r.facility_id}&tab=pms`}
                          className="rounded-md border border-[var(--color-gold)]/30 px-2.5 py-1 text-xs font-medium text-[var(--color-gold)] hover:bg-[var(--color-gold)]/10 transition"
                        >
                          Process
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
