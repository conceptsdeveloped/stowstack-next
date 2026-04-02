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

function facilityToLead(
  row: Record<string, unknown>,
  notes: Array<{ text: string; at: string }>
) {
  return {
    id: row.id,
    name: row.contact_name || "",
    email: row.contact_email || "",
    phone: row.contact_phone || "",
    facilityName: row.name || "",
    location: row.location || "",
    occupancyRange: row.occupancy_range || "",
    totalUnits: row.total_units || "",
    biggestIssue: row.biggest_issue || "",
    formNotes: row.form_notes || null,
    status: row.pipeline_status || "submitted",
    pmsUploaded: row.pms_uploaded || false,
    followUpDate: row.follow_up_date || null,
    accessCode: row.access_code || null,
    notes,
    createdAt: row.created_at
      ? new Date(row.created_at as string).toISOString()
      : "",
    updatedAt: row.updated_at
      ? new Date(row.updated_at as string).toISOString()
      : "",
  };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-leads");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
    const limit = Math.max(
      1,
      Math.min(200, parseInt(url.searchParams.get("limit") || "50"))
    );
    const search = url.searchParams.get("search") || "";
    const statusFilter = url.searchParams.get("status") || "";
    const offset = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { contact_name: { contains: search, mode: "insensitive" } },
        { name: { contains: search, mode: "insensitive" } },
        { location: { contains: search, mode: "insensitive" } },
        { contact_email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (statusFilter) {
      where.pipeline_status = statusFilter;
    }

    const sort = url.searchParams.get("sort") || "newest";
    let orderBy: Record<string, string>;
    switch (sort) {
      case "oldest":
        orderBy = { created_at: "asc" };
        break;
      case "name":
        orderBy = { contact_name: "asc" };
        break;
      default:
        orderBy = { created_at: "desc" };
    }

    const [total, facilities] = await Promise.all([
      db.facilities.count({ where }),
      db.facilities.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Batch-fetch notes
    const facilityIds = facilities.map((f) => f.id);
    const noteRows =
      facilityIds.length > 0
        ? await db.lead_notes.findMany({
            where: { facility_id: { in: facilityIds } },
            orderBy: { created_at: "asc" },
            select: { facility_id: true, text: true, created_at: true },
          })
        : [];

    const notesByFacility: Record<
      string,
      Array<{ text: string; at: string }>
    > = {};
    for (const n of noteRows) {
      if (!notesByFacility[n.facility_id]) notesByFacility[n.facility_id] = [];
      notesByFacility[n.facility_id].push({
        text: n.text || "",
        at: n.created_at?.toISOString() || "",
      });
    }

    const leads = facilities.map((f) =>
      facilityToLead(
        f as unknown as Record<string, unknown>,
        notesByFacility[f.id] || []
      )
    );

    const auditCount = await db.shared_audits.count();

    return jsonResponse(
      {
        leads,
        auditCount,
        pagination: { page, limit, total, totalPages },
      },
      200,
      origin
    );
  } catch (err) {
    console.error("Admin leads list error:", err);
    return errorResponse("Failed to list leads", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-leads");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { lead } = body || {};
    if (!lead?.email) return errorResponse("Missing lead data", 400, origin);

    const facility = await db.facilities.create({
      data: {
        name: lead.facilityName || "",
        location: lead.location || "",
        contact_name: lead.name || "",
        contact_email: lead.email,
        contact_phone: lead.phone || "",
        occupancy_range: lead.occupancyRange || "",
        total_units: lead.totalUnits || "",
        biggest_issue: lead.biggestIssue || "",
        notes: lead.notes || null,
        status: "intake",
        pipeline_status: "submitted",
        form_notes: lead.notes || null,
      },
    });

    // Fire-and-forget activity log
    db.activity_log
      .create({
        data: {
          type: "lead_created",
          facility_id: facility.id,
          lead_name: lead.name || "",
          facility_name: lead.facilityName || "",
          detail: `New lead from ${lead.facilityName || "unknown facility"}`.slice(0, 500),
          meta: {},
        },
      })
      .catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));

    return jsonResponse({ id: facility.id }, 200, origin);
  } catch (err) {
    console.error("Admin lead create error:", err);
    return errorResponse("Failed to create lead", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-leads");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { id, status, note, pmsUploaded, followUpDate } = body || {};
    if (!id) return errorResponse("Missing lead ID", 400, origin);

    const facility = await db.facilities.findUnique({ where: { id } });
    if (!facility) return errorResponse("Lead not found", 404, origin);

    // Build dynamic update
    const updateData: Record<string, unknown> = {};
    if (status) updateData.pipeline_status = status;
    if (pmsUploaded !== undefined) updateData.pms_uploaded = pmsUploaded;
    if (followUpDate !== undefined)
      updateData.follow_up_date = followUpDate || null;

    if (Object.keys(updateData).length > 0) {
      await db.facilities.update({ where: { id }, data: updateData });
    }

    // Add note
    if (note) {
      await db.lead_notes.create({
        data: { facility_id: id, text: note },
      });
    }

    // Provision portal access on client_signed
    if (status === "client_signed" && !facility.access_code) {
      const { randomBytes } = await import("crypto");
      const code = randomBytes(4).toString("hex").toUpperCase();
      await db.facilities.update({
        where: { id },
        data: { access_code: code },
      });

      const clientEmail = facility.contact_email || "";
      const clientName = facility.contact_name || "";

      await db.clients.create({
        data: {
          facility_id: id,
          email: clientEmail,
          name: clientName,
          facility_name: facility.name || "",
          location: facility.location || "",
          occupancy_range: facility.occupancy_range || "",
          total_units: facility.total_units || "",
          access_code: code,
        },
      });

      // Auto-send welcome email with portal access instructions
      if (clientEmail && process.env.RESEND_API_KEY) {
        const portalUrl = process.env.NEXT_PUBLIC_APP_URL || "https://storageads.com";
        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "StorageAds <noreply@storageads.com>",
            to: clientEmail,
            subject: `Welcome to StorageAds — Your ${facility.name || "Facility"} Portal is Ready`,
            html: `
              <div style="font-family: -apple-system, system-ui, sans-serif; max-width: 560px; margin: 0 auto; background: #faf9f5; color: #141413;">
                <div style="background: linear-gradient(135deg, #B58B3F, #9E7A36); padding: 28px 24px; border-radius: 12px 12px 0 0;">
                  <h1 style="color: #faf9f5; margin: 0; font-size: 22px;">Welcome to StorageAds</h1>
                  <p style="color: rgba(250,249,245,0.85); margin: 8px 0 0; font-size: 14px;">Your client portal is ready</p>
                </div>
                <div style="padding: 28px 24px; border: 1px solid #e8e6dc; border-top: 0; border-radius: 0 0 12px 12px; background: #ffffff;">
                  <p style="color: #6a6560; font-size: 15px; margin: 0 0 16px;">Hi ${clientName || "there"},</p>
                  <p style="color: #6a6560; font-size: 15px; margin: 0 0 20px;">Your StorageAds portal for <strong>${facility.name || "your facility"}</strong> is set up and ready. You can log in to track campaigns, view reports, and message our team.</p>
                  <div style="text-align: center; margin: 24px 0;">
                    <a href="${portalUrl}/portal" style="display: inline-block; background: #B58B3F; color: #faf9f5; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                      Open Your Portal
                    </a>
                  </div>
                  <p style="color: #6a6560; font-size: 14px; margin: 20px 0 8px;">To log in, go to <strong>${portalUrl}/portal</strong> and enter your email. We'll send a one-time login code.</p>
                  <hr style="border: none; border-top: 1px solid #e8e6dc; margin: 24px 0;" />
                  <p style="color: #6a6560; font-size: 14px; margin: 0 0 4px;"><strong>What happens next:</strong></p>
                  <ol style="color: #6a6560; font-size: 14px; padding-left: 20px; margin: 8px 0;">
                    <li style="margin-bottom: 6px;">Complete the onboarding wizard (5-10 minutes)</li>
                    <li style="margin-bottom: 6px;">We build your campaigns (within 48 hours)</li>
                    <li style="margin-bottom: 6px;">Ads go live and you start seeing results</li>
                  </ol>
                  <p style="color: #b0aea5; font-size: 12px; margin-top: 24px;">Questions? Reply to this email or reach Blake at blake@storageads.com.</p>
                </div>
              </div>
            `,
          }),
        }).catch(() => { /* email send failure is non-critical */ });
      }
    }

    // Fire-and-forget activity logging
    if (status) {
      db.activity_log
        .create({
          data: {
            type:
              status === "client_signed" ? "client_signed" : "status_change",
            facility_id: id,
            lead_name: facility.contact_name || "",
            facility_name: facility.name || "",
            detail:
              status === "client_signed"
                ? `${facility.name} signed as client`
                : `Status changed to "${status}"`,
            meta: { to: status },
          },
        })
        .catch((err) => console.error("[activity_log] Fire-and-forget failed:", err));
    }

    // Fetch updated record
    const updated = await db.facilities.findUnique({ where: { id } });
    const notes = await db.lead_notes.findMany({
      where: { facility_id: id },
      orderBy: { created_at: "asc" },
      select: { text: true, created_at: true },
    });

    const record = facilityToLead(
      updated as unknown as Record<string, unknown>,
      notes.map((n) => ({
        text: n.text || "",
        at: n.created_at?.toISOString() || "",
      }))
    );

    return jsonResponse({ success: true, record }, 200, origin);
  } catch (err) {
    console.error("Admin lead update error:", err);
    return errorResponse("Failed to update lead", 500, origin);
  }
}
