import { readFileSync } from "fs";
import path from "path";
import { db } from "@/lib/db";

const DOC_NAMES = ["CREATIVE", "STRATEGY", "BRAND_DOCTRINE"] as const;
type DocName = (typeof DOC_NAMES)[number];

const FILE_MAP: Record<DocName, string> = {
  CREATIVE: "CREATIVE.md",
  STRATEGY: "STRATEGY.md",
  BRAND_DOCTRINE: "BRAND_DOCTRINE.md",
};

// In-memory cache per serverless invocation
const _cache: Map<string, { content: string; version: number }> = new Map();

/**
 * Read a doctrine document. Checks DB first (latest version),
 * falls back to filesystem (initial seed). Caches for the
 * lifetime of the serverless function.
 */
export async function readDoctrine(docName: DocName): Promise<string> {
  const cached = _cache.get(docName);
  if (cached) return cached.content;

  // Try DB first
  try {
    const row = await db.doctrine_versions.findFirst({
      where: { doc_name: docName },
      orderBy: { version: "desc" },
      select: { content: true, version: true },
    });

    if (row) {
      _cache.set(docName, { content: row.content, version: row.version });
      return row.content;
    }
  } catch {
    // DB may not have the table yet, fall through to filesystem
  }

  // Fallback to filesystem (seed data)
  try {
    const content = readFileSync(
      path.resolve(process.cwd(), FILE_MAP[docName]),
      "utf-8",
    );
    _cache.set(docName, { content, version: 0 });
    return content;
  } catch {
    return "";
  }
}

/**
 * Write a new version of a doctrine document to the database.
 * Returns the new version number.
 */
export async function writeDoctrine(
  docName: DocName,
  content: string,
  changeSummary?: string,
): Promise<number> {
  // Get the current max version
  const latest = await db.doctrine_versions.findFirst({
    where: { doc_name: docName },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (latest?.version ?? 0) + 1;

  await db.doctrine_versions.create({
    data: {
      doc_name: docName,
      content,
      version: nextVersion,
      change_summary: changeSummary ?? null,
    },
  });

  // Update cache
  _cache.set(docName, { content, version: nextVersion });

  return nextVersion;
}

/**
 * Seed doctrine from filesystem into DB if no versions exist yet.
 * Safe to call multiple times — skips if versions already exist.
 */
export async function seedDoctrineIfNeeded(): Promise<void> {
  for (const docName of DOC_NAMES) {
    try {
      const exists = await db.doctrine_versions.findFirst({
        where: { doc_name: docName },
        select: { id: true },
      });

      if (!exists) {
        const content = readFileSync(
          path.resolve(process.cwd(), FILE_MAP[docName]),
          "utf-8",
        );
        if (content) {
          await db.doctrine_versions.create({
            data: {
              doc_name: docName,
              content,
              version: 1,
              change_summary: "Initial seed from filesystem",
            },
          });
        }
      }
    } catch {
      // Non-fatal — filesystem or DB may not be ready
    }
  }
}
