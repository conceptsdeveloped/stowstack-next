import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-12-18.acacia" as Stripe.LatestApiVersion,
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() for lazy initialization */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export const PLANS = {
  launch: {
    name: "Launch",
    price: 750,
    priceId: process.env.STRIPE_PRICE_LAUNCH!,
    facilityLimit: 1,
    landingPageLimit: 2,
    teamLimit: 3,
  },
  growth: {
    name: "Growth",
    price: 1500,
    priceId: process.env.STRIPE_PRICE_GROWTH!,
    facilityLimit: 3,
    landingPageLimit: 5,
    teamLimit: 10,
  },
  portfolio: {
    name: "Portfolio",
    price: 0, // Custom pricing
    priceId: process.env.STRIPE_PRICE_PORTFOLIO!,
    facilityLimit: -1,
    landingPageLimit: -1,
    teamLimit: -1,
  },
} as const;

export type PlanKey = keyof typeof PLANS;
