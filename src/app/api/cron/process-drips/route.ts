import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEQUENCES, type DripStep } from "@/lib/drip-sequences";
import { verifyCronSecret } from "@/lib/cron-auth";

export const maxDuration = 60;

const CANCEL_STATUSES = ["call_scheduled", "client_signed", "lost"];

function logActivity(params: {
  type: string;
  facilityId: string;
  leadName: string;
  facilityName: string;
  detail: string;
  meta: Record<string, unknown>;
}) {
  db.$executeRaw`
    INSERT INTO activity_log (type, facility_id, lead_name, facility_name, detail, meta)
    VALUES (${params.type}, ${params.facilityId}::uuid, ${params.leadName}, ${params.facilityName}, ${params.detail.slice(0, 500)}, ${JSON.stringify(params.meta)}::jsonb)
  `.catch(() => {});
}

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
}

function getAdminKey() {
  const key = process.env.ADMIN_SECRET;
  if (!key) throw new Error("ADMIN_SECRET environment variable is not set");
  return key;
}

async function sendTemplateEmail(templateId: string, lead: { id: string }) {
  const res = await fetch(`${getBaseUrl()}/api/send-template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": getAdminKey(),
    },
    body: JSON.stringify({ templateId, leadId: lead.id }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`send-template failed (${res.status}): ${text}`);
  }

  return res.json();
}

async function sendSms(to: string, body: string, facilityId?: string) {
  const res = await fetch(`${getBaseUrl()}/api/sms-send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": getAdminKey(),
    },
    body: JSON.stringify({ to, body, facilityId }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`sms-send failed (${res.status}): ${text}`);
  }

  return res.json();
}

/**
 * Look up custom drip steps from drip_sequence_templates.
 * Funnel-based sequences use sequence_id format: "funnel_{variationId}"
 */
async function getCustomSteps(sequenceId: string): Promise<DripStep[] | null> {
  if (!sequenceId.startsWith("funnel_")) return null;
  const variationId = sequenceId.replace("funnel_", "");
  try {
    const template = await db.drip_sequence_templates.findFirst({
      where: { variation_id: variationId },
      select: { steps: true },
    });
    return template?.steps as DripStep[] | null;
  } catch {
    return null;
  }
}

interface DripRow {
  id: string;
  facility_id: string;
  sequence_id: string;
  current_step: number;
  status: string;
  enrolled_at: Date;
  next_send_at: Date;
  history: Record<string, unknown>[] | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  facility_name: string | null;
  pipeline_status: string | null;
  biggest_issue: string | null;
  occupancy_range: string | null;
  total_units: number | null;
}

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = {
    processed: 0,
    sent: 0,
    cancelled: 0,
    completed: 0,
    errors: [] as { facilityId?: string; id?: string; error: string }[],
  };

  try {
    const drips = await db.$queryRaw<DripRow[]>`
      SELECT ds.*, f.contact_name, f.contact_email, f.contact_phone, f.name AS facility_name,
             f.pipeline_status, f.biggest_issue, f.occupancy_range, f.total_units
      FROM drip_sequences ds
      JOIN facilities f ON ds.facility_id = f.id
      WHERE ds.status = 'active'
    `;

    for (const drip of drips) {
      try {
        results.processed++;

        if (CANCEL_STATUSES.includes(drip.pipeline_status || "")) {
          await db.$executeRaw`
            UPDATE drip_sequences SET status = 'cancelled', cancelled_at = NOW(),
            cancel_reason = ${`lead_status_${drip.pipeline_status}`} WHERE id = ${drip.id}::uuid
          `;
          logActivity({
            type: "drip_cancelled",
            facilityId: drip.facility_id,
            leadName: drip.contact_name || "",
            facilityName: drip.facility_name || "",
            detail: `Drip sequence auto-cancelled: lead status changed to ${drip.pipeline_status}`,
            meta: { sequenceId: drip.sequence_id },
          });
          results.cancelled++;
          continue;
        }

        const nextSendAt = new Date(drip.next_send_at);
        if (nextSendAt > now) continue;

        // Look up steps: custom funnel template or hardcoded sequence
        const customSteps = await getCustomSteps(drip.sequence_id);
        const sequence = SEQUENCES[drip.sequence_id];
        const steps = customSteps || sequence?.steps;
        if (!steps) continue;

        const step = steps[drip.current_step];
        if (!step) {
          await db.$executeRaw`
            UPDATE drip_sequences SET status = 'completed', completed_at = NOW() WHERE id = ${drip.id}::uuid
          `;
          results.completed++;
          continue;
        }

        const lead = {
          id: drip.facility_id,
          name: drip.contact_name,
          email: drip.contact_email,
          facilityName: drip.facility_name,
          biggestIssue: drip.biggest_issue,
          occupancyRange: drip.occupancy_range,
          totalUnits: drip.total_units,
        };

        try {
          // Dispatch based on channel
          if (step.channel === 'sms') {
            // SMS: replace variables and send via Twilio
            const phone = drip.contact_phone;
            const smsBody = (step.customMessage || '')
              .replace(/\[Facility\]/g, drip.facility_name || '')
              .replace(/\[Name\]/g, drip.contact_name || '');
            if (phone && phone.match(/^\+?\d/) && smsBody) {
              await sendSms(phone, smsBody, drip.facility_id);
            }
          } else if (step.customMessage) {
            // Custom email from funnel config — use send-template with custom body
            // For now, falls through to template email with the funnel templateId
            await sendTemplateEmail(step.templateId, lead);
          } else {
            await sendTemplateEmail(step.templateId, lead);
          }

          const history = [
            ...(drip.history || []),
            {
              step: drip.current_step,
              templateId: step.templateId,
              sentAt: now.toISOString(),
            },
          ];

          const nextStep = drip.current_step + 1;

          if (nextStep >= steps.length) {
            await db.$executeRaw`
              UPDATE drip_sequences SET status = 'completed', completed_at = NOW(),
              current_step = ${nextStep}, history = ${JSON.stringify(history)}::jsonb WHERE id = ${drip.id}::uuid
            `;
            results.completed++;
          } else {
            const nextStepDef = steps[nextStep];
            const enrolledAt = new Date(drip.enrolled_at);
            const delayMs =
              ((nextStepDef.delayDays || 0) * 24 * 60 * 60 * 1000) +
              ((nextStepDef.delayHours || 0) * 60 * 60 * 1000);
            const newNextSendAt = new Date(enrolledAt.getTime() + delayMs);

            await db.$executeRaw`
              UPDATE drip_sequences SET current_step = ${nextStep},
              next_send_at = ${newNextSendAt.toISOString()}::timestamptz,
              history = ${JSON.stringify(history)}::jsonb WHERE id = ${drip.id}::uuid
            `;
          }

          logActivity({
            type: "drip_sent",
            facilityId: drip.facility_id,
            leadName: drip.contact_name || "",
            facilityName: drip.facility_name || "",
            detail: `Drip email sent: "${step.label}" (${step.templateId})`,
            meta: {
              sequenceId: drip.sequence_id,
              step: drip.current_step,
              templateId: step.templateId,
            },
          });

          results.sent++;
        } catch (emailErr: unknown) {
          const message =
            emailErr instanceof Error ? emailErr.message : "Unknown error";
          results.errors.push({
            facilityId: drip.facility_id,
            error: message,
          });
        }
      } catch (dripErr: unknown) {
        const message =
          dripErr instanceof Error ? dripErr.message : "Unknown error";
        results.errors.push({ id: drip.id, error: message });
      }
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Cron processing failed", message },
      { status: 500 }
    );
  }
}
