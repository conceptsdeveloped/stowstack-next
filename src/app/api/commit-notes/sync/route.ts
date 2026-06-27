import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { classifyCommit, generateSummaries } from "@/lib/commit-enrichment";

const GITHUB_REPO = "conceptsdeveloped/stowstack-next";
const BATCH_SIZE = 5; // Process 5 commits concurrently to respect Anthropic rate limits
const MAX_COMMITS = 100; // Max commits to sync per request

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
}

/* ─── CORS preflight ─── */
export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * POST /api/commit-notes/sync
 *
 * Fetches recent commits from the GitHub repository and syncs them into the
 * commit_enrichments table. Generates AI summaries for each new commit.
 *
 * Query params:
 *   - count: number of commits to fetch (default 50, max 100)
 *
 * Skips commits that already exist in the database.
 * Processes in batches of 5 to avoid Anthropic rate limits.
 */
export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "commit-notes-sync");
  if (limited) return limited;

  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const countParam = url.searchParams.get("count");
  const count = Math.min(Math.max(parseInt(countParam || "50", 10) || 50, 1), MAX_COMMITS);

  try {
    // ── Step 1: Fetch commits from GitHub ──
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "StorageAds-Changelog-Sync",
    };

    // Use GitHub token if available (avoids rate limiting on private repos)
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const ghRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=${count}`,
      { headers },
    );

    if (!ghRes.ok) {
      const ghBody = await ghRes.text().catch(() => "");
      const remaining = ghRes.headers.get("x-ratelimit-remaining");
      const resetAt = ghRes.headers.get("x-ratelimit-reset");

      let errorMsg = `GitHub API returned ${ghRes.status}: ${ghRes.statusText}`;
      if (remaining === "0" && resetAt) {
        const resetDate = new Date(parseInt(resetAt, 10) * 1000);
        errorMsg += `. Rate limit exceeded — resets at ${resetDate.toLocaleTimeString()}.`;
      } else if (ghBody) {
        errorMsg += `. ${ghBody.slice(0, 200)}`;
      }

      return errorResponse(errorMsg, 502, origin);
    }

    const commits: GitHubCommit[] = await ghRes.json();

    if (!Array.isArray(commits) || commits.length === 0) {
      return jsonResponse(
        { synced: 0, skipped: 0, total: 0, message: "No commits found in repository" },
        200,
        origin,
      );
    }

    // ── Step 2: Filter out already-synced commits ──
    const existingRecords = await db.commit_enrichments.findMany({
      where: { commit_hash: { in: commits.map((c) => c.sha) } },
      select: { commit_hash: true },
    });
    const existingHashes = new Set(existingRecords.map((e) => e.commit_hash));

    const newCommits = commits.filter((c) => !existingHashes.has(c.sha));
    const skipped = commits.length - newCommits.length;

    if (newCommits.length === 0) {
      return jsonResponse(
        {
          synced: 0,
          skipped,
          total: commits.length,
          message: "All commits already synced",
        },
        200,
        origin,
      );
    }

    // ── Step 3: Process in batches ──
    let synced = 0;
    const errors: string[] = [];

    for (let i = 0; i < newCommits.length; i += BATCH_SIZE) {
      const batch = newCommits.slice(i, i + BATCH_SIZE);

      const results = await Promise.allSettled(
        batch.map(async (commit) => {
          const [subject, ...bodyParts] = commit.commit.message.split("\n");
          const body = bodyParts.join("\n").trim();
          const commitType = classifyCommit(subject);

          const { laymans, technical } = await generateSummaries(subject, body);

          await db.commit_enrichments.upsert({
            where: { commit_hash: commit.sha },
            update: {}, // Don't overwrite existing records
            create: {
              commit_hash: commit.sha,
              subject: subject || "",
              body: body || null,
              dev_name: commit.commit.author.name || "Unknown",
              commit_type: commitType,
              laymans_summary: laymans,
              technical_summary: technical,
              committed_at: new Date(commit.commit.author.date),
            },
          });

          return commit.sha;
        }),
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          synced++;
        } else {
          const errMsg =
            result.reason instanceof Error ? result.reason.message : String(result.reason);
          errors.push(errMsg);
        }
      }
    }

    return jsonResponse(
      {
        synced,
        skipped,
        failed: errors.length,
        total: commits.length,
        message:
          errors.length > 0
            ? `Synced ${synced} commits with ${errors.length} error(s)`
            : `Successfully synced ${synced} new commit${synced === 1 ? "" : "s"}`,
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
      },
      200,
      origin,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Sync failed: ${message}`, 500, origin);
  }
}
