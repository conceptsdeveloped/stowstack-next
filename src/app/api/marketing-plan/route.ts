import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import * as Sentry from "@sentry/nextjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonResponse, errorResponse, getOrigin, corsResponse, requireAdminKey } from "@/lib/api-helpers";
import { getBrandContextForCopy } from "@/lib/brand-doctrine";
import { getCreativeContext } from "@/lib/creative";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

export const maxDuration = 120;

const OCCUPANCY_MIDPOINTS: Record<string, number> = {
  "below-60": 50,
  "60-75": 67,
  "75-85": 80,
  "85-95": 90,
  "above-95": 97,
};

function getSpendRecommendation(facility: Record<string, unknown>) {
  const occ = OCCUPANCY_MIDPOINTS[facility.occupancy_range as string] ?? 75;
  const rating = parseFloat(String(facility.google_rating)) || 0;
  const reviewCount = (facility.review_count as number) || 0;

  let budgetTier: string;
  let monthlyBudget: { min: number; max: number };
  const reasoning: string[] = [];

  if (occ < 60) {
    budgetTier = "aggressive";
    monthlyBudget = { min: 2000, max: 5000 };
    reasoning.push("Low occupancy — aggressive spend to fill units fast");
  } else if (occ < 75) {
    budgetTier = "growth";
    monthlyBudget = { min: 1500, max: 3500 };
    reasoning.push("Moderate vacancy — strong growth opportunity");
  } else if (occ < 85) {
    budgetTier = "steady";
    monthlyBudget = { min: 800, max: 2000 };
    reasoning.push("Healthy occupancy — steady spend to maintain and grow");
  } else if (occ < 95) {
    budgetTier = "optimize";
    monthlyBudget = { min: 500, max: 1200 };
    reasoning.push("High occupancy — optimize for premium units and rate increases");
  } else {
    budgetTier = "maintain";
    monthlyBudget = { min: 300, max: 800 };
    reasoning.push("Near full — minimal spend, focus on retention and rate optimization");
  }

  const channels: Record<string, number> = {
    google_search: occ < 80 ? 40 : 30,
    meta_ads: occ < 80 ? 30 : 25,
    google_display: 10,
    tiktok_organic: 10,
    google_business: 10,
  };

  if (rating >= 4.5 && reviewCount > 50) {
    reasoning.push(
      `Strong reputation (${rating}★, ${reviewCount} reviews) — leverage social proof in ads`
    );
  } else if (rating < 4.0) {
    reasoning.push("Below 4★ rating — prioritize reputation management before heavy ad spend");
  }

  if (facility.biggest_issue) {
    reasoning.push(
      `Operator-identified challenge: "${facility.biggest_issue}" — plan should address this directly`
    );
  }

  return { budgetTier, monthlyBudget, channels, reasoning };
}

