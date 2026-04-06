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

const VALID_STATUSES = ["reviewed", "approved", "needs-changes"];

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-reviews");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const reviews = await db.commit_reviews.findMany({
      orderBy: { created_at: "desc" },
    });

    const byHash: Record<string, (typeof reviews)[number][]> = {};
    for (const r of reviews) {
      if (!byHash[r.commit_hash]) byHash[r.commit_hash] = [];
      byHash[r.commit_hash].push(r);
    }

    return jsonResponse({ reviews: byHash }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch reviews", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-reviews");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { commitHash, reviewedBy, status } = body || {};

    if (!commitHash) {
      return errorResponse("commitHash is required", 400, origin);
    }
    if (!reviewedBy) {
      return errorResponse("reviewedBy is required", 400, origin);
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        400,
        origin
      );
    }

    const review = await db.commit_reviews.upsert({
      where: {
        commit_hash_reviewed_by: {
          commit_hash: commitHash,
          reviewed_by: reviewedBy,
        },
      },
      update: {
        status: status || "reviewed",
        created_at: new Date(),
      },
      create: {
        commit_hash: commitHash,
        reviewed_by: reviewedBy,
        status: status || "reviewed",
      },
    });

    return jsonResponse({ review }, 200, origin);
  } catch {
    return errorResponse("Failed to save review", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-reviews");
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

    await db.commit_reviews.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to remove review", 500, origin);
  }
}
