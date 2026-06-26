import changelog from "@/data/changelog.json";

export type ChangelogCategory = "feature" | "improvement" | "fix";

export interface ChangelogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  category: ChangelogCategory;
  scope: string | null;
  title: string;
}

export interface ChangelogMonth {
  label: string; // e.g. "June 2026"
  key: string; // e.g. "2026-05" (zero-based month for stable sort)
  entries: ChangelogEntry[];
}

/** All entries, newest first (the JSON is already commit-order). */
export function getChangelogEntries(): ChangelogEntry[] {
  return (changelog.entries as ChangelogEntry[]) ?? [];
}

/** Entries grouped by calendar month, newest month first. */
export function getChangelogByMonth(): ChangelogMonth[] {
  const groups = new Map<string, ChangelogEntry[]>();

  for (const entry of getChangelogEntries()) {
    const d = new Date(`${entry.date}T00:00:00`);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(entry);
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, entries]) => ({
      key,
      label: new Date(`${entries[0].date}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
      entries,
    }));
}
