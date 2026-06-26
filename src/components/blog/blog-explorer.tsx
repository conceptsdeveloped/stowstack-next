"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Search, X } from "lucide-react";
import {
  type BlogListItem,
  type SortKey,
  SORT_OPTIONS,
  collectTags,
  countByPillar,
  filterPosts,
  sortPosts,
  isDefaultView,
} from "@/lib/blog-filter";

interface PillarMeta {
  key: string;
  label: string;
}

interface BlogExplorerProps {
  posts: BlogListItem[];
  pillars: PillarMeta[];
  initialPillar?: string | null;
  initialQuery?: string;
  initialSort?: SortKey;
  initialTags?: string[];
}

const VALID_SORTS = new Set(SORT_OPTIONS.map((o) => o.key));
const INITIAL_TAG_LIMIT = 12;

export function BlogExplorer({
  posts,
  pillars,
  initialPillar = null,
  initialQuery = "",
  initialSort = "newest",
  initialTags = [],
}: BlogExplorerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [pillar, setPillar] = useState<string | null>(initialPillar);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [sort, setSort] = useState<SortKey>(
    VALID_SORTS.has(initialSort) ? initialSort : "newest",
  );
  const [showAllTags, setShowAllTags] = useState(false);

  const pillarCounts = useMemo(() => countByPillar(posts), [posts]);
  const allTags = useMemo(() => collectTags(posts), [posts]);
  const visibleTags = showAllTags ? allTags : allTags.slice(0, INITIAL_TAG_LIMIT);

  const filter = { query, pillar, tags };
  const results = useMemo(
    () => sortPosts(filterPosts(posts, filter), sort),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [posts, query, pillar, tags, sort],
  );

  const defaultView = isDefaultView(filter);
  const featured = useMemo(
    () => posts.find((p) => p.featured) ?? posts[0],
    [posts],
  );
  // In the default browse view we pull the featured post out into its own card.
  const gridPosts =
    defaultView && featured ? results.filter((p) => p.slug !== featured.slug) : results;

  // Keep the URL in sync so a filtered view is shareable / bookmarkable.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (pillar) params.set("pillar", pillar);
    if (tags.length) params.set("tags", tags.join(","));
    if (sort !== "newest") params.set("sort", sort);
    const qs = params.toString();
    const url = qs ? `/blog?${qs}` : "/blog";
    window.history.replaceState(null, "", url);
  }, [query, pillar, tags, sort]);

  const hasFilters = !defaultView || sort !== "newest";

  function toggleTag(tag: string) {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function clearAll() {
    setQuery("");
    setPillar(null);
    setTags([]);
    setSort("newest");
  }

  const pillBase =
    "text-xs px-3 py-1.5 rounded-full transition-colors cursor-pointer";

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: "var(--text-tertiary)" }}
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts by keyword, topic, or tag..."
          aria-label="Search posts"
          className="w-full rounded-lg pl-9 pr-9 py-2.5 text-sm outline-none"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border-subtle)",
            color: "var(--text-primary)",
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-tertiary)" }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Category pills + sort */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPillar(null)}
            className={pillBase}
            style={{
              background: !pillar ? "var(--accent)" : "var(--bg-elevated)",
              color: !pillar ? "#fff" : "var(--text-secondary)",
              border: !pillar ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
            }}
          >
            All ({posts.length})
          </button>
          {pillars.map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => setPillar(pillar === p.key ? null : p.key)}
              className={pillBase}
              style={{
                background: pillar === p.key ? "var(--accent)" : "var(--bg-elevated)",
                color: pillar === p.key ? "#fff" : "var(--text-secondary)",
                border:
                  pillar === p.key
                    ? "1px solid var(--accent)"
                    : "1px solid var(--border-subtle)",
              }}
            >
              {p.label} ({pillarCounts[p.key] ?? 0})
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-tertiary)" }}>
          <span>Sort</span>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort posts"
            className="rounded-md px-2 py-1.5 text-xs outline-none cursor-pointer"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-secondary)",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {visibleTags.map(({ tag, count }) => {
            const active = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                aria-pressed={active}
                className="text-xs px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                style={{
                  background: active ? "var(--accent)" : "var(--bg-elevated)",
                  color: active ? "#fff" : "var(--text-tertiary)",
                  border: active ? "1px solid var(--accent)" : "1px solid var(--border-subtle)",
                }}
              >
                {tag} <span style={{ opacity: 0.6 }}>{count}</span>
              </button>
            );
          })}
          {allTags.length > INITIAL_TAG_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAllTags((v) => !v)}
              className="text-xs px-2.5 py-1 rounded-full cursor-pointer"
              style={{ color: "var(--text-secondary)", textDecoration: "underline" }}
            >
              {showAllTags ? "Show fewer" : `+${allTags.length - INITIAL_TAG_LIMIT} more tags`}
            </button>
          )}
        </div>
      )}

      {/* Result count + clear */}
      <div className="flex items-center justify-between mb-6">
        <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {results.length === posts.length
            ? `${posts.length} posts`
            : `${results.length} of ${posts.length} posts`}
        </p>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="text-xs flex items-center gap-1 cursor-pointer"
            style={{ color: "var(--text-secondary)" }}
          >
            <X size={12} /> Clear filters
          </button>
        )}
      </div>

      {/* Featured (default view only) */}
      {defaultView && featured && (
        <Link
          href={`/blog/${featured.slug}`}
          className="block rounded-lg p-8 mb-12 transition-colors group"
          style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}
        >
          <span
            className="text-xs font-semibold uppercase mb-4 block"
            style={{ color: "var(--accent)", letterSpacing: "var(--tracking-wide)" }}
          >
            Featured
          </span>
          <h2
            className="font-semibold mb-3 group-hover:opacity-80 transition-opacity"
            style={{ fontSize: "var(--text-subhead)", lineHeight: "var(--leading-snug)" }}
          >
            {featured.title}
          </h2>
          <p
            className="mb-4"
            style={{ color: "var(--text-secondary)", fontSize: "var(--text-body)", maxWidth: "600px" }}
          >
            {featured.description}
          </p>
          <div className="flex items-center gap-4 text-xs" style={{ color: "var(--text-tertiary)" }}>
            <span>{featured.pillarLabel}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {featured.readingTime} min read
            </span>
            <span>·</span>
            <span>{featured.date}</span>
          </div>
        </Link>
      )}

      {/* Results */}
      {gridPosts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm mb-3" style={{ color: "var(--text-tertiary)" }}>
            No posts match your search and filters.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs cursor-pointer"
            style={{ color: "var(--accent)" }}
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {gridPosts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="flex items-start justify-between gap-6 py-6 group border-b"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <div className="flex-1 min-w-0">
                <h3
                  className="font-semibold mb-1 group-hover:opacity-80 transition-opacity"
                  style={{ fontSize: "var(--text-body)" }}
                >
                  {post.title}
                </h3>
                <p className="text-sm line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                  {post.description}
                </p>
                <div
                  className="flex items-center gap-3 mt-2 text-xs"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setPillar(post.pillar);
                    }}
                    className="hover:underline cursor-pointer"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {post.pillarLabel}
                  </button>
                  <span>·</span>
                  <span>{post.readingTime} min</span>
                  <span>·</span>
                  <span>{post.date}</span>
                </div>
              </div>
              <ArrowRight
                size={16}
                className="flex-shrink-0 mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-tertiary)" }}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
