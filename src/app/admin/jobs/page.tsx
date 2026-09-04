"use client";

import { useCallback, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock, Loader2, RefreshCw, Snowflake } from "lucide-react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";

/**
 * Job queue health (MISSION.md s1).
 *
 * The one question an operator has: is anything stuck? Frozen jobs answer it —
 * a frozen job's outcome is UNKNOWN, it is never retried automatically, and it
 * is waiting for a person to decide. Everything else on this page is context.
 */

interface StatRow { queue: string; status: string; n: number; oldest: string | null }
interface JobRow {
  id: string; queue: string; status: string; attempts: number; max_attempts: number;
  tenant_key: string | null; progress_done: number; progress_total: number | null;
  last_error: string | null; run_after: string; updated_at: string; locked_by: string | null;
}
interface JobsResponse {
  stats: StatRow[]; attention: JobRow[]; running: JobRow[];
  expiredLeases: number; doneLastHour: number;
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  pending: { color: "var(--color-body-text)", bg: "var(--color-light-gray)" },
  running: { color: "var(--color-blue)", bg: "var(--color-light-gray)" },
  done: { color: "var(--color-green)", bg: "var(--color-light-gray)" },
  failed: { color: "var(--color-red)", bg: "var(--color-light-gray)" },
  frozen: { color: "var(--color-red)", bg: "var(--color-light-gray)" },
};

function ago(iso: string | null): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Stat({ label, value, tone, icon: Icon }: {
  label: string; value: string | number; tone?: "warn" | "ok"; icon: typeof Clock;
}) {
  const color =
    tone === "warn" ? "var(--color-red)" : tone === "ok" ? "var(--color-green)" : "var(--color-dark)";
  return (
    <div style={{
      border: "1px solid var(--color-light-gray)", padding: "1rem 1.1rem",
      display: "flex", flexDirection: "column", gap: ".35rem", minWidth: 0,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".4rem", color: "var(--color-mid-gray)" }}>
        <Icon size={13} aria-hidden />
        <span style={{ fontSize: ".7rem", fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.1, letterSpacing: "-.03em", color }}>
        {value}
      </div>
    </div>
  );
}

function Pill({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span style={{
      fontSize: ".65rem", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
      color: s.color, background: s.bg, padding: "2px 6px", whiteSpace: "nowrap",
    }}>
      {status}
    </span>
  );
}

