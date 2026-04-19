"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  Loader2,
  Shield,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface AuditEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "login", label: "Login" },
  { value: "logout", label: "Logout" },
  { value: "signup", label: "Signup" },
  { value: "password.change", label: "Password Change" },
  { value: "password.reset", label: "Password Reset" },
  { value: "team.invite", label: "Team Invite" },
  { value: "team.remove", label: "Team Remove" },
  { value: "settings.update", label: "Settings Update" },
  { value: "page.create", label: "Page Create" },
  { value: "page.publish", label: "Page Publish" },
  { value: "api_key.create", label: "API Key Create" },
  { value: "api_key.revoke", label: "API Key Revoke" },
];

type ActionCategory = "auth" | "team" | "content" | "security";

function getActionCategory(action: string): ActionCategory {
  if (
    action === "login" ||
    action === "logout" ||
    action === "signup"
  )
    return "auth";
  if (action.startsWith("team.")) return "team";
  if (action.startsWith("page.") || action.startsWith("content."))
    return "content";
  if (
    action.startsWith("password.") ||
    action.startsWith("api_key.") ||
    action === "2fa.enable" ||
    action === "2fa.disable"
  )
    return "security";
  return "auth";
}

const CATEGORY_STYLES: Record<ActionCategory, string> = {
  auth: "bg-[var(--color-gold)]/15 text-[var(--color-gold)]",
  team: "bg-[var(--color-blue)]/15 text-[var(--color-blue)]",
  content: "bg-[var(--color-green)]/15 text-[var(--color-green)]",
  security: "bg-[var(--color-red)]/15 text-[var(--color-red)]",
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function formatActionLabel(action: string): string {
  return action
    .replace(/[._]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const PAGE_SIZE = 50;

export default function AuditLogPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isAdmin =
    session?.user?.role === "org_admin";

  const fetchEntries = useCallback(
    async (currentOffset: number, action: string) => {
      if (!session) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(currentOffset),
        });
        if (action) params.set("action", action);

        const res = await authFetch(
          `/api/partner/audit-log?${params.toString()}`,
        );
        if (res.ok) {
          const data = (await res.json()) as {
            entries: AuditEntry[];
            total: number;
          };
          setEntries(data.entries);
          setTotal(data.total);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    },
    [session, authFetch],
  );

  useEffect(() => {
    if (session && isAdmin) {
      fetchEntries(offset, actionFilter);
    }
  }, [session, isAdmin, offset, actionFilter, fetchEntries]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-mid-gray)]" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-4 h-12 w-12 text-[var(--color-mid-gray)]" />
        <h2
          className="mb-2 text-lg font-medium text-[var(--color-light)]"
          style={{ fontFamily: "var(--font-primary)" }}
        >
          Access Denied
        </h2>
        <p className="text-sm text-[var(--color-mid-gray)]">
          Only organization admins can view the audit log.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl font-semibold text-[var(--color-light)] sm:text-2xl"
          style={{ fontFamily: "var(--font-primary)" }}
        >
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-[var(--color-mid-gray)]">
          Track all activity within your organization.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-3">
        <Filter className="h-4 w-4 text-[var(--color-mid-gray)]" />
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setOffset(0);
          }}
          className="rounded-lg border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] px-3 py-2 text-sm text-[var(--color-light)] outline-none focus:border-[var(--color-gold)]/50"
        >
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table / Cards */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-lg bg-[var(--color-dark-surface)]"
            />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] py-16 text-center">
          <Clock className="mb-4 h-10 w-10 text-[var(--color-mid-gray)]" />
          <p
            className="text-base font-medium text-[var(--color-light)]"
            style={{ fontFamily: "var(--font-primary)" }}
          >
            No activity yet
          </p>
          <p className="mt-1 text-sm text-[var(--color-mid-gray)]">
            Activity will appear here as actions are performed.
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-[var(--color-dark-border)] sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-dark-border)] bg-[var(--color-dark-surface)]">
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-mid-gray)]">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-mid-gray)]">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-mid-gray)]">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-mid-gray)]">
                    Resource
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-mid-gray)]">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-[var(--color-mid-gray)]">
                    IP
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const category = getActionCategory(entry.action);
                  const isExpanded = expandedId === entry.id;
                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] transition-colors hover:bg-[var(--color-dark-border)]/40"
                    >
                      <td
                        className="whitespace-nowrap px-4 py-3 text-[var(--color-mid-gray)]"
                        title={new Date(entry.createdAt).toLocaleString()}
                      >
                        {formatRelativeTime(entry.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[var(--color-light)]">
                          {entry.userName || "System"}
                        </div>
                        {entry.userEmail && (
                          <div className="text-xs text-[var(--color-mid-gray)]">
                            {entry.userEmail}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}
                        >
                          {formatActionLabel(entry.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[var(--color-mid-gray)]">
                        {entry.resourceType ? (
                          <span>
                            {entry.resourceType}
                            {entry.resourceId && (
                              <span className="ml-1 text-xs text-[var(--color-mid-gray)]/60">
                                {entry.resourceId.slice(0, 8)}...
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-[var(--color-mid-gray)]/40">
                            --
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.metadata &&
                        Object.keys(entry.metadata).length > 0 ? (
                          <button
                            onClick={() =>
                              setExpandedId(isExpanded ? null : entry.id)
                            }
                            className="text-xs text-[var(--color-gold)] hover:underline"
                          >
                            {isExpanded ? "Hide" : "View"}
                          </button>
                        ) : (
                          <span className="text-xs text-[var(--color-mid-gray)]/40">
                            --
                          </span>
                        )}
                        {isExpanded && entry.metadata && (
                          <pre className="mt-2 max-w-xs overflow-auto rounded-lg bg-[var(--color-dark)] p-2 text-xs text-[var(--color-mid-gray)]">
                            {JSON.stringify(entry.metadata, null, 2)}
                          </pre>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-[var(--color-mid-gray)]">
                        {entry.ipAddress || "--"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="space-y-3 sm:hidden">
            {entries.map((entry) => {
              const category = getActionCategory(entry.action);
              const isExpanded = expandedId === entry.id;
              return (
                <div
                  key={entry.id}
                  className="rounded-xl border border-[var(--color-dark-border)] bg-[var(--color-dark-surface)] p-4"
                >
                  <div className="mb-2 flex items-start justify-between">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}
                    >
                      {formatActionLabel(entry.action)}
                    </span>
                    <span
                      className="text-xs text-[var(--color-mid-gray)]"
                      title={new Date(entry.createdAt).toLocaleString()}
                    >
                      {formatRelativeTime(entry.createdAt)}
                    </span>
                  </div>
                  <div className="mb-1 text-sm text-[var(--color-light)]">
                    {entry.userName || "System"}
                    {entry.userEmail && (
                      <span className="ml-1 text-xs text-[var(--color-mid-gray)]">
                        ({entry.userEmail})
                      </span>
                    )}
                  </div>
                  {entry.resourceType && (
                    <div className="mb-1 text-xs text-[var(--color-mid-gray)]">
                      {entry.resourceType}
                      {entry.resourceId && (
                        <span className="ml-1 opacity-60">
                          {entry.resourceId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-mid-gray)]/60">
                      {entry.ipAddress || ""}
                    </span>
                    {entry.metadata &&
                      Object.keys(entry.metadata).length > 0 && (
                        <button
                          onClick={() =>
                            setExpandedId(isExpanded ? null : entry.id)
                          }
                          className="text-xs text-[var(--color-gold)] hover:underline"
                        >
                          {isExpanded ? "Hide details" : "View details"}
                        </button>
                      )}
                  </div>
                  {isExpanded && entry.metadata && (
                    <pre className="mt-2 overflow-auto rounded-lg bg-[var(--color-dark)] p-2 text-xs text-[var(--color-mid-gray)]">
                      {JSON.stringify(entry.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-[var(--color-mid-gray)]">
                Showing {offset + 1}--{Math.min(offset + PAGE_SIZE, total)} of{" "}
                {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="flex items-center gap-1 rounded-lg border border-[var(--color-dark-border)] px-3 py-1.5 text-sm text-[var(--color-light)] transition-colors hover:bg-[var(--color-dark-border)] disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </button>
                <span className="text-sm text-[var(--color-mid-gray)]">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="flex items-center gap-1 rounded-lg border border-[var(--color-dark-border)] px-3 py-1.5 text-sm text-[var(--color-light)] transition-colors hover:bg-[var(--color-dark-border)] disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
