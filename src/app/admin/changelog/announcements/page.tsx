"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAdminFetch, adminFetch } from "@/hooks/use-admin-fetch";
import {
  GitCommit,
  Sparkles,
  Bug,
  Wrench,
  Search,
  Filter,
  AlertCircle,
  Check,
  X,
  Plus,
  ArrowLeft,
} from "lucide-react";

/* ═══════════════════════════════════════════
   Announcements — the manually-curated changelog that the partner page
   reads via /api/changelog (changelog_entries table). Relocated here from
   /admin/changelog when the rich git-commit log took over that route.
   ═══════════════════════════════════════════ */

interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  category: string | null;
  published_at: string | null;
  created_at: string | null;
}

type Category = "feature" | "improvement" | "fix";

/* ═══════════════════════════════════════════
   CONSTANTS — category vocabulary shared with the partner changelog.
   Colors follow the light-only design system: green / blue categorical,
   neutral charcoal for fixes (red is errors-only; gold is banned).
   ═══════════════════════════════════════════ */

const CATEGORY_CONFIG: Record<
  Category,
  { bg: string; text: string; icon: typeof GitCommit; label: string }
> = {
  feature: {
    bg: "rgba(120,140,93,0.12)",
    text: "var(--color-green)",
    icon: Sparkles,
    label: "Feature",
  },
  improvement: {
    bg: "rgba(106,155,204,0.12)",
    text: "var(--color-blue)",
    icon: Wrench,
    label: "Improvement",
  },
  fix: {
    bg: "rgba(20,20,19,0.07)",
    text: "var(--color-dark)",
    icon: Bug,
    label: "Fix",
  },
};

const TYPE_FILTERS = [
  { key: "all", label: "All", icon: GitCommit },
  { key: "feature", label: "Features", icon: Sparkles },
  { key: "improvement", label: "Improvements", icon: Wrench },
  { key: "fix", label: "Fixes", icon: Bug },
] as const;

function normalizeCategory(c: string | null): Category {
  return c === "feature" || c === "fix" ? c : "improvement";
}

/* ═══════════════════════════════════════════
   UTILITY: Group entries by date
   ═══════════════════════════════════════════ */

function groupByDate(
  entries: ChangelogEntry[],
): { dateLabel: string; entries: ChangelogEntry[] }[] {
  const groups: Record<string, ChangelogEntry[]> = {};
  const orderedKeys: string[] = [];

  for (const entry of entries) {
    const dateKey = new Date(
      entry.published_at || entry.created_at || "",
    ).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    if (!groups[dateKey]) {
      groups[dateKey] = [];
      orderedKeys.push(dateKey);
    }
    groups[dateKey].push(entry);
  }

  return orderedKeys.map((key) => ({ dateLabel: key, entries: groups[key] }));
}

/* ═══════════════════════════════════════════
   COMPONENT: Skeleton loader
   ═══════════════════════════════════════════ */

function ChangelogSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading announcements">
      {Array.from({ length: 3 }).map((_, gi) => (
        <div key={gi}>
          <div className="h-4 w-32 rounded bg-[var(--color-dark)]/5 mb-4 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border p-5 animate-pulse"
                style={{
                  backgroundColor: "var(--bg-elevated)",
                  borderColor: "var(--border-subtle)",
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-[var(--color-dark)]/5 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-[var(--color-dark)]/5" />
                    <div className="h-3 w-full rounded bg-[var(--color-dark)]/5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPONENT: Status banner
   ═══════════════════════════════════════════ */

function StatusBanner({
  result,
  isError,
  onDismiss,
}: {
  result: string;
  isError: boolean;
  onDismiss: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm"
      style={{
        backgroundColor: isError ? "var(--color-red-light)" : "var(--color-green-light)",
        borderColor: isError ? "rgba(176,74,58,0.2)" : "rgba(120,140,93,0.2)",
        color: isError ? "var(--color-red)" : "var(--color-green)",
      }}
      role="alert"
    >
      <div className="flex items-center gap-2">
        {isError ? <AlertCircle size={14} /> : <Check size={14} />}
        <span>{result}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 rounded p-1 transition-colors hover:bg-black/5"
        aria-label="Dismiss notification"
      >
        <X size={12} />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPONENT: Create-entry form
   ═══════════════════════════════════════════ */

function CreateEntryForm({
  onCreated,
  onError,
  onClose,
}: {
  onCreated: (msg: string) => void;
  onError: (msg: string) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<Category>("improvement");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && !submitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      try {
        await adminFetch("/api/changelog", {
          method: "POST",
          body: JSON.stringify({ title: title.trim(), body: body.trim(), category }),
        });
        onCreated("Entry published");
        onClose();
      } catch (err) {
        onError(err instanceof Error ? err.message : "Failed to publish entry");
      } finally {
        setSubmitting(false);
      }
    },
    [canSubmit, title, body, category, onCreated, onError, onClose],
  );

  const fieldStyle: React.CSSProperties = {
    backgroundColor: "var(--bg-elevated)",
    borderColor: "var(--border-subtle)",
    color: "var(--color-dark)",
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border p-4 sm:p-5 space-y-4"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)",
      }}
      aria-label="Create announcement entry"
    >
      <div>
        <label
          htmlFor="cl-title"
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--color-body-text)" }}
        >
          Title
        </label>
        <input
          id="cl-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What changed?"
          maxLength={140}
          required
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--color-dark)]"
          style={fieldStyle}
        />
      </div>

      <div>
        <label
          htmlFor="cl-body"
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--color-body-text)" }}
        >
          Details
        </label>
        <textarea
          id="cl-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="A sentence or two on what it does for operators."
          rows={3}
          required
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-y focus:border-[var(--color-dark)]"
          style={fieldStyle}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <label
            htmlFor="cl-category"
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--color-body-text)" }}
          >
            Category
          </label>
          <select
            id="cl-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:border-[var(--color-dark)]"
            style={fieldStyle}
          >
            <option value="feature">Feature</option>
            <option value="improvement">Improvement</option>
            <option value="fix">Fix</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: "var(--color-light-gray)",
              color: "var(--color-body-text)",
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: "var(--color-dark)",
              color: "var(--color-light)",
              opacity: canSubmit ? 1 : 0.6,
              cursor: canSubmit ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? "Publishing..." : "Publish entry"}
          </button>
        </div>
      </div>
    </form>
  );
}

