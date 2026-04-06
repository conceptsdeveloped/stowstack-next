import { NextRequest } from "next/server";
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

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-campaigns");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  try {
    // If no code provided (admin dashboard), return all campaigns
    if (!code) {
      const campaigns = await db.client_campaigns.findMany({
        orderBy: { month: "asc" },
        select: {
          month: true,
          spend: true,
          leads: true,
          cpl: true,
          move_ins: true,
          cost_per_move_in: true,
          roas: true,
          occupancy_delta: true,
        },
      });

      const mapped = campaigns.map((c) => ({
        month: c.month,
        spend: Number(c.spend),
        leads: c.leads,
        cpl: Number(c.cpl),
        moveIns: c.move_ins,
        costPerMoveIn: Number(c.cost_per_move_in),
        roas: Number(c.roas),
        occupancyDelta: Number(c.occupancy_delta),
      }));

      return jsonResponse({ campaigns: mapped }, 200, origin);
    }

    // Client-specific: look up by access code
    const client = await db.clients.findUnique({
      where: { access_code: code },
      select: { id: true },
    });
    if (!client) return errorResponse("Client not found", 404, origin);

    const campaigns = await db.client_campaigns.findMany({
      where: { client_id: client.id },
      orderBy: { month: "asc" },
      select: {
        month: true,
        spend: true,
        leads: true,
        cpl: true,
        move_ins: true,
        cost_per_move_in: true,
        roas: true,
        occupancy_delta: true,
      },
    });

    const mapped = campaigns.map((c) => ({
      month: c.month,
      spend: Number(c.spend),
      leads: c.leads,
      cpl: Number(c.cpl),
      moveIns: c.move_ins,
      costPerMoveIn: Number(c.cost_per_move_in),
      roas: Number(c.roas),
      occupancyDelta: Number(c.occupancy_delta),
    }));

    return jsonResponse({ campaigns: mapped }, 200, origin);
  } catch {
    return errorResponse("Failed to get campaigns", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-campaigns");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { code, campaign } = body || {};
    if (!code || !campaign)
      return errorResponse("Missing code or campaign data", 400, origin);
    if (!campaign.month || campaign.spend == null || campaign.leads == null)
      return errorResponse(
        "Campaign requires month, spend, and leads",
        400,
        origin
      );

    const client = await db.clients.findUnique({
      where: { access_code: code },
      select: { id: true },
    });
    if (!client) return errorResponse("Client not found", 404, origin);

    const spend = Number(campaign.spend);
    const leads = Number(campaign.leads);
    const moveIns = Number(campaign.moveIns || 0);
    const cpl =
      campaign.cpl != null ? Number(campaign.cpl) : leads > 0 ? spend / leads : 0;
    const costPerMoveIn =
      campaign.costPerMoveIn != null
        ? Number(campaign.costPerMoveIn)
        : moveIns > 0
          ? spend / moveIns
          : 0;
    const roas = Number(campaign.roas || 0);
    const occupancyDelta = Number(campaign.occupancyDelta || 0);

    await db.$executeRaw`
      INSERT INTO client_campaigns (client_id, month, spend, leads, cpl, move_ins, cost_per_move_in, roas, occupancy_delta)
      VALUES (${client.id}::uuid, ${campaign.month}, ${spend}, ${leads}, ${cpl}, ${moveIns}, ${costPerMoveIn}, ${roas}, ${occupancyDelta})
      ON CONFLICT (client_id, month) DO UPDATE SET
        spend = EXCLUDED.spend, leads = EXCLUDED.leads, cpl = EXCLUDED.cpl,
        move_ins = EXCLUDED.move_ins, cost_per_move_in = EXCLUDED.cost_per_move_in,
        roas = EXCLUDED.roas, occupancy_delta = EXCLUDED.occupancy_delta
    `;

    const campaigns = await db.client_campaigns.findMany({
      where: { client_id: client.id },
      orderBy: { month: "asc" },
      select: {
        month: true,
        spend: true,
        leads: true,
        cpl: true,
        move_ins: true,
        cost_per_move_in: true,
        roas: true,
        occupancy_delta: true,
      },
    });

    const mapped = campaigns.map((c) => ({
      month: c.month,
      spend: Number(c.spend),
      leads: c.leads,
      cpl: Number(c.cpl),
      moveIns: c.move_ins,
      costPerMoveIn: Number(c.cost_per_move_in),
      roas: Number(c.roas),
      occupancyDelta: Number(c.occupancy_delta),
    }));

    return jsonResponse({ success: true, campaigns: mapped }, 200, origin);
  } catch {
    return errorResponse("Failed to add campaign", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-campaigns");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { code, month } = body || {};
    if (!code || !month)
      return errorResponse("Missing code or month", 400, origin);

    const client = await db.clients.findUnique({
      where: { access_code: code },
      select: { id: true },
    });
    if (!client) return errorResponse("Client not found", 404, origin);

    await db.client_campaigns.deleteMany({
      where: { client_id: client.id, month },
    });

    const campaigns = await db.client_campaigns.findMany({
      where: { client_id: client.id },
      orderBy: { month: "asc" },
      select: {
        month: true,
        spend: true,
        leads: true,
        cpl: true,
        move_ins: true,
        cost_per_move_in: true,
        roas: true,
        occupancy_delta: true,
      },
    });

    const mapped = campaigns.map((c) => ({
      month: c.month,
      spend: Number(c.spend),
      leads: c.leads,
      cpl: Number(c.cpl),
      moveIns: c.move_ins,
      costPerMoveIn: Number(c.cost_per_move_in),
      roas: Number(c.roas),
      occupancyDelta: Number(c.occupancy_delta),
    }));

    return jsonResponse({ success: true, campaigns: mapped }, 200, origin);
  } catch {
    return errorResponse("Failed to delete campaign", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "client-campaigns");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { code, monthlyGoal } = body || {};
    if (!code) return errorResponse("Missing code", 400, origin);

    if (monthlyGoal !== undefined) {
      const goal = Math.max(0, Math.min(999, Number(monthlyGoal) || 0));
      await db.clients.update({
        where: { access_code: code },
        data: { monthly_goal: goal },
      });
      return jsonResponse({ success: true, monthlyGoal: goal }, 200, origin);
    }

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to update settings", 500, origin);
  }
}
