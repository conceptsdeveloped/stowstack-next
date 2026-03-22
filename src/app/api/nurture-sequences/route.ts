import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

const SEQUENCE_TEMPLATES: Record<
  string,
  {
    name: string;
    trigger_type: string;
    steps: Array<{
      step_number: number;
      delay_minutes: number;
      channel: string;
      subject: string | null;
      body: string;
      send_window: { start: string; end: string } | null;
    }>;
  }
> = {
  landing_page_abandon: {
    name: "Landing Page Visitor Recovery",
    trigger_type: "landing_page_abandon",
    steps: [
      { step_number: 1, delay_minutes: 60, channel: "sms", subject: null, body: "Hey {first_name}, still looking for storage near {facility_location}? That {unit_size} at {facility_name} is still available at ${unit_rate}/mo. Reserve it here: {reserve_link}", send_window: { start: "09:00", end: "20:00" } },
      { step_number: 2, delay_minutes: 1440, channel: "email", subject: "Your {unit_size} unit is still waiting at {facility_name}", body: "Hi {first_name},\n\nYou were looking at a {unit_size} unit at {facility_name}. Good news \u2014 it's still available.\n\n\u2022 Rate: ${unit_rate}/month\n\u2022 Location: {facility_location}\n\nReserve it now: {reserve_link}\n\nQuestions? Call us at {facility_phone}.\n\n\u2014 {facility_name} Team", send_window: null },
      { step_number: 3, delay_minutes: 4320, channel: "sms", subject: null, body: "Heads up {first_name} \u2014 people are viewing storage near {facility_location} today. Your {unit_size} unit is still open. Lock it in: {reserve_link}", send_window: { start: "10:00", end: "19:00" } },
      { step_number: 4, delay_minutes: 10080, channel: "email", subject: "Last chance: {unit_size} at {facility_name}", body: "Hi {first_name},\n\nWe're running a limited-time offer at {facility_name}: first month at 50% off when you reserve this week.\n\n{unit_size} unit: ${unit_rate}/mo (first month just ${half_rate})\n\nReserve: {reserve_link}\n\n\u2014 {facility_name} Team", send_window: null },
      { step_number: 5, delay_minutes: 20160, channel: "email", subject: "We saved a spot for you, {first_name}", body: "Hi {first_name},\n\nA couple weeks ago you were looking for storage near {facility_location}. If you still need space, we've got you covered.\n\nReserve your unit: {reserve_link}\n\nIf your plans changed, no worries \u2014 we won't bother you again.\n\n\u2014 {facility_name} Team", send_window: null },
    ],
  },
  reservation_abandon: {
    name: "Incomplete Reservation Recovery",
    trigger_type: "reservation_abandon",
    steps: [
      { step_number: 1, delay_minutes: 30, channel: "sms", subject: null, body: "Hey {first_name}, looks like you didn't finish reserving your {unit_size} at {facility_name}. Need help? Reply here or call {facility_phone}: {reserve_link}", send_window: { start: "08:00", end: "21:00" } },
      { step_number: 2, delay_minutes: 240, channel: "email", subject: "Finish your reservation at {facility_name}", body: "Hi {first_name},\n\nYou started reserving a {unit_size} unit at {facility_name} but didn't finish.\n\n\u2022 Unit: {unit_size}\n\u2022 Rate: ${unit_rate}/month\n\nPick up where you left off: {reserve_link}\n\nCall us at {facility_phone} if you need help.\n\n\u2014 {facility_name} Team", send_window: null },
      { step_number: 3, delay_minutes: 1440, channel: "sms", subject: null, body: "{first_name}, your {unit_size} reservation at {facility_name} expires today. Finish here before someone else grabs it: {reserve_link}", send_window: { start: "10:00", end: "18:00" } },
    ],
  },
  post_move_in: {
    name: "New Tenant Lifecycle",
    trigger_type: "post_move_in",
    steps: [
      { step_number: 1, delay_minutes: 120, channel: "sms", subject: null, body: "Welcome to {facility_name}, {first_name}! Your gate code is {gate_code}. Office hours: {office_hours}. Questions anytime: {facility_phone}", send_window: { start: "08:00", end: "20:00" } },
      { step_number: 2, delay_minutes: 10080, channel: "email", subject: "How's everything going, {first_name}?", body: "Hi {first_name},\n\nYou've been with us at {facility_name} for a week. How's everything going?\n\nIf you need anything \u2014 different unit size, packing supplies, access questions \u2014 just reply or call {facility_phone}.\n\n\u2014 {facility_name} Team", send_window: null },
      { step_number: 3, delay_minutes: 43200, channel: "sms", subject: null, body: "Hey {first_name}! You've been at {facility_name} for 30 days. If we're doing a good job, would you mind leaving us a quick Google review? It really helps: {review_link}", send_window: { start: "10:00", end: "18:00" } },
      { step_number: 4, delay_minutes: 86400, channel: "email", subject: "Upgrade opportunity at {facility_name}", body: "Hi {first_name},\n\nYou've been with us for 60 days \u2014 thanks for being a great tenant.\n\nDid you know we offer:\n\u2022 Tenant protection plans starting at $12/mo\n\u2022 Climate-controlled upgrades\n\u2022 Larger unit options\n\nInterested? Reply or call {facility_phone}.\n\n\u2014 {facility_name} Team", send_window: null },
      { step_number: 5, delay_minutes: 129600, channel: "email", subject: "Your 90-day check-in at {facility_name}", body: "Hi {first_name},\n\n3 months already! Quick check-in:\n\n\u2705 Right unit size?\n\u2705 On autopay yet?\n\u2705 Want to lock in your current rate?\n\nReply or call {facility_phone}.\n\n\u2014 {facility_name} Team", send_window: null },
    ],
  },
  win_back: {
    name: "Move-Out Win-Back",
    trigger_type: "win_back",
    steps: [
      { step_number: 1, delay_minutes: 1440, channel: "email", subject: "We'll miss you at {facility_name}, {first_name}", body: "Hi {first_name},\n\nWe're sorry to see you go. If you have 30 seconds, we'd love to know how we did:\n\n{feedback_link}\n\nIf you ever need storage again, you'll always have a spot.\n\n\u2014 {facility_name} Team", send_window: null },
      { step_number: 2, delay_minutes: 43200, channel: "sms", subject: null, body: "Hey {first_name}, it's {facility_name}. Need storage again? Come back and get 25% off your first month. Code: {promo_code}. Reserve: {reserve_link}", send_window: { start: "10:00", end: "18:00" } },
      { step_number: 3, delay_minutes: 129600, channel: "email", subject: "Your neighbors are still storing with us, {first_name}", body: "Hi {first_name},\n\nIt's been 3 months since you moved out of {facility_name}. If your storage needs have changed, we'd love to have you back.\n\nReturning tenant special: 25% off your first month + waived admin fee.\n\nReserve: {reserve_link}\n\n\u2014 {facility_name} Team", send_window: null },
    ],
  },
};

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) {
    return errorResponse("facilityId required", 400, origin);
  }

  try {
    const [sequences, enrollments, messages] = await Promise.all([
      db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT * FROM nurture_sequences WHERE facility_id = ${facilityId}::uuid ORDER BY created_at DESC
      `,
      db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT * FROM nurture_enrollments WHERE facility_id = ${facilityId}::uuid ORDER BY enrolled_at DESC LIMIT 200
      `,
      db.$queryRaw<Array<Record<string, unknown>>>`
        SELECT nm.* FROM nurture_messages nm
        JOIN nurture_enrollments ne ON ne.id = nm.enrollment_id
        WHERE ne.facility_id = ${facilityId}::uuid
        ORDER BY nm.created_at DESC LIMIT 500
      `,
    ]);

    const stats = {
      totalSequences: sequences.length,
      activeEnrollments: enrollments.filter((e) => e.status === "active").length,
      converted: enrollments.filter((e) => e.status === "converted").length,
      totalMessages: messages.length,
      smsSent: messages.filter(
        (m) => m.channel === "sms" && m.status !== "pending"
      ).length,
      emailSent: messages.filter(
        (m) => m.channel === "email" && m.status !== "pending"
      ).length,
      deliveryRate:
        messages.length > 0
          ? Math.round(
              (messages.filter((m) =>
                ["sent", "delivered", "opened", "clicked"].includes(
                  m.status as string
                )
              ).length /
                messages.filter((m) => m.status !== "pending").length) *
                100
            )
          : 0,
    };

    return jsonResponse(
      {
        templates: Object.entries(SEQUENCE_TEMPLATES).map(([key, t]) => ({
          key,
          name: t.name,
          trigger_type: t.trigger_type,
          stepCount: t.steps.length,
        })),
        sequences,
        enrollments,
        recentMessages: messages.slice(0, 50),
        stats,
      },
      200,
      origin
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { action } = body;

  try {
    if (action === "create_from_template") {
      const { facilityId, templateKey } = body as {
        facilityId?: string;
        templateKey?: string;
      };
      const template = templateKey ? SEQUENCE_TEMPLATES[templateKey] : null;
      if (!template) {
        return errorResponse(`Unknown template: ${templateKey}`, 400, origin);
      }

      const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
        INSERT INTO nurture_sequences (facility_id, name, trigger_type, steps, status)
        VALUES (${facilityId}, ${template.name}, ${template.trigger_type}, ${JSON.stringify(template.steps)}::jsonb, 'active')
        RETURNING *
      `;
      return jsonResponse({ sequence: rows[0] }, 201, origin);
    }

    if (action === "create_sequence") {
      const { facilityId, name, triggerType, steps } = body as {
        facilityId?: string;
        name?: string;
        triggerType?: string;
        steps?: unknown[];
      };
      if (!facilityId || !name || !triggerType) {
        return errorResponse(
          "facilityId, name, triggerType required",
          400,
          origin
        );
      }

      const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
        INSERT INTO nurture_sequences (facility_id, name, trigger_type, steps, status)
        VALUES (${facilityId}, ${name}, ${triggerType}, ${JSON.stringify(steps || [])}::jsonb, 'active')
        RETURNING *
      `;
      return jsonResponse({ sequence: rows[0] }, 201, origin);
    }

    if (action === "enroll") {
      const {
        sequenceId,
        facilityId,
        contactName,
        contactEmail,
        contactPhone,
        leadId,
        tenantId,
        metadata,
      } = body as {
        sequenceId?: string;
        facilityId?: string;
        contactName?: string;
        contactEmail?: string;
        contactPhone?: string;
        leadId?: string;
        tenantId?: string;
        metadata?: Record<string, unknown>;
      };

      if (!sequenceId || !facilityId) {
        return errorResponse(
          "sequenceId and facilityId required",
          400,
          origin
        );
      }
      if (!contactEmail && !contactPhone) {
        return errorResponse(
          "At least contactEmail or contactPhone required",
          400,
          origin
        );
      }

      const seqRows = await db.$queryRaw<
        Array<{ id: string; steps: unknown }>
      >`SELECT * FROM nurture_sequences WHERE id = ${sequenceId}`;
      const seq = seqRows[0];
      if (!seq) {
        return errorResponse("Sequence not found", 404, origin);
      }

      const steps =
        typeof seq.steps === "string" ? JSON.parse(seq.steps) : seq.steps;
      const firstStep = (steps as Array<{ delay_minutes?: number }>)[0];
      const nextSendAt = firstStep
        ? new Date(
            Date.now() + (firstStep.delay_minutes || 60) * 60 * 1000
          ).toISOString()
        : null;

      const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
        INSERT INTO nurture_enrollments (
          sequence_id, facility_id, lead_id, tenant_id,
          contact_name, contact_email, contact_phone,
          current_step, status, next_send_at, metadata
        ) VALUES (
          ${sequenceId}, ${facilityId},
          ${leadId || null}, ${tenantId || null},
          ${contactName || null}, ${contactEmail || null}, ${contactPhone || null},
          0, 'active', ${nextSendAt}::timestamptz,
          ${JSON.stringify(metadata || {})}::jsonb
        )
        RETURNING *
      `;

      return jsonResponse({ enrollment: rows[0] }, 201, origin);
    }

    return errorResponse(
      "Invalid action. Use: create_from_template, create_sequence, enroll",
      400,
      origin
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const { enrollmentId, action: patchAction } = body as {
    enrollmentId?: string;
    action?: string;
  };

  if (!enrollmentId || !patchAction) {
    return errorResponse("enrollmentId and action required", 400, origin);
  }

  try {
    if (patchAction === "pause") {
      await db.$executeRaw`
        UPDATE nurture_enrollments SET status = 'paused', next_send_at = NULL WHERE id = ${enrollmentId}
      `;
    } else if (patchAction === "resume") {
      const enrollmentRows = await db.$queryRaw<
        Array<{ id: string; sequence_id: string; current_step: number }>
      >`SELECT * FROM nurture_enrollments WHERE id = ${enrollmentId}`;
      const enrollment = enrollmentRows[0];
      if (!enrollment) {
        return errorResponse("Enrollment not found", 404, origin);
      }

      const seqRows = await db.$queryRaw<
        Array<{ id: string; steps: unknown }>
      >`SELECT * FROM nurture_sequences WHERE id = ${enrollment.sequence_id}`;
      const seq = seqRows[0];
      const steps =
        typeof seq.steps === "string" ? JSON.parse(seq.steps) : seq.steps;
      const currentStep = (steps as Array<{ delay_minutes?: number }>)[
        enrollment.current_step
      ];
      const nextSendAt = currentStep
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : null;

      await db.$executeRaw`
        UPDATE nurture_enrollments SET status = 'active', next_send_at = ${nextSendAt}::timestamptz WHERE id = ${enrollmentId}
      `;
    } else if (patchAction === "skip") {
      const enrollmentRows = await db.$queryRaw<
        Array<{ id: string; sequence_id: string; current_step: number }>
      >`SELECT * FROM nurture_enrollments WHERE id = ${enrollmentId}`;
      const enrollment = enrollmentRows[0];
      if (!enrollment) {
        return errorResponse("Enrollment not found", 404, origin);
      }

      const seqRows = await db.$queryRaw<
        Array<{ id: string; steps: unknown }>
      >`SELECT * FROM nurture_sequences WHERE id = ${enrollment.sequence_id}`;
      const seq = seqRows[0];
      const steps =
        typeof seq.steps === "string" ? JSON.parse(seq.steps) : seq.steps;
      const nextStepIdx = enrollment.current_step + 1;

      if (nextStepIdx >= (steps as unknown[]).length) {
        await db.$executeRaw`
          UPDATE nurture_enrollments SET status = 'completed', completed_at = NOW(), current_step = ${nextStepIdx}, next_send_at = NULL WHERE id = ${enrollmentId}
        `;
      } else {
        const nextStep = (steps as Array<{ delay_minutes?: number }>)[
          nextStepIdx
        ];
        const nextSendAt = new Date(
          Date.now() + (nextStep.delay_minutes || 60) * 60 * 1000
        ).toISOString();
        await db.$executeRaw`
          UPDATE nurture_enrollments SET current_step = ${nextStepIdx}, next_send_at = ${nextSendAt}::timestamptz WHERE id = ${enrollmentId}
        `;
      }
    } else if (patchAction === "convert") {
      await db.$executeRaw`
        UPDATE nurture_enrollments SET status = 'converted', exit_reason = 'manual_convert', completed_at = NOW(), next_send_at = NULL WHERE id = ${enrollmentId}
      `;
    } else if (patchAction === "unsubscribe") {
      await db.$executeRaw`
        UPDATE nurture_enrollments SET status = 'unsubscribed', exit_reason = 'manual_unsubscribe', completed_at = NOW(), next_send_at = NULL WHERE id = ${enrollmentId}
      `;
    } else if (patchAction === "update_sequence") {
      const {
        sequenceId,
        name,
        steps,
        status: seqStatus,
      } = body as {
        sequenceId?: string;
        name?: string;
        steps?: unknown[];
        status?: string;
      };
      const targetId = sequenceId || enrollmentId;

      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (name) {
        sets.push(`name = $${idx++}`);
        params.push(name);
      }
      if (steps) {
        sets.push(`steps = $${idx++}::jsonb`);
        params.push(JSON.stringify(steps));
      }
      if (seqStatus) {
        sets.push(`status = $${idx++}`);
        params.push(seqStatus);
      }
      sets.push("updated_at = NOW()");
      params.push(targetId);

      await db.$executeRawUnsafe(
        `UPDATE nurture_sequences SET ${sets.join(", ")} WHERE id = $${idx}`,
        ...params
      );
    }

    return jsonResponse({ success: true }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function DELETE(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const type = url.searchParams.get("type");

  if (!id) {
    return errorResponse("id required", 400, origin);
  }

  try {
    if (type === "enrollment") {
      await db.$executeRaw`DELETE FROM nurture_enrollments WHERE id = ${id}`;
    } else {
      await db.$executeRaw`DELETE FROM nurture_sequences WHERE id = ${id}`;
    }

    return jsonResponse({ deleted: true }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