export default function JobsPage() {
  const { data, loading, error, refetch } = useAdminFetch<JobsResponse>("/api/admin-jobs");
  const [releasing, setReleasing] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const release = useCallback(async (id: string) => {
    setReleasing(id);
    setNote(null);
    try {
      const key = typeof window !== "undefined" ? localStorage.getItem("storageads_admin_key") || "" : "";
      const res = await fetch("/api/admin-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Admin-Key": key },
        body: JSON.stringify({ id }),
      });
      setNote(res.ok ? "Released — it will be picked up within a minute." : "Could not release that job.");
      if (res.ok) refetch();
    } catch {
      setNote("Could not release that job.");
    } finally {
      setReleasing(null);
    }
  }, [refetch]);

  const totals = useMemo(() => {
    const s = data?.stats ?? [];
    const by = (st: string) => s.filter((r) => r.status === st).reduce((n, r) => n + r.n, 0);
    return { pending: by("pending"), running: by("running"), frozen: by("frozen"), failed: by("failed") };
  }, [data]);

  if (loading && !data) {
    return (
      <div style={{ padding: "2rem", color: "var(--color-mid-gray)", display: "flex", gap: ".5rem", alignItems: "center" }}>
        <Loader2 size={15} className="animate-spin" aria-hidden /> Loading the queue…
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: "2rem", color: "var(--color-red)" }}>
        Could not read the job queue. {error}
      </div>
    );
  }

  const attention = data?.attention ?? [];

  return (
    <div style={{ padding: "1.5rem 1.75rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <header style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, letterSpacing: "-.03em", margin: 0 }}>
            Job queue
          </h1>
          <p style={{ margin: ".35rem 0 0", color: "var(--color-body-text)", fontSize: ".85rem", maxWidth: "62ch", lineHeight: 1.6 }}>
            Background work that survives a function timeout. A <strong>frozen</strong> job is one whose
            outcome is unknown — it is never retried automatically, because retrying something that may
            already have happened can send twice and charge twice. Those wait for you.
          </p>
        </div>
        <button
          onClick={refetch}
          style={{
            display: "flex", alignItems: "center", gap: ".4rem", fontSize: ".75rem", fontWeight: 600,
            padding: ".5rem .8rem", border: "1px solid var(--color-light-gray)",
            background: "transparent", color: "var(--color-dark)", cursor: "pointer",
          }}
        >
          <RefreshCw size={13} aria-hidden /> Refresh
        </button>
      </header>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: ".75rem" }}>
        <Stat label="Waiting" value={totals.pending} icon={Clock} />
        <Stat label="Running" value={totals.running} icon={Loader2} />
        <Stat label="Frozen" value={totals.frozen} tone={totals.frozen > 0 ? "warn" : undefined} icon={Snowflake} />
        <Stat label="Failed" value={totals.failed} tone={totals.failed > 0 ? "warn" : undefined} icon={AlertTriangle} />
        <Stat label="Done · 1h" value={data?.doneLastHour ?? 0} tone="ok" icon={CheckCircle2} />
      </div>

      {(data?.expiredLeases ?? 0) > 0 && (
        <div style={{
          borderLeft: "3px solid var(--color-red)", background: "var(--color-light-gray)",
          padding: ".75rem 1rem", fontSize: ".82rem", lineHeight: 1.55,
        }}>
          <strong>{data?.expiredLeases} job(s) hold an expired lease.</strong> A worker died mid-pass; the
          next run reclaims them automatically. A number that stays high means the worker itself is unhealthy.
        </div>
      )}

      {note && (
        <div style={{ fontSize: ".8rem", color: "var(--color-body-text)" }}>{note}</div>
      )}

      <section>
        <h2 style={{ fontSize: ".8rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-mid-gray)", margin: "0 0 .6rem" }}>
          Needs a decision
        </h2>
        {attention.length === 0 ? (
          <p style={{ color: "var(--color-mid-gray)", fontSize: ".85rem", margin: 0 }}>
            Nothing frozen or failed. The queue is healthy.
          </p>
        ) : (
          <div style={{ border: "1px solid var(--color-light-gray)" }}>
            {attention.map((j, i) => (
              <div key={j.id} style={{
                display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: ".75rem",
                padding: ".7rem .9rem", alignItems: "start",
                borderTop: i === 0 ? "none" : "1px solid var(--color-light-gray)",
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", flexWrap: "wrap" }}>
                    <Pill status={j.status} />
                    <code style={{ fontSize: ".78rem", fontWeight: 600 }}>{j.queue}</code>
                    <span style={{ fontSize: ".7rem", color: "var(--color-mid-gray)" }}>
                      {j.attempts}/{j.max_attempts} attempts · {ago(j.updated_at)}
                    </span>
                  </div>
                  {j.last_error && (
                    <div style={{
                      marginTop: ".35rem", fontSize: ".76rem", color: "var(--color-body-text)",
                      lineHeight: 1.5, wordBreak: "break-word",
                    }}>
                      {j.last_error}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => release(j.id)}
                  disabled={releasing === j.id}
                  style={{
                    fontSize: ".72rem", fontWeight: 600, padding: ".4rem .7rem", whiteSpace: "nowrap",
                    border: "1px solid var(--color-dark)", background: "var(--color-dark)",
                    color: "var(--color-light)", cursor: releasing === j.id ? "default" : "pointer",
                    opacity: releasing === j.id ? 0.6 : 1,
                  }}
                >
                  {releasing === j.id ? "Releasing…" : "Release"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: ".8rem", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-mid-gray)", margin: "0 0 .6rem" }}>
          By queue
        </h2>
        {(data?.stats.length ?? 0) === 0 ? (
          <p style={{ color: "var(--color-mid-gray)", fontSize: ".85rem", margin: 0 }}>
            No jobs in the last 24 hours. Detection is scheduled every 2 and 15 minutes — if this stays
            empty, the worker cron is not running.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: ".82rem", minWidth: 460 }}>
              <thead>
                <tr>
                  {["Queue", "Status", "Count", "Oldest"].map((h) => (
                    <th key={h} style={{
                      textAlign: h === "Count" ? "right" : "left", padding: "0 .75rem .45rem 0",
                      borderBottom: "1.5px solid var(--color-dark)", fontSize: ".68rem", fontWeight: 700,
                      letterSpacing: ".08em", textTransform: "uppercase", color: "var(--color-mid-gray)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.stats.map((r) => (
                  <tr key={`${r.queue}-${r.status}`}>
                    <td style={{ padding: ".5rem .75rem .5rem 0", borderBottom: "1px solid var(--color-light-gray)" }}>
                      <code style={{ fontWeight: 600 }}>{r.queue}</code>
                    </td>
                    <td style={{ padding: ".5rem .75rem .5rem 0", borderBottom: "1px solid var(--color-light-gray)" }}>
                      <Pill status={r.status} />
                    </td>
                    <td style={{
                      padding: ".5rem .75rem .5rem 0", borderBottom: "1px solid var(--color-light-gray)",
                      textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600,
                    }}>{r.n}</td>
                    <td style={{
                      padding: ".5rem 0 .5rem 0", borderBottom: "1px solid var(--color-light-gray)",
                      color: "var(--color-mid-gray)",
                    }}>{ago(r.oldest)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
