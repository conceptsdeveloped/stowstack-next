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

const SYSTEM_PROMPT = `You are a Google Ads keyword strategist specializing in self-storage facilities. You generate keyword ideas organized by search intent and ad group theme.

Return ONLY valid JSON — no markdown, no text outside the JSON.

For each keyword, provide:
- keyword: the search term (lowercase)
- intent: "high" (ready to rent), "medium" (researching), or "low" (early awareness)
- competition: "high", "medium", or "low" (based on typical self-storage market)
- estimatedCPC: realistic CPC in dollars for self-storage (typically $2-$12)
- estimatedVolume: monthly search volume estimate for a local market
- relevanceScore: 0-100, how relevant to self-storage
- rationale: 1-sentence explanation
- group: ad group name (e.g., "Brand + Location", "Unit Sizes", "Competitor", "Life Events")

OUTPUT:
{
  "keywords": [
    { "keyword": "", "intent": "", "competition": "", "estimatedCPC": 0, "estimatedVolume": 0, "relevanceScore": 0, "rationale": "", "group": "" }
  ]
}

Generate 25-35 keywords covering these groups:
1. Brand + Location (facility name + city/area)
2. Generic Storage (self storage, storage units, etc.)
3. Unit Sizes (5x5, 10x10, etc.)
4. Features (climate controlled, 24 hour access, etc.)
5. Life Events (moving, declutter, renovation, etc.)
6. Competitor (alternative to [competitor], storage near [landmark])
7. Long-tail / Low Competition (unique local opportunities)`;

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "google-ads-keywords");
  if (limited) return limited;

  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return errorResponse("ANTHROPIC_API_KEY not configured", 500, origin);

  try {
    const { facilityId } = await req.json();
    if (!facilityId)
      return errorResponse("facilityId required", 400, origin);

    const facility = await db.facilities.findUnique({
      where: { id: facilityId },
    });
    if (!facility)
      return errorResponse("Facility not found", 404, origin);

    const [contextDocs, marketingPlans] = await Promise.all([
      db.facility_context.findMany({
        where: {
          facility_id: facilityId,
          type: { in: ["competitor_info", "market_research"] },
        },
        take: 3,
      }),
      db.marketing_plans.findMany({
        where: { facility_id: facilityId, status: "active" },
        orderBy: { created_at: "desc" },
        take: 1,
      }),
    ]);

    const lines: string[] = [
      `Facility: ${facility.name}`,
      `Location: ${facility.location}`,
      `Address: ${facility.google_address || facility.location}`,
      `Occupancy: ${facility.occupancy_range || "unknown"}`,
      `Total units: ${facility.total_units || "unknown"}`,
    ];
    if (facility.google_rating)
      lines.push(
        `Rating: ${facility.google_rating}★ (${facility.review_count} reviews)`
      );
    if (facility.biggest_issue)
      lines.push(`Challenge: ${facility.biggest_issue}`);

    if (contextDocs.length) {
      lines.push("\nCompetitor/Market Context:");
      contextDocs.forEach((d) =>
        lines.push(
          `[${d.type}] ${d.title}: ${(d.content || "").slice(0, 300)}`
        )
      );
    }

    const plan = marketingPlans[0];
    if (plan?.plan_json) {
      const p =
        typeof plan.plan_json === "string"
          ? JSON.parse(plan.plan_json)
          : plan.plan_json;
      lines.push(
        "\n--- ACTIVE MARKETING PLAN (use this to inform keyword selection) ---"
      );
      if (p.bottleneck_analysis)
        lines.push(`Bottleneck: ${p.bottleneck_analysis.slice(0, 200)}`);
      if (p.target_audiences?.length) {
        lines.push(
          "Target audiences: " +
            p.target_audiences
              .map(
                (a: { segment: string; messaging_angle: string }) =>
                  `${a.segment} (${a.messaging_angle})`
              )
              .join("; ")
        );
      }
      if (p.messaging_pillars?.length) {
        lines.push(
          "Messaging pillars: " +
            p.messaging_pillars
              .map((m: { pillar: string }) => m.pillar)
              .join(", ")
        );
      }
      if (p.channel_strategy?.length) {
        const googleStrategy = p.channel_strategy.find(
          (c: { channel: string }) => /google|search|ppc/i.test(c.channel)
        );
        if (googleStrategy) {
          lines.push(`Google strategy: ${googleStrategy.objective}`);
          if (googleStrategy.tactics?.length)
            lines.push(`Tactics: ${googleStrategy.tactics.join("; ")}`);
        }
      }
      if (plan.assigned_playbooks?.length) {
        lines.push(
          `Active playbooks: ${plan.assigned_playbooks.join(", ")}`
        );
      }
      lines.push(
        "Weight keyword suggestions toward these strategic priorities."
      );
    }

    try {
      const [pmsUnits, pmsSnap, pmsSpecials] = await Promise.all([
        db.facility_pms_units.findMany({
          where: { facility_id: facilityId },
          orderBy: { total_count: "desc" },
        }),
        db.facility_pms_snapshots.findMany({
          where: { facility_id: facilityId },
          orderBy: { snapshot_date: "desc" },
          take: 1,
        }),
        db.facility_pms_specials.findMany({
          where: { facility_id: facilityId, active: true },
          take: 3,
        }),
      ]);

      if (pmsUnits.length) {
        const totalUnits = pmsUnits.reduce(
          (s, u) => s + (u.total_count || 0),
          0
        );
        const totalVacant = pmsUnits.reduce(
          (s, u) => s + (u.vacant_count ?? 0),
          0
        );
        const occPct =
          pmsSnap[0]?.occupancy_pct ||
          (totalUnits > 0
            ? (((totalUnits - totalVacant) / totalUnits) * 100).toFixed(1)
            : null);
        const monthlyGap = pmsUnits.reduce(
          (s, u) =>
            s + (u.vacant_count ?? 0) * (Number(u.street_rate) || 0),
          0
        );

        lines.push(
          "\n--- storEDGE PMS DATA (CANONICAL SOURCE OF TRUTH) ---"
        );
        pmsUnits.forEach((u) => {
          const features =
            Array.isArray(u.features) && u.features.length
              ? ` [${u.features.join(", ")}]`
              : "";
          const vacancy =
            (u.vacant_count ?? 0) > 0
              ? `${u.vacant_count} vacant ($${((u.vacant_count ?? 0) * (Number(u.street_rate) || 0)).toLocaleString()}/mo revenue gap)`
              : "FULL — do NOT target";
          lines.push(
            `${u.unit_type}: $${Number(u.street_rate) || "?"}/mo${u.web_rate ? `, web $${u.web_rate}` : ""} — ${vacancy}${features}`
          );
        });
        if (occPct) lines.push(`Overall occupancy: ${occPct}%`);
        lines.push(
          `Total vacant: ${totalVacant} units | Monthly revenue gap: $${monthlyGap.toLocaleString()}`
        );

        const occ = parseFloat(String(occPct)) || 0;
        if (occ < 80) {
          lines.push(
            "\nSTRATEGY: AGGRESSIVE DEMAND — Under 80% occupancy. Broad keywords, strong offer terms, volume over efficiency."
          );
          lines.push(
            "Generate keywords covering ALL available unit types. Include move-in incentive keywords."
          );
        } else if (occ < 90) {
          const priorityTypes = pmsUnits
            .filter((u) => (u.vacant_count ?? 0) > 0)
            .sort((a, b) => (b.vacant_count ?? 0) - (a.vacant_count ?? 0))
            .slice(0, 3);
          lines.push(
            `\nSTRATEGY: TARGETED BY UNIT TYPE — 80-90% occupancy. Focus on underperforming types.`
          );
          lines.push(
            `Priority unit types to fill: ${priorityTypes.map((u) => `${u.unit_type} (${u.vacant_count} vacant)`).join(", ")}`
          );
          lines.push(
            "Weight keywords toward these specific unit sizes/types. Optimize for CPMI."
          );
        } else if (occ < 95) {
          lines.push(
            "\nSTRATEGY: SELECTIVE + RATE OPTIMIZATION — 90-95% occupancy. Fill specific vacancies only."
          );
          lines.push(
            "Generate precise, long-tail keywords for remaining vacant unit types. Reduce broad match terms."
          );
        } else {
          lines.push(
            "\nSTRATEGY: REVENUE MAXIMIZATION — 95%+ occupancy. Minimal acquisition keywords."
          );
          lines.push(
            "Focus on brand defense, waitlist/coming-soon, and high-value unit keywords only."
          );
        }

        if (pmsSpecials.length) {
          lines.push(
            "\nActive promotions: " +
              pmsSpecials
                .map((s) => {
                  const disc =
                    s.discount_type === "percent"
                      ? `${s.discount_value}% off`
                      : s.discount_type === "months_free"
                        ? `${s.discount_value} mo free`
                        : `$${s.discount_value} off`;
                  return `${s.name} (${disc}${s.applies_to?.length ? ` on ${s.applies_to.join(", ")}` : ""})`;
                })
                .join("; ")
          );
          lines.push(
            "Include keywords that align with these active promotions."
          );
        }

        lines.push("\nRULES:");
        lines.push(
          '- NEVER generate generic "Self Storage Near You" — always reference specific unit types/sizes the facility has available'
        );
        lines.push(
          "- NEVER target keywords for unit types at 100% occupancy"
        );
        lines.push(
          "- Weight keywords toward unit types with the largest revenue gap"
        );
        lines.push(
          "- Include location-specific keywords (city, neighborhood, landmarks)"
        );
      }
    } catch {
      // PMS data is optional enrichment
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Generate Google Ads keywords for this self-storage facility. Make them specific to the location and market.\n\n${lines.join("\n")}`,
          },
        ],
      }),
    });

    const message = await res.json();
    const raw = message.content[0].text.trim();
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Could not parse keywords response");
      try {
        parsed = JSON.parse(match[0]);
      } catch {
        let repaired = match[0]
          .replace(/,\s*$/, "")
          .replace(/,\s*"[^"]*$/, "");
        const ob = (repaired.match(/\{/g) || []).length;
        const cb = (repaired.match(/\}/g) || []).length;
        const oB = (repaired.match(/\[/g) || []).length;
        const cB = (repaired.match(/\]/g) || []).length;
        for (let i = 0; i < oB - cB; i++) repaired += "]";
        for (let i = 0; i < ob - cb; i++) repaired += "}";
        parsed = JSON.parse(repaired);
      }
    }

    return jsonResponse(parsed, 200, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Keyword generation failed",
      500,
      origin
    );
  }
}
