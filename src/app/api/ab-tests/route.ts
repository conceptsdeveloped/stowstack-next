import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  isAdminRequest,
} from "@/lib/api-helpers";

const CHI_SQUARE_95_THRESHOLD = 3.841;

function calculateSignificance(
  controlConversions: number,
  controlVisitors: number,
  treatmentConversions: number,
  treatmentVisitors: number
): {
  pValue: number;
  isSignificant: boolean;
  confidence: number;
  chiSquare: number;
} {
  if (
    controlVisitors < 1 ||
    treatmentVisitors < 1 ||
    controlConversions < 0 ||
    treatmentConversions < 0 ||
    controlConversions > controlVisitors ||
    treatmentConversions > treatmentVisitors
  ) {
    return { pValue: 1, isSignificant: false, confidence: 0, chiSquare: 0 };
  }

  const controlNonConversions = controlVisitors - controlConversions;
  const treatmentNonConversions = treatmentVisitors - treatmentConversions;

  const totalVisitors = controlVisitors + treatmentVisitors;
  const totalConversions = controlConversions + treatmentConversions;
  const totalNonConversions = controlNonConversions + treatmentNonConversions;

  const expectedControlConversions =
    (controlVisitors / totalVisitors) * totalConversions;
  const expectedControlNonConversions =
    (controlVisitors / totalVisitors) * totalNonConversions;
  const expectedTreatmentConversions =
    (treatmentVisitors / totalVisitors) * totalConversions;
  const expectedTreatmentNonConversions =
    (treatmentVisitors / totalVisitors) * totalNonConversions;

  if (
    expectedControlConversions === 0 ||
    expectedControlNonConversions === 0 ||
    expectedTreatmentConversions === 0 ||
    expectedTreatmentNonConversions === 0
  ) {
    return { pValue: 1, isSignificant: false, confidence: 0, chiSquare: 0 };
  }

  const chiSquare =
    Math.pow(controlConversions - expectedControlConversions, 2) /
      expectedControlConversions +
    Math.pow(controlNonConversions - expectedControlNonConversions, 2) /
      expectedControlNonConversions +
    Math.pow(treatmentConversions - expectedTreatmentConversions, 2) /
      expectedTreatmentConversions +
    Math.pow(treatmentNonConversions - expectedTreatmentNonConversions, 2) /
      expectedTreatmentNonConversions;

  const pValue = chiSquare > CHI_SQUARE_95_THRESHOLD ? 0.05 : 0.5;
  const isSignificant = chiSquare > CHI_SQUARE_95_THRESHOLD;

  return { pValue, isSignificant, confidence: 1 - pValue, chiSquare };
}

function generateVariantId(): string {
  return "v_" + Math.random().toString(36).slice(2, 10);
}

