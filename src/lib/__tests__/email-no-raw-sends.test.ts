// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression guard: the centralized email layer (src/lib/email.ts) must be the
 * ONLY place that talks to Resend directly. This test fails if any other file
 * reintroduces a raw `fetch("https://api.resend.com/...")`, a `new Resend(...)`,
 * or an `import { Resend } from "resend"` — which would bypass the layer's
 * validation, retry, idempotency, and dry-run/redirect safety guards.
 *
 * If this test fails: route the send through `sendEmail()` / `sendBatchEmails()`
 * from "@/lib/email" instead of calling Resend directly.
 */

const SRC_ROOT = path.resolve(process.cwd(), "src");

// The single sanctioned location for direct Resend access.
const ALLOWED = new Set([
  path.join("lib", "email.ts"),
  // Test files reference the endpoint URL/SDK name in assertions, not real sends.
]);

const FORBIDDEN: Array<{ label: string; re: RegExp }> = [
  { label: "raw Resend REST endpoint", re: /api\.resend\.com/ },
  { label: "Resend SDK constructor", re: /new\s+Resend\s*\(/ },
  { label: 'Resend SDK import', re: /from\s+["']resend["']/ },
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

describe("email layer is the only Resend sender", () => {
  const files = walk(SRC_ROOT);

  it("finds a non-trivial number of source files (sanity)", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("has no direct Resend access outside src/lib/email.ts", () => {
    const violations: string[] = [];

    for (const file of files) {
      const rel = path.relative(SRC_ROOT, file);
      if (ALLOWED.has(rel)) continue;
      // Skip the test directory itself — assertions legitimately mention the URL/SDK.
      if (rel.includes(`__tests__${path.sep}`)) continue;

      const contents = readFileSync(file, "utf8");
      for (const { label, re } of FORBIDDEN) {
        if (re.test(contents)) {
          violations.push(`${rel}: ${label}`);
        }
      }
    }

    expect(
      violations,
      `Direct Resend access must go through src/lib/email.ts. Offenders:\n${violations.join("\n")}`
    ).toEqual([]);
  });
});
