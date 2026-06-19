import { db } from "@/lib/db";
import { getValidGoogleToken } from "@/lib/platform-auth";
import { GBP_QUESTION_TEMPLATES } from "@/data/gbp-question-templates";

let templatesEnsured = false;

/** Upsert the global storage-vertical Q&A library into gbp_question_templates. Idempotent. */
export async function ensureQuestionTemplatesSeeded(): Promise<number> {
  if (templatesEnsured) return GBP_QUESTION_TEMPLATES.length;
  let count = 0;
  for (const t of GBP_QUESTION_TEMPLATES) {
    try {
      await db.gbp_question_templates.upsert({
        where: { question_text: t.question_text },
        update: {
          answer_template: t.answer_template,
          category: t.category,
          priority: t.priority,
          active: true,
        },
        create: {
          question_text: t.question_text,
          answer_template: t.answer_template,
          category: t.category,
          priority: t.priority,
          active: true,
        },
      });
      count++;
    } catch {
      // continue seeding the rest of the library
    }
  }
  templatesEnsured = true;
  return count;
}

function fill(tpl: string, facility: { name: string; location: string | null }): string {
  return tpl
    .replace(/\{\{facility_name\}\}/g, facility.name)
    .replace(/\{\{location\}\}/g, facility.location || "your area");
}

interface SeedConnection {
  id: string;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: Date | null;
  location_id: string | null;
}

/** Best-effort: create the question on GBP and answer it. Returns the external id on success. */
async function publishSeededQA(
  connection: SeedConnection,
  questionText: string,
  answerText: string
): Promise<{ published: boolean; externalQuestionId: string | null }> {
  if (!connection.location_id) return { published: false, externalQuestionId: null };

  const token = await getValidGoogleToken(
    {
      id: connection.id,
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_expires_at: connection.token_expires_at,
    },
    {
      clientId: process.env.GOOGLE_GBP_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_GBP_CLIENT_SECRET || "",
      table: "gbp_connections",
    }
  );
  if (!token) return { published: false, externalQuestionId: null };

  try {
    const qRes = await fetch(
      `https://mybusiness.googleapis.com/v4/${connection.location_id}/questions`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: questionText }),
      }
    );
    if (!qRes.ok) return { published: false, externalQuestionId: null };
    const q = await qRes.json();
    const questionName: string | undefined = q.name;
    if (!questionName) return { published: false, externalQuestionId: null };

    await fetch(
      `https://mybusiness.googleapis.com/v4/${questionName}/answers:upsert`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ answer: { text: answerText } }),
      }
    );
    return { published: true, externalQuestionId: questionName };
  } catch {
    return { published: false, externalQuestionId: null };
  }
}

/**
 * Seed a facility's GBP profile with the storage-vertical Q&A library.
 * Always creates local gbp_questions rows (answer pre-filled); when publish=true
 * and a connected profile exists, also posts the Q&A to Google. Dedupes on
 * question text per facility, so it is safe to re-run.
 */
export async function seedFacilityQuestions(
  facilityId: string,
  opts: { publish?: boolean } = {}
): Promise<{ created: number; published: number; skipped: number }> {
  await ensureQuestionTemplatesSeeded();

  const facility = await db.facilities.findUnique({
    where: { id: facilityId },
    select: { id: true, name: true, location: true },
  });
  if (!facility) return { created: 0, published: 0, skipped: 0 };

  const templates = await db.gbp_question_templates.findMany({
    where: { active: true },
    orderBy: { priority: "desc" },
  });

  const connection = await db.gbp_connections.findFirst({
    where: { facility_id: facilityId, status: "connected" },
    select: {
      id: true,
      access_token: true,
      refresh_token: true,
      token_expires_at: true,
      location_id: true,
    },
  });

  let created = 0;
  let published = 0;
  let skipped = 0;

  for (const t of templates) {
    const questionText = t.question_text;
    const existing = await db.gbp_questions.findFirst({
      where: { facility_id: facilityId, question_text: questionText },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const answerText = fill(t.answer_template, facility);

    let externalQuestionId: string | null = null;
    let status = "seeded";
    if (opts.publish && connection) {
      const r = await publishSeededQA(connection, questionText, answerText);
      if (r.published) {
        externalQuestionId = r.externalQuestionId;
        status = "published";
        published++;
      }
    }

    await db.gbp_questions.create({
      data: {
        facility_id: facilityId,
        gbp_connection_id: connection?.id ?? null,
        external_question_id: externalQuestionId,
        author_name: facility.name,
        question_text: questionText,
        question_time: new Date(),
        answer_text: answerText,
        answer_status: status,
        synced_at: new Date(),
      },
    });
    created++;
  }

  return { created, published, skipped };
}
