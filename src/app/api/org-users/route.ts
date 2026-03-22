import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);
  if (session.user.role !== "org_admin" && !session.user.is_superadmin) {
    return errorResponse("Forbidden", 403, origin);
  }

  try {
    const users = await db.org_users.findMany({
      where: { organization_id: session.organization.id },
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        created_at: true,
        last_login_at: true,
      },
    });

    return jsonResponse({ users }, 200, origin);
  } catch (err) {
    console.error("Org users error:", err);
    return errorResponse("Failed to fetch users", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);
  if (session.user.role !== "org_admin" && !session.user.is_superadmin) {
    return errorResponse("Forbidden", 403, origin);
  }

  try {
    const body = await req.json();
    const { email, name, role } = body;

    if (!email || !role) {
      return errorResponse("Email and role are required", 400, origin);
    }

    const validRoles = ["org_admin", "facility_manager", "viewer"];
    if (!validRoles.includes(role)) {
      return errorResponse("Invalid role", 400, origin);
    }

    // Check for existing user in org
    const existing = await db.org_users.findFirst({
      where: { organization_id: session.organization.id, email },
    });
    if (existing) return errorResponse("User already exists in organization", 400, origin);

    // Generate invite token
    const inviteToken = crypto.randomBytes(32).toString("hex");
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const user = await db.org_users.create({
      data: {
        organization_id: session.organization.id,
        email,
        name: name || "",
        role,
        status: "invited",
        invite_token: inviteToken,
        invite_expires_at: inviteExpires,
      },
    });

    return jsonResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
      },
      inviteToken,
    }, 200, origin);
  } catch (err) {
    console.error("Org user invite error:", err);
    return errorResponse("Failed to invite user", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);
  if (session.user.role !== "org_admin" && !session.user.is_superadmin) {
    return errorResponse("Forbidden", 403, origin);
  }

  try {
    const body = await req.json();
    const { id, role, status } = body;
    if (!id) return errorResponse("Missing user ID", 400, origin);

    const user = await db.org_users.findFirst({
      where: { id, organization_id: session.organization.id },
    });
    if (!user) return errorResponse("User not found", 404, origin);

    const updateData: Record<string, unknown> = {};
    if (role) updateData.role = role;
    if (status) updateData.status = status;

    const updated = await db.org_users.update({
      where: { id },
      data: updateData,
    });

    return jsonResponse({
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
        status: updated.status,
      },
    }, 200, origin);
  } catch (err) {
    console.error("Org user update error:", err);
    return errorResponse("Failed to update user", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);
  if (session.user.role !== "org_admin" && !session.user.is_superadmin) {
    return errorResponse("Forbidden", 403, origin);
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return errorResponse("Missing user ID", 400, origin);

    // Prevent deleting self
    if (id === session.user.id) {
      return errorResponse("Cannot remove yourself", 400, origin);
    }

    await db.org_users.delete({
      where: { id },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    console.error("Org user delete error:", err);
    return errorResponse("Failed to remove user", 500, origin);
  }
}
