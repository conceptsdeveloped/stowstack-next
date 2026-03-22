import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  jsonResponse,
  errorResponse,
  getOrigin,
  corsResponse,
  requireAdminKey,
} from "@/lib/api-helpers";

async function generateSummaries(
  subject: string,
  body: string,
  devNote: string
): Promise<{ laymans: string; technical: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const cleaned = subject
      .replace(
        /^(feat|fix|chore|refactor|docs|style|perf|test|ci|build)(\(.+?\))?:\s*/i,
        ""
      )
      .replace(/([A-Z])/g, " $1")
      .trim();
    return {
      laymans:
        devNote ||
        `${cleaned.charAt(0).toUpperCase()}${cleaned.slice(1)}.`,
      technical: body || subject,
    };
  }

  try {
    const context = [
      `Commit: ${subject}`,
      body ? `Details: ${body}` : "",
      devNote ? `Dev's intention: ${devNote}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `You are summarizing a code commit for a self-storage SaaS called StowStack. Two audiences read this:

1. LAYMAN'S SUMMARY: For non-technical stakeholders. One sentence, plain English, no jargon. Focus on what changed for users or the business. Start with a verb.
2. TECHNICAL SUMMARY: For developers. 1-2 sentences, concise, mention specific systems/components affected.

${context}

Respond in exactly this JSON format (no markdown):
{"laymans": "...", "technical": "..."}`,
          },
        ],
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const text = data.content?.[0]?.text || "";
      const parsed = JSON.parse(text);
      return { laymans: parsed.laymans, technical: parsed.technical };
    }
  } catch {
    // Fall through to fallback
  }

  return {
    laymans: devNote || subject,
    technical: body || subject,
  };
}

export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const enrichments = await db.commit_enrichments.findMany({
      orderBy: { created_at: "desc" },
    });

    const byHash: Record<string, (typeof enrichments)[number]> = {};
    for (const e of enrichments) {
      byHash[e.commit_hash] = e;
    }

    return jsonResponse({ enrichments: byHash }, 200, origin);
  } catch {
    return errorResponse("Failed to fetch enrichments", 500, origin);
  }
}

export async function POST(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { commitHash, devNote, devName, subject, body: commitBody } =
      body || {};

    if (!commitHash) {
      return errorResponse("commitHash is required", 400, origin);
    }
    if (!devName) {
      return errorResponse("devName is required", 400, origin);
    }

    const { laymans, technical } = await generateSummaries(
      subject || "",
      commitBody || "",
      devNote || ""
    );

    const enrichment = await db.commit_enrichments.upsert({
      where: { commit_hash: commitHash },
      update: {
        dev_note: devNote || undefined,
        dev_name: devName,
        laymans_summary: laymans,
        technical_summary: technical,
        updated_at: new Date(),
      },
      create: {
        commit_hash: commitHash,
        dev_note: devNote || "",
        dev_name: devName,
        laymans_summary: laymans,
        technical_summary: technical,
      },
    });

    return jsonResponse({ enrichment }, 200, origin);
  } catch {
    return errorResponse("Failed to save enrichment", 500, origin);
  }
}

export async function PATCH(req: NextRequest) {
  const origin = getOrigin(req);
  const authErr = requireAdminKey(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const { commitHash, devNote, subject, body: commitBody } = body || {};

    if (!commitHash) {
      return errorResponse("commitHash is required", 400, origin);
    }

    const { laymans, technical } = await generateSummaries(
      subject || "",
      commitBody || "",
      devNote || ""
    );

    const existing = await db.commit_enrichments.findUnique({
      where: { commit_hash: commitHash },
    });

    if (!existing) {
      return errorResponse("Enrichment not found", 404, origin);
    }

    const enrichment = await db.commit_enrichments.update({
      where: { commit_hash: commitHash },
      data: {
        dev_note: devNote ?? existing.dev_note,
        laymans_summary: laymans,
        technical_summary: technical,
        updated_at: new Date(),
      },
    });

    return jsonResponse({ enrichment }, 200, origin);
  } catch {
    return errorResponse("Failed to update enrichment", 500, origin);
  }
}
