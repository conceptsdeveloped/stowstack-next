import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, verifyCsrfOrigin, captureRouteError } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { authenticatePortalRequest } from "@/lib/portal-auth";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.BILLING, "create-billing-portal");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);

  // Portal-client auth. This route formerly required a partner/org session
  // (`ss_` token) that a portal client never holds, so "Manage Payment Method"
  // always 401'd. Authenticate the portal client (access code + email in the
  // query) and resolve billing through their facility's organization.
  const scope = await authenticatePortalRequest(req);
  if (scope instanceof NextResponse) return scope;
  if (scope.kind !== "client") {
    return errorResponse("Client context required", 400, origin);
  }

  try {
    // clients → facilities → organizations.stripe_customer_id
    const facility = await db.facilities.findUnique({
      where: { id: scope.facilityId },
      select: { organizations: { select: { stripe_customer_id: true } } },
    });
    const stripeCustomerId = facility?.organizations?.stripe_customer_id;
    if (!stripeCustomerId) {
      return errorResponse("No billing account found", 400, origin);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://storageads.com"}/portal`,
    });

    return jsonResponse({ url: portalSession.url }, 200, origin);
  } catch (err) {
    console.error("Billing portal error:", err);
    captureRouteError(err, "create-billing-portal");
    return errorResponse("Failed to create billing portal session", 500, origin);
  }
}
