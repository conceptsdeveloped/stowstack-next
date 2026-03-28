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

  try {
    const entries = await db.changelog_entries.findMany({
      orderBy: { published_at: "desc" },
      take: 20,
    });

    return jsonResponse({ entries }, 200, origin);
  } catch (err) {
    console.error("Changelog GET error:", err);
    return errorResponse("Failed to fetch changelog", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const denied = requireAdminKey(req);
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      title?: string;
      body?: string;
      category?: string;
    };

    if (!body.title || typeof body.title !== "string" || body.title.trim().length === 0) {
      return errorResponse("Title is required", 400, origin);
    }

    if (!body.body || typeof body.body !== "string" || body.body.trim().length === 0) {
      return errorResponse("Body is required", 400, origin);
    }

    const validCategories = ["feature", "improvement", "fix"];
    const category = body.category && validCategories.includes(body.category)
      ? body.category
      : "improvement";

    const entry = await db.changelog_entries.create({
      data: {
        title: body.title.trim(),
        body: body.body.trim(),
        category,
      },
    });

    return jsonResponse({ entry }, 201, origin);
  } catch (err) {
    console.error("Changelog POST error:", err);
    return errorResponse("Failed to create changelog entry", 500, origin);
  }
}
