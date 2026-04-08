import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

interface AngleStats {
  impressions: number;
  clicks: number;
  ctr: number;
  leads: number;
  score: number;
}

interface CopyPerformance {
  variation_id: string;
  headline: string;
  angle: string;
  ctr: number;
}

interface LearningsJson {
  angle_performance: Record<string, AngleStats>;
  best_performing_copy: CopyPerformance[];
  worst_performing_copy: CopyPerformance[];
  recommended_angles: string[];
  avoid_angles: string[];
  data_points: number;
  last_data_period: string;
}

const MIN_IMPRESSIONS = 1000;
const MIN_PERIODS = 2;

/**
 * Compute facility-level learnings from creative performance data.
 * Pure DB queries — no LLM calls. Upserts into facility_learnings.
 */
export async function computeFacilityLearnings(
  facilityId: string,
): Promise<LearningsJson | null> {
  // Get all creative performance joined with ad variation angles
  const rows = await db.$queryRaw<
    Array<{
      variation_id: string;
      angle: string | null;
      period: string;
      impressions: number;
      clicks: number;
      ctr: number | null;
      leads: number;
      content_json: Record<string, unknown>;
    }>
  >`
    SELECT
      cp.variation_id,
      av.angle,
      cp.period,
      cp.impressions::int,
      cp.clicks::int,
      cp.ctr::float,
      cp.leads::int,
      av.content_json
    FROM creative_performance cp
    JOIN ad_variations av ON av.id = cp.variation_id
    WHERE cp.facility_id = ${facilityId}::uuid
    ORDER BY cp.period DESC
  `;

  if (rows.length === 0) return null;

  // Check minimum data thresholds
  const periods = new Set(rows.map((r) => r.period));
  const totalImpressions = rows.reduce((sum, r) => sum + r.impressions, 0);

  if (periods.size < MIN_PERIODS || totalImpressions < MIN_IMPRESSIONS) {
    return null;
  }

  // Aggregate by angle
  const angleMap: Record<string, { impressions: number; clicks: number; leads: number }> = {};
  for (const row of rows) {
    const angle = row.angle || "unknown";
    if (!angleMap[angle]) {
      angleMap[angle] = { impressions: 0, clicks: 0, leads: 0 };
    }
    angleMap[angle].impressions += row.impressions;
    angleMap[angle].clicks += row.clicks;
    angleMap[angle].leads += row.leads;
  }

  // Compute angle performance with scores
  const avgCtr = totalImpressions > 0
    ? rows.reduce((sum, r) => sum + r.clicks, 0) / totalImpressions
    : 0;

  const anglePerformance: Record<string, AngleStats> = {};
  for (const [angle, stats] of Object.entries(angleMap)) {
    const ctr = stats.impressions > 0 ? stats.clicks / stats.impressions : 0;
    anglePerformance[angle] = {
      impressions: stats.impressions,
      clicks: stats.clicks,
      ctr: parseFloat(ctr.toFixed(4)),
      leads: stats.leads,
      score: avgCtr > 0 ? parseFloat((ctr / avgCtr).toFixed(2)) : 0,
    };
  }

  // Find best and worst performing copy
  const copyRows = rows
    .filter((r) => r.impressions >= 100 && r.ctr !== null)
    .map((r) => {
      const content = r.content_json as Record<string, string>;
      return {
        variation_id: r.variation_id,
        headline: content.headline || content.primaryText?.slice(0, 60) || "Unknown",
        angle: r.angle || "unknown",
        ctr: r.ctr || 0,
      };
    });

  copyRows.sort((a, b) => b.ctr - a.ctr);
  const bestCopy = copyRows.slice(0, 3);
  const worstCopy = copyRows.slice(-3).reverse();

  // Determine recommended and avoid angles
  const sortedAngles = Object.entries(anglePerformance)
    .filter(([, s]) => s.impressions >= 200)
    .sort((a, b) => b[1].score - a[1].score);

  const recommended = sortedAngles
    .filter(([, s]) => s.score >= 1.0)
    .map(([angle]) => angle);
  const avoid = sortedAngles
    .filter(([, s]) => s.score < 0.5)
    .map(([angle]) => angle);

  const sortedPeriods = [...periods].sort().reverse();

  const learnings: LearningsJson = {
    angle_performance: anglePerformance,
    best_performing_copy: bestCopy,
    worst_performing_copy: worstCopy,
    recommended_angles: recommended,
    avoid_angles: avoid,
    data_points: periods.size,
    last_data_period: sortedPeriods[0],
  };

  // Upsert into facility_learnings
  await db.facility_learnings.upsert({
    where: { facility_id: facilityId },
    update: {
      learnings_json: learnings as unknown as Prisma.InputJsonValue,
      last_synthesized: new Date(),
    },
    create: {
      facility_id: facilityId,
      learnings_json: learnings as unknown as Prisma.InputJsonValue,
      last_synthesized: new Date(),
    },
  });

  return learnings;
}

/**
 * Get facility learnings formatted for prompt injection.
 * Returns empty string when no data exists (pre-launch safe).
 */
export async function getFacilityLearningsContext(
  facilityId: string,
): Promise<string> {
  try {
    const row = await db.facility_learnings.findUnique({
      where: { facility_id: facilityId },
      select: { learnings_json: true },
    });

    if (!row?.learnings_json) return "";

    const learnings = row.learnings_json as unknown as LearningsJson;
    if (!learnings.angle_performance || learnings.data_points < MIN_PERIODS) {
      return "";
    }

    const lines: string[] = [
      "--- FACILITY PERFORMANCE DATA (from real campaign results — use this to inform your creative decisions) ---",
    ];

    // Angle recommendations
    if (learnings.recommended_angles.length > 0) {
      lines.push(
        `RECOMMENDED ANGLES (proven to perform for this facility): ${learnings.recommended_angles.join(", ")}`,
      );
    }
    if (learnings.avoid_angles.length > 0) {
      lines.push(
        `AVOID THESE ANGLES (underperformed for this facility): ${learnings.avoid_angles.join(", ")}`,
      );
    }

    // Best performing copy examples
    if (learnings.best_performing_copy.length > 0) {
      lines.push("TOP PERFORMING HEADLINES:");
      for (const copy of learnings.best_performing_copy) {
        lines.push(`  - "${copy.headline}" (${copy.angle}, ${(copy.ctr * 100).toFixed(1)}% CTR)`);
      }
    }

    // Worst performing to avoid
    if (learnings.worst_performing_copy.length > 0) {
      lines.push("WORST PERFORMING (avoid similar messaging):");
      for (const copy of learnings.worst_performing_copy) {
        lines.push(`  - "${copy.headline}" (${copy.angle}, ${(copy.ctr * 100).toFixed(1)}% CTR)`);
      }
    }

    // Angle breakdown
    const angleEntries = Object.entries(learnings.angle_performance)
      .sort((a, b) => b[1].score - a[1].score);
    if (angleEntries.length > 0) {
      lines.push("ANGLE PERFORMANCE SCORES (1.0 = average, higher = better):");
      for (const [angle, stats] of angleEntries) {
        lines.push(`  - ${angle}: ${stats.score}x average (${(stats.ctr * 100).toFixed(1)}% CTR, ${stats.impressions} impressions)`);
      }
    }

    lines.push(`Based on ${learnings.data_points} months of data through ${learnings.last_data_period}.`);

    return lines.join("\n");
  } catch {
    return "";
  }
}
