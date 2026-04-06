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
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "betapad-notes");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const limitParam = url.searchParams.get("limit");
    const take = limitParam ? parseInt(limitParam, 10) || 100 : 500;

    const notes = await db.betapad_notes.findMany({
      where: sessionId ? { session_id: sessionId } : undefined,
      orderBy: { created_at: "desc" },
      take,
    });

    return jsonResponse({ notes }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch notes", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "betapad-notes");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { sessionId, entryType, entryData } = body || {};

    if (!sessionId || !entryType || !entryData) {
      return errorResponse(
        "sessionId, entryType, and entryData are required",
        400,
        origin
      );
    }

    const note = await db.betapad_notes.create({
      data: {
        session_id: sessionId,
        entry_type: entryType,
        entry_data: entryData,
      },
    });

    return jsonResponse({ note }, 200, origin);
  } catch {
    return errorResponse("Failed to save note", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "betapad-notes");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return errorResponse("id is required", 400, origin);
    }

    await db.betapad_notes.delete({ where: { id } });
    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to delete note", 500, origin);
  }
}
