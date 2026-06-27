import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { authenticatePortalRequest } from "@/lib/portal-auth";

/**
 * Portal goal tracker.
 *
 * Unlike /api/attribution (which counts move-ins by the *lead's* created_at and
 * is fused with Angelo's campaign_spend join), this route counts a month's
 * actual move-ins by the move-in EVENT date — lead_status_events.to_status =
 * 'moved_in' with changed_at inside the month — so a lead created in an earlier
 * month still counts toward the month it actually moved in. That is the correct
 * basis for a monthly goal.
 */

const MONTHS_OF_HISTORY = 12;

/** First day (UTC) of the month `offset` months before `ref`. */
function monthStart(ref: Date, offset = 0): Date {
  return new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - offset, 1));
}

/** "YYYY-MM" label for a month-start date. */
function monthLabel(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Count move-ins for a facility within [start, end) by move-in event date. */
async function countMoveIns(facilityId: string, start: Date, end: Date): Promise<number> {
  return db.lead_status_events.count({
    where: {
      to_status: "moved_in",
      changed_at: { gte: start, lt: end },
      partial_leads: { is: { facility_id: facilityId } },
    },
  });
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-goals");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const scope = await authenticatePortalRequest(req);
    if (scope instanceof NextResponse) return scope;

    let clientId: string;
    let facilityId: string;
    if (scope.kind === "admin") {
      const clientIdParam = req.nextUrl.searchParams.get("clientId");
      if (!clientIdParam) return errorResponse("Missing client identifier", 400, origin);
      const c = await db.clients.findUnique({
        where: { id: clientIdParam },
        select: { id: true, facility_id: true },
      });
      if (!c) return errorResponse("Client not found", 404, origin);
      clientId = c.id;
      facilityId = c.facility_id;
    } else {
      clientId = scope.clientId;
      facilityId = scope.facilityId;
    }

    const client = await db.clients.findUnique({
      where: { id: clientId },
      select: { monthly_goal: true },
    });
    const defaultTarget = client?.monthly_goal ?? 0;

    const now = new Date();
    const curStart = monthStart(now, 0);
    const nextStart = monthStart(now, -1); // start of NEXT month = end of current
    const historyStart = monthStart(now, MONTHS_OF_HISTORY - 1);

    // Live actual for the current month, then persist the snapshot so past months
    // read back consistently without recomputation.
    const currentActual = await countMoveIns(facilityId, curStart, nextStart);

    const currentRow = await db.client_goals.upsert({
      where: { client_id_period_month: { client_id: clientId, period_month: curStart } },
      update: { actual: currentActual },
      create: {
        client_id: clientId,
        period_month: curStart,
        target: defaultTarget,
        actual: currentActual,
      },
      select: { period_month: true, target: true, actual: true },
    });

    const stored = await db.client_goals.findMany({
      where: { client_id: clientId, period_month: { gte: historyStart } },
      orderBy: { period_month: "desc" },
      select: { period_month: true, target: true, actual: true },
    });

    const goals = stored.map((g) => ({
      month: monthLabel(g.period_month),
      target: g.target,
      actual: g.actual,
    }));

    const current = {
      month: monthLabel(currentRow.period_month),
      target: currentRow.target,
      actual: currentRow.actual,
      pct:
        currentRow.target > 0
          ? Math.min(100, Math.round((currentRow.actual / currentRow.target) * 100))
          : null,
    };

    return jsonResponse({ current, goals }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-goals");
  if (limited) return limited;
  const origin = getOrigin(req);

  // Targets are founder-set; clients see their own goals but do not edit them here
  // (the legacy single-scalar default still flows through /api/client-data).
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { clientId, month, target } = body || {};
    if (!clientId || !month || typeof target !== "number" || target < 0) {
      return errorResponse("clientId, month (YYYY-MM) and a non-negative target are required", 400, origin);
    }

    const m = /^(\d{4})-(\d{2})$/.exec(String(month));
    if (!m) return errorResponse("month must be YYYY-MM", 400, origin);
    const periodMonth = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));

    const exists = await db.clients.findUnique({ where: { id: clientId }, select: { id: true } });
    if (!exists) return errorResponse("Client not found", 404, origin);

    await db.client_goals.upsert({
      where: { client_id_period_month: { client_id: clientId, period_month: periodMonth } },
      update: { target },
      create: { client_id: clientId, period_month: periodMonth, target, actual: 0 },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
