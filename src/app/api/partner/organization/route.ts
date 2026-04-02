import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  verifyCsrfOrigin,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-organization");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  if (session.user.role !== "org_admin") {
    return errorResponse("Only organization admins can manage the organization", 403, origin);
  }

  try {
    const body = (await req.json()) as { action?: string };

    if (body.action === "cancel_deletion") {
      const org = await db.organizations.findUnique({
        where: { id: session.user.organization_id },
        select: { status: true, scheduled_deletion_at: true },
      });

      if (!org || org.status !== "pending_deletion") {
        return errorResponse("Organization is not scheduled for deletion", 400, origin);
      }

      await db.organizations.update({
        where: { id: session.user.organization_id },
        data: {
          status: "active",
          scheduled_deletion_at: null,
        },
      });

      return jsonResponse({ message: "Deletion cancelled. Organization is active again." }, 200, origin);
    }

    return errorResponse("Unknown action", 400, origin);
  } catch (err) {
    console.error("Organization PATCH error:", err);
    return errorResponse("Failed to update organization", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "partner-organization");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  // Only org_admin can delete
  if (session.user.role !== "org_admin") {
    return errorResponse("Only organization admins can delete the organization", 403, origin);
  }

  try {
    const body = (await req.json()) as { confirmName?: string };

    if (!body.confirmName || typeof body.confirmName !== "string") {
      return errorResponse("Confirmation name is required", 400, origin);
    }

    // Fetch the org to compare names
    const org = await db.organizations.findUnique({
      where: { id: session.user.organization_id },
      select: { name: true, status: true },
    });

    if (!org) {
      return errorResponse("Organization not found", 404, origin);
    }

    if (org.status === "pending_deletion") {
      return errorResponse("Organization is already scheduled for deletion", 400, origin);
    }

    if (body.confirmName.trim() !== org.name) {
      return errorResponse(
        "Organization name does not match. Please type the exact name to confirm.",
        400,
        origin
      );
    }

    const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await db.organizations.update({
      where: { id: session.user.organization_id },
      data: {
        status: "pending_deletion",
        scheduled_deletion_at: scheduledAt,
      },
    });

    return jsonResponse(
      {
        message: "Deletion scheduled",
        scheduledDeletionAt: scheduledAt.toISOString(),
      },
      200,
      origin
    );
  } catch (err) {
    console.error("Organization DELETE error:", err);
    return errorResponse("Failed to schedule deletion", 500, origin);
  }
}
