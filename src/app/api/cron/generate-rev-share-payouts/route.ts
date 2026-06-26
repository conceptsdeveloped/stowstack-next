import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyCronSecret } from "@/lib/cron-auth";
import { summarize, monthKey, REV_SHARE_FACILITY_MRR } from "@/lib/rev-share";

export const maxDuration = 60;

/**
 * Monthly partner revenue-share payout generation.
 *
 * For every rev-share-enabled org, snapshots the current month's payout into
 * `rev_share_payouts` (status `pending`) and maintains the per-facility
 * `rev_share_referrals` registry. This is the "writes" half of the rev-share
 * system — before this cron, those tables had no producer (see
 * docs/systems/13-gaps-and-seams.md).
 *
 * Idempotent per (org, month):
 *  - The payout row is unique on (organization_id, month). A re-run within the
 *    same month updates the snapshot's facility_count / gross_mrr / pct / amount
 *    but never downgrades a row already marked `paid`/`processing`, and only
 *    books per-facility `total_earned` increments once (on first creation).
 *  - `organizations.lifetime_earnings` is recomputed as SUM(payout_amount) over
 *    all the org's payout rows, so it stays correct regardless of re-runs.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = monthKey(new Date());
  const orgs = await db.organizations.findMany({
    where: { rev_share_enabled: true },
    select: { id: true, rev_share_pct: true, rev_share_tier: true },
  });

  let processed = 0;
  let created = 0;
  let updated = 0;
  const errors: Array<{ orgId: string; error: string }> = [];

  for (const org of orgs) {
    try {
      const facilities = await db.facilities.findMany({
        where: { organization_id: org.id, NOT: { status: "churned" } },
        select: { id: true },
      });
      const facilityCount = facilities.length;

      const overridePct =
        org.rev_share_tier && org.rev_share_tier !== "auto"
          ? toNum(org.rev_share_pct)
          : null;
      const s = summarize(facilityCount, overridePct);

      const existing = await db.rev_share_payouts.findUnique({
        where: {
          organization_id_month: { organization_id: org.id, month: period },
        },
        select: { id: true, status: true },
      });

      const isNewMonth = !existing;
      // Never re-touch a payout that's already been processed/paid.
      const locked =
        existing?.status === "paid" || existing?.status === "processing";

      if (!locked) {
        await db.rev_share_payouts.upsert({
          where: {
            organization_id_month: { organization_id: org.id, month: period },
          },
          create: {
            organization_id: org.id,
            month: period,
            facility_count: facilityCount,
            gross_mrr: s.grossMrr,
            rev_share_pct: s.pct,
            payout_amount: s.monthlyEarnings,
            status: "pending",
          },
          update: {
            facility_count: facilityCount,
            gross_mrr: s.grossMrr,
            rev_share_pct: s.pct,
            payout_amount: s.monthlyEarnings,
          },
        });
        if (isNewMonth) created++;
        else updated++;
      }

      // Per-facility registry. Book the per-facility share into total_earned
      // only on the month's first creation, so re-runs don't double-count.
      const perFacilityShare =
        facilityCount > 0 ? round2(s.monthlyEarnings / facilityCount) : 0;
      const nowIso = new Date();
      for (const f of facilities) {
        const ref = await db.rev_share_referrals.findUnique({
          where: {
            organization_id_facility_id: {
              organization_id: org.id,
              facility_id: f.id,
            },
          },
          select: { id: true, total_earned: true, first_revenue_at: true },
        });
        if (!ref) {
          await db.rev_share_referrals.create({
            data: {
              organization_id: org.id,
              facility_id: f.id,
              status: "active",
              first_revenue_at: perFacilityShare > 0 ? nowIso : null,
              total_earned: isNewMonth ? perFacilityShare : 0,
            },
          });
        } else if (isNewMonth && !locked) {
          await db.rev_share_referrals.update({
            where: { id: ref.id },
            data: {
              status: "active",
              first_revenue_at: ref.first_revenue_at ?? (perFacilityShare > 0 ? nowIso : null),
              total_earned: toNum(ref.total_earned) + perFacilityShare,
            },
          });
        }
      }

      // Recompute lifetime earnings from the payout ledger — idempotent.
      const agg = await db.rev_share_payouts.aggregate({
        where: { organization_id: org.id },
        _sum: { payout_amount: true },
      });
      await db.organizations.update({
        where: { id: org.id },
        data: { lifetime_earnings: toNum(agg._sum.payout_amount) },
      });

      processed++;
    } catch (err) {
      errors.push({
        orgId: org.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    ok: true,
    period,
    facilityMrr: REV_SHARE_FACILITY_MRR,
    orgs: orgs.length,
    processed,
    created,
    updated,
    errors,
  });
}

function toNum(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" ? v : Number((v as { toString(): string }).toString());
  return Number.isFinite(n) ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
