import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSession } from "@/lib/session-auth";
import { jsonResponse, errorResponse, getOrigin, corsResponse, verifyCsrfOrigin } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.BILLING, "create-billing-portal");
  if (limited) return limited;
  const csrfErr = verifyCsrfOrigin(req);
  if (csrfErr) return csrfErr;
  const origin = getOrigin(req);
  const session = await getSession(req);
  if (!session) return errorResponse("Unauthorized", 401, origin);

  try {
    if (!session.organization.hasStripe) {
      return errorResponse("No billing account found", 400, origin);
    }

    // Look up Stripe customer
    const org = await (await import("@/lib/db")).db.organizations.findUnique({
      where: { id: session.organization.id },
      select: { stripe_customer_id: true },
    });

    if (!org?.stripe_customer_id) {
      return errorResponse("No Stripe customer found", 400, origin);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: org.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://storageads.com"}/portal`,
    });

    return jsonResponse({ url: portalSession.url }, 200, origin);
  } catch (err) {
    console.error("Billing portal error:", err);
    return errorResponse("Failed to create billing portal session", 500, origin);
  }
}
