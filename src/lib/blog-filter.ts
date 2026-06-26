/**
 * Pure, framework-free filtering / sorting / tag helpers for the blog index.
 * Kept separate from the React UI so the logic is unit-testable and reusable.
 */

export interface BlogListItem {
  slug: string;
  title: string;
  description: string;
  pillar: string;
  pillarLabel: string;
  tags: string[];
  date: string; // ISO yyyy-mm-dd (lexicographically sortable)
  readingTime: number;
  featured: boolean;
  /** Precomputed lowercased haystack: title + description + tags + pillar label. */
  searchText: string;
}

export type SortKey = "newest" | "oldest" | "shortest" | "longest" | "az";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "oldest", label: "Oldest first" },
  { key: "shortest", label: "Quickest read" },
  { key: "longest", label: "Longest read" },
  { key: "az", label: "Title A–Z" },
];

export interface BlogFilter {
  /** Free-text query; whitespace-separated terms are AND-matched against searchText. */
  query?: string;
  /** Restrict to a single pillar key, or null/undefined for all. */
  pillar?: string | null;
  /** Tag filter; a post matches if it has ANY of these tags (broadening OR). */
  tags?: string[];
}

/** Build the lowercased search haystack for a post. */
export function buildSearchText(
  title: string,
  description: string,
  tags: string[],
  pillarLabel: string,
): string {
  return [title, description, pillarLabel, ...tags].join(" ").toLowerCase();
}

/** All tags across the posts with their frequency, sorted by count desc then alpha. */
export function collectTags(posts: BlogListItem[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.tags) {
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/** Per-pillar post counts (key -> count). */
export function countByPillar(posts: BlogListItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of posts) out[p.pillar] = (out[p.pillar] ?? 0) + 1;
  return out;
}

/** Filter posts by query (AND terms), pillar (exact), and tags (ANY-of). Pure. */
export function filterPosts(posts: BlogListItem[], filter: BlogFilter): BlogListItem[] {
  const terms = (filter.query ?? "")
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const pillar = filter.pillar ?? null;
  const tags = (filter.tags ?? []).filter(Boolean);

  return posts.filter((p) => {
    if (pillar && p.pillar !== pillar) return false;
    if (tags.length > 0 && !tags.some((t) => p.tags.includes(t))) return false;
    if (terms.length > 0 && !terms.every((term) => p.searchText.includes(term))) return false;
    return true;
  });
}

/** Return a new array sorted by the given key. Pure (does not mutate input). */
export function sortPosts(posts: BlogListItem[], sort: SortKey): BlogListItem[] {
  const copy = [...posts];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
    case "shortest":
      return copy.sort(
        (a, b) => a.readingTime - b.readingTime || b.date.localeCompare(a.date),
      );
    case "longest":
      return copy.sort(
        (a, b) => b.readingTime - a.readingTime || b.date.localeCompare(a.date),
      );
    case "az":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    case "newest":
    default:
      return copy.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
  }
}

/** True when no filters are active (default browse view). */
export function isDefaultView(filter: BlogFilter): boolean {
  return (
    !(filter.query ?? "").trim() &&
    !filter.pillar &&
    (filter.tags ?? []).length === 0
  );
}
