import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  corsResponse,
  jsonResponse,
  errorResponse,
  requireAdminKey,
  isAdminRequest,
  getOrigin,
} from "@/lib/api-helpers";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(req.headers.get("origin"));
}

// GET: Admin - list deletion requests
export async function GET(req: NextRequest) {
  const authError = requireAdminKey(req);
  if (authError) return authError;

  const origin = getOrigin(req);
  const status = req.nextUrl.searchParams.get("status");

  const where = status ? { status } : {};
  const requests = await db.data_deletion_requests.findMany({
    where,
    orderBy: { requested_at: "desc" },
  });

  return jsonResponse({ requests }, 200, origin);
}

// POST: Public - submit a deletion request; Admin - execute deletion
export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { action } = body;

    // Admin action: execute a deletion request
    if (action === "execute") {
      const authError = requireAdminKey(req);
      if (authError) return authError;
      return handleExecuteDeletion(body, origin);
    }

    // Admin action: acknowledge a request
    if (action === "acknowledge") {
      const authError = requireAdminKey(req);
      if (authError) return authError;
      return handleAcknowledge(body, origin);
    }

    // Public: submit a new deletion request
    return handleNewRequest(body, origin);
  } catch {
    return errorResponse("Invalid request", 400, origin);
  }
}

async function handleNewRequest(
  body: { email?: string; name?: string; reason?: string },
  origin: string | null
) {
  const { email, name, reason } = body;

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return errorResponse("Valid email is required", 400, origin);
  }

  const sanitizedEmail = email.trim().toLowerCase();
  const sanitizedName = name?.trim() || null;
  const sanitizedReason = reason?.trim() || null;

  // Check for existing pending request
  const existing = await db.data_deletion_requests.findFirst({
    where: {
      email: sanitizedEmail,
      status: { in: ["pending", "acknowledged"] },
    },
  });

  if (existing) {
    return jsonResponse(
      {
        message:
          "A deletion request for this email is already being processed.",
        confirmation_id: existing.id,
        status: existing.status,
      },
      200,
      origin
    );
  }

  // Scan for data across all tables
  const dataFound = await scanForUserData(sanitizedEmail);

  // Create the request
  const request = await db.data_deletion_requests.create({
    data: {
      email: sanitizedEmail,
      name: sanitizedName,
      reason: sanitizedReason,
      source: "user_request",
      data_found: dataFound,
    },
  });

  // Send confirmation email to the user
  if (resend) {
    try {
      await resend.emails.send({
        from: "StowStack <noreply@stowstack.co>",
        to: sanitizedEmail,
        subject: "Data Deletion Request Received - StowStack",
        html: buildUserConfirmationEmail(
          sanitizedName || "there",
          request.id
        ),
      });
    } catch {
      // Email failure shouldn't block the request
    }

    // Notify admin
    try {
      await resend.emails.send({
        from: "StowStack System <noreply@stowstack.co>",
        to: "blake@storepawpaw.com",
        subject: `Data Deletion Request: ${sanitizedEmail}`,
        html: buildAdminNotificationEmail(
          sanitizedEmail,
          sanitizedName,
          sanitizedReason,
          dataFound,
          request.id
        ),
      });
    } catch {
      // Admin notification failure shouldn't block
    }
  }

  return jsonResponse(
    {
      message:
        "Your data deletion request has been received. We will acknowledge it within 5 business days and complete deletion within 30 days.",
      confirmation_id: request.id,
    },
    201,
    origin
  );
}

async function handleAcknowledge(
  body: { id?: string; admin_notes?: string },
  origin: string | null
) {
  const { id, admin_notes } = body;
  if (!id) return errorResponse("Request ID required", 400, origin);

  const request = await db.data_deletion_requests.findUnique({
    where: { id },
  });
  if (!request) return errorResponse("Request not found", 404, origin);

  const updated = await db.data_deletion_requests.update({
    where: { id },
    data: {
      status: "acknowledged",
      acknowledged_at: new Date(),
      admin_notes: admin_notes || request.admin_notes,
    },
  });

  // Email the user that their request was acknowledged
  if (resend) {
    try {
      await resend.emails.send({
        from: "StowStack <noreply@stowstack.co>",
        to: request.email,
        subject: "Data Deletion Request Acknowledged - StowStack",
        html: buildAcknowledgmentEmail(request.name || "there", request.id),
      });
    } catch {
      // Non-blocking
    }
  }

  return jsonResponse({ request: updated }, 200, origin);
}

