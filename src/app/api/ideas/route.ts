import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const ideas = await db.ideas.findMany({
      orderBy: { created_at: "desc" },
    });
    return jsonResponse({ ideas }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch ideas", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { title, description, category, priority } = body || {};

    if (!title?.trim()) {
      return errorResponse("Title is required", 400, origin);
    }

    const idea = await db.ideas.create({
      data: {
        title: title.trim(),
        description: (description || "").trim(),
        category: category || "general",
        priority: priority || "medium",
        status: "new",
        votes: 0,
      },
    });

    return jsonResponse({ idea }, 200, origin);
  } catch {
    return errorResponse("Failed to create idea", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, ...updates } = body || {};

    if (!id) {
      return errorResponse("id is required", 400, origin);
    }

    const existing = await db.ideas.findUnique({ where: { id } });
    if (!existing) {
      return errorResponse("Idea not found", 404, origin);
    }

    const allowed = [
      "title",
      "description",
      "category",
      "priority",
      "status",
      "votes",
    ] as const;
    const data: Record<string, unknown> = { updated_at: new Date() };

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        data[key] = updates[key];
      }
    }

    const idea = await db.ideas.update({
      where: { id },
      data,
    });

    return jsonResponse({ idea }, 200, origin);
  } catch {
    return errorResponse("Failed to update idea", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id } = body || {};

    if (!id) {
      return errorResponse("id is required", 400, origin);
    }

    await db.ideas.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to delete idea", 500, origin);
  }
}
