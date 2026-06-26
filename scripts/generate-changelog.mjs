#!/usr/bin/env node
/**
 * Generates the public changelog from git history.
 *
 * Reads conventional commits (feat / fix / perf), maps each to a
 * customer-readable entry, and writes src/data/changelog.json. The public
 * /changelog page renders that file.
 *
 * Fail-safe by design: if git is unavailable or produces zero entries
 * (e.g. a shallow CI checkout), the existing committed JSON is left intact
 * so a deploy never ships an empty changelog.
 *
 * Run manually with `npm run changelog`. Also runs at build time.
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(ROOT, "src/data/changelog.json");

// Commit types we surface, and the public category they map to.
const TYPE_TO_CATEGORY = {
  feat: "feature",
  fix: "fix",
  perf: "improvement",
};

// Scopes we never publish (security-fix specifics don't belong on a public page).
const EXCLUDE_SCOPES = new Set(["security"]);

const US = "\x1f"; // unit separator between fields
const RS = "\x1e"; // record separator between commits

function readGitLog() {
  // %x1f / %x1e emit the raw separator bytes so commit subjects can contain anything.
  const fmt = ["%H", "%ad", "%s"].join("%x1f");
  const raw = execSync(`git log --no-merges --date=short --pretty=format:"${fmt}%x1e"`, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  return raw
    .split(RS)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) => {
      const [hash, date, subject] = r.split(US);
      return { hash, date, subject };
    });
}

const CONVENTIONAL = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;

function toEntry({ hash, date, subject }) {
  const m = CONVENTIONAL.exec(subject);
  if (!m) return null;
  const [, type, scope, , description] = m;
  const category = TYPE_TO_CATEGORY[type];
  if (!category) return null;
  if (scope && EXCLUDE_SCOPES.has(scope.toLowerCase())) return null;

  // Capitalize first letter; leave the rest of the operator-voiced subject as-is.
  const title = description.charAt(0).toUpperCase() + description.slice(1);

  return { id: hash.slice(0, 10), date, category, scope: scope || null, title };
}

function main() {
  let all = [];
  try {
    all = readGitLog();
  } catch (err) {
    console.warn(`[changelog] git log failed: ${err.message}`);
  }

  const entries = all.map(toEntry).filter(Boolean);

  // Never let a shallow / partial CI checkout shrink (or empty) the committed
  // changelog. Only overwrite when git yields at least as many entries.
  if (existsSync(OUT)) {
    let existingCount = 0;
    try {
      existingCount = (JSON.parse(readFileSync(OUT, "utf8")).entries ?? []).length;
    } catch {
      existingCount = 0;
    }
    if (entries.length < existingCount) {
      console.warn(
        `[changelog] git yielded ${entries.length} entries (< ${existingCount} committed) ` +
          "— keeping existing changelog.json (likely a shallow checkout)"
      );
      return;
    }
  }

  const dropped = all.length - entries.length;

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify({ entries }, null, 2) + "\n");
  console.log(
    `[changelog] wrote ${entries.length} entries to src/data/changelog.json` +
      (dropped > 0 ? ` (${dropped} non-customer commits skipped)` : "")
  );
}

main();
