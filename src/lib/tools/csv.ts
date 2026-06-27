/**
 * Generic CSV helpers shared by the operator tools at /tools — pure, no DOM.
 *
 * Each calculator builds its own row set (a 2D array of stringified cells) in
 * its pure lib, then the client wraps the serialized text in a Blob and
 * triggers the download. Keeping serialization here means every tool exports
 * with identical, RFC-4180-ish quoting and a consistent filename scheme.
 */

export type CsvCell = string;
export type CsvRow = readonly CsvCell[];

/** Serialize rows to RFC-4180-ish CSV text, quoting every cell. */
export function rowsToCsv(rows: readonly CsvRow[]): string {
  return rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
}

/**
 * Build a safe download filename: `${prefix}-${slug-of-name}.csv`, falling back
 * to `${prefix}-storage.csv` when no usable name is supplied.
 */
export function csvFileName(prefix: string, name?: string): string {
  const slug = (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${prefix}-${slug || "storage"}.csv`;
}
