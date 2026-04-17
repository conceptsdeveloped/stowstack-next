import { db } from "./db";
import { PLANS, type PlanKey } from "./stripe";

export type PlanLimit = {
  facilityLimit: number; // -1 = unlimited
  landingPageLimit: number;
  teamLimit: number;
};

export const DEFAULT_PLAN: PlanKey = "launch";

/**
 * Lookup the limits for a plan key. Falls back to `launch` limits when
 * the plan isn't recognized.
 */
export function getPlanLimits(plan: string | null | undefined): PlanLimit {
  const key = (plan || DEFAULT_PLAN) as PlanKey;
  const cfg = PLANS[key] ?? PLANS[DEFAULT_PLAN];
  return {
    facilityLimit: cfg.facilityLimit,
    landingPageLimit: cfg.landingPageLimit,
    teamLimit: cfg.teamLimit,
  };
}

export type OrgGate = {
  ok: boolean;
  reason?: string;
  code?: "over_limit" | "subscription_inactive" | "trial_expired" | "not_found";
};

/**
 * Check whether an org's subscription_status allows write operations.
 * Active and trialing orgs pass. Past-due, canceled, and incomplete are denied.
 */
export function isSubscriptionActive(status: string | null | undefined, trialEndsAt: Date | null | undefined): OrgGate {
  if (status === "active") return { ok: true };
  if (status === "trialing") {
    if (trialEndsAt && trialEndsAt < new Date()) {
      return { ok: false, code: "trial_expired", reason: "Trial has expired — please add a payment method" };
    }
    return { ok: true };
  }
  if (status === "past_due") {
    return { ok: false, code: "subscription_inactive", reason: "Payment past due — update billing to continue" };
  }
  if (status === "canceled") {
    return { ok: false, code: "subscription_inactive", reason: "Subscription canceled" };
  }
  return { ok: false, code: "subscription_inactive", reason: "Subscription not active" };
}

/**
 * Check whether the org can create another facility.
 * Returns { ok: true } when under the limit or on an unlimited plan.
 */
export async function canAddFacility(orgId: string): Promise<OrgGate> {
  const org = await db.organizations.findUnique({
    where: { id: orgId },
    select: {
      facility_limit: true,
      plan: true,
      subscription_status: true,
      trial_ends_at: true,
    },
  });
  if (!org) return { ok: false, code: "not_found", reason: "Organization not found" };

  const subGate = isSubscriptionActive(org.subscription_status, org.trial_ends_at);
  if (!subGate.ok) return subGate;

  // Prefer explicit facility_limit (set by Stripe webhook) over plan defaults.
  const limit = org.facility_limit ?? getPlanLimits(org.plan).facilityLimit;
  if (limit === -1) return { ok: true };

  const count = await db.facilities.count({ where: { organization_id: orgId } });
  if (count >= limit) {
    return {
      ok: false,
      code: "over_limit",
      reason: `Facility limit reached (${count}/${limit}). Upgrade your plan to add more.`,
    };
  }
  return { ok: true };
}

/**
 * Check whether the org can create another landing page.
 */
export async function canAddLandingPage(facilityId: string): Promise<OrgGate> {
  const facility = await db.facilities.findUnique({
    where: { id: facilityId },
    select: { organization_id: true },
  });
  if (!facility?.organization_id) return { ok: true }; // unattached facilities aren't gated

  const org = await db.organizations.findUnique({
    where: { id: facility.organization_id },
    select: { plan: true, subscription_status: true, trial_ends_at: true },
  });
  if (!org) return { ok: true };

  const subGate = isSubscriptionActive(org.subscription_status, org.trial_ends_at);
  if (!subGate.ok) return subGate;

  const limit = getPlanLimits(org.plan).landingPageLimit;
  if (limit === -1) return { ok: true };

  const count = await db.landing_pages.count({ where: { facility_id: facilityId } });
  if (count >= limit) {
    return {
      ok: false,
      code: "over_limit",
      reason: `Landing page limit reached (${count}/${limit}) for your plan`,
    };
  }
  return { ok: true };
}
