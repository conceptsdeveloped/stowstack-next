import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const SEQUENCES: Record<
  string,
  {
    id: string;
    name: string;
    description: string;
    steps: Array<{
      delayDays?: number;
      delayHours?: number;
      templateId: string;
      label: string;
    }>;
  }
> = {
  post_audit: {
    id: "post_audit",
    name: "Post-Audit Follow-up",
    description: "Automated nurture sequence after audit form submission",
    steps: [
      { delayDays: 2, templateId: "follow_up", label: "Warm follow-up" },
      { delayDays: 5, templateId: "value_add", label: "Personalized tip" },
      { delayDays: 10, templateId: "check_in", label: "Check-in" },
      { delayDays: 21, templateId: "last_chance", label: "Final touch" },
    ],
  },
  recovery: {
    id: "recovery",
    name: "Abandoned Form Recovery",
    description:
      "Automated recovery sequence for partial/abandoned landing page leads",
    steps: [
      {
        delayHours: 1,
        templateId: "recovery_1hr",
        label: "Quick recovery (1hr)",
      },
      {
        delayHours: 24,
        templateId: "recovery_24hr",
        label: "Urgency nudge (24hr)",
      },
      {
        delayHours: 72,
        templateId: "recovery_72hr",
        label: "Discount offer (72hr)",
      },
    ],
  },
};

async function enrollLead(facilityId: string, sequenceId = "post_audit") {
  const sequence = SEQUENCES[sequenceId];
  if (!sequence) throw new Error(`Unknown sequence: ${sequenceId}`);

  const now = new Date();
  const firstStep = sequence.steps[0];
  const delayMs = (firstStep.delayDays || 0) * 24 * 60 * 60 * 1000;
  const nextSendAt = new Date(now.getTime() + delayMs);

  const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
    INSERT INTO drip_sequences (facility_id, sequence_id, current_step, status, enrolled_at, next_send_at, history)
    VALUES (${facilityId}, ${sequenceId}, 0, 'active', ${now}::timestamptz, ${nextSendAt}::timestamptz, '[]'::jsonb)
    ON CONFLICT (facility_id) DO NOTHING
    RETURNING *
  `;

  return rows[0] || null;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "drip-sequences");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const sequences = Object.values(SEQUENCES).map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      steps: s.steps,
    }));

    const drips = await db.$queryRaw<Array<Record<string, unknown>>>`
      SELECT ds.*, f.contact_name, f.contact_email, f.name AS facility_name, f.pipeline_status
      FROM drip_sequences ds
      JOIN facilities f ON ds.facility_id = f.id
      ORDER BY ds.enrolled_at DESC
    `;

    const formattedDrips = drips.map((d) => ({
      sequenceId: d.sequence_id,
      leadId: d.facility_id,
      currentStep: d.current_step,
      status: d.status,
      enrolledAt: d.enrolled_at,
      nextSendAt: d.next_send_at,
      pausedAt: d.paused_at,
      completedAt: d.completed_at,
      cancelledAt: d.cancelled_at,
      cancelReason: d.cancel_reason,
      history: d.history || [],
      leadName: d.contact_name || "Unknown",
      leadEmail: d.contact_email || "",
      facilityName: d.facility_name || "Unknown",
      leadStatus: d.pipeline_status || "",
    }));

    return jsonResponse({ sequences, drips: formattedDrips }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch drip data", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "drip-sequences");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { leadId, sequenceId = "post_audit" } = body as {
    leadId?: string;
    sequenceId?: string;
  };

  if (!leadId) {
    return errorResponse("Missing leadId", 400, origin);
  }

  try {
    const facility = await db.facilities.findUnique({
      where: { id: leadId },
      select: { id: true },
    });
    if (!facility) {
      return errorResponse("Lead not found", 404, origin);
    }

    const existing = await db.drip_sequences.findUnique({
      where: { facility_id: leadId },
    });

    if (
      existing &&
      (existing.status === "active" || existing.status === "paused")
    ) {
      return errorResponse(
        "Lead already has an active drip sequence",
        400,
        origin
      );
    }

    if (existing) {
      await db.drip_sequences.delete({ where: { facility_id: leadId } });
    }

    const drip = await enrollLead(leadId, sequenceId);
    return jsonResponse({ success: true, drip }, 200, origin);
  } catch {
    return errorResponse("Failed to enroll lead", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "drip-sequences");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { leadId, action } = body as { leadId?: string; action?: string };

  if (!leadId || !["pause", "resume"].includes(action || "")) {
    return errorResponse(
      "Missing leadId or invalid action (pause/resume)",
      400,
      origin
    );
  }

  try {
    const drip = await db.drip_sequences.findUnique({
      where: { facility_id: leadId },
    });
    if (!drip) {
      return errorResponse("No drip sequence found for this lead", 404, origin);
    }

    if (action === "pause" && drip.status !== "active") {
      return errorResponse("Can only pause active sequences", 400, origin);
    }
    if (action === "resume" && drip.status !== "paused") {
      return errorResponse("Can only resume paused sequences", 400, origin);
    }

    if (action === "pause") {
      await db.drip_sequences.update({
        where: { facility_id: leadId },
        data: { status: "paused", paused_at: new Date() },
      });
    } else {
      const sequence = SEQUENCES[drip.sequence_id];
      let nextSendAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      if (sequence && drip.current_step < sequence.steps.length) {
        const step = sequence.steps[drip.current_step];
        nextSendAt = new Date(
          Date.now() +
            Math.max(1, (step.delayDays || 1) - drip.current_step) *
              24 *
              60 *
              60 *
              1000
        );
      }
      await db.drip_sequences.update({
        where: { facility_id: leadId },
        data: { status: "active", paused_at: null, next_send_at: nextSendAt },
      });
    }

    const updated = await db.drip_sequences.findUnique({
      where: { facility_id: leadId },
    });
    return jsonResponse({ success: true, drip: updated }, 200, origin);
  } catch {
    return errorResponse("Failed to update drip", 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "drip-sequences");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { leadId } = body as { leadId?: string };
  if (!leadId) {
    return errorResponse("Missing leadId", 400, origin);
  }

  try {
    const drip = await db.drip_sequences.findUnique({
      where: { facility_id: leadId },
    });
    if (!drip) {
      return errorResponse("No drip sequence found", 404, origin);
    }

    await db.drip_sequences.update({
      where: { facility_id: leadId },
      data: { status: "cancelled", cancelled_at: new Date() },
    });

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to cancel drip", 500, origin);
  }
}
