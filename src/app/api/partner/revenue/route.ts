import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session-auth";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import {
  REV_SHARE_TIERS,
  REV_SHARE_FACILITY_MRR,
  summarize,
} from "@/lib/rev-share";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * Server-authoritative partner revenue-share summary.
 *
 * Replaces the two dead `/api/referrals` / `/api/referrals?type=payouts` fetches
 * the partner revenue page used to make (the customer-referral route is admin-key
 * gated and has no `?type=payouts` handler, so both always rendered empty).
 *
 * Auth: org session token (`getSession`), or admin key with `?orgId=` to inspect
 * a specific org — mirrors `/api/org-facilities`.
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(
    req,
    RATE_LIMIT_TIERS.AUTHENTICATED,
    "partner-revenue",
  );
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const isAdmin = isAdminRequest(req);
    const session = !isAdmin ? await getSession(req) : null;
    if (!isAdmin && !session) return errorResponse("Unauthorized", 401, origin);

    const url = new URL(req.url);
    const orgId = isAdmin
      ? url.searchParams.get("orgId") || session?.user.organization_id
      : session?.user.organization_id;
    if (!orgId) return errorResponse("Organization ID required", 400, origin);

    const org = await db.organizations.findUnique({
      where: { id: orgId },
      select: {
        rev_share_enabled: true,
        rev_share_pct: true,
        rev_share_tier: true,
        lifetime_earnings: true,
      },
    });
    if (!org) return errorResponse("Organization not found", 404, origin);

    // Active facilities in the org are the rev-share base. "churned" facilities
    // stop earning (no clawback of prior payouts).
    const facilityCount = await db.facilities.count({
      where: { organization_id: orgId, NOT: { status: "churned" } },
    });

    // Per-facility referral rows (one per facility the org earns on), joined to
    // facility names for the table. Empty until the payout cron has run.
    const referralRows = await db.rev_share_referrals.findMany({
      where: { organization_id: orgId },
      orderBy: { referred_at: "desc" },
      select: {
        id: true,
        facility_id: true,
        status: true,
        total_earned: true,
        referred_at: true,
        facilities: { select: { name: true } },
      },
    });

    const payoutRows = await db.rev_share_payouts.findMany({
      where: { organization_id: orgId },
      orderBy: { month: "desc" },
      select: {
        id: true,
        month: true,
        payout_amount: true,
        status: true,
        paid_at: true,
      },
    });

    const overridePct =
      org.rev_share_tier && org.rev_share_tier !== "auto"
        ? num(org.rev_share_pct)
        : null;
    const s = summarize(facilityCount, overridePct);

    return jsonResponse(
      {
        enabled: org.rev_share_enabled ?? true,
        facilityCount,
        facilityMrr: REV_SHARE_FACILITY_MRR,
        tier: s.tier,
        nextTier: s.nextTier,
        pct: s.pct,
        grossMrr: s.grossMrr,
        monthlyEarnings: s.monthlyEarnings,
        annualEarnings: s.annualEarnings,
        lifetimeEarnings: num(org.lifetime_earnings),
        tiers: REV_SHARE_TIERS,
        referrals: referralRows.map((r) => ({
          id: r.id,
          facility_name: r.facilities?.name ?? "Facility",
          status: r.status ?? "active",
          commission: num(r.total_earned),
          created_at: r.referred_at?.toISOString() ?? null,
        })),
        payouts: payoutRows.map((p) => ({
          id: p.id,
          period: p.month,
          amount: num(p.payout_amount),
          status: p.status ?? "pending",
          paid_at: p.paid_at?.toISOString() ?? null,
        })),
      },
      200,
      origin,
    );
  } catch (err) {
    console.error("[partner/revenue] GET failed", err);
    return errorResponse("Failed to load revenue share", 500, origin);
  }
}

/** Prisma Decimal | number | null → number. */
function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number(v.toString());
  return Number.isFinite(n) ? n : 0;
}
