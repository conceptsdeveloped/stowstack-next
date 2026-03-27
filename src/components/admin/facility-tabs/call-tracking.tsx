"use client"

import { useState, useEffect, useCallback } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Phone,
  PhoneIncoming,
  PhoneOff,
  Play,
  RefreshCw,
  Timer,
  TrendingUp,
  XCircle,
} from "lucide-react"

/* ================================================================
   Types
   ================================================================ */

interface CallLog {
  id: string
  twilio_call_sid: string
  caller_number: string
  caller_city?: string
  caller_state?: string
  duration: number
  status: string
  call_outcome?: string
  campaign_source?: string
  recording_url?: string
  move_in_linked?: boolean
  started_at: string
  ended_at?: string
  tracking_label?: string
  tracking_number?: string
}

interface CallLogsResponse {
  logs: CallLog[]
  total: number
  page: number
  pages: number
}

interface CallTrackingProps {
  facilityId: string
  adminKey: string
}

/* ================================================================
   Helpers
   ================================================================ */

const OUTCOME_OPTIONS = [
  { value: "", label: "-- Set Outcome --" },
  { value: "Qualified", label: "Qualified" },
  { value: "Existing Tenant", label: "Existing Tenant" },
  { value: "Spam", label: "Spam" },
  { value: "Wrong Number", label: "Wrong Number" },
  { value: "Unknown", label: "Unknown" },
]

