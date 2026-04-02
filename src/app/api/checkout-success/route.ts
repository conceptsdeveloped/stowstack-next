import { NextRequest } from "next/server";
import crypto from "crypto";
import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "checkout-success");
  if (limited) return limited;
  const origin = getOrigin(req);
  const sessionId = req.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return errorResponse("Missing session_id", 400, origin);
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!session || session.status !== "complete") {
      return errorResponse("Session not complete", 400, origin);
    }

    const customer = await stripe.customers.retrieve(
      session.customer as string,
    );
    if (!customer || (customer as Stripe.DeletedCustomer).deleted) {
      return errorResponse("Customer not found", 400, origin);
    }

    const meta = (customer as Stripe.Customer).metadata || {};
    if (!meta.signupComplete) {
      return errorResponse(
        "Signup not yet processed. Please wait a moment and refresh.",
        400,
        origin,
      );
    }

    const setupToken = crypto.randomBytes(32).toString("hex");
    const setupTokenHash = crypto
      .createHash("sha256")
      .update(setupToken)
      .digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    if (meta.userId) {
      try {
        await db.$executeRaw`
          UPDATE org_users SET setup_token_hash = ${setupTokenHash}, setup_token_expires = ${expiresAt}
          WHERE id = ${meta.userId}::uuid
        `;
      } catch {
        // User may not exist yet if webhook hasn't completed
      }
    }

    try {
      await stripe.customers.update(session.customer as string, {
        metadata: { tempPassword: "", signupComplete: "true" },
      });
    } catch {
      // Non-critical - metadata cleanup
    }

    return jsonResponse(
      {
        orgSlug: meta.orgSlug,
        email:
          session.metadata?.email ||
          session.customer_details?.email || "",
        tempPassword: meta.tempPassword,
        companyName: session.metadata?.companyName,
        plan: session.metadata?.plan,
      },
      200,
      origin,
    );
  } catch {
    return errorResponse("Failed to retrieve session details", 500, origin);
  }
}