async function aggregateResults(test: Record<string, unknown>) {
  const primaryMetric =
    (test.metrics as Record<string, unknown>)?.primary ||
    "reservation_completed";

  const visitorRows = await db.$queryRawUnsafe<
    Record<string, unknown>[]
  >(
    `SELECT variant_id, COUNT(DISTINCT visitor_id) AS visitors
     FROM ab_test_events
     WHERE test_id = $1
     GROUP BY variant_id`,
    test.id
  );

  const conversionRows = await db.$queryRawUnsafe<
    Record<string, unknown>[]
  >(
    `SELECT variant_id, COUNT(DISTINCT visitor_id) AS conversions
     FROM ab_test_events
     WHERE test_id = $1 AND event_name = $2
     GROUP BY variant_id`,
    test.id,
    primaryMetric
  );

  const secondaryMetrics =
    ((test.metrics as Record<string, unknown>)?.secondary as string[]) || [];
  let secondaryRows: Record<string, unknown>[] = [];
  if (secondaryMetrics.length > 0) {
    secondaryRows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT variant_id, event_name, COUNT(DISTINCT visitor_id) AS count
       FROM ab_test_events
       WHERE test_id = $1 AND event_name = ANY($2)
       GROUP BY variant_id, event_name`,
      test.id,
      secondaryMetrics
    );
  }

  const visitorMap: Record<string, number> = {};
  for (const row of visitorRows)
    visitorMap[String(row.variant_id)] = parseInt(
      String(row.visitors),
      10
    );
  const conversionMap: Record<string, number> = {};
  for (const row of conversionRows)
    conversionMap[String(row.variant_id)] = parseInt(
      String(row.conversions),
      10
    );
  const secondaryMap: Record<string, Record<string, number>> = {};
  for (const row of secondaryRows) {
    const vid = String(row.variant_id);
    if (!secondaryMap[vid]) secondaryMap[vid] = {};
    secondaryMap[vid][String(row.event_name)] = parseInt(
      String(row.count),
      10
    );
  }

  const testVariants =
    (test.variants as Array<Record<string, unknown>>) || [];
  const variants = testVariants.map((v) => {
    const visitors = visitorMap[String(v.id)] || 0;
    const conversions = conversionMap[String(v.id)] || 0;
    const conversionRate = visitors > 0 ? conversions / visitors : 0;
    const secondary: Record<string, number> = {};
    if (secondaryMetrics.length > 0) {
      for (const metric of secondaryMetrics) {
        const count = secondaryMap[String(v.id)]?.[metric] || 0;
        secondary[metric] = visitors > 0 ? count / visitors : 0;
      }
    }
    return {
      variantId: v.id,
      variantName: v.name,
      totalVisitors: visitors,
      conversions,
      conversionRate,
      secondaryMetrics:
        Object.keys(secondary).length > 0 ? secondary : undefined,
    };
  });

  let winner: Record<string, unknown> | undefined = undefined;
  let statisticallySignificant = false;

  if (variants.length >= 2) {
    const control = variants[0];
    const treatment = variants[1];

    const sig = calculateSignificance(
      control.conversions,
      control.totalVisitors,
      treatment.conversions,
      treatment.totalVisitors
    );

    if (sig.isSignificant) {
      statisticallySignificant = true;
      const better =
        treatment.conversionRate > control.conversionRate
          ? treatment
          : control;
      const worse = better === treatment ? control : treatment;
      const lift =
        worse.conversionRate > 0
          ? (better.conversionRate - worse.conversionRate) /
            worse.conversionRate
          : 0;

      winner = {
        variantId: better.variantId,
        variantName: better.variantName,
        confidence: sig.confidence,
        lift,
        pValue: sig.pValue,
      };
    }
  }

  return {
    testId: test.id,
    testName: test.name,
    variants,
    startDate: test.start_date,
    endDate: test.end_date,
    winner,
    statisticallySignificant,
  };
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  if (!isAdminRequest(request))
    return errorResponse("Unauthorized", 401, origin);

  const facilityId = request.nextUrl.searchParams.get("facilityId");
  const testId = request.nextUrl.searchParams.get("testId");
  const results = request.nextUrl.searchParams.get("results");

  try {
    if (testId) {
      const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        "SELECT * FROM ab_tests WHERE id = $1",
        testId
      );
      if (rows.length === 0)
        return errorResponse("Test not found", 404, origin);

      const test = rows[0];
      if (results === "true") {
        const aggregated = await aggregateResults(test);
        return jsonResponse({ test, results: aggregated }, 200, origin);
      }
      return jsonResponse({ test }, 200, origin);
    }

    if (facilityId) {
      const tests = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        "SELECT * FROM ab_tests WHERE facility_id = $1 ORDER BY created_at DESC",
        facilityId
      );
      return jsonResponse({ tests }, 200, origin);
    }

    return errorResponse(
      "Provide facilityId or testId query parameter",
      400,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = getOrigin(request);

  try {
    const body = await request.json();

    // Public tracking endpoint (no auth)
    if (body?.action === "track") {
      const { testId, variantId, visitorId, eventName, metadata } = body;
      if (!testId || !variantId || !visitorId || !eventName) {
        return errorResponse(
          "testId, variantId, visitorId, and eventName are required",
          400,
          origin
        );
      }

      const dupeCheck = await db.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT id FROM ab_test_events
         WHERE test_id = $1 AND variant_id = $2 AND visitor_id = $3
           AND event_name = $4 AND created_at > NOW() - INTERVAL '5 seconds'
         LIMIT 1`,
        testId,
        variantId,
        visitorId,
        eventName
      );

      if (dupeCheck.length > 0) {
        return jsonResponse(
          { tracked: false, reason: "duplicate" },
          200,
          origin
        );
      }

      await db.$executeRawUnsafe(
        `INSERT INTO ab_test_events (test_id, variant_id, visitor_id, event_name, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        testId,
        variantId,
        visitorId,
        eventName,
        metadata ? JSON.stringify(metadata) : null
      );

      return jsonResponse({ tracked: true }, 200, origin);
    }

    // All other POST actions require admin auth
    if (!isAdminRequest(request))
      return errorResponse("Unauthorized", 401, origin);

    const {
      facilityId,
      name,
      description,
      variants,
      metrics,
      landingPageIds,
    } = body || {};

    if (
      !facilityId ||
      !name ||
      !variants ||
      !Array.isArray(variants) ||
      variants.length < 2
    ) {
      return errorResponse(
        "facilityId, name, and at least 2 variants are required",
        400,
        origin
      );
    }

    if (!metrics || !metrics.primary) {
      return errorResponse("metrics.primary is required", 400, origin);
    }

    const totalWeight = variants.reduce(
      (sum: number, v: Record<string, unknown>) =>
        sum + Number(v.weight || 0),
      0
    );
    if (totalWeight !== 100) {
      return errorResponse(
        `Variant weights must sum to 100 (got ${totalWeight})`,
        400,
        origin
      );
    }

    const variantsWithIds = variants.map(
      (v: Record<string, unknown>) => ({
        id: generateVariantId(),
        name: v.name,
        slug: v.slug,
        weight: v.weight,
      })
    );

    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `INSERT INTO ab_tests (facility_id, name, description, status, variants, metrics, landing_page_ids, start_date)
       VALUES ($1, $2, $3, 'active', $4, $5, $6, NOW())
       RETURNING *`,
      facilityId,
      name,
      description || null,
      JSON.stringify(variantsWithIds),
      JSON.stringify(metrics),
      landingPageIds || null
    );

    return jsonResponse({ test: rows[0] }, 201, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function PATCH(request: NextRequest) {
  const origin = getOrigin(request);
  if (!isAdminRequest(request))
    return errorResponse("Unauthorized", 401, origin);

  const testId = request.nextUrl.searchParams.get("testId");
  if (!testId)
    return errorResponse(
      "testId query parameter is required",
      400,
      origin
    );

  try {
    const body = await request.json();
    const { status, name, winnerVariantId } = body || {};

    const sets: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status !== undefined) {
      if (!["active", "paused", "completed"].includes(status)) {
        return errorResponse(
          "status must be active, paused, or completed",
          400,
          origin
        );
      }
      sets.push(`status = $${paramIdx++}`);
      params.push(status);
      if (status === "completed") {
        sets.push("end_date = NOW()");
      }
    }

    if (name !== undefined) {
      sets.push(`name = $${paramIdx++}`);
      params.push(name);
    }

    if (winnerVariantId !== undefined) {
      sets.push(`winner_variant_id = $${paramIdx++}`);
      params.push(winnerVariantId);
    }

    if (sets.length === 0)
      return errorResponse("No fields to update", 400, origin);

    params.push(testId);
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      `UPDATE ab_tests SET ${sets.join(", ")} WHERE id = $${paramIdx} RETURNING *`,
      ...params
    );

    if (rows.length === 0)
      return errorResponse("Test not found", 404, origin);

    return jsonResponse({ test: rows[0] }, 200, origin);
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}

export async function DELETE(request: NextRequest) {
  const origin = getOrigin(request);
  if (!isAdminRequest(request))
    return errorResponse("Unauthorized", 401, origin);

  const testId = request.nextUrl.searchParams.get("testId");
  if (!testId)
    return errorResponse(
      "testId query parameter is required",
      400,
      origin
    );

  try {
    const rows = await db.$queryRawUnsafe<Record<string, unknown>[]>(
      "DELETE FROM ab_tests WHERE id = $1 RETURNING id",
      testId
    );
    if (rows.length === 0)
      return errorResponse("Test not found", 404, origin);

    return jsonResponse(
      { deleted: true, testId: rows[0].id },
      200,
      origin
    );
  } catch {
    return errorResponse("Internal server error", 500, origin);
  }
}
