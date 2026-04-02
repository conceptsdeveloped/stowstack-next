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

/**
 * Classify a commit subject into a type based on conventional commit patterns
 * and common keywords used in the StorageAds codebase.
 */
function classifyCommit(subject: string): "feature" | "fix" | "improvement" {
  const lower = (subject || "").toLowerCase().trim();

  // Fix patterns: fix(...):, hotfix, bugfix, patch, resolve, crash, repair, revert (reverts are often fixes)
  if (
    /^fix[\s(:]/.test(lower) ||
    /bug\s*fix/i.test(lower) ||
    /^hotfix/i.test(lower) ||
    /^patch/i.test(lower) ||
    /^resolve/i.test(lower) ||
    /crash/i.test(lower) ||
    /^revert/i.test(lower) ||
    /repair/i.test(lower) ||
    /broken/i.test(lower)
  ) {
    return "fix";
  }

  // Feature patterns: feat(...):, add, new, implement, introduce, launch, create, build, enable
  if (
    /^feat[\s(:]/.test(lower) ||
    /^add\s/.test(lower) ||
    /^new\s/.test(lower) ||
    /^implement/i.test(lower) ||
    /^introduce/i.test(lower) ||
    /^launch/i.test(lower) ||
    /^create/i.test(lower) ||
    /^build\s/.test(lower) ||
    /^enable/i.test(lower)
  ) {
    return "feature";
  }

  // Everything else: refactors, docs, chore, perf, style, ci, test, update, improve, enhance
  return "improvement";
}

/**
 * Generate human-readable and technical summaries for a commit using Claude Haiku.
 * Falls back to cleaned-up commit subject if the API key is missing or the call fails.
 */
async function generateSummaries(
  subject: string,
  body: string,
  devNote: string
): Promise<{ laymans: string; technical: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  // Fallback: clean up conventional commit prefix and return
  if (!apiKey) {
    const cleaned = (subject || "")
      .replace(
        /^(feat|fix|chore|refactor|docs|style|perf|test|ci|build)(\(.+?\))?:\s*/i,
        ""
      )
      .replace(/([A-Z])/g, " $1")
      .trim();
    const laymans =
      devNote ||
      (cleaned
        ? `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`
        : subject || "Code update.");
    return {
      laymans,
      technical: body || subject || "No details available.",
    };
  }

  try {
    const contextParts = [
      `Commit subject: ${subject}`,
      body ? `Commit body: ${body}` : "",
      devNote ? `Developer note: ${devNote}` : "",
    ].filter(Boolean);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `You are summarizing a code commit for a self-storage marketing SaaS called StorageAds. Two audiences read this:

1. LAYMAN'S SUMMARY: For non-technical stakeholders (facility owners, managers). One sentence, plain English, absolutely no jargon. Focus on what changed for users or the business. Start with an action verb.
2. TECHNICAL SUMMARY: For developers. 1-2 sentences, concise, mention specific systems/components/files affected.

${contextParts.join("\n")}

Respond in exactly this JSON format (no markdown, no code fences):
{"laymans": "...", "technical": "..."}`,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = (data.content?.[0]?.text || "").trim();
      // Strip potential markdown fences
      const jsonStr = text.replace(/^```json?\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(jsonStr);
      if (parsed.laymans && parsed.technical) {
        return { laymans: parsed.laymans, technical: parsed.technical };
      }
    }
  } catch {
    // Fall through to fallback below
  }

  // Final fallback
  const cleaned = (subject || "")
    .replace(
      /^(feat|fix|chore|refactor|docs|style|perf|test|ci|build)(\(.+?\))?:\s*/i,
      ""
    )
    .trim();
  return {
    laymans: devNote || cleaned || subject || "Code update.",
    technical: body || subject || "No details available.",
  };
}

/* ─── CORS preflight ─── */
export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/* ─── GET: Fetch changelog entries with optional filters ─── */
export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const typeFilter = url.searchParams.get("type"); // feature | fix | improvement
    const devFilter = url.searchParams.get("dev"); // developer name
    const searchQuery = url.searchParams.get("search"); // free-text search
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    const limit = Math.min(Math.max(parseInt(limitParam || "50", 10) || 50, 1), 200);
    const offset = Math.max(parseInt(offsetParam || "0", 10) || 0, 0);

    // Build Prisma where clause
    const where: Record<string, unknown> = {};

    if (typeFilter && ["feature", "fix", "improvement"].includes(typeFilter)) {
      where.commit_type = typeFilter;
    }

    if (devFilter) {
      where.dev_name = { contains: devFilter, mode: "insensitive" };
    }

    if (searchQuery) {
      where.OR = [
        { subject: { contains: searchQuery, mode: "insensitive" } },
        { laymans_summary: { contains: searchQuery, mode: "insensitive" } },
        { technical_summary: { contains: searchQuery, mode: "insensitive" } },
        { dev_note: { contains: searchQuery, mode: "insensitive" } },
        { commit_hash: { startsWith: searchQuery.toLowerCase() } },
      ];
    }

    // Parallel queries: entries + total count + distinct developers
    const [enrichments, totalCount, devNamesRaw] = await Promise.all([
      db.commit_enrichments.findMany({
        where,
        orderBy: { committed_at: "desc" },
        take: limit,
        skip: offset,
      }),
      db.commit_enrichments.count({ where }),
      db.commit_enrichments.findMany({
        where: { dev_name: { not: null } },
        distinct: ["dev_name"],
        select: { dev_name: true },
        orderBy: { dev_name: "asc" },
      }),
    ]);

    // Shape entries for the frontend
    const entries = enrichments.map((e) => ({
      id: e.id,
      commitHash: e.commit_hash,
      title:
        e.laymans_summary ||
        (e.subject || "")
          .replace(
            /^(feat|fix|chore|refactor|docs|style|perf|test|ci|build)(\(.+?\))?:\s*/i,
            ""
          )
          .trim() ||
        e.commit_hash.slice(0, 7),
      description: e.technical_summary || e.body || "",
      type:
        (e.commit_type as "feature" | "fix" | "improvement") ||
        classifyCommit(e.subject || ""),
      date: (e.committed_at || e.created_at || new Date()).toISOString(),
      devName: e.dev_name || "Unknown",
      devNote: e.dev_note || "",
      subject: e.subject || "",
    }));

    // Unique developer names for filter dropdown
    const developers = devNamesRaw
      .map((d) => d.dev_name)
      .filter((name): name is string => !!name);

    // Type counts for filter badges
    const [featureCount, fixCount, improvementCount] = await Promise.all([
      db.commit_enrichments.count({ where: { commit_type: "feature" } }),
      db.commit_enrichments.count({ where: { commit_type: "fix" } }),
      db.commit_enrichments.count({ where: { commit_type: "improvement" } }),
    ]);

    return jsonResponse(
      {
        entries,
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
        developers,
        typeCounts: {
          feature: featureCount,
          fix: fixCount,
          improvement: improvementCount,
          all: featureCount + fixCount + improvementCount,
        },
      },
      200,
      origin
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Failed to fetch changelog: ${message}`, 500, origin);
  }
}

/* ─── POST: Create or update a commit enrichment ─── */
export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "commit-notes");
  if (limited) return limited;

  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const {
      commitHash,
      devNote,
      devName,
      subject,
      body: commitBody,
      committedAt,
    } = body || {};

    if (!commitHash || typeof commitHash !== "string") {
      return errorResponse("commitHash is required and must be a string", 400, origin);
    }
    if (!devName || typeof devName !== "string") {
      return errorResponse("devName is required and must be a string", 400, origin);
    }

    const { laymans, technical } = await generateSummaries(
      subject || "",
      commitBody || "",
      devNote || ""
    );

    const commitType = classifyCommit(subject || "");
    const committedDate = committedAt ? new Date(committedAt) : new Date();

    const enrichment = await db.commit_enrichments.upsert({
      where: { commit_hash: commitHash },
      update: {
        subject: subject || undefined,
        body: commitBody || undefined,
        dev_note: devNote || undefined,
        dev_name: devName,
        commit_type: commitType,
        laymans_summary: laymans,
        technical_summary: technical,
        committed_at: committedDate,
        updated_at: new Date(),
      },
      create: {
        commit_hash: commitHash,
        subject: subject || "",
        body: commitBody || "",
        dev_note: devNote || "",
        dev_name: devName,
        commit_type: commitType,
        laymans_summary: laymans,
        technical_summary: technical,
        committed_at: committedDate,
      },
    });

    return jsonResponse({ enrichment }, 201, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Failed to save enrichment: ${message}`, 500, origin);
  }
}

/* ─── PATCH: Update an existing enrichment (re-generates summaries) ─── */
export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { commitHash, devNote, subject, body: commitBody } = body || {};

    if (!commitHash || typeof commitHash !== "string") {
      return errorResponse("commitHash is required and must be a string", 400, origin);
    }

    const existing = await db.commit_enrichments.findUnique({
      where: { commit_hash: commitHash },
    });

    if (!existing) {
      return errorResponse(
        `No enrichment found for commit ${commitHash}`,
        404,
        origin
      );
    }

    // Use provided values or fall back to existing
    const finalSubject = subject || existing.subject || "";
    const finalBody = commitBody || existing.body || "";
    const finalNote = devNote ?? existing.dev_note ?? "";

    const { laymans, technical } = await generateSummaries(
      finalSubject,
      finalBody,
      finalNote
    );

    const enrichment = await db.commit_enrichments.update({
      where: { commit_hash: commitHash },
      data: {
        subject: subject !== undefined ? subject : existing.subject,
        body: commitBody !== undefined ? commitBody : existing.body,
        dev_note: devNote !== undefined ? devNote : existing.dev_note,
        commit_type: classifyCommit(finalSubject),
        laymans_summary: laymans,
        technical_summary: technical,
        updated_at: new Date(),
      },
    });

    return jsonResponse({ enrichment }, 200, origin);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    return errorResponse(`Failed to update enrichment: ${message}`, 500, origin);
  }
}
