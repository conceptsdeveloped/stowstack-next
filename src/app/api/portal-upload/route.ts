import { NextRequest } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
  isAdminRequest,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { escapeHtml } from "@/lib/validation";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set([
  "text/csv",
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

/**
 * Resolve a portal client from code + email query params.
 * Returns { facilityId, clientEmail } or null.
 */
async function resolveClient(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const email = url.searchParams.get("email")?.trim().toLowerCase();

  if (!code || !email) return null;

  // Try 4-digit login code
  if (/^\d{4}$/.test(code)) {
    const loginCode = await db.portal_login_codes.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        code,
        expires_at: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (loginCode) {
      const client = await db.clients.findFirst({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, facility_id: true, email: true },
      });
      return client ? { facilityId: client.facility_id, clientEmail: client.email } : null;
    }
  }

  // Legacy access code
  const client = await db.clients.findUnique({
    where: { access_code: code },
    select: { id: true, facility_id: true, email: true },
  });
  if (client && client.email.toLowerCase() === email) {
    return { facilityId: client.facility_id, clientEmail: client.email };
  }

  return null;
}

/**
 * POST — Upload a PMS report file from the client portal.
 */
export async function POST(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "portal-upload");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    const resolved = await resolveClient(req);
    if (!resolved) {
      return errorResponse("Unauthorized", 401, origin);
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const reportType = (formData.get("reportType") as string) || "unknown";

    if (!file || !(file instanceof File)) {
      return errorResponse("No file provided", 400, origin);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("File too large (25MB max)", 413, origin);
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return errorResponse(
        "Unsupported file type. Accepted: CSV, PDF, Excel (.xlsx, .xls)",
        415,
        origin,
      );
    }

    // Upload to Vercel Blob
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const blob = await put(
      `pms-reports/${resolved.facilityId}/${Date.now()}-${sanitizedName}`,
      file,
      { access: "public", contentType: file.type, multipart: true },
    );

    // Get facility name
    const facility = await db.facilities.findUnique({
      where: { id: resolved.facilityId },
      select: { name: true },
    });

    // Create pms_reports record
    const report = await db.pms_reports.create({
      data: {
        facility_id: resolved.facilityId,
        facility_name: facility?.name ?? null,
        email: resolved.clientEmail,
        report_type: reportType,
        file_name: file.name,
        file_url: blob.url,
        file_size: file.size,
        mime_type: file.type,
        status: "uploaded",
      },
    });

    // Mark facility as having PMS data
    await db.facilities.update({
      where: { id: resolved.facilityId },
      data: { pms_uploaded: true, updated_at: new Date() },
    });

    // Send admin notification (fire-and-forget)
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          from: "StorageAds <notifications@storageads.com>",
          to: [process.env.ADMIN_EMAIL || "blake@storageads.com"],
          subject: `PMS Report Uploaded: ${escapeHtml(facility?.name ?? "Unknown")}`,
          html: `<div style="font-family: Poppins, sans-serif; padding: 24px; max-width: 480px;">
            <h2 style="color: #141413; margin: 0 0 16px;">New PMS Report Upload</h2>
            <table style="font-size: 14px; color: #6a6560; line-height: 1.6;">
              <tr><td style="padding-right: 12px; font-weight: 500; color: #141413;">Facility</td><td>${escapeHtml(facility?.name ?? "Unknown")}</td></tr>
              <tr><td style="padding-right: 12px; font-weight: 500; color: #141413;">File</td><td>${escapeHtml(file.name)}</td></tr>
              <tr><td style="padding-right: 12px; font-weight: 500; color: #141413;">Type</td><td>${escapeHtml(reportType)}</td></tr>
              <tr><td style="padding-right: 12px; font-weight: 500; color: #141413;">Size</td><td>${(file.size / 1024).toFixed(1)} KB</td></tr>
              <tr><td style="padding-right: 12px; font-weight: 500; color: #141413;">From</td><td>${escapeHtml(resolved.clientEmail)}</td></tr>
            </table>
            <p style="margin-top: 16px;"><a href="${blob.url}" style="color: #B58B3F;">View File</a></p>
          </div>`,
        }),
      }).catch((err) => {
        console.error("[portal-upload] Notification email failed:", err instanceof Error ? err.message : err);
      });
    }

    return jsonResponse({ id: report.id, file_url: blob.url, success: true }, 200, origin);
  } catch (err) {
    console.error("[portal-upload] Error:", err instanceof Error ? err.message : err);
    return errorResponse("Upload failed", 500, origin);
  }
}

/**
 * GET — Fetch upload history for the client's facility.
 * Also supports admin access with facilityId query param.
 */
export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "portal-upload");
  if (limited) return limited;
  const origin = getOrigin(req);

  try {
    let facilityId: string | null = null;

    // Admin can pass facilityId directly
    const url = new URL(req.url);
    const paramFacilityId = url.searchParams.get("facilityId");
    if (paramFacilityId && isAdminRequest(req)) {
      facilityId = paramFacilityId;
    } else {
      const resolved = await resolveClient(req);
      if (!resolved) {
        return errorResponse("Unauthorized", 401, origin);
      }
      facilityId = resolved.facilityId;
    }

    const reports = await db.pms_reports.findMany({
      where: { facility_id: facilityId },
      orderBy: { uploaded_at: "desc" },
      select: {
        id: true,
        file_name: true,
        file_url: true,
        file_size: true,
        mime_type: true,
        report_type: true,
        status: true,
        notes: true,
        uploaded_at: true,
        processed_at: true,
      },
      take: 50,
    });

    return jsonResponse({ reports }, 200, origin);
  } catch (err) {
    console.error("[portal-upload] GET Error:", err instanceof Error ? err.message : err);
    return errorResponse("Failed to fetch uploads", 500, origin);
  }
}
