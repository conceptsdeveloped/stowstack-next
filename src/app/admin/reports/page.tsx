"use client";

import { useState } from "react";
import { FileText, Plus, Download, Loader2 } from "lucide-react";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import { useFacility } from "@/lib/facility-context";
import { FacilityBadge } from "@/components/admin/facility-badge";
import { ExportButton } from "@/components/export/export-button";
import { GenerateReportModal } from "@/components/export/generate-report-modal";
import { REPORT_TYPE_LABELS, REPORT_STATUS_CONFIG } from "@/types/reports";
import type { Report, GenerateReportRequest } from "@/types/reports";

export default function ReportsPage() {
  const { currentId } = useFacility();
  const params: Record<string, string> = {};
  if (currentId !== "all") params.facilityId = currentId;

  const { data, loading, error, refetch } = useAdminFetch<{ reports: Report[] }>("/api/admin-reports", params);
  const reports = data?.reports ?? [];
  const [showModal, setShowModal] = useState(false);

  const handleGenerate = async (request: GenerateReportRequest) => {
    try {
      await adminFetch("/api/admin-reports", {
        method: "POST",
        body: JSON.stringify(request),
      });
      refetch();
    } catch (err) {
      throw err; // Re-throw so GenerateReportModal can show error state
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1
            className="text-2xl font-semibold"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
          >
            Reports
          </h1>
          <FacilityBadge />
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            fontFamily: "var(--font-heading)",
            color: "#fff",
            backgroundColor: "var(--color-gold)",
          }}
        >
          <Plus className="h-4 w-4" />
          Generate Report
        </button>
      </div>

      {/* Error state */}
      {!loading && error && (
        <div
          className="rounded-xl border p-6 text-center"
          style={{ borderColor: "rgba(176, 74, 58, 0.2)", backgroundColor: "rgba(176, 74, 58, 0.05)" }}
        >
          <p className="text-sm mb-3" style={{ fontFamily: "var(--font-body)", color: "var(--color-red)" }}>
            Failed to load reports: {error}
          </p>
          <button
            type="button"
            onClick={refetch}
            className="rounded-lg px-4 py-2 text-xs font-medium"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", backgroundColor: "var(--color-gold-light)" }}
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {reports.length === 0 && (
        <div
          className="rounded-xl border p-12 text-center"
          style={{ borderColor: "var(--color-light-gray)", backgroundColor: "var(--color-light)" }}
        >
          <FileText className="mx-auto mb-4 h-10 w-10" style={{ color: "var(--color-mid-gray)" }} />
          <h3
            className="text-base font-medium mb-2"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
          >
            No reports yet
          </h3>
          <p
            className="text-sm mb-6"
            style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}
          >
            Generate your first report to download branded performance data for your team or accountant.
          </p>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2.5 text-sm font-medium"
            style={{ fontFamily: "var(--font-heading)", color: "#fff", backgroundColor: "var(--color-gold)" }}
          >
            <Plus className="h-4 w-4" />
            Generate Report
          </button>
        </div>
      )}

      {/* Reports table */}
      {reports.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: "var(--color-light-gray)" }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-light-gray)" }}>
                {["Report", "Facility", "Period", "Format", "Status", "Size", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider"
                    style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((report, idx) => {
                const statusCfg = REPORT_STATUS_CONFIG[report.status];
                return (
                  <tr
                    key={report.id}
                    style={{
                      borderBottom: idx < reports.length - 1 ? "1px solid var(--color-light-gray)" : undefined,
                    }}
                  >
                    <td className="px-4 py-3">
                      <span className="font-medium" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)", fontSize: "13px" }}>
                        {REPORT_TYPE_LABELS[report.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)" }}>
                      {report.facilityName}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-mid-gray)" }}>
                      {report.dateRange.start} – {report.dateRange.end}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                        style={{ fontFamily: "var(--font-heading)", backgroundColor: "var(--color-light-gray)", color: "var(--color-body-text)" }}
                      >
                        {report.format}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ fontFamily: "var(--font-heading)", color: statusCfg.color, backgroundColor: statusCfg.bg }}
                      >
                        {report.status === "generating" && <Loader2 className="h-3 w-3 animate-spin" />}
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--color-mid-gray)" }}>
                      {report.fileSize ? `${(report.fileSize / 1024).toFixed(0)} KB` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {report.downloadUrl && report.status === "ready" && (
                        <a
                          href={report.downloadUrl}
                          className="p-1 rounded inline-flex"
                          style={{ color: "var(--color-gold)" }}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Generate modal */}
      <GenerateReportModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onGenerate={handleGenerate}
      />
    </div>
  );
}
