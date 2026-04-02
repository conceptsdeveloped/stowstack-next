import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { corsResponse, getOrigin } from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";
import { isValidEmail, sanitizeString, escapeHtml } from "@/lib/validation";

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function POST(request: NextRequest) {
  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.PUBLIC_WRITE, "audit-form");
  if (limited) return limited;

  try {
    const body = await request.json();
    const {
      phone,
      totalUnits,
      occupancyRange,
      runningAds,
      biggestChallenge,
      howHeard,
    } = body;

    const name = sanitizeString(body.name, 200);
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const facilityName = sanitizeString(body.facilityName, 200);
    const location = sanitizeString(body.location, 500);

    if (!name || !email || !facilityName || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Create facility record
    const facility = await db.facilities.create({
      data: {
        name: facilityName,
        location,
        contact_name: name,
        contact_email: email,
        contact_phone: phone || null,
        total_units: totalUnits || null,
        occupancy_range: occupancyRange || null,
        biggest_issue: biggestChallenge || null,
        notes: howHeard ? `How heard: ${howHeard}` : null,
        form_notes: runningAds ? `Running ads: ${runningAds}` : null,
        status: "intake",
        pipeline_status: "submitted",
      },
    });

    // Send email notification via Resend (if configured)
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "StorageAds <noreply@storageads.com>",
            to: [process.env.ADMIN_EMAIL || "blake@storageads.com"],
            subject: `New Audit Request: ${escapeHtml(facilityName)} (${escapeHtml(location)})`,
            html: `
              <h2>New Facility Audit Request</h2>
              <p><strong>Name:</strong> ${escapeHtml(name)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Phone:</strong> ${escapeHtml(phone || "N/A")}</p>
              <p><strong>Facility:</strong> ${escapeHtml(facilityName)}</p>
              <p><strong>Location:</strong> ${escapeHtml(location)}</p>
              <p><strong>Units:</strong> ${escapeHtml(String(totalUnits || "N/A"))}</p>
              <p><strong>Occupancy:</strong> ${escapeHtml(occupancyRange || "N/A")}</p>
              <p><strong>Running Ads:</strong> ${escapeHtml(runningAds || "N/A")}</p>
              <p><strong>Biggest Challenge:</strong> ${escapeHtml(biggestChallenge || "N/A")}</p>
              <p><strong>How Heard:</strong> ${escapeHtml(howHeard || "N/A")}</p>
            `,
          }),
        });
      } catch {
        // Email failure should not block the response
      }
    }

    return NextResponse.json({
      success: true,
      facilityId: facility.id,
    });
  } catch (error) {
    console.error("Audit form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
