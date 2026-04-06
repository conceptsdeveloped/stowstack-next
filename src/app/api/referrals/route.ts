import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const CREDIT_TIERS: Record<string, number> = {
  signed_up: 99,
  active: 99,
  bonus_3: 200,
  bonus_5: 500,
  bonus_10: 1000,
  bonus_25: 2500,
};

function generateCode(name: string): string {
  const prefix = name.replace(/[^a-zA-Z]/g, "").substring(0, 4).toUpperCase();
  const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "referrals");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (!action) {
      const codes = await db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT rc.*,
          (SELECT COUNT(*) FROM referrals r WHERE r.referral_code_id = rc.id) as referral_count,
          (SELECT COUNT(*) FROM referrals r WHERE r.referral_code_id = rc.id AND r.status = 'active') as active_count
        FROM referral_codes rc
        ORDER BY rc.total_earned DESC, rc.created_at DESC
      `;
      return jsonResponse({ codes }, 200, origin);
    }

    if (action === "referrals") {
      const codeId = url.searchParams.get("code_id");
      if (!codeId) return errorResponse("code_id required", 400, origin);
      const referralsList = await db.referrals.findMany({
        where: { referral_code_id: codeId },
        orderBy: { created_at: "desc" },
      });
      return jsonResponse({ referrals: referralsList }, 200, origin);
    }

    if (action === "credits") {
      const codeId = url.searchParams.get("code_id");
      if (!codeId) return errorResponse("code_id required", 400, origin);
      const credits = await db.referral_credits.findMany({
        where: { referral_code_id: codeId },
        orderBy: { created_at: "desc" },
      });
      return jsonResponse({ credits }, 200, origin);
    }

    if (action === "leaderboard") {
      const leaders = await db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT rc.id, rc.code, rc.referrer_name, rc.referral_count, rc.total_earned, rc.credit_balance,
          (SELECT COUNT(*) FROM referrals r WHERE r.referral_code_id = rc.id AND r.status = 'active') as active_referrals
        FROM referral_codes rc
        WHERE rc.status = 'active' AND rc.referral_count > 0
        ORDER BY rc.referral_count DESC, rc.total_earned DESC
        LIMIT 20
      `;
      return jsonResponse({ leaders }, 200, origin);
    }

    return errorResponse("Unknown action", 400, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "referrals");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();

    if (!action) {
      const { facility_id, referrer_name, referrer_email } = body;
      if (!facility_id || !referrer_name || !referrer_email) {
        return errorResponse("facility_id, referrer_name, and referrer_email required", 400, origin);
      }

      const existing = await db.referral_codes.findFirst({
        where: { facility_id },
      });
      if (existing) {
        return errorResponse("Referral code already exists for this facility", 409, origin);
      }

      const code = generateCode(referrer_name);
      const row = await db.referral_codes.create({
        data: {
          facility_id,
          code,
          referrer_name,
          referrer_email,
        },
      });
      return jsonResponse({ referral_code: row }, 201, origin);
    }

    if (action === "refer") {
      const {
        referral_code_id,
        referred_name,
        referred_email,
        referred_phone,
        facility_name,
        facility_location,
        notes,
      } = body;
      if (!referral_code_id || !referred_name || !referred_email) {
        return errorResponse("referral_code_id, referred_name, and referred_email required", 400, origin);
      }

      const dup = await db.referrals.findFirst({
        where: { referral_code_id, referred_email },
      });
      if (dup) {
        return errorResponse("This person has already been referred", 409, origin);
      }

      const row = await db.$transaction(async (tx) => {
        const referral = await tx.referrals.create({
          data: {
            referral_code_id,
            referred_name,
            referred_email,
            referred_phone: referred_phone || null,
            facility_name: facility_name || null,
            facility_location: facility_location || null,
            notes: notes || null,
          },
        });

        await tx.referral_codes.update({
          where: { id: referral_code_id },
          data: { referral_count: { increment: 1 } },
        });

        return referral;
      });

      return jsonResponse({ referral: row }, 201, origin);
    }

    return errorResponse("Unknown action", 400, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "referrals");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = await req.json();

    if (action === "status") {
      const { referral_id, status } = body;
      if (!referral_id || !status) {
        return errorResponse("referral_id and status required", 400, origin);
      }

      const ref = await db.referrals.findUnique({ where: { id: referral_id } });
      if (!ref) return errorResponse("Referral not found", 404, origin);

      const updateData: Record<string, unknown> = { status, updated_at: new Date() };
      if (status === "signed_up" && !ref.signed_up_at) updateData.signed_up_at = new Date();
      if (status === "active" && !ref.activated_at) updateData.activated_at = new Date();

      await db.$transaction(async (tx) => {
        await tx.referrals.update({
          where: { id: referral_id },
          data: updateData,
        });

        if ((status === "signed_up" || status === "active") && !ref.credit_issued) {
          const creditAmount = CREDIT_TIERS[status] || 0;
          if (creditAmount > 0) {
            const codeRow = await tx.referral_codes.findUnique({
              where: { id: ref.referral_code_id },
            });
            if (codeRow) {
              const newBalance = parseFloat(String(codeRow.credit_balance)) + creditAmount;
              const newTotal = parseFloat(String(codeRow.total_earned)) + creditAmount;

              await tx.referral_codes.update({
                where: { id: ref.referral_code_id },
                data: { credit_balance: newBalance, total_earned: newTotal },
              });

              await tx.referral_credits.create({
                data: {
                  referral_code_id: ref.referral_code_id,
                  referral_id,
                  type: "earned",
                  amount: creditAmount,
                  description: `Referral ${status === "signed_up" ? "signup" : "activation"} credit for ${ref.referred_name}`,
                  balance_after: newBalance,
                },
              });

              await tx.referrals.update({
                where: { id: referral_id },
                data: {
                  credit_amount: { increment: creditAmount },
                  credit_issued: true,
                  credit_issued_at: new Date(),
                },
              });

              const totalActive = await tx.referrals.count({
                where: { referral_code_id: ref.referral_code_id, status: "active" },
              });

              let bonus = 0;
              let bonusLabel = "";
              if (totalActive === 3) { bonus = CREDIT_TIERS.bonus_3; bonusLabel = "3-referral milestone bonus"; }
              if (totalActive === 5) { bonus = CREDIT_TIERS.bonus_5; bonusLabel = "5-referral milestone bonus"; }
              if (totalActive === 10) { bonus = CREDIT_TIERS.bonus_10; bonusLabel = "10-referral milestone bonus"; }
              if (totalActive === 25) { bonus = CREDIT_TIERS.bonus_25; bonusLabel = "25-referral milestone bonus"; }

              if (bonus > 0) {
                const updatedCode = await tx.referral_codes.findUnique({
                  where: { id: ref.referral_code_id },
                  select: { credit_balance: true, total_earned: true },
                });
                if (updatedCode) {
                  const bonusBalance = parseFloat(String(updatedCode.credit_balance)) + bonus;
                  const bonusTotal = parseFloat(String(updatedCode.total_earned)) + bonus;
                  await tx.referral_codes.update({
                    where: { id: ref.referral_code_id },
                    data: { credit_balance: bonusBalance, total_earned: bonusTotal },
                  });
                  await tx.referral_credits.create({
                    data: {
                      referral_code_id: ref.referral_code_id,
                      type: "bonus",
                      amount: bonus,
                      description: bonusLabel,
                      balance_after: bonusBalance,
                    },
                  });
                }
              }
            }
          }
        }
      });

      return jsonResponse({ success: true }, 200, origin);
    }

    if (action === "redeem") {
      const { code_id, amount, description } = body;
      if (!code_id || !amount) return errorResponse("code_id and amount required", 400, origin);

      const codeRow = await db.referral_codes.findUnique({ where: { id: code_id } });
      if (!codeRow) return errorResponse("Referral code not found", 404, origin);
      if (parseFloat(String(codeRow.credit_balance)) < amount) {
        return errorResponse("Insufficient credit balance", 400, origin);
      }

      const newBalance = parseFloat(String(codeRow.credit_balance)) - amount;
      await db.$transaction(async (tx) => {
        await tx.referral_codes.update({
          where: { id: code_id },
          data: { credit_balance: newBalance },
        });
        await tx.referral_credits.create({
          data: {
            referral_code_id: code_id,
            type: "redeemed",
            amount: -amount,
            description: description || "Credit redemption",
            balance_after: newBalance,
          },
        });
      });

      return jsonResponse({ success: true, new_balance: newBalance }, 200, origin);
    }

    return errorResponse("Unknown action", 400, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