function outcomeColor(outcome?: string): string {
  switch (outcome?.toLowerCase()) {
    case "qualified":
      return "bg-emerald-500/20 text-emerald-400"
    case "existing tenant":
      return "bg-[var(--color-blue)]/20 text-[var(--color-blue)]"
    case "spam":
      return "bg-red-500/20 text-red-400"
    case "wrong number":
      return "bg-[var(--color-mid-gray)]/20 text-[var(--color-mid-gray)]"
    case "unknown":
      return "bg-yellow-500/20 text-yellow-400"
    default:
      return "bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

/* ================================================================
   Component
   ================================================================ */

export default function CallTracking({ facilityId, adminKey }: CallTrackingProps) {
  const [logs, setLogs] = useState<CallLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  /* ---- Fetch ---- */

  const fetchLogs = useCallback(
    async (p: number) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/call-logs?facilityId=${facilityId}&page=${p}`,
          { headers: { "X-Admin-Key": adminKey } }
        )
        if (!res.ok) throw new Error(`Failed to load call logs (${res.status})`)
        const data: CallLogsResponse = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
        setPage(data.page)
        setPages(data.pages)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load call logs")
      } finally {
        setLoading(false)
      }
    },
    [facilityId, adminKey]
  )

  useEffect(() => {
    fetchLogs(page)
  }, [fetchLogs, page])

  /* ---- Update outcome ---- */

  async function updateOutcome(id: string, outcome: string) {
    setUpdatingId(id)
    try {
      const res = await fetch("/api/call-logs", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ id, call_outcome: outcome }),
      })
      if (!res.ok) throw new Error("Failed to update outcome")
      setLogs((prev) =>
        prev.map((l) => (l.id === id ? { ...l, call_outcome: outcome } : l))
      )
    } catch {
      // Silently fail — dropdown stays as-is
    } finally {
      setUpdatingId(null)
    }
  }

  /* ---- Stats ---- */

  const qualifiedCalls = logs.filter(
    (l) => l.call_outcome?.toLowerCase() === "qualified" || (!l.call_outcome && l.duration >= 30)
  ).length
  const avgDuration =
    logs.length > 0
      ? Math.round(logs.reduce((sum, l) => sum + (l.duration || 0), 0) / logs.length)
      : 0
  const conversionRate =
    total > 0 ? ((qualifiedCalls / logs.length) * 100).toFixed(1) : "0.0"

  /* ---- Render ---- */

  if (error) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
        <XCircle className="h-5 w-5 shrink-0 text-red-400" />
        <p className="flex-1 text-sm text-red-300">{error}</p>
        <button
          type="button"
          onClick={() => fetchLogs(page)}
          className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ---- Summary Stats ---- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          icon={Phone}
          label="Total Calls"
          value={total.toString()}
          loading={loading}
        />
        <StatCard
          icon={PhoneIncoming}
          label="Qualified (30s+)"
          value={qualifiedCalls.toString()}
          loading={loading}
          accent
        />
        <StatCard
          icon={Timer}
          label="Avg Duration"
          value={formatDuration(avgDuration)}
          loading={loading}
        />
        <StatCard
          icon={TrendingUp}
          label="Conversion Rate"
          value={`${conversionRate}%`}
          loading={loading}
          accent
        />
      </div>

      {/* ---- Table ---- */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--color-mid-gray)]">
                <th className="px-4 py-3 font-medium">Date / Time</th>
                <th className="px-4 py-3 font-medium">Caller</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Campaign</th>
                <th className="px-4 py-3 font-medium">Outcome</th>
                <th className="px-4 py-3 font-medium text-center">Recording</th>
                <th className="px-4 py-3 font-medium text-center">Move-In</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)]">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 w-20 animate-pulse rounded bg-[var(--color-light-gray)]" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-[var(--color-mid-gray)]"
                  >
                    No call logs found for this facility.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-[var(--border-subtle)] transition-colors hover:bg-[var(--color-light-gray)]/50"
                  >
                    {/* Date / Time */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm text-[var(--color-dark)]">
                        {formatDate(log.started_at)}
                      </div>
                      <div className="text-xs text-[var(--color-mid-gray)]">
                        {formatTime(log.started_at)}
                      </div>
                    </td>

                    {/* Caller */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="text-sm text-[var(--color-dark)]">
                        {formatPhone(log.caller_number)}
                      </div>
                      {log.tracking_label && (
                        <div className="text-xs text-[var(--color-gold)]">
                          {log.tracking_label}
                        </div>
                      )}
                    </td>

                    {/* Location */}
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--color-body-text)]">
                      {[log.caller_city, log.caller_state].filter(Boolean).join(", ") || "—"}
                    </td>

                    {/* Duration */}
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-sm text-[var(--color-dark)]">
                      {formatDuration(log.duration)}
                    </td>

                    {/* Campaign */}
                    <td className="whitespace-nowrap px-4 py-3">
                      {log.campaign_source ? (
                        <span className="inline-flex items-center rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-xs font-medium text-[var(--color-gold)]">
                          {log.campaign_source}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--color-mid-gray)]">—</span>
                      )}
                    </td>

                    {/* Outcome dropdown */}
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="relative">
                        <select
                          value={log.call_outcome || ""}
                          onChange={(e) => updateOutcome(log.id, e.target.value)}
                          disabled={updatingId === log.id}
                          className={`appearance-none rounded-lg border border-[var(--border-subtle)] px-2.5 py-1 pr-7 text-xs font-medium transition-colors focus:border-[var(--color-gold)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--color-gold)]/50 ${outcomeColor(log.call_outcome)} ${updatingId === log.id ? "opacity-50" : ""}`}
                          style={{ backgroundColor: "transparent" }}
                        >
                          {OUTCOME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {updatingId === log.id && (
                          <Loader2 className="absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-[var(--color-mid-gray)]" />
                        )}
                      </div>
                    </td>

                    {/* Recording */}
                    <td className="px-4 py-3 text-center">
                      {log.recording_url ? (
                        <a
                          href={log.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold)] transition-colors hover:bg-[var(--color-gold)]/25"
                          title="Play recording"
                        >
                          <Play className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <PhoneOff className="mx-auto h-4 w-4 text-[var(--color-mid-gray)]" />
                      )}
                    </td>
                    {/* Move-In Toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        title={log.move_in_linked ? "Linked to move-in" : "Mark as move-in"}
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
                          log.move_in_linked
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-[var(--color-light-gray)]/30 text-[var(--color-mid-gray)] hover:bg-emerald-500/10 hover:text-emerald-400"
                        }`}
                        onClick={async () => {
                          const newVal = !log.move_in_linked
                          try {
                            await fetch("/api/call-logs", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", "X-Admin-Key": adminKey },
                              body: JSON.stringify({ id: log.id, move_in_linked: newVal }),
                            })
                            setLogs((prev) => prev.map((l) => l.id === log.id ? { ...l, move_in_linked: newVal } : l))
                          } catch { /* silent */ }
                        }}
                      >
                        <TrendingUp className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ---- Pagination ---- */}
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-4 py-3">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-body-text)] transition-colors hover:bg-[var(--color-light-gray)] disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="text-xs text-[var(--color-mid-gray)]">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-[var(--color-body-text)] transition-colors hover:bg-[var(--color-light-gray)] disabled:opacity-40 disabled:pointer-events-none"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   Stat Card
   ================================================================ */

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  loading?: boolean
  accent?: boolean
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4">
      <div className="mb-2 flex items-center gap-2">
        <Icon
          className={`h-4 w-4 ${accent ? "text-[var(--color-gold)]" : "text-[var(--color-mid-gray)]"}`}
        />
        <span className="text-xs text-[var(--color-mid-gray)]">{label}</span>
      </div>
      {loading ? (
        <div className="h-7 w-16 animate-pulse rounded bg-[var(--color-light-gray)]" />
      ) : (
        <p
          className={`text-xl font-semibold ${accent ? "text-[var(--color-gold)]" : "text-[var(--color-dark)]"}`}
        >
          {value}
        </p>
      )}
    </div>
  )
}