/* ═══════════════════════════════════════════
   COMPONENT: Single entry card
   ═══════════════════════════════════════════ */

function EntryCard({ entry }: { entry: ChangelogEntry }) {
  const config = CATEGORY_CONFIG[normalizeCategory(entry.category)];
  const Icon = config.icon;
  const dateStr = entry.published_at || entry.created_at;

  return (
    <div
      className="rounded-xl border p-4 sm:p-5 transition-colors hover:bg-[var(--color-light-gray)]/30"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: config.bg }}
          aria-hidden="true"
        >
          <Icon size={14} style={{ color: config.text }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-1 flex-wrap">
            <h3
              className="text-sm font-medium leading-snug"
              style={{ color: "var(--color-dark)" }}
            >
              {entry.title}
            </h3>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5"
              style={{ backgroundColor: config.bg, color: config.text }}
            >
              {config.label}
            </span>
          </div>

          {entry.body && (
            <p
              className="text-xs leading-relaxed mt-1"
              style={{ color: "var(--color-body-text)" }}
            >
              {entry.body}
            </p>
          )}

          {dateStr && (
            <div
              className="flex items-center gap-2 mt-2 text-[11px]"
              style={{ color: "var(--color-mid-gray)" }}
            >
              <time dateTime={dateStr}>
                {new Date(dateStr).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </time>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */

export default function AnnouncementsPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchInput, setSearchInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [banner, setBanner] = useState<{ msg: string; isError: boolean } | null>(null);

  const { data, loading, error, refetch } =
    useAdminFetch<{ entries: ChangelogEntry[] }>("/api/changelog");

  const entries = useMemo(() => data?.entries ?? [], [data]);

  // ── Client-side counts, filter, and search ──
  const typeCounts = useMemo(() => {
    const counts = { all: entries.length, feature: 0, improvement: 0, fix: 0 };
    for (const e of entries) counts[normalizeCategory(e.category)] += 1;
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return entries.filter((e) => {
      if (typeFilter !== "all" && normalizeCategory(e.category) !== typeFilter) {
        return false;
      }
      if (q) {
        return e.title.toLowerCase().includes(q) || e.body.toLowerCase().includes(q);
      }
      return true;
    });
  }, [entries, typeFilter, searchInput]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);
  const totalCount = entries.length;
  const hasActiveFilters = typeFilter !== "all" || searchInput.trim() !== "";

  const handleCreated = useCallback(
    (msg: string) => {
      setBanner({ msg, isError: false });
      refetch();
    },
    [refetch],
  );

  return (
    <div className="space-y-5 p-3 sm:p-6">
      {/* ── Back link ── */}
      <Link
        href="/admin/changelog"
        className="inline-flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-70"
        style={{ color: "var(--color-mid-gray)" }}
      >
        <ArrowLeft size={13} />
        <span>Commit log</span>
      </Link>

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-xl sm:text-2xl font-semibold"
            style={{ color: "var(--color-dark)" }}
          >
            Announcements
          </h1>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "var(--color-mid-gray)" }}>
            {totalCount > 0
              ? `${totalCount} update${totalCount === 1 ? "" : "s"} published — partners see these on their changelog`
              : "Manually-curated updates partners see on their changelog"}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all self-start sm:self-auto"
          style={{
            backgroundColor: showCreate ? "var(--color-light-gray)" : "var(--color-dark)",
            color: showCreate ? "var(--color-mid-gray)" : "var(--color-light)",
          }}
          aria-expanded={showCreate}
        >
          {showCreate ? <X size={14} /> : <Plus size={14} />}
          <span>{showCreate ? "Close" : "New entry"}</span>
        </button>
      </div>

      {/* ── Banner ── */}
      {banner && (
        <StatusBanner
          result={banner.msg}
          isError={banner.isError}
          onDismiss={() => setBanner(null)}
        />
      )}

      {/* ── Create form ── */}
      {showCreate && (
        <CreateEntryForm
          onCreated={handleCreated}
          onError={(msg) => setBanner({ msg, isError: true })}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* ── Filters row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide"
          role="tablist"
          aria-label="Filter by type"
        >
          <Filter
            size={14}
            style={{ color: "var(--color-mid-gray)" }}
            className="shrink-0"
            aria-hidden="true"
          />
          {TYPE_FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = typeFilter === f.key;
            const count = typeCounts[f.key as keyof typeof typeCounts];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: isActive ? "var(--color-dark)" : "var(--color-light-gray)",
                  color: isActive ? "var(--color-light)" : "var(--color-mid-gray)",
                }}
                role="tab"
                aria-selected={isActive}
                aria-label={`${f.label} (${count})`}
              >
                <Icon size={11} />
                <span>{f.label}</span>
                <span
                  className="text-[9px] font-semibold rounded-full px-1.5 py-px"
                  style={{
                    backgroundColor: isActive ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative flex-1 sm:flex-none">
          <Search
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: "var(--color-mid-gray)" }}
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search updates..."
            className="w-full sm:w-48 rounded-lg border pl-8 pr-8 py-1.5 text-xs outline-none transition-colors focus:border-[var(--color-dark)]"
            style={{
              backgroundColor: "var(--bg-elevated)",
              borderColor: "var(--border-subtle)",
              color: "var(--color-dark)",
            }}
            aria-label="Search announcement entries"
          />
          {searchInput && (
            <button
              type="button"
              onClick={() => setSearchInput("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[var(--color-light-gray)]"
              aria-label="Clear search"
            >
              <X size={11} style={{ color: "var(--color-mid-gray)" }} />
            </button>
          )}
        </div>
      </div>

      {/* ── Error state ── */}
      {error && !loading && (
        <div
          className="flex items-center gap-3 rounded-lg border p-4 text-sm"
          style={{
            backgroundColor: "var(--color-red-light)",
            borderColor: "rgba(176,74,58,0.2)",
            color: "var(--color-red)",
          }}
          role="alert"
        >
          <AlertCircle size={16} className="shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">Failed to load announcements</p>
            <p className="text-xs mt-0.5 opacity-80">{error}</p>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            style={{
              backgroundColor: "rgba(176,74,58,0.1)",
              color: "var(--color-red)",
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <ChangelogSkeleton />
      ) : grouped.length > 0 ? (
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.dateLabel} aria-label={`Changes from ${group.dateLabel}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--border-subtle)" }} />
                <time
                  className="text-[10px] sm:text-xs font-medium shrink-0 px-2"
                  style={{ color: "var(--color-mid-gray)" }}
                >
                  {group.dateLabel}
                </time>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--border-subtle)" }} />
              </div>
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        !error && (
          <div className="text-center py-16 sm:py-24">
            <div
              className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4"
              style={{ backgroundColor: "var(--color-light-gray)" }}
            >
              <GitCommit size={28} style={{ color: "var(--color-mid-gray)" }} />
            </div>
            {hasActiveFilters ? (
              <>
                <p className="text-sm font-medium" style={{ color: "var(--color-dark)" }}>
                  No matching entries
                </p>
                <p className="text-xs mt-1 mb-4" style={{ color: "var(--color-mid-gray)" }}>
                  Try adjusting your filter or search query
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTypeFilter("all");
                    setSearchInput("");
                  }}
                  className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: "var(--color-light-gray)",
                    color: "var(--color-body-text)",
                  }}
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium" style={{ color: "var(--color-dark)" }}>
                  No announcements yet
                </p>
                <p
                  className="text-xs mt-1 mb-5 mx-auto"
                  style={{ color: "var(--color-mid-gray)", maxWidth: "320px" }}
                >
                  Publish your first update. Partners see these on their changelog page.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
                  style={{
                    backgroundColor: "var(--color-dark)",
                    color: "var(--color-light)",
                  }}
                >
                  <Plus size={14} />
                  New entry
                </button>
              </>
            )}
          </div>
        )
      )}
    </div>
  );
}
