import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "shared-audits");
  if (limited) return limited;
  const origin = getOrigin(req);
  const url = new URL(req.url);

  // Public access by slug (for shared audit report pages)
  const slug = url.searchParams.get("slug");
  if (slug) {
    const audit = await db.shared_audits.findFirst({ where: { slug } });
    if (!audit) return errorResponse("Audit not found", 404, origin);

    // Increment view count
    db.shared_audits.update({ where: { id: audit.id }, data: { views: { increment: 1 } } }).catch((err) => console.error("[audit_view] Fire-and-forget failed:", err));

    return jsonResponse({ audit }, 200, origin);
  }

  // Admin: list all
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const audits = await db.shared_audits.findMany({
    orderBy: { created_at: "desc" },
  });

  return jsonResponse({ audits }, 200, origin);
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "shared-audits");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { id, action } = body as { id?: string; action?: string };

  if (!id) return errorResponse("id is required", 400, origin);
  if (!action || !["extend", "revoke"].includes(action)) {
    return errorResponse("action must be 'extend' or 'revoke'", 400, origin);
  }

  try {
    const audit = await db.shared_audits.findUnique({ where: { id } });
    if (!audit) return errorResponse("Audit not found", 404, origin);

    if (action === "extend") {
      const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.shared_audits.update({
        where: { id },
        data: { expires_at: newExpiry },
      });
    } else {
      // Revoke by setting expiry to the past
      await db.shared_audits.update({
        where: { id },
        data: { expires_at: new Date(0) },
      });
    }

    const updated = await db.shared_audits.findUnique({ where: { id } });
    return jsonResponse({ success: true, audit: updated }, 200, origin);
  } catch {
    return errorResponse("Failed to update shared audit", 500, origin);
  }
}
