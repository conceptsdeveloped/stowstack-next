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

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-comments");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const comments = await db.commit_comments.findMany({
      orderBy: { created_at: "asc" },
    });

    const byHash: Record<string, (typeof comments)[number][]> = {};
    for (const c of comments) {
      if (!byHash[c.commit_hash]) byHash[c.commit_hash] = [];
      byHash[c.commit_hash].push(c);
    }

    return jsonResponse({ comments: byHash }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch comments", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-comments");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { commitHash, author, body: commentBody } = body || {};

    if (!commitHash) {
      return errorResponse("commitHash is required", 400, origin);
    }
    if (!author?.trim()) {
      return errorResponse("author is required", 400, origin);
    }
    if (!commentBody?.trim()) {
      return errorResponse("Comment body is required", 400, origin);
    }

    const comment = await db.commit_comments.create({
      data: {
        commit_hash: commitHash,
        author: author.trim(),
        body: commentBody.trim(),
      },
    });

    return jsonResponse({ comment }, 200, origin);
  } catch {
    return errorResponse("Failed to add comment", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "commit-comments");
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

    await db.commit_comments.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to remove comment", 500, origin);
  }
}
