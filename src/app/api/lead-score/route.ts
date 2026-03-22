import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  corsResponse,
  getOrigin,
  requireAdminKey,
} from "@/lib/api-helpers";

interface LeadInput {
  totalUnits: string | null;
  occupancyRange: string | null;
  biggestIssue: string | null;
  status: string | null;
  createdAt: string | Date | null;
  notesCount: number;
  formNotes: string | null;
  pmsUploaded: boolean;
}

interface ScoreResult {
  score: number;
  breakdown: Record<string, number>;
  grade: string;
}

function scoreLead(lead: LeadInput, hasOnboarding: boolean): ScoreResult {
  let score = 0;
  const breakdown: Record<string, number> = {};

  const unitScores: Record<string, number> = {
    "under-100": 8,
    "100-300": 14,
    "300-500": 18,
    "500+": 20,
  };
  const unitScore = unitScores[lead.totalUnits || ""] || 10;
  score += unitScore;
  breakdown.facilitySize = unitScore;

  const occScores: Record<string, number> = {
    "below-60": 25,
    "60-75": 20,
    "75-85": 15,
    "85-95": 8,
    "above-95": 3,
  };
  const occScore = occScores[lead.occupancyRange || ""] || 10;
  score += occScore;
  breakdown.occupancy = occScore;

  const issueScores: Record<string, number> = {
    "filling-units": 15,
    "lowering-costs": 12,
    "digital-presence": 10,
    "competitive-pressure": 13,
    "seasonal-fluctuations": 11,
    other: 5,
  };
  const issueScore = issueScores[lead.biggestIssue || ""] || 5;
  score += issueScore;
  breakdown.issue = issueScore;

  const stageScores: Record<string, number> = {
    submitted: 3,
    form_sent: 5,
    form_completed: 8,
    audit_generated: 10,
    call_scheduled: 13,
    client_signed: 15,
    lost: 0,
  };
  const stageScore = stageScores[lead.status || ""] || 0;
  score += stageScore;
  breakdown.pipelineProgress = stageScore;

  const ageInDays = Math.max(
    0,
    (Date.now() - new Date(String(lead.createdAt || Date.now())).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const recencyScore =
    ageInDays <= 1
      ? 10
      : ageInDays <= 3
        ? 8
        : ageInDays <= 7
          ? 6
          : ageInDays <= 14
            ? 4
            : ageInDays <= 30
              ? 2
              : 1;
  score += recencyScore;
  breakdown.recency = recencyScore;

  let engagementScore = 0;
  if (lead.notesCount > 0) engagementScore += 3;
  if (lead.formNotes) engagementScore += 3;
  if (lead.pmsUploaded) engagementScore += 4;
  if (hasOnboarding) engagementScore += 5;
  engagementScore = Math.min(15, engagementScore);
  score += engagementScore;
  breakdown.engagement = engagementScore;

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
    grade:
      score >= 80
        ? "A"
        : score >= 60
          ? "B"
          : score >= 40
            ? "C"
            : score >= 20
              ? "D"
              : "F",
  };
}

export async function OPTIONS(request: NextRequest) {
  return corsResponse(getOrigin(request));
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request);
  const denied = requireAdminKey(request);
  if (denied) return denied;

  const leadId = request.nextUrl.searchParams.get("id");

  try {
    if (leadId) {
      const facilityRows = await db.$queryRawUnsafe<
        Record<string, unknown>[]
      >("SELECT * FROM facilities WHERE id = $1", leadId);
      if (facilityRows.length === 0)
        return errorResponse("Lead not found", 404, origin);
      const facility = facilityRows[0];

      const noteCountRows = await db.$queryRawUnsafe<
        Record<string, unknown>[]
      >(
        "SELECT COUNT(*) as count FROM lead_notes WHERE facility_id = $1",
        leadId
      );

      let hasOnboarding = false;
      if (facility.access_code) {
        const onbRows = await db.$queryRawUnsafe<
          Record<string, unknown>[]
        >(
          "SELECT steps FROM client_onboarding WHERE access_code = $1",
          facility.access_code
        );
        if (onbRows.length > 0 && onbRows[0].steps) {
          hasOnboarding = Object.values(
            onbRows[0].steps as Record<
              string,
              { completed?: boolean }
            >
          ).some((s) => s.completed);
        }
      }

      const lead: LeadInput = {
        totalUnits: facility.total_units as string | null,
        occupancyRange: facility.occupancy_range as string | null,
        biggestIssue: facility.biggest_issue as string | null,
        status: facility.pipeline_status as string | null,
        createdAt: facility.created_at as string | null,
        notesCount: parseInt(
          String(noteCountRows[0]?.count || 0)
        ),
        formNotes: facility.form_notes as string | null,
        pmsUploaded: !!facility.pms_uploaded,
      };

      return jsonResponse(
        { score: scoreLead(lead, hasOnboarding) },
        200,
        origin
      );
    }

    // All lead scores
    const facilities = await db.$queryRawUnsafe<
      Record<string, unknown>[]
    >("SELECT * FROM facilities");
    if (facilities.length === 0)
      return jsonResponse({ scores: {} }, 200, origin);

    const noteCounts = await db.$queryRawUnsafe<
      Record<string, unknown>[]
    >(
      "SELECT facility_id, COUNT(*) as count FROM lead_notes GROUP BY facility_id"
    );
    const noteCountMap: Record<string, number> = {};
    for (const n of noteCounts)
      noteCountMap[String(n.facility_id)] = parseInt(
        String(n.count)
      );

    const onboardingRows = await db.$queryRawUnsafe<
      Record<string, unknown>[]
    >("SELECT access_code, steps FROM client_onboarding");
    const onboardingMap: Record<string, boolean> = {};
    for (const o of onboardingRows) {
      if (o.steps) {
        onboardingMap[String(o.access_code)] = Object.values(
          o.steps as Record<string, { completed?: boolean }>
        ).some((s) => s.completed);
      }
    }

    const scores: Record<string, ScoreResult> = {};
    for (const f of facilities) {
      const lead: LeadInput = {
        totalUnits: f.total_units as string | null,
        occupancyRange: f.occupancy_range as string | null,
        biggestIssue: f.biggest_issue as string | null,
        status: f.pipeline_status as string | null,
        createdAt: f.created_at as string | null,
        notesCount: noteCountMap[String(f.id)] || 0,
        formNotes: f.form_notes as string | null,
        pmsUploaded: !!f.pms_uploaded,
      };
      const hasOnboarding = f.access_code
        ? !!onboardingMap[String(f.access_code)]
        : false;
      scores[String(f.id)] = scoreLead(lead, hasOnboarding);
    }

    return jsonResponse({ scores }, 200, origin);
  } catch {
    return errorResponse("Failed to compute scores", 500, origin);
  }
}
