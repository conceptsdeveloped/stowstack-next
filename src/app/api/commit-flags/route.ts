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

const VALID_FLAG_TYPES = [
  "needs-review",
  "breaking-change",
  "hotfix",
  "discussion-needed",
  "blocked",
  "good-example",
  "needs-testing",
];

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-flags");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const flags = await db.commit_flags.findMany({
      orderBy: { created_at: "desc" },
    });

    const byHash: Record<string, (typeof flags)[number][]> = {};
    for (const f of flags) {
      if (!byHash[f.commit_hash]) byHash[f.commit_hash] = [];
      byHash[f.commit_hash].push(f);
    }

    return jsonResponse({ flags: byHash }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch flags", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-flags");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { commitHash, flagType, reason, flaggedBy } = body || {};

    if (!commitHash) {
      return errorResponse("commitHash is required", 400, origin);
    }
    if (!flagType || !VALID_FLAG_TYPES.includes(flagType)) {
      return errorResponse(
        `Invalid flag type. Must be one of: ${VALID_FLAG_TYPES.join(", ")}`,
        400,
        origin
      );
    }
    if (!flaggedBy) {
      return errorResponse("flaggedBy is required", 400, origin);
    }

    const existing = await db.commit_flags.findMany({
      where: {
        commit_hash: commitHash,
        flag_type: flagType,
        flagged_by: flaggedBy,
      },
    });

    if (existing.length > 0) {
      return errorResponse(
        "You already flagged this commit with that type",
        409,
        origin
      );
    }

    const flag = await db.commit_flags.create({
      data: {
        commit_hash: commitHash,
        flag_type: flagType,
        reason: (reason || "").trim(),
        flagged_by: flaggedBy,
      },
    });

    return jsonResponse({ flag }, 200, origin);
  } catch {
    return errorResponse("Failed to add flag", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-flags");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return errorResponse("id is required", 400, origin);
    }

    await db.commit_flags.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to remove flag", 500, origin);
  }
}