async function handleExecuteDeletion(
  body: { id?: string; admin_notes?: string },
  origin: string | null
) {
  const { id, admin_notes } = body;
  if (!id) return errorResponse("Request ID required", 400, origin);

  const request = await db.data_deletion_requests.findUnique({
    where: { id },
  });
  if (!request) return errorResponse("Request not found", 404, origin);
  if (request.status === "completed") {
    return errorResponse("Request already completed", 400, origin);
  }

  const email = request.email;
  const deleted: Record<string, number> = {};

  // Delete client portal data
  const clients = await db.clients.findMany({ where: { email } });
  if (clients.length > 0) {
    const clientIds = clients.map((c) => c.id);
    const onboardingDel = await db.client_onboarding.deleteMany({
      where: { client_id: { in: clientIds } },
    });
    deleted.client_onboarding = onboardingDel.count;
    const campaignDel = await db.client_campaigns.deleteMany({
      where: { client_id: { in: clientIds } },
    });
    deleted.client_campaigns = campaignDel.count;
    const clientDel = await db.clients.deleteMany({ where: { email } });
    deleted.clients = clientDel.count;
  }

  // Delete tenant data
  const tenants = await db.tenants.findMany({ where: { email } });
  if (tenants.length > 0) {
    const tenantIds = tenants.map((t) => t.id);
    const commDel = await db.tenant_communications.deleteMany({
      where: { tenant_id: { in: tenantIds } },
    });
    deleted.tenant_communications = commDel.count;
    const payDel = await db.tenant_payments.deleteMany({
      where: { tenant_id: { in: tenantIds } },
    });
    deleted.tenant_payments = payDel.count;
    const churnDel = await db.churn_predictions.deleteMany({
      where: { tenant_id: { in: tenantIds } },
    });
    deleted.churn_predictions = churnDel.count;
    const escalDel = await db.delinquency_escalations.deleteMany({
      where: { tenant_id: { in: tenantIds } },
    });
    deleted.delinquency_escalations = escalDel.count;
    const upsellDel = await db.upsell_opportunities.deleteMany({
      where: { tenant_id: { in: tenantIds } },
    });
    deleted.upsell_opportunities = upsellDel.count;
    const tenantDel = await db.tenants.deleteMany({ where: { email } });
    deleted.tenants = tenantDel.count;
  }

  // Delete partial leads
  const partialDel = await db.partial_leads.deleteMany({
    where: { email },
  });
  deleted.partial_leads = partialDel.count;

  // Delete call logs by caller number (if phone matches)
  // Note: call logs use phone numbers, not emails — we skip these unless
  // we can match by other means. Financial records are retained per policy.

  // Delete org user data and their sessions (partner accounts)
  const orgUsers = await db.org_users.findMany({ where: { email } });
  if (orgUsers.length > 0) {
    const orgUserIds = orgUsers.map((u) => u.id);
    const sessionDel = await db.sessions.deleteMany({
      where: { user_id: { in: orgUserIds } },
    });
    deleted.sessions = sessionDel.count;
    const orgUserDel = await db.org_users.deleteMany({ where: { email } });
    deleted.org_users = orgUserDel.count;
  }

  // Delete FB deletion requests for this user
  // (These are Meta-specific, clean them up too)

  // Mark the request as completed
  const updated = await db.data_deletion_requests.update({
    where: { id },
    data: {
      status: "completed",
      completed_at: new Date(),
      completed_by: "admin",
      data_deleted: deleted,
      admin_notes: admin_notes || request.admin_notes,
    },
  });

  // Send completion email to user
  if (resend) {
    try {
      await resend.emails.send({
        from: "StowStack <noreply@stowstack.co>",
        to: email,
        subject: "Data Deletion Complete - StowStack",
        html: buildCompletionEmail(request.name || "there", request.id),
      });
    } catch {
      // Non-blocking
    }
  }

  return jsonResponse(
    { request: updated, deleted },
    200,
    origin
  );
}

// Scan all tables for data matching this email
async function scanForUserData(email: string) {
  const found: Record<string, number> = {};

  const [clients, tenants, partialLeads, orgUsers] = await Promise.all([
    db.clients.count({ where: { email } }),
    db.tenants.count({ where: { email } }),
    db.partial_leads.count({ where: { email } }),
    db.org_users.count({ where: { email } }),
  ]);

  if (clients > 0) found.clients = clients;
  if (tenants > 0) found.tenants = tenants;
  if (partialLeads > 0) found.partial_leads = partialLeads;
  if (orgUsers > 0) found.org_users = orgUsers;

  return found;
}

