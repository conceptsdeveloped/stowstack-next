import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const handoffs = await db.dev_handoffs.findMany({
      where: { status: { not: "archived" } },
      orderBy: { created_at: "desc" },
    });
    return jsonResponse({ handoffs }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch handoffs", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { fromDev, toDev, title, body: handoffBody, commitHash } = body;

    if (!fromDev)
      return errorResponse("fromDev is required", 400, origin);
    if (!title?.trim())
      return errorResponse("title is required", 400, origin);
    if (!handoffBody?.trim())
      return errorResponse("body is required", 400, origin);

    const handoff = await db.dev_handoffs.create({
      data: {
        from_dev: fromDev,
        to_dev: toDev || null,
        title: title.trim(),
        body: handoffBody.trim(),
        commit_hash: commitHash || null,
        status: "active",
      },
    });

    return jsonResponse({ handoff }, 200, origin);
  } catch {
    return errorResponse("Failed to create handoff", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id) return errorResponse("id is required", 400, origin);

    const validStatuses = ["active", "acknowledged", "archived"];
    if (status && !validStatuses.includes(status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        400,
        origin,
      );
    }

    const handoff = await db.dev_handoffs.update({
      where: { id },
      data: { status: status || "acknowledged", updated_at: new Date() },
    });

    return jsonResponse({ handoff }, 200, origin);
  } catch {
    return errorResponse("Failed to update handoff", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  if (!isAdminRequest(req)) return errorResponse("Unauthorized", 401, origin);

  try {
    const body = await req.json();
    const { id } = body;

    if (!id) return errorResponse("id is required", 400, origin);

    await db.dev_handoffs.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to remove handoff", 500, origin);
  }
}
