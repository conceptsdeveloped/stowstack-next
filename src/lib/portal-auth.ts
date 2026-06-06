import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isAdminRequest, errorResponse } from "@/lib/api-helpers";

/**
 * Result of authenticating a client-portal API request.
 *  - { kind: "admin" }  — authenticated via X-Admin-Key (founder/staff god-mode;
 *                          may read across facilities).
 *  - { kind: "client", facilityId } — authenticated via a client access code
 *                          (accessCode + email); pinned to that client's facility.
 */
export type PortalScope =
  | { kind: "admin" }
  | { kind: "client"; facilityId: string };

/**
 * Fail-closed authentication for client-portal API routes.
 *
 * Returns a PortalScope on success or a 401 NextResponse on failure. Callers MUST
 * check `instanceof NextResponse` and return it BEFORE running any query — never
 * let a query execute for an unauthenticated request. A caller-supplied facilityId
 * is never trusted as authorization: admins must name the target explicitly, and
 * clients are pinned to the facility their access code resolves to.
 *
 * Credentials are read from query params (accessCode + email) to match the
 * existing portal GET routes; the admin key is the X-Admin-Key header.
 */
export async function authenticatePortalRequest(
  req: NextRequest
): Promise<PortalScope | NextResponse> {
  if (isAdminRequest(req)) return { kind: "admin" };

  const url = new URL(req.url);
  const accessCode = url.searchParams.get("accessCode");
  const email = url.searchParams.get("email");

  if (accessCode && email) {
    const client = await db.clients.findFirst({
      where: {
        access_code: accessCode,
        email: { equals: email.trim(), mode: "insensitive" },
      },
      select: { facility_id: true },
    });
    if (client?.facility_id) {
      return { kind: "client", facilityId: client.facility_id };
    }
  }

  return errorResponse("Unauthorized", 401, req.headers.get("origin"));
}
