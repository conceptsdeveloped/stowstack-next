"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useAdminFetch } from "@/hooks/use-admin-fetch";
import {
  GitCommit,
  Sparkles,
  Bug,
  Wrench,
  RefreshCw,
  Search,
  Filter,
  ChevronDown,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  X,
  Users,
} from "lucide-react";

/* ═══════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════ */

interface ChangelogEntry {
  id: string;
  commitHash: string;
  title: string;
  description: string;
  type: "feature" | "fix" | "improvement";
  date: string;
  devName: string;
  devNote: string;
  subject: string;
}

interface ChangelogResponse {
  entries: ChangelogEntry[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  developers: string[];
  typeCounts: {
    feature: number;
    fix: number;
    improvement: number;
    all: number;
  };
}

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const TYPE_CONFIG: Record<
  string,
  {
    bg: string;
    text: string;
    icon: typeof GitCommit;
    label: string;
  }
> = {
  feature: {
    bg: "rgba(120,140,93,0.12)",
    text: "var(--color-green)",
    icon: Sparkles,
    label: "Feature",
  },
  fix: {
    bg: "rgba(176,74,58,0.1)",
    text: "var(--color-red)",
    icon: Bug,
    label: "Fix",
  },
  improvement: {
    bg: "rgba(181,139,63,0.1)",
    text: "var(--color-gold)",
    icon: Wrench,
    label: "Improvement",
  },
};

const TYPE_FILTERS = [
  { key: "all", label: "All", icon: GitCommit },
  { key: "feature", label: "Features", icon: Sparkles },
  { key: "fix", label: "Fixes", icon: Bug },
  { key: "improvement", label: "Improvements", icon: Wrench },
] as const;

const GITHUB_REPO = "conceptsdeveloped/stowstack-next";
const PAGE_SIZE = 50;

/* ═══════════════════════════════════════════
   UTILITY: Group entries by date
   ═══════════════════════════════════════════ */

function groupByDate(
  entries: ChangelogEntry[]
): { dateLabel: string; entries: ChangelogEntry[] }[] {
  const groups: Record<string, ChangelogEntry[]> = {};
  const orderedKeys: string[] = [];

  for (const entry of entries) {
    const dateKey = new Date(entry.date).toLocaleDateString("en-US", {
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
    <div className="space-y-8" role="status" aria-label="Loading changelog">
      {Array.from({ length: 3 }).map((_, gi) => (
        <div key={gi}>
          <div className="h-4 w-32 rounded bg-[var(--color-dark)]/5 mb-4 animate-pulse" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
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
                    <div className="h-3 w-1/3 rounded bg-[var(--color-dark)]/5" />
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
   COMPONENT: Commit hash copy button
   ═══════════════════════════════════════════ */

function CopyHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [hash]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono transition-colors hover:bg-[var(--color-light-gray)]"
      style={{ color: "var(--color-mid-gray)" }}
      title={`Copy commit hash: ${hash}`}
      aria-label={`Copy commit hash ${hash.slice(0, 7)}`}
    >
      {hash.slice(0, 7)}
      {copied ? (
        <Check size={10} style={{ color: "var(--color-green)" }} />
      ) : (
        <Copy size={10} />
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════
   COMPONENT: Developer filter dropdown
   ═══════════════════════════════════════════ */

function DevFilterDropdown({
  developers,
  selected,
  onSelect,
}: {
  developers: string[];
  selected: string;
  onSelect: (dev: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open]);

  if (developers.length === 0) return null;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
        style={{
          backgroundColor: selected
            ? "var(--color-gold)"
            : "var(--color-light-gray)",
          color: selected ? "var(--color-light)" : "var(--color-mid-gray)",
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Filter by developer"
      >
        <Users size={12} />
        {selected || "Developer"}
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border shadow-lg overflow-hidden"
          style={{
            backgroundColor: "var(--bg-elevated)",
            borderColor: "var(--border-subtle)",
          }}
          role="listbox"
          aria-label="Developer options"
        >
          <button
            type="button"
            onClick={() => {
              onSelect("");
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--color-light-gray)]"
            style={{
              color: !selected
                ? "var(--color-gold)"
                : "var(--color-body-text)",
              fontWeight: !selected ? 600 : 400,
            }}
            role="option"
            aria-selected={!selected}
          >
            All Developers
          </button>
          {developers.map((dev) => (
            <button
              key={dev}
              type="button"
              onClick={() => {
                onSelect(dev);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-[var(--color-light-gray)]"
              style={{
                color:
                  selected === dev
                    ? "var(--color-gold)"
                    : "var(--color-body-text)",
                fontWeight: selected === dev ? 600 : 400,
              }}
              role="option"
              aria-selected={selected === dev}
            >
              {dev}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   COMPONENT: Sync status banner
   ═══════════════════════════════════════════ */

function SyncBanner({
  result,
  onDismiss,
}: {
  result: string;
  onDismiss: () => void;
}) {
  const isError =
    result.toLowerCase().includes("fail") ||
    result.toLowerCase().includes("error");

  return (
    <div
      className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm animate-in fade-in"
      style={{
        backgroundColor: isError
          ? "var(--color-red-light)"
          : "var(--color-green-light)",
        borderColor: isError
          ? "rgba(176,74,58,0.2)"
          : "rgba(120,140,93,0.2)",
        color: isError ? "var(--color-red)" : "var(--color-green)",
      }}
      role="alert"
    >
      <div className="flex items-center gap-2">
        {isError ? (
          <AlertCircle size={14} />
        ) : (
          <Check size={14} />
        )}
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
   COMPONENT: Single changelog entry card
   ═══════════════════════════════════════════ */

function EntryCard({ entry }: { entry: ChangelogEntry }) {
  const config = TYPE_CONFIG[entry.type] || TYPE_CONFIG.improvement;
  const Icon = config.icon;
  const [expanded, setExpanded] = useState(false);

  const githubUrl = `https://github.com/${GITHUB_REPO}/commit/${entry.commitHash}`;

  return (
    <div
      className="rounded-xl border p-4 sm:p-5 transition-colors hover:bg-[var(--color-light-gray)]/30"
      style={{
        backgroundColor: "var(--bg-elevated)",
        borderColor: "var(--border-subtle)",
      }}
    >
      <div className="flex items-start gap-3">
        {/* Type icon */}
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
          style={{ backgroundColor: config.bg }}
          aria-hidden="true"
        >
          <Icon size={14} style={{ color: config.text }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + badge row */}
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

          {/* Technical description (expandable) */}
          {entry.description && (
            <div className="mt-1">
              <p
                className={`text-xs leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
                style={{ color: "var(--color-body-text)" }}
              >
                {entry.description}
              </p>
              {entry.description.length > 160 && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="text-[10px] font-medium mt-1 transition-colors"
                  style={{ color: "var(--color-gold)" }}
                >
                  {expanded ? "Show less" : "Show more"}
                </button>
              )}
            </div>
          )}

          {/* Developer note */}
          {entry.devNote && (
            <div
              className="mt-2 rounded-lg px-3 py-2 text-xs italic"
              style={{
                backgroundColor: "var(--color-gold-light)",
                color: "var(--color-gold-hover)",
              }}
            >
              &ldquo;{entry.devNote}&rdquo;
            </div>
          )}

          {/* Meta row */}
          <div
            className="flex items-center gap-2 mt-2 flex-wrap text-[11px]"
            style={{ color: "var(--color-mid-gray)" }}
          >
            {entry.devName && entry.devName !== "Unknown" && (
              <span className="font-medium">{entry.devName}</span>
            )}
            {entry.devName && entry.devName !== "Unknown" && (
              <span aria-hidden="true">&middot;</span>
            )}
            <CopyHash hash={entry.commitHash} />
            <span aria-hidden="true">&middot;</span>
            <time dateTime={entry.date}>
              {new Date(entry.date).toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </time>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 transition-colors hover:text-[var(--color-gold)]"
              title="View on GitHub"
              aria-label={`View commit ${entry.commitHash.slice(0, 7)} on GitHub`}
            >
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════════════════ */

export default function ChangelogPage() {
  // ── State ──
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [devFilter, setDevFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [allEntries, setAllEntries] = useState<ChangelogEntry[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Build query params ──
  const params = useMemo(() => {
    const p: Record<string, string> = {
      limit: String(PAGE_SIZE),
      offset: String(offset),
    };
    if (typeFilter !== "all") p.type = typeFilter;
    if (devFilter) p.dev = devFilter;
    if (searchQuery) p.search = searchQuery;
    return p;
  }, [typeFilter, devFilter, searchQuery, offset]);

  // ── Fetch data ──
  const { data, loading, error, refetch } =
    useAdminFetch<ChangelogResponse>("/api/commit-notes", params);

  // ── Accumulate entries for infinite scroll ──
  useEffect(() => {
    if (data) {
      if (offset === 0) {
        setAllEntries(data.entries);
      } else {
        setAllEntries((prev) => {
          // Deduplicate by id
          const existingIds = new Set(prev.map((e) => e.id));
          const newEntries = data.entries.filter(
            (e) => !existingIds.has(e.id)
          );
          return [...prev, ...newEntries];
        });
      }
      setHasMore(data.hasMore);
      setLoadingMore(false);
    }
  }, [data, offset]);

  // ── Reset on filter change ──
  useEffect(() => {
    setOffset(0);
    setAllEntries([]);
    setHasMore(true);
  }, [typeFilter, devFilter, searchQuery]);

  // ── Debounced search ──
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchInput(value);
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      searchTimeoutRef.current = setTimeout(() => {
        setSearchQuery(value.trim());
      }, 350);
    },
    []
  );

  // Cleanup search timeout
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // ── Load more (infinite scroll) ──
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      setLoadingMore(true);
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [loadingMore, hasMore, loading]);

  // ── Intersection observer for infinite scroll ──
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  // ── Sync handler ──
  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const adminKey =
        typeof window !== "undefined"
          ? localStorage.getItem("storageads_admin_key")
          : null;
      const res = await fetch("/api/commit-notes/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(adminKey ? { "X-Admin-Key": adminKey } : {}),
        },
      });
      const result = await res.json();
      if (res.ok) {
        setSyncResult(result.message || `Synced ${result.synced} commits`);
        // Reset pagination and refetch
        setOffset(0);
        setAllEntries([]);
        setHasMore(true);
        // Small delay to let state settle, then refetch
        setTimeout(() => refetch(), 100);
      } else {
        setSyncResult(result.error || `Sync failed (${res.status})`);
      }
    } catch {
      setSyncResult("Sync failed — check your network connection");
    } finally {
      setSyncing(false);
    }
  }, [refetch]);

  // ── Clear search ──
  const clearSearch = useCallback(() => {
    setSearchInput("");
    setSearchQuery("");
  }, []);

  // ── Derived data ──
  const grouped = useMemo(() => groupByDate(allEntries), [allEntries]);
  const typeCounts = data?.typeCounts;
  const developers = data?.developers || [];
  const totalCount = data?.total ?? 0;
  const isInitialLoad = loading && offset === 0;
  const hasActiveFilters =
    typeFilter !== "all" || devFilter !== "" || searchQuery !== "";

  return (
    <div className="space-y-5 p-3 sm:p-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-xl sm:text-2xl font-semibold"
            style={{ color: "var(--color-dark)" }}
          >
            Changelog
          </h1>
          <p
            className="text-xs sm:text-sm mt-1"
            style={{ color: "var(--color-mid-gray)" }}
          >
            {totalCount > 0
              ? `${totalCount} update${totalCount === 1 ? "" : "s"} tracked`
              : "Recent updates and improvements"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all self-start sm:self-auto"
          style={{
            backgroundColor: syncing
              ? "var(--color-light-gray)"
              : "var(--color-gold)",
            color: syncing
              ? "var(--color-mid-gray)"
              : "var(--color-light)",
            cursor: syncing ? "not-allowed" : "pointer",
            opacity: syncing ? 0.7 : 1,
          }}
          aria-label={syncing ? "Syncing commits from GitHub" : "Sync commits from GitHub"}
          aria-busy={syncing}
        >
          <RefreshCw
            size={14}
            className={syncing ? "animate-spin" : ""}
          />
          <span className="hidden sm:inline">
            {syncing ? "Syncing..." : "Sync Commits"}
          </span>
          <span className="sm:hidden">
            {syncing ? "Syncing..." : "Sync"}
          </span>
        </button>
      </div>

      {/* ── Sync result banner ── */}
      {syncResult && (
        <SyncBanner
          result={syncResult}
          onDismiss={() => setSyncResult(null)}
        />
      )}

      {/* ── Filters row ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Type filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" role="tablist" aria-label="Filter by type">
          <Filter
            size={14}
            style={{ color: "var(--color-mid-gray)" }}
            className="shrink-0"
            aria-hidden="true"
          />
          {TYPE_FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = typeFilter === f.key;
            const count =
              typeCounts?.[f.key as keyof typeof typeCounts] ?? null;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setTypeFilter(f.key)}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: isActive
                    ? "var(--color-gold)"
                    : "var(--color-light-gray)",
                  color: isActive
                    ? "var(--color-light)"
                    : "var(--color-mid-gray)",
                }}
                role="tab"
                aria-selected={isActive}
                aria-label={`${f.label}${count !== null ? ` (${count})` : ""}`}
              >
                <Icon size={11} />
                <span>{f.label}</span>
                {count !== null && (
                  <span
                    className="text-[9px] font-semibold rounded-full px-1.5 py-px"
                    style={{
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.2)"
                        : "rgba(0,0,0,0.06)",
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search + developer filter */}
        <div className="flex items-center gap-2">
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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search commits..."
              className="w-full sm:w-48 rounded-lg border pl-8 pr-8 py-1.5 text-xs outline-none transition-colors focus:border-[var(--color-gold)]"
              style={{
                backgroundColor: "var(--bg-elevated)",
                borderColor: "var(--border-subtle)",
                color: "var(--color-dark)",
              }}
              aria-label="Search changelog entries"
            />
            {searchInput && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-[var(--color-light-gray)]"
                aria-label="Clear search"
              >
                <X size={11} style={{ color: "var(--color-mid-gray)" }} />
              </button>
            )}
          </div>

          <DevFilterDropdown
            developers={developers}
            selected={devFilter}
            onSelect={setDevFilter}
          />
        </div>
      </div>

      {/* ── Active filter indicators ── */}
      {hasActiveFilters && !isInitialLoad && (
        <div
          className="flex items-center gap-2 text-xs"
          style={{ color: "var(--color-mid-gray)" }}
        >
          <span>
            Showing {allEntries.length} of {totalCount} entries
          </span>
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              setDevFilter("");
              setSearchInput("");
              setSearchQuery("");
            }}
            className="font-medium transition-colors hover:text-[var(--color-gold)]"
            style={{ color: "var(--color-gold)" }}
          >
            Clear filters
          </button>
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
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
            <p className="font-medium">Failed to load changelog</p>
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

      {/* ── Loading state ── */}
      {isInitialLoad ? (
        <ChangelogSkeleton />
      ) : grouped.length > 0 ? (
        /* ── Entry list grouped by date ── */
        <div className="space-y-8">
          {grouped.map((group) => (
            <section key={group.dateLabel} aria-label={`Changes from ${group.dateLabel}`}>
              {/* Date separator */}
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-px flex-1"
                  style={{ backgroundColor: "var(--border-subtle)" }}
                />
                <time
                  className="text-[10px] sm:text-xs font-medium shrink-0 px-2"
                  style={{ color: "var(--color-mid-gray)" }}
                >
                  {group.dateLabel}
                </time>
                <div
                  className="h-px flex-1"
                  style={{ backgroundColor: "var(--border-subtle)" }}
                />
              </div>

              {/* Entries */}
              <div className="space-y-2">
                {group.entries.map((entry) => (
                  <EntryCard key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))}

          {/* Infinite scroll sentinel */}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex justify-center py-6"
              role="status"
              aria-label="Loading more entries"
            >
              {loadingMore && (
                <div className="flex items-center gap-2">
                  <div
                    className="h-5 w-5 border-2 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: "var(--color-gold)", borderTopColor: "transparent" }}
                  />
                  <span
                    className="text-xs"
                    style={{ color: "var(--color-mid-gray)" }}
                  >
                    Loading more...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* End of list */}
          {!hasMore && allEntries.length > 0 && (
            <p
              className="text-center text-xs py-4"
              style={{ color: "var(--color-mid-gray)" }}
            >
              You&apos;ve reached the end &middot; {totalCount} total{" "}
              {totalCount === 1 ? "entry" : "entries"}
            </p>
          )}
        </div>
      ) : (
        /* ── Empty state ── */
        <div className="text-center py-16 sm:py-24">
          <div
            className="inline-flex items-center justify-center h-16 w-16 rounded-2xl mb-4"
            style={{ backgroundColor: "var(--color-light-gray)" }}
          >
            <GitCommit
              size={28}
              style={{ color: "var(--color-mid-gray)" }}
            />
          </div>

          {hasActiveFilters ? (
            <>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-dark)" }}
              >
                No matching entries
              </p>
              <p
                className="text-xs mt-1 mb-4"
                style={{ color: "var(--color-mid-gray)" }}
              >
                Try adjusting your filters or search query
              </p>
              <button
                type="button"
                onClick={() => {
                  setTypeFilter("all");
                  setDevFilter("");
                  setSearchInput("");
                  setSearchQuery("");
                }}
                className="text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: "var(--color-light-gray)",
                  color: "var(--color-body-text)",
                }}
              >
                Clear all filters
              </button>
            </>
          ) : (
            <>
              <p
                className="text-sm font-medium"
                style={{ color: "var(--color-dark)" }}
              >
                No changelog entries yet
              </p>
              <p
                className="text-xs mt-1 mb-5 mx-auto"
                style={{
                  color: "var(--color-mid-gray)",
                  maxWidth: "320px",
                }}
              >
                Sync your Git history to populate the changelog with
                AI-generated summaries of every commit
              </p>
              <button
                type="button"
                onClick={handleSync}
                disabled={syncing}
                className="inline-flex items-center gap-2 text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
                style={{
                  backgroundColor: "var(--color-gold)",
                  color: "var(--color-light)",
                  opacity: syncing ? 0.7 : 1,
                }}
                aria-label="Sync commits from GitHub to populate changelog"
              >
                <RefreshCw
                  size={14}
                  className={syncing ? "animate-spin" : ""}
                />
                {syncing ? "Syncing..." : "Sync from GitHub"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
