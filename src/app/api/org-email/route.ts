import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

function buildEmail(
  org: { primary_color: string | null; white_label: boolean | null; name: string; logo_url: string | null },
  body: string
): string {
  const primaryColor = org.primary_color || "#16a34a";
  const brandName = org.white_label ? org.name : "StorageAds";
  const logoHtml = org.logo_url
    ? `<img src="${org.logo_url}" alt="${org.name}" style="height: 28px; object-fit: contain;" />`
    : `<span style="font-size: 18px; font-weight: bold; color: white;">${brandName}</span>`;

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8" /></head>
    <body style="margin: 0; padding: 0; background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <div style="max-width: 560px; margin: 0 auto; padding: 24px 16px;">
        <div style="background: ${primaryColor}; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
          ${logoHtml}
        </div>
        <div style="background: white; padding: 28px 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
          ${body}
        </div>
        <div style="text-align: center; padding: 16px 0;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">
            ${org.white_label ? org.name : 'Powered by <a href="https://storageads.com" style="color: #64748b;">StorageAds</a>'}
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "org-email");
  if (limited) return limited;
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { orgId, to, subject, templateKey, variables } = body;
    if (!orgId || !to || !templateKey) {
      return errorResponse("orgId, to, and templateKey required", 400, origin);
    }

    const org = await db.organizations.findUnique({ where: { id: orgId } });
    if (!org) return errorResponse("Organization not found", 404, origin);

    const primaryColor = org.primary_color || "#16a34a";
    const brandName = org.white_label ? org.name : "StorageAds";
    const fromName = org.white_label ? org.name : "StorageAds";
    const vars = variables || {};

    const templates: Record<string, { subject: string; html: string }> = {
      welcome: {
        subject: vars.subject || `Welcome to ${brandName}`,
        html: buildEmail(org, `
          <h2 style="color: #1e293b; margin: 0 0 12px;">Welcome, ${vars.name || "there"}!</h2>
          <p style="color: #475569; font-size: 15px;">Your facility <strong>${vars.facilityName || ""}</strong> is now set up with ${brandName}.</p>
          <p style="color: #475569; font-size: 15px;">We'll be building your ad-specific landing pages and launching campaigns to fill vacant units.</p>
          ${vars.accessCode ? `
            <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 4px; font-size: 13px; color: #64748b;">Your portal access code:</p>
              <p style="margin: 0; font-size: 18px; font-weight: bold; font-family: monospace;">${vars.accessCode}</p>
            </div>
          ` : ""}
          <a href="${vars.portalUrl || "https://storageads.com/portal"}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">View Your Dashboard</a>
        `),
      },
      campaign_live: {
        subject: vars.subject || `Your campaigns are live — ${vars.facilityName || ""}`,
        html: buildEmail(org, `
          <h2 style="color: #1e293b; margin: 0 0 12px;">Your campaigns are live!</h2>
          <p style="color: #475569; font-size: 15px;">We've launched campaigns for <strong>${vars.facilityName || "your facility"}</strong>.</p>
          ${vars.channels ? `
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0 0 8px; font-size: 13px; color: #166534; font-weight: 600;">Active Channels:</p>
              <ul style="margin: 0; padding-left: 20px; color: #15803d;">
                ${(vars.channels as string[]).map((c: string) => `<li style="margin-bottom: 4px;">${c}</li>`).join("")}
              </ul>
            </div>
          ` : ""}
          <p style="color: #475569; font-size: 15px;">You'll start seeing leads and move-in data in your dashboard within the first few days.</p>
          <a href="${vars.portalUrl || "https://storageads.com/portal"}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">View Dashboard</a>
        `),
      },
      monthly_report: {
        subject: vars.subject || `Monthly Report — ${vars.facilityName || ""} — ${vars.month || ""}`,
        html: buildEmail(org, `
          <h2 style="color: #1e293b; margin: 0 0 12px;">Monthly Performance Report</h2>
          <p style="color: #475569; font-size: 15px;">Here's how <strong>${vars.facilityName || "your facility"}</strong> performed in <strong>${vars.month || "this month"}</strong>:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
            <tr>
              <td style="padding: 12px; background: #f8fafc; border-radius: 8px 0 0 0; text-align: center;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Spend</div>
                <div style="font-size: 20px; font-weight: bold; color: #1e293b;">$${vars.spend || "0"}</div>
              </td>
              <td style="padding: 12px; background: #f8fafc; text-align: center;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Leads</div>
                <div style="font-size: 20px; font-weight: bold; color: #1e293b;">${vars.leads || "0"}</div>
              </td>
              <td style="padding: 12px; background: #f8fafc; text-align: center;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Move-Ins</div>
                <div style="font-size: 20px; font-weight: bold; color: ${primaryColor};">${vars.moveIns || "0"}</div>
              </td>
              <td style="padding: 12px; background: #f8fafc; border-radius: 0 8px 0 0; text-align: center;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">ROAS</div>
                <div style="font-size: 20px; font-weight: bold; color: ${primaryColor};">${vars.roas || "0"}x</div>
              </td>
            </tr>
          </table>
          <a href="${vars.portalUrl || "https://storageads.com/portal"}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">View Full Report</a>
        `),
      },
      lead_notification: {
        subject: vars.subject || `New Lead — ${vars.facilityName || ""}`,
        html: buildEmail(org, `
          <h2 style="color: #1e293b; margin: 0 0 12px;">New Lead Received</h2>
          <p style="color: #475569; font-size: 15px;">A new lead just came in for <strong>${vars.facilityName || "your facility"}</strong>:</p>
          <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0;">
            ${vars.leadName ? `<p style="margin: 0 0 6px; font-size: 14px;"><strong>Name:</strong> ${vars.leadName}</p>` : ""}
            ${vars.leadEmail ? `<p style="margin: 0 0 6px; font-size: 14px;"><strong>Email:</strong> ${vars.leadEmail}</p>` : ""}
            ${vars.leadPhone ? `<p style="margin: 0 0 6px; font-size: 14px;"><strong>Phone:</strong> ${vars.leadPhone}</p>` : ""}
            ${vars.unitSize ? `<p style="margin: 0 0 6px; font-size: 14px;"><strong>Unit Size:</strong> ${vars.unitSize}</p>` : ""}
            ${vars.source ? `<p style="margin: 0; font-size: 14px;"><strong>Source:</strong> ${vars.source}</p>` : ""}
          </div>
          <a href="${vars.portalUrl || "https://storageads.com/portal"}" style="display: inline-block; background: ${primaryColor}; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px;">View in Dashboard</a>
        `),
      },
    };

    const template = templates[templateKey];
    if (!template) return errorResponse(`Unknown template: ${templateKey}`, 400, origin);

    if (!process.env.RESEND_API_KEY) {
      return jsonResponse(
        { success: true, preview: true, html: template.html, subject: template.subject },
        200,
        origin
      );
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${fromName} <${org.white_label ? "noreply" : "team"}@storageads.com>`,
        to,
        subject: subject || template.subject,
        html: template.html,
      }),
    });

    if (!emailRes.ok) {
      const err = await emailRes.text();
      return errorResponse(`Failed to send email: ${err}`, 500, origin);
    }

    return jsonResponse({ success: true }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
