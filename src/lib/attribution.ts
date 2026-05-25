import { db } from "@/lib/db";

/**
 * Attribute campaign spend data to specific ad variations.
 * Joins publish_log (which variation was published as which campaign)
 * with campaign_spend (how that campaign performed).
 * Upserts monthly aggregates into creative_performance.
 */
export async function attributeSpendToVariations(
  facilityId: string,
): Promise<number> {
  // Join publish_log → campaign_spend via campaignId
  // publish_log.response_payload->>'campaignId' = campaign_spend.campaign_id
  const attributed = await db.$queryRaw<
    Array<{
      variation_id: string;
      period: string;
      total_spend: number;
      total_impressions: number;
      total_clicks: number;
    }>
  >`
    SELECT
      pl.variation_id,
      TO_CHAR(cs.date, 'YYYY-MM') as period,
      SUM(cs.spend)::numeric as total_spend,
      SUM(cs.impressions)::int as total_impressions,
      SUM(cs.clicks)::int as total_clicks
    FROM publish_log pl
    JOIN campaign_spend cs
      ON cs.campaign_id = pl.response_payload->>'campaignId'
      AND cs.facility_id = pl.facility_id
    WHERE pl.facility_id = ${facilityId}::uuid
      AND pl.status = 'published'
      AND pl.response_payload->>'campaignId' IS NOT NULL
      AND cs.date IS NOT NULL
    GROUP BY pl.variation_id, TO_CHAR(cs.date, 'YYYY-MM')
  `;

  let upserted = 0;

  for (const row of attributed) {
    const ctr =
      row.total_impressions > 0
        ? row.total_clicks / row.total_impressions
        : null;
    const cpc =
      row.total_clicks > 0 ? row.total_spend / row.total_clicks : null;

    await db.creative_performance.upsert({
      where: {
        variation_id_period: {
          variation_id: row.variation_id,
          period: row.period,
        },
      },
      update: {
        spend: row.total_spend,
        impressions: row.total_impressions,
        clicks: row.total_clicks,
        ctr,
        cpc,
      },
      create: {
        facility_id: facilityId,
        variation_id: row.variation_id,
        period: row.period,
        spend: row.total_spend,
        impressions: row.total_impressions,
        clicks: row.total_clicks,
        ctr,
        cpc,
      },
    });
    upserted++;
  }

  return upserted;
}
