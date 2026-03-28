"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Globe,
  Loader2,
  Monitor,
  Smartphone,
  Trash2,
  X,
  AlertTriangle,
  ShieldCheck,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  browserInfo: string;
  lastActiveAt: string | null;
  createdAt: string | null;
  isCurrent: boolean;
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getDeviceIcon(browserInfo: string) {
  const lower = browserInfo.toLowerCase();
  if (lower.includes("android") || lower.includes("ios") || lower.includes("iphone")) {
    return <Smartphone className="h-5 w-5 text-[var(--color-mid-gray)]" />;
  }
  return <Monitor className="h-5 w-5 text-[var(--color-mid-gray)]" />;
}

export function SessionManagement() {
  const { authFetch } = usePartnerAuth();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    type: "single" | "all";
    sessionId?: string;
    browserInfo?: string;
  } | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      setError(null);
      const res = await authFetch("/api/partner/sessions");
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to load sessions");
        return;
      }
      const data = await res.json();
      setSessions(data.sessions);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevoking(sessionId);
    setConfirmDialog(null);
    try {
      const res = await authFetch("/api/partner/sessions", {
        method: "DELETE",
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to revoke session");
      }
    } catch {
      setError("Connection error");
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAll = async () => {
    setRevoking("all");
    setConfirmDialog(null);
    try {
      const res = await authFetch("/api/partner/sessions", {
        method: "DELETE",
        body: JSON.stringify({ revokeAll: true }),
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.isCurrent));
      } else {
        const data = await res.json();
        setError(data.error || "Failed to revoke sessions");
      }
    } catch {
      setError("Connection error");
    } finally {
      setRevoking(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-[var(--border-subtle)] p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[var(--color-light-gray)]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-[var(--color-light-gray)]" />
                <div className="h-3 w-24 rounded bg-[var(--color-light-gray)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-[var(--color-red)]/20 bg-[var(--color-red)]/5 p-4">
        <div className="flex items-center gap-2 text-sm text-[var(--color-red)]">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
        <button
          onClick={() => {
            setLoading(true);
            fetchSessions();
          }}
          className="mt-2 text-xs text-[var(--color-gold)] hover:text-[var(--color-gold-hover)]"
        >
          Retry
        </button>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="py-8 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-[var(--color-mid-gray)]" />
        <p className="mt-2 text-sm text-[var(--color-mid-gray)]">
          No active sessions found.
        </p>
      </div>
    );
  }

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <div className="space-y-3">
      {sessions.map((s) => (
        <div
          key={s.id}
          className={`rounded-lg border p-4 transition-colors ${
            s.isCurrent
              ? "border-[var(--color-gold)]/30 bg-[var(--color-gold)]/5"
              : "border-[var(--border-subtle)]"
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-light-gray)]">
                {getDeviceIcon(s.browserInfo)}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {s.browserInfo}
                  </p>
                  {s.isCurrent && (
                    <span className="inline-flex items-center rounded-full bg-[var(--color-gold)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-gold)]">
                      This device
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[var(--color-mid-gray)]">
                  {s.ipAddress && (
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" />
                      {s.ipAddress}
                    </span>
                  )}
                  <span>Active {relativeTime(s.lastActiveAt)}</span>
                </div>
              </div>
            </div>
            {!s.isCurrent && (
              <button
                onClick={() =>
                  setConfirmDialog({
                    type: "single",
                    sessionId: s.id,
                    browserInfo: s.browserInfo,
                  })
                }
                disabled={revoking === s.id}
                className="shrink-0 rounded-lg p-2 text-[var(--color-mid-gray)] transition-colors hover:bg-[var(--color-red)]/10 hover:text-[var(--color-red)] disabled:opacity-50"
                title="Revoke session"
              >
                {revoking === s.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
        </div>
      ))}

      {otherSessions.length > 0 && (
        <button
          onClick={() => setConfirmDialog({ type: "all" })}
          disabled={revoking === "all"}
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-red)]/20 px-4 py-2.5 text-sm font-medium text-[var(--color-red)] transition-colors hover:bg-[var(--color-red)]/5 disabled:opacity-50"
        >
          {revoking === "all" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Revoke all other sessions ({otherSessions.length})
        </button>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                {confirmDialog.type === "all"
                  ? "Revoke all other sessions?"
                  : "Revoke this session?"}
              </h4>
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg p-1 text-[var(--color-mid-gray)] hover:text-[var(--color-dark)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm text-[var(--color-body-text)]">
              {confirmDialog.type === "all"
                ? `This will sign out ${otherSessions.length} other session${otherSessions.length > 1 ? "s" : ""}. You will remain signed in on this device.`
                : `This will sign out the session on ${confirmDialog.browserInfo || "this device"}.`}
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="rounded-lg px-3 py-2 text-sm text-[var(--color-body-text)] hover:text-[var(--color-dark)]"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmDialog.type === "all") {
                    handleRevokeAll();
                  } else if (confirmDialog.sessionId) {
                    handleRevoke(confirmDialog.sessionId);
                  }
                }}
                className="rounded-lg bg-[var(--color-red)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-red)]/90"
              >
                Revoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