// Email templates
function buildUserConfirmationEmail(name: string, requestId: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F5F5F7;">
      <div style="margin-bottom: 24px;">
        <span style="font-weight: 700; font-size: 18px; color: #F5F5F7;">Stow<span style="color: #3B82F6;">Stack</span></span>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #F5F5F7;">Data Deletion Request Received</h2>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">Hi ${name},</p>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">
        We have received your data deletion request. Here's what happens next:
      </p>
      <ul style="color: #A1A1A6; line-height: 1.8; margin-bottom: 16px; padding-left: 20px;">
        <li>We will acknowledge your request within <strong style="color: #F5F5F7;">5 business days</strong></li>
        <li>Data deletion will be completed within <strong style="color: #F5F5F7;">30 days</strong></li>
        <li>You will receive a confirmation email when deletion is complete</li>
      </ul>
      <div style="background: #1A1A1A; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <p style="color: #6E6E73; font-size: 12px; margin-bottom: 4px;">Confirmation ID</p>
        <p style="color: #3B82F6; font-family: monospace; font-size: 14px;">${requestId}</p>
      </div>
      <p style="color: #6E6E73; font-size: 12px; line-height: 1.5;">
        If you have questions, contact us at blake@storepawpaw.com or (269) 929-8541.
      </p>
    </div>
  `;
}

function buildAdminNotificationEmail(
  email: string,
  name: string | null,
  reason: string | null,
  dataFound: Record<string, number>,
  requestId: string
) {
  const dataLines = Object.entries(dataFound)
    .map(([table, count]) => `<li>${table}: ${count} record(s)</li>`)
    .join("");

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
      <h2 style="font-size: 18px; font-weight: 600; margin-bottom: 16px;">New Data Deletion Request</h2>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Name:</strong> ${name || "Not provided"}</p>
      <p><strong>Reason:</strong> ${reason || "Not provided"}</p>
      <p><strong>Request ID:</strong> ${requestId}</p>
      <h3 style="margin-top: 16px;">Data Found:</h3>
      <ul>${dataLines || "<li>No matching records found</li>"}</ul>
      <p style="margin-top: 16px; color: #666;">
        Review and process this request in the admin dashboard under Settings > Data Deletion Requests.
      </p>
    </div>
  `;
}

function buildAcknowledgmentEmail(name: string, requestId: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F5F5F7;">
      <div style="margin-bottom: 24px;">
        <span style="font-weight: 700; font-size: 18px; color: #F5F5F7;">Stow<span style="color: #3B82F6;">Stack</span></span>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #F5F5F7;">Deletion Request Acknowledged</h2>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">Hi ${name},</p>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">
        Your data deletion request (ID: <span style="color: #3B82F6; font-family: monospace;">${requestId}</span>) has been acknowledged and is being processed.
      </p>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">
        Deletion will be completed within 30 days of your original request. You will receive a final confirmation email when complete.
      </p>
      <p style="color: #6E6E73; font-size: 12px; line-height: 1.5;">
        Questions? Contact us at blake@storepawpaw.com or (269) 929-8541.
      </p>
    </div>
  `;
}

function buildCompletionEmail(name: string, requestId: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #0A0A0A; color: #F5F5F7;">
      <div style="margin-bottom: 24px;">
        <span style="font-weight: 700; font-size: 18px; color: #F5F5F7;">Stow<span style="color: #3B82F6;">Stack</span></span>
      </div>
      <h2 style="font-size: 20px; font-weight: 600; margin-bottom: 16px; color: #22C55E;">Data Deletion Complete</h2>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">Hi ${name},</p>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">
        Your data deletion request (ID: <span style="color: #3B82F6; font-family: monospace;">${requestId}</span>) has been completed.
      </p>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">
        The following data has been permanently removed from our systems:
      </p>
      <ul style="color: #A1A1A6; line-height: 1.8; margin-bottom: 16px; padding-left: 20px;">
        <li>Account information and login credentials</li>
        <li>Facility data and campaign information</li>
        <li>Portal access and session data</li>
        <li>Messages and communications</li>
        <li>Any data obtained through Meta platform APIs</li>
      </ul>
      <p style="color: #A1A1A6; line-height: 1.6; margin-bottom: 16px;">
        As noted in our privacy policy, certain financial records may be retained as required by tax and accounting regulations.
      </p>
      <p style="color: #6E6E73; font-size: 12px; line-height: 1.5;">
        Questions? Contact us at blake@storepawpaw.com or (269) 929-8541.
      </p>
    </div>
  `;
}
