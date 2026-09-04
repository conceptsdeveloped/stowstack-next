import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdminKey } from "@/lib/api-helpers";

/**
 * Operator window onto the domain event stream (MISSION.md s7).
 *
 * Events are the product's memory of what happened at a facility — a move-in, a
 * move-out, a delinquency rung, a rate change, a unit freeing up. They fan out
 * to subscriber queues, and several of those queues have no handler yet by
 * design: an unregistered queue freezes rather than fails, so the work
 * accumulates visibly instead of being dropped.
 *
 * This is how you see that accumulation, and how you know detection is running
 * at all.
 */
export const dynamic = "force-dynamic";

interface EventRow {
  id: string;
  type: string;
  facility_id: string | null;
  facility_name: string | null;
  payload: Record<string, unknown>;
  occurred_at: Date;
  created_at: Date;
  deliveries: number;
}

export async function GET(req: NextRequest) {
  const denied = await requireAdminKey(req);
  if (denied) return denied;

  const type = req.nextUrl.searchParams.get("type");
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? 50) || 50));

  try {
    const byType = await db.$queryRaw<{ type: string; n: number; latest: Date }[]>`
      SELECT type, count(*)::int AS n, max(occurred_at) AS latest
      FROM domain_events
      GROUP BY type
      ORDER BY n DESC
    `;

    // `deliveries` counts the jobs fanned out from each event. The dedupe key is
    // "<eventId>:<queue>", so a prefix match counts them without needing a join
    // column on jobs.
    const events = await db.$queryRaw<EventRow[]>`
      SELECT e.id, e.type, e.facility_id, f.name AS facility_name,
             e.payload, e.occurred_at, e.created_at,
             (SELECT count(*)::int FROM jobs j WHERE j.dedupe_key LIKE e.id || ':%') AS deliveries
      FROM domain_events e
      LEFT JOIN facilities f ON f.id = e.facility_id
      WHERE (${type}::text IS NULL OR e.type = ${type}::text)
      ORDER BY e.occurred_at DESC, e.created_at DESC
      LIMIT ${limit}
    `;

    // Subscriber queues holding work. This is the wiring diagram made real: each
    // row is a Modules v2 capability whose events are piling up, ready for the
    // day its handler ships.
    const waiting = await db.$queryRaw<{ queue: string; status: string; n: number }[]>`
      SELECT queue, status, count(*)::int AS n
      FROM jobs
      WHERE queue NOT LIKE 'pms.%' AND queue NOT LIKE 'demo.%' AND status <> 'done'
      GROUP BY queue, status
      ORDER BY n DESC
    `;

    return NextResponse.json({
      byType,
      events,
      waiting,
      total: byType.reduce((n, r) => n + r.n, 0),
    });
  } catch (error) {
    console.error("[admin-events] failed:", error);
    return NextResponse.json({ error: "Failed to read the event stream" }, { status: 500 });
  }
}
