import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      facilityName,
      location,
      totalUnits,
      occupancyRange,
      runningAds,
      biggestChallenge,
      howHeard,
    } = body;

    if (!name || !email || !facilityName || !location) {
      return NextResponse.json(
        { error: "Missing required fields" },
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
            to: ["blake@storageads.com"],
            subject: `New Audit Request: ${facilityName} (${location})`,
            html: `
              <h2>New Facility Audit Request</h2>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || "N/A"}</p>
              <p><strong>Facility:</strong> ${facilityName}</p>
              <p><strong>Location:</strong> ${location}</p>
              <p><strong>Units:</strong> ${totalUnits || "N/A"}</p>
              <p><strong>Occupancy:</strong> ${occupancyRange || "N/A"}</p>
              <p><strong>Running Ads:</strong> ${runningAds || "N/A"}</p>
              <p><strong>Biggest Challenge:</strong> ${biggestChallenge || "N/A"}</p>
              <p><strong>How Heard:</strong> ${howHeard || "N/A"}</p>
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
