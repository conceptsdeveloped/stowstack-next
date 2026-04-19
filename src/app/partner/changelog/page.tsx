"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  Sparkles,
  Wrench,
  Bug,
  Megaphone,
} from "lucide-react";
import { usePartnerAuth } from "@/components/partner/use-partner-auth";

interface ChangelogEntry {
  id: string;
  title: string;
  body: string;
  category: string | null;
  published_at: string | null;
  created_at: string | null;
}

interface GroupedEntries {
  label: string;
  entries: ChangelogEntry[];
}

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; Icon: typeof Sparkles }
> = {
  feature: {
    label: "Feature",
    color: "text-[var(--color-gold)]",
    bg: "bg-[var(--color-gold)]/10",
    Icon: Sparkles,
  },
  improvement: {
    label: "Improvement",
    color: "text-[#6a9bcc]",
    bg: "bg-[#6a9bcc]/10",
    Icon: Wrench,
  },
  fix: {
    label: "Fix",
    color: "text-[var(--color-green)]",
    bg: "bg-[var(--color-green)]/10",
    Icon: Bug,
  },
};

function groupByMonth(entries: ChangelogEntry[]): GroupedEntries[] {
  const groups = new Map<string, ChangelogEntry[]>();

  for (const entry of entries) {
    const date = new Date(entry.published_at || entry.created_at || "");
    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
    const label = date.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(entry);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([, entries]) => ({
      label: new Date(
        entries[0].published_at || entries[0].created_at || ""
      ).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      entries,
    }));
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ChangelogPage() {
  const { session, loading: authLoading, authFetch } = usePartnerAuth();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastViewedAt, setLastViewedAt] = useState<string | null>(null);
  const viewedMarked = useRef(false);

  const fetchChangelog = useCallback(async () => {
    try {
      const res = await fetch("/api/changelog");
      if (!res.ok) {
        setError("Failed to load changelog");
        return;
      }
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setError("Connection error");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLastViewed = useCallback(async () => {
    if (!session) return;
    try {
      const res = await authFetch("/api/partner/notifications/preferences");
      if (res.ok) {
        // We'll get user data including last_changelog_viewed_at from a dedicated source
        // For now, use localStorage as a lightweight approach
        const stored = localStorage.getItem("changelog_last_viewed");
        if (stored) setLastViewedAt(stored);
      }
    } catch {
      // Non-critical
    }
  }, [session, authFetch]);

  const markAsViewed = useCallback(async () => {
    if (!session || viewedMarked.current) return;
    viewedMarked.current = true;
    try {
      await authFetch("/api/partner/changelog-viewed", {
        method: "PATCH",
        body: JSON.stringify({}),
      });
      const now = new Date().toISOString();
      localStorage.setItem("changelog_last_viewed", now);
      setLastViewedAt(now);
    } catch {
      // Non-critical
    }
  }, [session, authFetch]);

  useEffect(() => {
    fetchChangelog();
    fetchLastViewed();
  }, [fetchChangelog, fetchLastViewed]);

  useEffect(() => {
    if (!loading && entries.length > 0) {
      markAsViewed();
    }
  }, [loading, entries.length, markAsViewed]);

  const isNew = (entry: ChangelogEntry): boolean => {
    if (!lastViewedAt) return false;
    const publishedAt = entry.published_at || entry.created_at;
    if (!publishedAt) return false;
    return new Date(publishedAt) > new Date(lastViewedAt);
  };

  if (authLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-primary)] text-xl font-semibold text-[var(--color-dark)]">
            Changelog
          </h1>
          <p className="mt-1 text-sm text-[var(--color-body-text)]">
            Latest updates and improvements
          </p>
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5"
            >
              <div className="flex items-center gap-3">
                <div className="h-6 w-20 rounded-full bg-[var(--color-light-gray)]" />
                <div className="h-4 w-48 rounded bg-[var(--color-light-gray)]" />
              </div>
              <div className="mt-3 h-3 w-full rounded bg-[var(--color-light-gray)]" />
              <div className="mt-2 h-3 w-3/4 rounded bg-[var(--color-light-gray)]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-primary)] text-xl font-semibold text-[var(--color-dark)]">
            Changelog
          </h1>
        </div>
        <div className="rounded-xl border border-[var(--color-red)]/20 bg-[var(--color-red)]/5 p-6 text-center">
          <p className="text-sm text-[var(--color-red)]">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              fetchChangelog();
            }}
            className="mt-2 text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-hover)]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-[family-name:var(--font-primary)] text-xl font-semibold text-[var(--color-dark)]">
            Changelog
          </h1>
          <p className="mt-1 text-sm text-[var(--color-body-text)]">
            Latest updates and improvements
          </p>
        </div>
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] py-16 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-[var(--color-mid-gray)]" />
          <p className="mt-3 text-sm font-medium text-[var(--color-dark)]">
            No updates yet
          </p>
          <p className="mt-1 text-xs text-[var(--color-mid-gray)]">
            Check back soon!
          </p>
        </div>
      </div>
    );
  }

  const grouped = groupByMonth(entries);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-primary)] text-xl font-semibold text-[var(--color-dark)]">
          Changelog
        </h1>
        <p className="mt-1 text-sm text-[var(--color-body-text)]">
          Latest updates and improvements
        </p>
      </div>

      {grouped.map((group) => (
        <div key={group.label}>
          <h2 className="mb-3 font-[family-name:var(--font-primary)] text-sm font-semibold text-[var(--color-mid-gray)]">
            {group.label}
          </h2>
          <div className="space-y-3">
            {group.entries.map((entry) => {
              const config =
                CATEGORY_CONFIG[entry.category || "improvement"] ||
                CATEGORY_CONFIG.improvement;
              const { Icon } = config;
              const entryIsNew = isNew(entry);

              return (
                <div
                  key={entry.id}
                  className="group relative rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 transition-colors hover:border-[var(--color-gold)]/20"
                >
                  {entryIsNew && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--color-gold)] opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--color-gold)]" />
                    </span>
                  )}
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.color}`}
                      >
                        <Icon className="h-3 w-3" />
                        {config.label}
                      </span>
                      <div>
                        <h3 className="text-sm font-medium text-[var(--color-dark)]">
                          {entry.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-[var(--color-body-text)]">
                          {entry.body}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-[var(--color-mid-gray)]">
                      {formatDate(entry.published_at || entry.created_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
