"use client";

import { useState, useCallback, useRef } from "react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import {
  FileSearch,
  Copy,
  Check,
  ExternalLink,
  Clock,
  Eye,
  RotateCw,
  Ban,
  Upload,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  Trash2,
  Send,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SharedAudit {
  id: string;
  facility_name: string;
  slug: string;
  view_count: number;
  created_at: string;
  expires_at: string | null;
  revoked: boolean;
}

interface DiagnosticRow {
  timestamp: string;
  email: string;
  facilityName: string;
  facilityAddress: string;
  contactName: string;
  occupancy: string;
  totalUnits: string;
  leasingMomentum: string;
  role: string;
  raw: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/*  CSV Parsing                                                        */
/* ------------------------------------------------------------------ */

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseCSV(csvText: string): { headers: string[]; rows: DiagnosticRow[] } {
  const lines = csvText.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0]);
  const rows: DiagnosticRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const raw: Record<string, string> = {};
    headers.forEach((h, idx) => {
      raw[h.trim()] = (fields[idx] || "").trim();
    });

    rows.push({
      timestamp: raw["Timestamp"] || "",
      email: raw["Email Address"] || raw["Best email address"] || "",
      facilityName: raw["Facility name"] || "",
      facilityAddress: raw["Facility address (city, state, zip)"] || "",
      contactName: raw["Best contact name"] || "",
      occupancy: raw["About where is your facility sitting today (overall occupancy)?"] || "",
      totalUnits: raw["What is your total unit count (approximately)?"] || "",
      leasingMomentum: raw["How would you describe the facility's leasing momentum right now?"] || "",
      role: raw["What is your role?"] || "",
      raw,
    });
  }

  return { headers, rows };
}

/* ------------------------------------------------------------------ */
/*  Sub-Components                                                     */
/* ------------------------------------------------------------------ */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-black/5 transition-colors" title="Copy link">
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} className="text-[#9CA3AF]" />}
    </button>
  );
}

function StatusBadge({ status }: { status: "idle" | "generating" | "done" | "error" }) {
  switch (status) {
    case "generating":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400">
          <Loader2 size={10} className="animate-spin" /> Generating
        </span>
      );
    case "done":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 size={10} /> Complete
        </span>
      );
    case "error":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-500/15 text-red-400">
          <AlertCircle size={10} /> Failed
        </span>
      );
    default:
      return null;
  }
}

