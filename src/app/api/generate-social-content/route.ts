import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

const SEASONAL_EVENTS = [
  { month: 1, event: "New Year Declutter", tip: "Start fresh — get the clutter out of your house and into storage" },
  { month: 3, event: "Spring Cleaning", tip: "Spring cleaning means clearing out. Storage makes it easy." },
  { month: 4, event: "Tax Season", tip: "Business owners: secure document storage for tax records" },
  { month: 5, event: "Moving Season Starts", tip: "Moving? Store the overflow while you settle in." },
  { month: 6, event: "Summer Moving Peak", tip: "Peak moving season — reserve your unit before they fill up" },
  { month: 8, event: "College Move-In", tip: "Students: store your stuff between semesters" },
  { month: 9, event: "Back to School", tip: "Downsizing the kids' rooms? We've got space." },
  { month: 10, event: "Fall Transition", tip: "Swap out summer gear for fall — storage keeps it organized" },
  { month: 11, event: "Holiday Prep", tip: "Make room for holiday guests — store the extras" },
  { month: 12, event: "Holiday Storage", tip: "Decorations, gifts, seasonal items — store it all safely" },
];

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse("Server configuration error: missing API key", 500, origin);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400, origin);
  }

  const {
    facilityId,
    platforms = ["facebook", "instagram", "gbp"],
    count = 10,
    timeframeDays = 14,
    postTypes = ["promotion", "tip", "seasonal", "community"],
    tone = "friendly",
  } = body as {
    facilityId?: string;
    platforms?: string[];
    count?: number;
    timeframeDays?: number;
    postTypes?: string[];
    tone?: string;
  };

  if (!facilityId) {
    return errorResponse("facilityId required", 400, origin);
  }

  try {
    const [facility, snapshot, units, specials, _intel] = await Promise.all([
      db.facilities.findUnique({ where: { id: facilityId } }),
      db.facility_pms_snapshots.findFirst({
        where: { facility_id: facilityId },
        orderBy: { snapshot_date: "desc" },
      }),
      db.facility_pms_units.findMany({
        where: { facility_id: facilityId },
        orderBy: { sqft: "asc" },
      }),
      db.facility_pms_specials.findMany({
        where: { facility_id: facilityId, active: true },
      }),
      db.facility_market_intel.findUnique({
        where: { facility_id: facilityId },
      }),
    ]);

    if (!facility) {
      return errorResponse("Facility not found", 404, origin);
    }

    // Try to get onboarding data via raw query (client_onboarding joined through clients)
    const onboardingRows = await db.$queryRaw<
      Array<{ data: unknown }>
    >`SELECT co.steps as data FROM client_onboarding co
      JOIN clients c ON c.id = co.client_id
      WHERE c.facility_id = ${facilityId}
      LIMIT 1`;
    const onboarding = onboardingRows[0] || null;

    const occupancyPct = snapshot
      ? parseFloat(String(snapshot.occupancy_pct || 0))
      : null;
    const vacantUnits = snapshot
      ? (snapshot.total_units || 0) - (snapshot.occupied_units || 0)
      : null;

    const availableUnits = units
      .filter((u) => u.occupied_count < u.total_count)
      .map(
        (u) =>
          `${u.unit_type} (${u.size_label}): $${u.street_rate}/mo — ${u.total_count - u.occupied_count} available`
      )
      .join("\n");

    const fullUnits = units
      .filter((u) => u.occupied_count >= u.total_count)
      .map((u) => u.unit_type)
      .join(", ");

    const activePromos = specials
      .map((s) => {
        const discountLabel =
          s.discount_type === "percent"
            ? `${s.discount_value}% off`
            : s.discount_type === "months_free"
              ? `${s.discount_value} months free`
              : `$${s.discount_value} off`;
        return `${s.name}: ${s.description} (${discountLabel})`;
      })
      .join("\n");

    const onboardingData =
      onboarding?.data
        ? typeof onboarding.data === "string"
          ? JSON.parse(onboarding.data)
          : onboarding.data
        : {};
    const facilityDetails =
      onboardingData?.steps?.facilityDetails?.data || {};
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const relevantEvents = SEASONAL_EVENTS.filter(
      (e) => e.month >= currentMonth && e.month <= currentMonth + 2
    );

    const prompt = `You are a social media manager for a self-storage facility. Generate exactly ${count} social media posts spread across the next ${timeframeDays} days.

FACILITY CONTEXT:
- Name: ${facility.name}
- Location: ${facility.location}
${occupancyPct !== null ? `- Occupancy: ${occupancyPct}% (${vacantUnits} vacant units)` : ""}
${availableUnits ? `- Available units:\n${availableUnits}` : ""}
${fullUnits ? `- FULL (don't promote): ${fullUnits}` : ""}
${activePromos ? `- Active promotions:\n${activePromos}` : "- No current promotions"}
${facilityDetails.brandDescription ? `- Brand description: ${facilityDetails.brandDescription}` : ""}
${facilityDetails.sellingPoints?.length ? `- Key selling points: ${facilityDetails.sellingPoints.join(", ")}` : ""}
${facility.google_phone ? `- Phone: ${facility.google_phone}` : ""}
${facility.website ? `- Website: ${facility.website}` : ""}

TONE: ${tone} (${tone === "professional" ? "authoritative, clean, no slang" : tone === "friendly" ? "warm, approachable, conversational" : tone === "urgent" ? "direct, action-oriented, time-sensitive" : "polished, high-end feel"})

PLATFORMS TO POST TO: ${(platforms as string[]).join(", ")}
POST TYPES TO INCLUDE: ${(postTypes as string[]).join(", ")}

PLATFORM FORMATTING:
- facebook: 150-300 words, conversational, can include links and emojis. No hashtags.
- instagram: 100-200 words, visual-first caption with emojis, add 15-20 relevant hashtags at the END separated by spaces. Include storage, moving, organization, and LOCAL area hashtags.
- gbp: 80-150 words, direct and informative, include a call to action. No hashtags. No emojis.

POST TYPE GUIDELINES:
- promotion: Highlight available units, specials, or seasonal offers. Include specific pricing and unit sizes. Always include a CTA.
- tip: Storage tips, organization advice, packing guides, moving tips. Position the facility as the local expert.
- seasonal: Tie into current season/holiday/event.${relevantEvents.length ? " Upcoming events: " + relevantEvents.map((e) => e.event).join(", ") : ""}
- community: Local events, neighborhood shoutouts, partnerships. Make the facility feel like a neighbor.
- behind_the_scenes: Facility improvements, security features, cleanliness, staff. Build trust.
- unit_spotlight: Feature a specific available unit type with dimensions, use cases, and pricing.
- testimonial: Simulate a customer success story (e.g., "One of our tenants just told us..."). Keep it authentic.
- holiday: Tie into an upcoming holiday if relevant.

RULES:
- Write like a real person, not a brand. No corporate buzzwords.
- Include specific details (unit sizes, prices, hours, address) when relevant.
- Every promotion post MUST include a specific CTA with a reason to act now.
- NEVER use "state-of-the-art", "premier", "solutions", "utilize". Use "clean", "dry", "secure", "affordable", "easy".
- Mix post types — don't do 3 of the same type in a row.
- Space posts 1-3 days apart across the timeframe.
- Vary platforms — distribute evenly across requested platforms.
- For Instagram, every post needs a suggested image description.

Return a JSON array of objects:
[{
  "platform": "facebook" | "instagram" | "gbp",
  "post_type": "promotion" | "tip" | "seasonal" | etc,
  "content": "The full post text including emojis if appropriate",
  "hashtags": ["#storage", "#moving", ...],
  "suggested_image": "Description of ideal photo to pair with this post",
  "day_offset": 1-${timeframeDays},
  "cta_url": "${facility.website || ""}"
}]

Return ONLY the JSON array, no markdown or explanation.`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return errorResponse(`Anthropic API error: ${text}`, 502, origin);
    }

    const aiMessage = await response.json();
    const text = aiMessage.content[0]?.text || "[]";
    let posts: Array<{
      platform?: string;
      post_type?: string;
      content: string;
      hashtags?: string[];
      cta_url?: string;
      day_offset?: number;
      suggested_image?: string;
    }>;

    try {
      const cleaned = text
        .replace(/^```json?\n?/, "")
        .replace(/\n?```$/, "")
        .trim();
      posts = JSON.parse(cleaned);
    } catch {
      return errorResponse("Failed to parse AI-generated content", 500, origin);
    }

    if (!Array.isArray(posts) || posts.length === 0) {
      return errorResponse("AI returned empty or invalid content", 500, origin);
    }

    const batchId = crypto.randomUUID();
    const savedPosts: Array<Record<string, unknown>> = [];

    for (const post of posts) {
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + (post.day_offset || 1));
      scheduledDate.setHours(10, 0, 0, 0);

      const rows = await db.$queryRaw<Array<Record<string, unknown>>>`
        INSERT INTO social_posts (
          facility_id, platform, post_type, content, hashtags, cta_url,
          status, scheduled_at, ai_generated, batch_id, suggested_image
        ) VALUES (
          ${facilityId}, ${post.platform || "facebook"}, ${post.post_type || "tip"},
          ${post.content}, ${post.hashtags || []}, ${post.cta_url || null},
          'draft', ${scheduledDate}::timestamptz, true, ${batchId}, ${post.suggested_image || null}
        )
        RETURNING *
      `;
      savedPosts.push(rows[0]);
    }

    return jsonResponse(
      { batchId, count: savedPosts.length, posts: savedPosts },
      200,
      origin
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
