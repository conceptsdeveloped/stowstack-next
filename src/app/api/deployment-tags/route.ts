import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

const VALID_ENVS = ["production", "staging", "preview"];

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const tags = await db.deployment_tags.findMany({
      orderBy: { created_at: "desc" },
    });

    const byHash: Record<string, typeof tags> = {};
    for (const t of tags) {
      if (!byHash[t.commit_hash]) byHash[t.commit_hash] = [];
      byHash[t.commit_hash].push(t);
    }

    return jsonResponse({ tags: byHash }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch deployment tags", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { commitHash, environment, deployedBy, version, notes } = body;

    if (!commitHash)
      return errorResponse("commitHash is required", 400, origin);
    if (!deployedBy)
      return errorResponse("deployedBy is required", 400, origin);
    if (environment && !VALID_ENVS.includes(environment)) {
      return errorResponse(
        `Invalid environment. Must be one of: ${VALID_ENVS.join(", ")}`,
        400,
        origin,
      );
    }

    const tag = await db.deployment_tags.create({
      data: {
        commit_hash: commitHash,
        environment: environment || "production",
        deployed_by: deployedBy,
        version: version || null,
        notes: notes || null,
      },
    });

    return jsonResponse({ tag }, 200, origin);
  } catch {
    return errorResponse("Failed to create deployment tag", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) return errorResponse("id is required", 400, origin);

    await db.deployment_tags.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to remove deployment tag", 500, origin);
  }
}
