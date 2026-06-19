import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { checkBlocklist } from "@/lib/voice/blocklist";

/** Write an AI safety audit-trail row. Best-effort — never blocks the caller. */
export async function logSafetyEvent(e: {
  facilityId?: string | null;
  eventType: string; // "blocklist_hit" | "review_queue" | "escalation" | "qa_sample"
  surface: string; // "gbp_review_reply" | "gbp_qa" | ...
  sourceId?: string | null;
  aiDraft?: string | null;
  escalationReason?: string | null;
  blocklistTerm?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.ai_safety_events.create({
      data: {
        facility_id: e.facilityId ?? null,
        event_type: e.eventType,
        surface: e.surface,
        source_id: e.sourceId ?? null,
        ai_draft: e.aiDraft ?? null,
        escalation_reason: e.escalationReason ?? null,
        blocklist_term: e.blocklistTerm ?? null,
        human_decision: "pending",
        metadata: e.metadata
          ? (e.metadata as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch {
    // audit logging is best-effort; never block the caller
  }
}

export interface AutoPublishDecision {
  publish: boolean;
  reason: string | null;
  blocklistTerm: string | null;
}

/**
 * The gate that makes review auto-publish safe. A reply is auto-published ONLY
 * when the review is 4–5 stars AND neither the review text nor the AI draft
 * trips the blocklist. Everything else is drafted and left in the human review
 * queue (status 'ai_drafted') for operator approval.
 */
export function reviewAutoPublishDecision(opts: {
  rating: number;
  reviewText: string | null;
  draftText: string;
}): AutoPublishDecision {
  if (opts.rating <= 3) {
    return { publish: false, reason: "low_rating_review_queue", blocklistTerm: null };
  }
  const blReview = checkBlocklist(opts.reviewText);
  if (blReview.hit) {
    return { publish: false, reason: "blocklist_review_text", blocklistTerm: blReview.term ?? null };
  }
  const blDraft = checkBlocklist(opts.draftText);
  if (blDraft.hit) {
    return { publish: false, reason: "blocklist_draft", blocklistTerm: blDraft.term ?? null };
  }
  return { publish: true, reason: null, blocklistTerm: null };
}