function DiagnosticDetail({ row }: { row: DiagnosticRow }) {
  const [expanded, setExpanded] = useState(false);
  const keys = Object.keys(row.raw).filter(
    (k) => k !== "Timestamp" && k !== "Email Address" && row.raw[k]
  );

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
      >
        {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {expanded ? "Hide" : "View"} all {keys.length} responses
      </button>
      {expanded && (
        <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto pr-2">
          {keys.map((key) => (
            <div key={key} className="text-xs">
              <p className="text-[#9CA3AF] leading-snug">{key}</p>
              <p className="text-[#6B7280] leading-snug mt-0.5">{row.raw[key]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function AuditsPage() {
  const { data: rawData, loading, error, refetch } = useAdminFetch<{ audits: SharedAudit[] }>("/api/shared-audits");
  const audits = rawData?.audits ?? [];
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Diagnostic state
  const [csvText, setCsvText] = useState("");
  const [diagnosticRows, setDiagnosticRows] = useState<DiagnosticRow[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [genStatus, setGenStatus] = useState<Record<number, "idle" | "generating" | "done" | "error">>({});
  const [genResults, setGenResults] = useState<Record<number, { slug: string; auditUrl: string; overallScore: number; overallGrade: string }>>({});
  const [genErrors, setGenErrors] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CSV Upload / Paste
  const handleCSVLoad = useCallback((text: string) => {
    setCsvText(text);
    const { headers, rows } = parseCSV(text);
    setCsvHeaders(headers);
    setDiagnosticRows(rows);
    setSelectedRow(null);
    setGenStatus({});
    setGenResults({});
    setGenErrors({});
  }, []);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) handleCSVLoad(text);
      };
      reader.readAsText(file);
    },
    [handleCSVLoad]
  );

  // Generate audit for a row
  const handleGenerate = useCallback(
    async (rowIdx: number) => {
      setGenStatus((s) => ({ ...s, [rowIdx]: "generating" }));
      setGenErrors((e) => {
        const copy = { ...e };
        delete copy[rowIdx];
        return copy;
      });

      try {
        const result = await adminFetch<{
          slug: string;
          auditUrl: string;
          overallScore: number;
          overallGrade: string;
        }>("/api/audit-generate-diagnostic", {
          method: "POST",
          body: JSON.stringify({
            diagnosticCsv: csvText,
            rowIndex: rowIdx + 1, // +1 because CSV line 0 = headers
          }),
        });

        setGenStatus((s) => ({ ...s, [rowIdx]: "done" }));
        setGenResults((r) => ({
          ...r,
          [rowIdx]: {
            slug: result.slug,
            auditUrl: result.auditUrl,
            overallScore: result.overallScore,
            overallGrade: result.overallGrade,
          },
        }));
        refetch(); // Refresh shared audits table
      } catch (err) {
        setGenStatus((s) => ({ ...s, [rowIdx]: "error" }));
        setGenErrors((e) => ({
          ...e,
          [rowIdx]: err instanceof Error ? err.message : "Generation failed",
        }));
      }
    },
    [csvText, refetch]
  );

  // Shared audit actions
  const handleExtend = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await adminFetch("/api/shared-audits", {
          method: "PATCH",
          body: JSON.stringify({ id, action: "extend" }),
        });
        refetch();
      } catch {
        // handled
      } finally {
        setActionLoading(null);
      }
    },
    [refetch]
  );

  const handleRevoke = useCallback(
    async (id: string) => {
      setActionLoading(id);
      try {
        await adminFetch("/api/shared-audits", {
          method: "PATCH",
          body: JSON.stringify({ id, action: "revoke" }),
        });
        refetch();
      } catch {
        // handled
      } finally {
        setActionLoading(null);
      }
    },
    [refetch]
  );

  const getAuditUrl = (slug: string) => {
    if (typeof window !== "undefined") return `${window.location.origin}/audit/${slug}`;
    return `/audit/${slug}`;
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="space-y-8 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Facility Diagnostics</h1>
        <p className="text-sm mt-1 text-[#9CA3AF]">
          Upload Google Forms responses, generate scored diagnostic audits, and share reports
        </p>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 1: Diagnostic Import                                */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-black/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.08] bg-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Upload size={16} className="text-[var(--accent)]" />
              <h2 className="text-sm font-semibold text-[#111827]">Import Diagnostic Responses</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors"
              >
                Upload CSV
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        </div>

        {diagnosticRows.length === 0 ? (
          <div className="p-8">
            <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center">
              <FileText size={32} className="mx-auto mb-3 text-[#9CA3AF]" />
              <p className="text-sm text-[#6B7280] mb-2">
                Upload a CSV export from Google Forms, or paste CSV text below
              </p>
              <p className="text-xs text-[#9CA3AF] mb-4">
                Download from Google Sheets → File → Download → CSV
              </p>
              <textarea
                placeholder="Paste CSV text here..."
                className="w-full h-32 rounded-lg border border-white/10 bg-[#F9FAFB] text-sm text-[#6B7280] p-3 font-mono resize-none focus:outline-none focus:border-[var(--accent)] transition-colors"
                onPaste={(e) => {
                  const text = e.clipboardData.getData("text");
                  if (text) {
                    e.preventDefault();
                    handleCSVLoad(text);
                  }
                }}
                onChange={(e) => {
                  if (e.target.value.includes(",") && e.target.value.includes("\n")) {
                    handleCSVLoad(e.target.value);
                  }
                }}
                value={csvText ? `${diagnosticRows.length} response(s) loaded` : ""}
                readOnly={diagnosticRows.length > 0}
              />
            </div>
          </div>
        ) : (
          <div>
            {/* Loaded responses */}
            <div className="px-5 py-3 flex items-center justify-between bg-emerald-500/5 border-b border-black/[0.08]">
              <span className="text-xs text-emerald-400 font-medium">
                {diagnosticRows.length} diagnostic response{diagnosticRows.length !== 1 ? "s" : ""} loaded
                ({csvHeaders.length} fields per response)
              </span>
              <button
                onClick={() => {
                  setCsvText("");
                  setDiagnosticRows([]);
                  setCsvHeaders([]);
                  setSelectedRow(null);
                  setGenStatus({});
                  setGenResults({});
                  setGenErrors({});
                }}
                className="text-xs text-[#9CA3AF] hover:text-red-400 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} /> Clear
              </button>
            </div>

            {/* Response cards */}
            <div className="divide-y divide-black/[0.08]">
              {diagnosticRows.map((row, idx) => {
                const status = genStatus[idx] || "idle";
                const result = genResults[idx];
                const genError = genErrors[idx];

                return (
                  <div key={idx} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-sm font-semibold text-[#111827] truncate">
                            {row.facilityName || "Unnamed Facility"}
                          </h3>
                          <StatusBadge status={status} />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-[#9CA3AF]">
                          <span>{row.facilityAddress}</span>
                          <span>{row.contactName} ({row.email})</span>
                          <span>{row.occupancy}</span>
                          <span>{row.totalUnits} units</span>
                          <span>{row.leasingMomentum}</span>
                        </div>

                        {/* Error message */}
                        {genError && (
                          <p className="text-xs text-red-400 mt-2">{genError}</p>
                        )}

                        {/* Result link */}
                        {result && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="text-xs text-emerald-400 font-medium">
                              Score: {result.overallScore}/100 ({result.overallGrade})
                            </span>
                            <a
                              href={getAuditUrl(result.slug)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1"
                            >
                              View Audit <ExternalLink size={10} />
                            </a>
                            <CopyButton text={getAuditUrl(result.slug)} />
                          </div>
                        )}

                        {/* Expandable detail */}
                        <div className="mt-2">
                          <DiagnosticDetail row={row} />
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {status === "idle" && (
                          <button
                            onClick={() => handleGenerate(idx)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors flex items-center gap-1.5"
                          >
                            <Sparkles size={12} />
                            Generate Audit
                          </button>
                        )}
                        {status === "generating" && (
                          <button
                            disabled
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)]/50 text-white/70 flex items-center gap-1.5 cursor-not-allowed"
                          >
                            <Loader2 size={12} className="animate-spin" />
                            Generating...
                          </button>
                        )}
                        {status === "error" && (
                          <button
                            onClick={() => handleGenerate(idx)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors flex items-center gap-1.5"
                          >
                            <RotateCw size={12} />
                            Retry
                          </button>
                        )}
                        {status === "done" && result && (
                          <a
                            href={getAuditUrl(result.slug)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
                          >
                            <ExternalLink size={12} />
                            Open Audit
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Batch generate */}
            {diagnosticRows.length > 1 && (
              <div className="px-5 py-3 border-t border-black/[0.08] bg-[#F9FAFB] flex items-center justify-between">
                <span className="text-xs text-[#9CA3AF]">
                  {Object.values(genStatus).filter((s) => s === "done").length} / {diagnosticRows.length} generated
                </span>
                <button
                  onClick={() => {
                    diagnosticRows.forEach((_, idx) => {
                      if ((genStatus[idx] || "idle") === "idle") {
                        // Stagger requests to avoid overloading
                        setTimeout(() => handleGenerate(idx), idx * 2000);
                      }
                    });
                  }}
                  disabled={Object.values(genStatus).some((s) => s === "generating")}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <Sparkles size={12} />
                  Generate All Remaining
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 2: Shared Audit Links                                */}
      {/* ============================================================ */}
      <div className="rounded-xl border border-black/[0.08] overflow-hidden">
        <div className="px-5 py-4 border-b border-black/[0.08] bg-white">
          <div className="flex items-center gap-2">
            <Send size={16} className="text-[var(--accent)]" />
            <h2 className="text-sm font-semibold text-[#111827]">Shared Audit Links</h2>
            <span className="text-xs text-[#9CA3AF]">
              ({audits.length} total)
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg border p-3 text-sm bg-red-500/10 border-red-500/20 text-red-400">
            Failed to load audits: {error}
          </div>
        )}

        {loading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg animate-pulse bg-white" />
            ))}
          </div>
        ) : audits.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="bg-[#F9FAFB]">
                <th className="text-left text-xs font-medium px-5 py-3 text-[#9CA3AF]">Facility</th>
                <th className="text-left text-xs font-medium px-5 py-3 text-[#9CA3AF]">Link</th>
                <th className="text-center text-xs font-medium px-5 py-3 text-[#9CA3AF]">Views</th>
                <th className="text-left text-xs font-medium px-5 py-3 text-[#9CA3AF]">Created</th>
                <th className="text-left text-xs font-medium px-5 py-3 text-[#9CA3AF]">Expires</th>
                <th className="text-right text-xs font-medium px-5 py-3 text-[#9CA3AF]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {audits.map((audit) => {
                const expired = isExpired(audit.expires_at);
                const url = getAuditUrl(audit.slug);
                const isLoading = actionLoading === audit.id;
                return (
                  <tr
                    key={audit.id}
                    className="border-t border-black/[0.08] transition-colors hover:bg-black/[0.03]"
                    style={{ opacity: audit.revoked ? 0.5 : 1 }}
                  >
                    <td className="px-5 py-3 text-sm text-[#111827]">
                      {audit.facility_name}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono truncate max-w-[200px] text-[var(--accent)]">
                          /audit/{audit.slug}
                        </code>
                        <CopyButton text={url} />
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 rounded hover:bg-black/5 transition-colors"
                        >
                          <ExternalLink size={12} className="text-[#9CA3AF]" />
                        </a>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Eye size={12} className="text-[#9CA3AF]" />
                        <span className="text-sm text-[#6B7280]">{audit.view_count}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#6B7280]">
                      {new Date(audit.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3">
                      {audit.expires_at ? (
                        <div className="flex items-center gap-1">
                          <Clock size={12} className={expired ? "text-red-400" : "text-[#9CA3AF]"} />
                          <span className={`text-sm ${expired ? "text-red-400" : "text-[#6B7280]"}`}>
                            {new Date(audit.expires_at).toLocaleDateString()}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[#9CA3AF]">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!audit.revoked && (
                          <>
                            <button
                              onClick={() => handleExtend(audit.id)}
                              disabled={isLoading}
                              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50"
                              title="Extend +30 days"
                            >
                              <RotateCw size={14} className="text-[var(--accent)]" />
                            </button>
                            <button
                              onClick={() => handleRevoke(audit.id)}
                              disabled={isLoading}
                              className="p-1.5 rounded-lg hover:bg-black/5 transition-colors disabled:opacity-50"
                              title="Revoke"
                            >
                              <Ban size={14} className="text-red-400" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-12">
            <FileSearch size={32} className="mx-auto mb-3 text-[#9CA3AF]" />
            <p className="text-sm text-[#9CA3AF]">No shared audit links yet</p>
            <p className="text-xs text-[#9CA3AF] mt-1">Upload diagnostic responses above to generate your first audit</p>
          </div>
        )}
      </div>
    </div>
  );
}
