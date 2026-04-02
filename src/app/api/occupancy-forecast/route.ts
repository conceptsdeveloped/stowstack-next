import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";
import { applyRateLimit } from "@/lib/with-rate-limit";
import { RATE_LIMIT_TIERS } from "@/lib/rate-limit-tiers";

const SEASONAL_INDEX: Record<number, number> = {
  1: 0.85,
  2: 0.88,
  3: 0.95,
  4: 1.05,
  5: 1.15,
  6: 1.2,
  7: 1.18,
  8: 1.12,
  9: 1.02,
  10: 0.92,
  11: 0.85,
  12: 0.83,
};

const OCCUPANCY_MID: Record<string, number> = {
  "below-60": 50,
  "60-75": 67.5,
  "75-85": 80,
  "85-95": 90,
  "above-95": 97,
};

const UNIT_COUNTS: Record<string, number> = {
  "under-100": 75,
  "100-300": 200,
  "300-500": 400,
  "500+": 650,
};

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);

  const limited = await applyRateLimit(request, RATE_LIMIT_TIERS.EXPENSIVE_API, "occupancy-forecast");
  if (limited) return limited;

  const denied = requireAdminKey(request);
  if (denied) return denied;

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("Missing facilityId", 400, origin);

  try {
    const facilityRows = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT * FROM facilities WHERE id = ${facilityId}::uuid
    `;
    if (facilityRows.length === 0)
      return errorResponse("Facility not found", 404, origin);
    const fac = facilityRows[0];

    const campaigns = await db.$queryRaw<Record<string, unknown>[]>`
      SELECT cc.* FROM client_campaigns cc
       JOIN clients c ON cc.client_id = c.id
       WHERE c.facility_id = ${facilityId}::uuid
       ORDER BY cc.month ASC
    `;

    let snapshots: Record<string, unknown>[] = [];
    try {
      snapshots = await db.$queryRaw<Record<string, unknown>[]>`
        SELECT * FROM facility_pms_snapshots
         WHERE facility_id = ${facilityId}::uuid
         ORDER BY snapshot_date ASC
      `;
    } catch {
      snapshots = [];
    }

    const currentOccupancy =
      snapshots.length > 0
        ? Number(snapshots[snapshots.length - 1].occupancy_pct || 80)
        : OCCUPANCY_MID[String(fac.occupancy_range)] || 80;

    const totalUnits =
      snapshots.length > 0
        ? Number(
            snapshots[snapshots.length - 1].total_units ||
              UNIT_COUNTS[String(fac.total_units)] ||
              200
          )
        : UNIT_COUNTS[String(fac.total_units)] || 200;

    const avgMoveInsPerMonth =
      campaigns.length > 0
        ? campaigns.reduce((s, c) => s + Number(c.move_ins || 0), 0) /
          campaigns.length
        : 0;

    const monthlyChurnRate = 0.06;

    const now = new Date();
    const forecast: Record<string, unknown>[] = [];
    let occupiedUnits = Math.round(totalUnits * (currentOccupancy / 100));

    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(
        now.getFullYear(),
        now.getMonth() + i + 1,
        1
      );
      const month = forecastDate.getMonth() + 1;
      const seasonalFactor = SEASONAL_INDEX[month] || 1.0;

      const projectedMoveIns = Math.round(
        avgMoveInsPerMonth * seasonalFactor
      );
      const projectedMoveOuts = Math.round(
        occupiedUnits * monthlyChurnRate * (2 - seasonalFactor)
      );
      const netChange = projectedMoveIns - projectedMoveOuts;
      occupiedUnits = Math.max(
        0,
        Math.min(totalUnits, occupiedUnits + netChange)
      );

      const occupancyPct = Math.round((occupiedUnits / totalUnits) * 100);
      const vacantUnits = totalUnits - occupiedUnits;
      const revenueLoss = vacantUnits * 110;

      forecast.push({
        month: forecastDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        monthNum: month,
        occupancyPct,
        occupiedUnits,
        vacantUnits,
        projectedMoveIns,
        projectedMoveOuts,
        netChange,
        revenueLoss,
        seasonalFactor,
      });
    }

    const withAdsOccupancy =
      (forecast[forecast.length - 1]?.occupancyPct as number) ||
      currentOccupancy;
    const withoutAdsForecast: Record<string, unknown>[] = [];
    let noAdsOccupied = Math.round(totalUnits * (currentOccupancy / 100));

    for (let i = 0; i < 12; i++) {
      const forecastDate = new Date(
        now.getFullYear(),
        now.getMonth() + i + 1,
        1
      );
      const month = forecastDate.getMonth() + 1;
      const seasonalFactor = SEASONAL_INDEX[month] || 1.0;

      const organicMoveIns = Math.round(
        avgMoveInsPerMonth * 0.3 * seasonalFactor
      );
      const churnOut = Math.round(
        noAdsOccupied * monthlyChurnRate * (2 - seasonalFactor)
      );
      noAdsOccupied = Math.max(
        0,
        Math.min(totalUnits, noAdsOccupied + organicMoveIns - churnOut)
      );

      withoutAdsForecast.push({
        month: forecastDate.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        }),
        occupancyPct: Math.round((noAdsOccupied / totalUnits) * 100),
      });
    }

    const withoutAdsOccupancy =
      (withoutAdsForecast[withoutAdsForecast.length - 1]
        ?.occupancyPct as number) || currentOccupancy;

    return jsonResponse(
      {
        success: true,
        facilityName: fac.name,
        currentOccupancy,
        totalUnits,
        avgMoveInsPerMonth:
          Math.round(avgMoveInsPerMonth * 10) / 10,
        monthlyChurnRate:
          Math.round(monthlyChurnRate * 1000) / 10,
        forecast,
        withoutAdsForecast,
        summary: {
          currentOccupancy,
          projectedOccupancy12mo: withAdsOccupancy,
          withoutAdsOccupancy12mo: withoutAdsOccupancy,
          occupancyDelta: withAdsOccupancy - withoutAdsOccupancy,
          projectedVacantIn12mo:
            totalUnits -
            Math.round((totalUnits * withAdsOccupancy) / 100),
          peakMonth: (forecast as Array<Record<string, unknown>>).reduce(
            (max, f) =>
              (f.occupancyPct as number) > (max.occupancyPct as number)
                ? f
                : max,
            forecast[0]
          )?.month,
          troughMonth: (forecast as Array<Record<string, unknown>>).reduce(
            (min, f) =>
              (f.occupancyPct as number) < (min.occupancyPct as number)
                ? f
                : min,
            forecast[0]
          )?.month,
        },
      },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
