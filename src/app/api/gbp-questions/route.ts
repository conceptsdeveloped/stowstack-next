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

interface GbpConnection {
  id: string;
  location_id: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
}

async function getValidToken(
  connection: GbpConnection
): Promise<string | null> {
  if (
    connection.access_token &&
    connection.token_expires_at &&
    new Date(connection.token_expires_at) > new Date()
  ) {
    return connection.access_token;
  }
  if (!connection.refresh_token) return null;
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_GBP_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_GBP_CLIENT_SECRET || "",
        refresh_token: connection.refresh_token,
        grant_type: "refresh_token",
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      const expiresAt = new Date(
        Date.now() + (data.expires_in || 3600) * 1000
      );
      await db.gbp_connections.update({
        where: { id: connection.id },
        data: {
          access_token: data.access_token,
          token_expires_at: expiresAt,
          status: "connected",
          updated_at: new Date(),
        },
      });
      return data.access_token;
    }
  } catch {
    // Token refresh failed
  }
  return null;
}

async function generateAIAnswer(
  question: { author_name: string | null; question_text: string },
  facilityName: string
): Promise<string> {
  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 250,
          messages: [
            {
              role: "user",
              content: `Write a helpful answer to a question posted on the Google Business Profile of a self-storage facility called "${facilityName}".

Question from "${question.author_name || "a customer"}": "${question.question_text}"

Guidelines:
- Keep it under 100 words
- Be helpful, friendly, and specific
- If you don't know specifics (prices, hours), suggest they call or visit
- Include a brief mention of the facility name
- Write only the answer text, no labels or quotes`,
            },
          ],
        }),
      });
      const data = await res.json();
      if (data.content?.[0]?.text) return data.content[0].text;
    } catch {
      // AI generation failed, fall through to template
    }
  }

  return `Great question! At ${facilityName}, we'd be happy to help. Please give us a call or stop by our office and our team can provide you with the most up-to-date information. We look forward to assisting you!`;
}

async function syncQuestionsFromGBP(
  facilityId: string,
  connection: GbpConnection
) {
  const token = await getValidToken(connection);
  if (!token)
    throw new Error("Unable to authenticate with Google Business Profile");

  const res = await fetch(
    `https://mybusiness.googleapis.com/v4/${connection.location_id}/questions?pageSize=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(
      errData.error?.message || `GBP API error ${res.status}`
    );
  }

  const data = await res.json();
  const questions = data.questions || [];
  let synced = 0;

  for (const q of questions) {
    const externalId = q.name;
    const existing = await db.gbp_questions.findUnique({
      where: { external_question_id: externalId },
    });

    if (!existing) {
      const topAnswer = q.topAnswers?.[0];
      await db.gbp_questions.create({
        data: {
          facility_id: facilityId,
          gbp_connection_id: connection.id,
          external_question_id: externalId,
          author_name: q.author?.displayName || "Anonymous",
          question_text: q.text || "",
          question_time: q.createTime
            ? new Date(q.createTime)
            : new Date(),
          answer_text: topAnswer?.text || null,
          answer_status: topAnswer ? "published" : "pending",
          upvote_count: q.totalAnswerCount || 0,
          synced_at: new Date(),
        },
      });
      synced++;
    }
  }
  return { synced, total: questions.length };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  const facilityId = req.nextUrl.searchParams.get("facilityId");
  if (!facilityId) return errorResponse("facilityId required", 400, origin);

  try {
    const filterStatus = req.nextUrl.searchParams.get("status");
    const where: Record<string, unknown> = { facility_id: facilityId };
    if (filterStatus) where.answer_status = filterStatus;

    const questions = await db.gbp_questions.findMany({
      where,
      orderBy: { question_time: "desc" },
    });

    const total = await db.gbp_questions.count({
      where: { facility_id: facilityId },
    });
    const answered = await db.gbp_questions.count({
      where: { facility_id: facilityId, answer_status: "published" },
    });

    return jsonResponse(
      {
        questions,
        stats: {
          total,
          answered,
          unanswered: total - answered,
        },
      },
      200,
      origin
    );
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);

  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.EXPENSIVE_API, "gbp-questions");
  if (limited) return limited;

  const authErr = await requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const action = req.nextUrl.searchParams.get("action");

    if (action === "sync") {
      const { facilityId } = body;
      if (!facilityId)
        return errorResponse("facilityId required", 400, origin);

      const connection = await db.gbp_connections.findFirst({
        where: { facility_id: facilityId, status: "connected" },
      });
      if (!connection)
        return errorResponse("No GBP connection", 400, origin);

      try {
        const result = await syncQuestionsFromGBP(facilityId, connection);
        return jsonResponse({ ok: true, ...result }, 200, origin);
      } catch (err: unknown) {
        return errorResponse(
          err instanceof Error ? err.message : "Sync failed",
          500,
          origin
        );
      }
    }

    if (action === "generate-answer") {
      const { questionId } = body;
      if (!questionId)
        return errorResponse("questionId required", 400, origin);

      const question = await db.gbp_questions.findUnique({
        where: { id: questionId },
        include: { facilities: { select: { name: true } } },
      });
      if (!question)
        return errorResponse("Question not found", 404, origin);

      const aiDraft = await generateAIAnswer(
        question,
        question.facilities.name
      );
      await db.gbp_questions.update({
        where: { id: questionId },
        data: { ai_draft: aiDraft, answer_status: "ai_drafted" },
      });
      return jsonResponse({ aiDraft }, 200, origin);
    }

    if (action === "approve-answer") {
      const { questionId, answerText } = body;
      if (!questionId || !answerText)
        return errorResponse(
          "questionId and answerText required",
          400,
          origin
        );

      const question = await db.gbp_questions.findUnique({
        where: { id: questionId },
        include: { gbp_connections: true },
      });
      if (!question)
        return errorResponse("Question not found", 404, origin);

      if (
        question.gbp_connections?.access_token &&
        question.external_question_id
      ) {
        try {
          const token = await getValidToken(question.gbp_connections);
          if (token) {
            await fetch(
              `https://mybusiness.googleapis.com/v4/${question.external_question_id}/answers`,
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ text: answerText }),
              }
            );
          }
        } catch {
          // Failed to publish to GBP, still save locally
        }
      }

      await db.gbp_questions.update({
        where: { id: questionId },
        data: {
          answer_text: answerText,
          answer_status: "published",
          answered_at: new Date(),
        },
      });
      return jsonResponse({ ok: true }, 200, origin);
    }

    if (action === "bulk-generate") {
      const { facilityId } = body;
      if (!facilityId)
        return errorResponse("facilityId required", 400, origin);

      const pending = await db.gbp_questions.findMany({
        where: { facility_id: facilityId, answer_status: "pending" },
        include: { facilities: { select: { name: true } } },
      });

      let generated = 0;
      for (const q of pending) {
        const aiDraft = await generateAIAnswer(q, q.facilities.name);
        await db.gbp_questions.update({
          where: { id: q.id },
          data: { ai_draft: aiDraft, answer_status: "ai_drafted" },
        });
        generated++;
      }
      return jsonResponse({ ok: true, generated }, 200, origin);
    }

    return errorResponse("Invalid action", 400, origin);
  } catch (err: unknown) {
    return errorResponse(
      err instanceof Error ? err.message : "Internal server error",
      500,
      origin
    );
  }
}
