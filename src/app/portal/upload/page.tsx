"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Clock,
  X,
} from "lucide-react";
import { usePortal } from "@/components/portal/portal-shell";
import { ErrorState } from "@/lib/portal-helpers";

/* ─── types ─── */

interface UploadRecord {
  id: string;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  mime_type: string | null;
  report_type: string | null;
  status: string;
  notes: string | null;
  uploaded_at: string | null;
  processed_at: string | null;
}

type FileUploadState = "pending" | "uploading" | "done" | "error";

interface QueuedFile {
  file: File;
  state: FileUploadState;
  error?: string;
}

const ACCEPT = ".csv,.pdf,.xlsx,.xls";
const ACCEPT_TYPES = [
  "text/csv",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];
const MAX_SIZE = 25 * 1024 * 1024;

/* ─── helpers ─── */

function fileIcon(mime: string | null) {
  if (mime === "text/csv" || mime?.includes("spreadsheet") || mime?.includes("excel")) {
    return <FileSpreadsheet className="h-5 w-5 text-[var(--color-green)]" />;
  }
  return <FileText className="h-5 w-5 text-[var(--color-blue)]" />;
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    uploaded:
      "bg-[var(--color-light-gray)] text-[var(--color-body-text)]",
    processing:
      "bg-[var(--color-gold-light)] text-[var(--color-gold)]",
    processed:
      "bg-[var(--color-green)]/10 text-[var(--color-green)]",
    error:
      "bg-[var(--color-red)]/10 text-[var(--color-red)]",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize ${
        styles[status] ?? styles.uploaded
      }`}
    >
      {status === "processing" && <Loader2 className="h-3 w-3 animate-spin" />}
      {status === "processed" && <CheckCircle2 className="h-3 w-3" />}
      {status === "error" && <AlertTriangle className="h-3 w-3" />}
      {status === "uploaded" && <Clock className="h-3 w-3" />}
      {status}
    </span>
  );
}

/* ─── page ─── */

export default function UploadPage() {
  const { authFetch, client } = usePortal();
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── fetch history ── */

  const fetchHistory = useCallback(async () => {
    try {
      const res = await authFetch("/api/portal-upload");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setHistory(json.reports ?? []);
    } catch {
      setError("Unable to load upload history.");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  /* ── file selection ── */

  const addFiles = (files: FileList | File[]) => {
    const newFiles: QueuedFile[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE) {
        newFiles.push({ file, state: "error", error: "File too large (25MB max)" });
        continue;
      }
      if (!ACCEPT_TYPES.includes(file.type)) {
        newFiles.push({ file, state: "error", error: "Unsupported file type" });
        continue;
      }
      newFiles.push({ file, state: "pending" });
    }
    setQueue((prev) => [...prev, ...newFiles]);
  };

  const removeFromQueue = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index));
  };

  /* ── upload ── */

  const uploadAll = async () => {
    setUploading(true);
    const pending = queue.filter((q) => q.state === "pending");

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].state !== "pending") continue;

      setQueue((prev) =>
        prev.map((q, j) => (j === i ? { ...q, state: "uploading" } : q))
      );

      try {
        const formData = new FormData();
        formData.append("file", queue[i].file);

        const ext = queue[i].file.name.split(".").pop()?.toLowerCase();
        const reportType =
          ext === "csv" ? "csv" : ext === "pdf" ? "pdf" : "excel";
        formData.append("reportType", reportType);

        const res = await authFetch("/api/portal-upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error || `Upload failed (${res.status})`);
        }

        setQueue((prev) =>
          prev.map((q, j) => (j === i ? { ...q, state: "done" } : q))
        );
      } catch (err) {
        setQueue((prev) =>
          prev.map((q, j) =>
            j === i
              ? { ...q, state: "error", error: err instanceof Error ? err.message : "Upload failed" }
              : q
          )
        );
      }
    }

    setUploading(false);
    fetchHistory();
  };

  const pendingCount = queue.filter((q) => q.state === "pending").length;
  const doneCount = queue.filter((q) => q.state === "done").length;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-dark)]">
          Upload PMS Reports
        </h2>
        <p className="text-sm text-[var(--color-mid-gray)]">
          Upload your facility management reports and our team will process them for{" "}
          {client.facilityName}
        </p>
      </div>

      {/* Drop zone */}
      <div
        className={`relative rounded-xl border-2 border-dashed p-10 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-[var(--color-gold)] bg-[var(--color-gold-light)]"
            : "border-[var(--color-light-gray)] hover:border-[var(--color-gold)]/40 bg-[var(--bg-elevated)]"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(false);
          if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="mx-auto mb-3 h-10 w-10 text-[var(--color-mid-gray)]" />
        <p className="text-sm font-medium text-[var(--color-dark)]">
          Drag and drop your reports here
        </p>
        <p className="mt-1 text-xs text-[var(--color-mid-gray)]">
          or click to browse — CSV, PDF, Excel (.xlsx, .xls) up to 25MB
        </p>
      </div>

      {/* File queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Files ({queue.length})
            </h3>
            {doneCount === queue.length && queue.length > 0 && (
              <button
                type="button"
                onClick={() => setQueue([])}
                className="text-xs text-[var(--color-mid-gray)] hover:text-[var(--color-dark)]"
              >
                Clear all
              </button>
            )}
          </div>

          <div className="divide-y divide-[var(--border-subtle)] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
            {queue.map((q, i) => (
              <div
                key={`${q.file.name}-${i}`}
                className="flex items-center gap-3 px-4 py-3"
              >
                {fileIcon(q.file.type)}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-[var(--color-dark)]">
                    {q.file.name}
                  </p>
                  <p className="text-xs text-[var(--color-mid-gray)]">
                    {formatSize(q.file.size)}
                    {q.error && (
                      <span className="ml-2 text-[var(--color-red)]">{q.error}</span>
                    )}
                  </p>
                </div>
                {q.state === "uploading" && (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--color-gold)]" />
                )}
                {q.state === "done" && (
                  <CheckCircle2 className="h-4 w-4 text-[var(--color-green)]" />
                )}
                {q.state === "error" && (
                  <AlertTriangle className="h-4 w-4 text-[var(--color-red)]" />
                )}
                {(q.state === "pending" || q.state === "error") && !uploading && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(i);
                    }}
                    className="p-1 text-[var(--color-mid-gray)] hover:text-[var(--color-dark)]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Upload button */}
          {pendingCount > 0 && (
            <button
              type="button"
              onClick={uploadAll}
              disabled={uploading}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-gold)] px-6 py-2.5 text-sm font-medium text-[var(--color-light)] transition-colors hover:bg-[var(--color-gold-hover)] disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Upload {pendingCount} {pendingCount === 1 ? "File" : "Files"}
                </>
              )}
            </button>
          )}

          {/* Success message */}
          {!uploading && doneCount > 0 && pendingCount === 0 && (
            <div className="rounded-xl border border-[var(--color-green)]/20 bg-[var(--color-green)]/5 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[var(--color-green)]" />
                <div>
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {doneCount} {doneCount === 1 ? "report" : "reports"} uploaded successfully
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-body-text)]">
                    Our team will review and process your reports. You can track the status below.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Upload History */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-dark)]">
          Upload History
        </h3>

        {error && <ErrorState message={error} onRetry={fetchHistory} />}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-xl bg-[var(--color-light-gray)]/50"
              />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-8 text-center">
            <FileText className="mx-auto mb-3 h-8 w-8 text-[var(--color-mid-gray)]" />
            <p className="text-sm text-[var(--color-body-text)]">
              No reports uploaded yet. Upload your first PMS report above.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] md:block">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--color-mid-gray)]">
                    <th className="px-5 py-3 font-medium">File</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 font-medium">Uploaded</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--color-light-gray)]/20"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {fileIcon(r.mime_type)}
                          <span className="font-medium text-[var(--color-dark)] truncate max-w-[200px]">
                            {r.file_name ?? "report"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-[var(--color-body-text)]">
                        {r.report_type ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-body-text)]">
                        {formatSize(r.file_size)}
                      </td>
                      <td className="px-4 py-3 text-[var(--color-body-text)]">
                        {formatDate(r.uploaded_at)}
                      </td>
                      <td className="px-4 py-3">{statusBadge(r.status)}</td>
                      <td className="px-4 py-3 text-xs text-[var(--color-body-text)] max-w-[200px] truncate">
                        {r.notes ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {history.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4"
                >
                  <div className="flex items-start gap-3">
                    {fileIcon(r.mime_type)}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-[var(--color-dark)]">
                        {r.file_name ?? "report"}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-mid-gray)]">
                        <span>{formatSize(r.file_size)}</span>
                        <span>&middot;</span>
                        <span>{formatDate(r.uploaded_at)}</span>
                      </div>
                      {r.notes && (
                        <p className="mt-2 text-xs text-[var(--color-body-text)]">
                          {r.notes}
                        </p>
                      )}
                    </div>
                    {statusBadge(r.status)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
