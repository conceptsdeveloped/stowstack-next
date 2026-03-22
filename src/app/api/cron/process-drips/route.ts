import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { SEQUENCES } from "@/lib/drip-sequences";
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

async function sendTemplateEmail(templateId: string, lead: { id: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
    || (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  const adminKey = process.env.ADMIN_SECRET;
  if (!adminKey) throw new Error("ADMIN_SECRET environment variable is not set");

  const res = await fetch(`${baseUrl}/api/send-template`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Key": adminKey,
    },
    body: JSON.stringify({ templateId, leadId: lead.id }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`send-template failed (${res.status}): ${text}`);
  }

  return res.json();
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
      SELECT ds.*, f.contact_name, f.contact_email, f.name AS facility_name,
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

        const sequence = SEQUENCES[drip.sequence_id];
        if (!sequence) continue;

        const step = sequence.steps[drip.current_step];
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
          await sendTemplateEmail(step.templateId, lead);

          const history = [
            ...(drip.history || []),
            {
              step: drip.current_step,
              templateId: step.templateId,
              sentAt: now.toISOString(),
            },
          ];

          const nextStep = drip.current_step + 1;

          if (nextStep >= sequence.steps.length) {
            await db.$executeRaw`
              UPDATE drip_sequences SET status = 'completed', completed_at = NOW(),
              current_step = ${nextStep}, history = ${JSON.stringify(history)}::jsonb WHERE id = ${drip.id}::uuid
            `;
            results.completed++;
          } else {
            const nextStepDef = sequence.steps[nextStep];
            const enrolledAt = new Date(drip.enrolled_at);
            const newNextSendAt = new Date(
              enrolledAt.getTime() +
                (nextStepDef.delayDays || 0) * 24 * 60 * 60 * 1000
            );

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