const PLAN_SYSTEM_PROMPT = `You are a self-storage marketing strategist who thinks in first principles. You don't recite playbooks — you diagnose.

Return ONLY valid JSON. No markdown, no text outside the JSON.

CRITICAL: tab_directives MUST be the FIRST field.

{
  "tab_directives": {
    "creative": "3-4 sentences.",
    "google_ads": "3-4 sentences.",
    "tiktok": "3-4 sentences.",
    "video": "3-4 sentences.",
    "landing_pages": "3-4 sentences."
  },
  "summary": "4-5 sentence strategic thesis.",
  "bottleneck_analysis": "3-4 sentences.",
  "target_audiences": [
    { "segment": "", "description": "", "messaging_angle": "", "channels": [] }
  ],
  "messaging_pillars": [
    { "pillar": "", "rationale": "", "example_headline": "" }
  ],
  "channel_strategy": [
    { "channel": "", "budget_pct": 30, "objective": "", "tactics": [] }
  ],
  "content_calendar": [
    { "week": 1, "focus": "", "deliverables": [], "channels": [] }
  ],
  "kpis": [
    { "metric": "", "target": "", "timeframe": "" }
  ],
  "strategic_rationale": []
}`;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const url = new URL(req.url);
  const facilityId = url.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const plan = await db.marketing_plans.findFirst({
      where: { facility_id: facilityId },
      orderBy: { created_at: "desc" },
    });
    return jsonResponse({ plan: plan || null }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "marketing-plan");
  if (limited) return limited;

  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { facilityId, playbooks } = body || {};
    if (!facilityId) return errorResponse("facilityId required", 400, origin);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return errorResponse("ANTHROPIC_API_KEY not configured", 500, origin);

    const [facilities, contextDocs, placesData, scrapeData, pmsUnits, pmsSnapshot, marketIntelRows] =
      await Promise.all([
        db.facilities.findMany({ where: { id: facilityId } }),
        db.facility_context.findMany({
          where: { facility_id: facilityId },
          orderBy: { created_at: "desc" },
          select: { type: true, title: true, content: true },
        }),
        db.places_data.findMany({
          where: { facility_id: facilityId },
          orderBy: { fetched_at: "desc" },
          take: 1,
          select: { photos: true, reviews: true },
        }),
        db.assets.findMany({
          where: { facility_id: facilityId, source: "website_scrape" },
          take: 5,
          select: { url: true, metadata: true },
        }),
        db.facility_pms_units
          .findMany({
            where: { facility_id: facilityId },
            orderBy: { total_count: "desc" },
            select: {
              unit_type: true,
              total_count: true,
              occupied_count: true,
              street_rate: true,
              web_rate: true,
              features: true,
            },
          })
          .catch(() => []),
        db.facility_pms_snapshots
          .findFirst({
            where: { facility_id: facilityId },
            orderBy: { snapshot_date: "desc" },
            select: {
              occupancy_pct: true,
              total_units: true,
              occupied_units: true,
              move_ins_mtd: true,
              move_outs_mtd: true,
            },
          })
          .catch(() => null),
        db.facility_market_intel
          .findMany({ where: { facility_id: facilityId } })
          .catch(() => []),
      ]);

    if (!facilities.length) return errorResponse("Facility not found", 404, origin);
    const facility = facilities[0] as Record<string, unknown>;

    const spendRec = getSpendRecommendation(facility);

    const lines: string[] = [
      `Facility: ${facility.name}`,
      `Location: ${facility.location}`,
      `Occupancy: ${facility.occupancy_range}`,
      `Total units: ${facility.total_units || "unknown"}`,
      `Biggest challenge: ${facility.biggest_issue || "not specified"}`,
    ];

    if (facility.google_rating)
      lines.push(`Google Rating: ${facility.google_rating}★ (${facility.review_count} reviews)`);
    if (facility.google_address) lines.push(`Address: ${facility.google_address}`);
    if (facility.website) lines.push(`Website: ${facility.website}`);
    if (facility.hours) lines.push(`Hours: ${JSON.stringify(facility.hours)}`);
    if (facility.notes) lines.push(`Operator notes: ${facility.notes}`);

    if (contextDocs.length) {
      lines.push("\n--- BUSINESS CONTEXT DOCUMENTS ---");
      for (const doc of contextDocs) {
        lines.push(`[${doc.type}] ${doc.title}: ${(doc.content || "").slice(0, 500)}`);
      }
    }

    const reviews = placesData[0]?.reviews;
    if (reviews && Array.isArray(reviews) && reviews.length) {
      lines.push("\n--- CUSTOMER REVIEWS ---");
      (reviews as Array<{ rating: number; text: string }>)
        .slice(0, 5)
        .forEach((r) => lines.push(`${r.rating}★: "${(r.text || "").slice(0, 150)}"`));
    }

    if (pmsUnits?.length) {
      lines.push("\n--- UNIT INVENTORY (from PMS) ---");
      const totalUnits = pmsUnits.reduce((s, u) => s + (u.total_count || 0), 0);
      const totalVacant = pmsUnits.reduce(
        (s, u) => s + ((u.total_count || 0) - (u.occupied_count || 0)),
        0
      );
      const monthlyGap = pmsUnits.reduce(
        (s, u) => s + ((u.total_count || 0) - (u.occupied_count || 0)) * (Number(u.street_rate) || 0),
        0
      );
      lines.push(
        `Total: ${totalUnits} units, ${totalVacant} vacant ($${monthlyGap.toLocaleString()}/mo revenue gap)`
      );
      pmsUnits.forEach((u) => {
        const vacantCount = (u.total_count || 0) - (u.occupied_count || 0);
        const features =
          Array.isArray(u.features) && u.features.length ? ` [${(u.features as string[]).join(", ")}]` : "";
        lines.push(
          `  ${u.unit_type}: ${u.total_count} total, ${vacantCount} vacant, $${u.street_rate || "?"}/mo${u.web_rate ? `, web $${u.web_rate}` : ""}${features}`
        );
      });
      if (pmsSnapshot) {
        if (pmsSnapshot.occupancy_pct)
          lines.push(`Overall occupancy: ${pmsSnapshot.occupancy_pct}%`);
        if (pmsSnapshot.move_ins_mtd || pmsSnapshot.move_outs_mtd)
          lines.push(
            `This month: ${pmsSnapshot.move_ins_mtd || 0} move-ins, ${pmsSnapshot.move_outs_mtd || 0} move-outs`
          );
      }
    }

    const mIntel = marketIntelRows?.[0] as Record<string, unknown> | undefined;
    if (mIntel) {
      const competitors =
        typeof mIntel.competitors === "string"
          ? JSON.parse(mIntel.competitors)
          : ((mIntel.competitors as Array<Record<string, unknown>>) || []);
      const demandDrivers =
        typeof mIntel.demand_drivers === "string"
          ? JSON.parse(mIntel.demand_drivers)
          : ((mIntel.demand_drivers as Array<Record<string, unknown>>) || []);
      const demographics =
        typeof mIntel.demographics === "string"
          ? JSON.parse(mIntel.demographics)
          : ((mIntel.demographics as Record<string, unknown>) || {});

      if (competitors.length) {
        lines.push("\n--- COMPETITIVE LANDSCAPE ---");
        competitors.forEach(
          (c: Record<string, unknown>) =>
            lines.push(
              `  ${c.name} — ${c.rating ? c.rating + "★" : "no rating"}${c.reviewCount ? ` (${c.reviewCount} reviews)` : ""}, ${c.distance_miles != null ? c.distance_miles + " miles away" : "distance unknown"}`
            )
        );
      }

      if (demandDrivers.length) {
        lines.push("\n--- LOCAL DEMAND DRIVERS ---");
        const grouped: Record<string, Array<Record<string, unknown>>> = {};
        demandDrivers.forEach((d: Record<string, unknown>) => {
          const cat = d.category as string;
          if (!grouped[cat]) grouped[cat] = [];
          grouped[cat].push(d);
        });
        Object.entries(grouped).forEach(([cat, items]) => {
          lines.push(`  [${cat}]`);
          items.forEach((d) =>
            lines.push(
              `    ${d.name} — ${d.distance_miles != null ? d.distance_miles + " miles" : "distance unknown"}`
            )
          );
        });
      }

      if (demographics.population || demographics.median_income) {
        lines.push("\n--- MARKET DEMOGRAPHICS ---");
        if (demographics.zip) lines.push(`  ZIP: ${demographics.zip}`);
        if (demographics.population)
          lines.push(`  Population: ${(demographics.population as number).toLocaleString()}`);
        if (demographics.median_income)
          lines.push(`  Median income: $${(demographics.median_income as number).toLocaleString()}`);
        if (demographics.median_age) lines.push(`  Median age: ${demographics.median_age}`);
        if (demographics.renter_pct != null)
          lines.push(`  Renter %: ${demographics.renter_pct}%`);
        if (demographics.median_home_value)
          lines.push(
            `  Median home value: $${(demographics.median_home_value as number).toLocaleString()}`
          );
      }

      if (mIntel.manual_notes) {
        lines.push("\n--- OPERATOR MARKET NOTES ---");
        lines.push(mIntel.manual_notes as string);
      }
    }

    if (playbooks?.length) {
      lines.push("\n--- ASSIGNED SEASONAL PLAYBOOKS ---");
      lines.push(`Active playbooks: ${playbooks.join(", ")}`);
      lines.push("Incorporate these seasonal strategies into the plan.");
      if (playbooks.includes("b2b-commercial")) {
        lines.push(
          "B2B/Commercial focus: Target contractors, small businesses, e-commerce sellers, medical/legal offices needing document storage."
        );
      }
    }

    lines.push("\n--- BUDGET RECOMMENDATION ---");
    lines.push(
      `Tier: ${spendRec.budgetTier} ($${spendRec.monthlyBudget.min}-$${spendRec.monthlyBudget.max}/month)`
    );
    lines.push(
      `Channel allocation: ${Object.entries(spendRec.channels).map(([k, v]) => `${k}: ${v}%`).join(", ")}`
    );
    spendRec.reasoning.forEach((r) => lines.push(`- ${r}`));

    void scrapeData;

    const client = new Anthropic({ apiKey });
    Sentry.addBreadcrumb({ category: "external_api", message: "Calling Anthropic API", level: "info" });
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      system: PLAN_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Generate a marketing plan for this facility. Think deeply — explain your reasoning. 2-3 target audiences, 3 messaging pillars, 4-week calendar, 3-4 KPIs, 3-5 strategic rationale points. tab_directives FIRST.\n\n${getBrandContextForCopy()}\n\n${getCreativeContext("meta")}\n\n${lines.join("\n")}`,
        },
      ],
    });

    const block = message.content[0];
    if (block.type !== "text") throw new Error("Unexpected response type");
    const raw = block.text.trim();

    let planJson;
    try {
      planJson = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          planJson = JSON.parse(match[0]);
        } catch {
          let repaired = match[0];
          const openBraces = (repaired.match(/\{/g) || []).length;
          const closeBraces = (repaired.match(/\}/g) || []).length;
          const openBrackets = (repaired.match(/\[/g) || []).length;
          const closeBrackets = (repaired.match(/\]/g) || []).length;
          repaired = repaired.replace(/,\s*$/, "");
          repaired = repaired.replace(/,\s*"[^"]*$/, "");
          for (let i = 0; i < openBrackets - closeBrackets; i++) repaired += "]";
          for (let i = 0; i < openBraces - closeBraces; i++) repaired += "}";
          planJson = JSON.parse(repaired);
        }
      } else {
        throw new Error("Could not parse marketing plan response");
      }
    }

    const maxVersion = await db.marketing_plans.aggregate({
      where: { facility_id: facilityId },
      _max: { version: true },
    });

    const plan = await db.marketing_plans.create({
      data: {
        facility_id: facilityId,
        version: (maxVersion._max.version || 0) + 1,
        plan_json: planJson as unknown as Prisma.InputJsonValue,
        spend_recommendation: spendRec as unknown as Prisma.InputJsonValue,
        assigned_playbooks: (playbooks as string[]) || [],
        generated_from: {
          contextDocs: contextDocs.length,
          hasReviews: !!(reviews && Array.isArray(reviews) && reviews.length),
          occupancy: facility.occupancy_range,
        } as unknown as Prisma.InputJsonValue,
        status: "active",
      },
    });

    await db.marketing_plans.updateMany({
      where: {
        facility_id: facilityId,
        id: { not: plan.id },
        status: "active",
      },
      data: { status: "archived" },
    });

    return jsonResponse({ plan }, 200, origin);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500, origin);
  }
}
