import { NextRequest } from "next/server";
import { stripe } from "@/lib/stripe";
import { jsonResponse, errorResponse, getOrigin, corsResponse } from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { plan, email, companyName, facilityCount, billingType, promoCode } = body;

    if (!plan || !email || !companyName) {
      return errorResponse("Missing required fields: plan, email, companyName", 400, origin);
    }

    // Look up or create Stripe customer
    const existingCustomers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string;

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      const newCustomer = await stripe.customers.create({
        email,
        name: companyName,
        metadata: { plan, facilityCount: String(facilityCount || 1) },
      });
      customerId = newCustomer.id;
    }

    // Determine price ID based on plan
    const priceMap: Record<string, string | undefined> = {
      launch: process.env.STRIPE_PRICE_LAUNCH,
      growth: process.env.STRIPE_PRICE_GROWTH,
      portfolio: process.env.STRIPE_PRICE_PORTFOLIO,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return errorResponse("Invalid plan", 400, origin);
    }

    const sessionParams: Record<string, unknown> = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: facilityCount || 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://stowstack.co"}/api/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://stowstack.co"}/pricing`,
      metadata: {
        plan,
        companyName,
        facilityCount: String(facilityCount || 1),
        billingType: billingType || "monthly",
      },
      subscription_data: {
        metadata: {
          plan,
          companyName,
          facilityCount: String(facilityCount || 1),
        },
      },
    };

    if (promoCode) {
      sessionParams.allow_promotion_codes = true;
    }

    const checkoutSession = await stripe.checkout.sessions.create(
      sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]
    );

    return jsonResponse({ url: checkoutSession.url }, 200, origin);
  } catch (err) {
    console.error("Checkout session error:", err);
    return errorResponse("Failed to create checkout session", 500, origin);
  }
}
