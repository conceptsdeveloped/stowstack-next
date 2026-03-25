import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
} from "@/lib/api-helpers";

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  try {
    const body = await req.json();
    const { facilityName, email, reportType, reportData, fileName } = body;

    if (!facilityName || !email || !reportData) {
      return errorResponse(
        "Missing required fields: facilityName, email, reportData",
        400,
        origin,
      );
    }

    const report = await db.pms_reports.create({
      data: {
        facility_name: facilityName,
        email,
        report_type: reportType || "unknown",
        file_name: fileName || "report.csv",
        report_data: reportData,
      },
    });

    const facility = await db.facilities.findFirst({
      where: { contact_email: email.toLowerCase() },
      select: { id: true },
    });

    if (facility) {
      await db.facilities.update({
        where: { id: facility.id },
        data: { pms_uploaded: true, updated_at: new Date() },
      });
      await db.pms_reports.update({
        where: { id: report.id },
        data: { facility_id: facility.id },
      });
    }

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
          to: ["blake@storageads.com", "anna@storageads.com"],
          subject: `PMS Report Uploaded: ${facilityName}`,
          html: `<div style="font-family: sans-serif; padding: 20px;">
            <h2>New PMS Report Upload</h2>
            <p><strong>Facility:</strong> ${facilityName}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Report Type:</strong> ${reportType || "Not specified"}</p>
            <p><strong>File:</strong> ${fileName || "report.csv"}</p>
            <p style="color: #666; font-size: 13px;">Uploaded: ${new Date().toISOString()}</p>
          </div>`,
        }),
      }).catch(() => {});
    }

    return jsonResponse({ id: report.id, success: true }, 200, origin);
  } catch {
    return errorResponse("Failed to save PMS report", 500, origin);
  }
}
