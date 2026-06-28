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

/**
 * Admin inbox index (M4). Lists every client message thread with the last
 * message, unread count (client messages not yet read), and the accessCode the
 * admin needs to open/reply via /api/client-messages. Admin-key gated.
 */
export async function OPTIONS(req: NextRequest) {
  return corsResponse(getOrigin(req));
}

export async function GET(req: NextRequest) {
  const limited = await applyRateLimit(req, RATE_LIMIT_TIERS.AUTHENTICATED, "admin-message-threads");
  if (limited) return limited;
  const origin = getOrigin(req);
  const denied = await requireAdminKey(req);
  if (denied) return denied;

  try {
    const groups = await db.client_messages.groupBy({
      by: ["client_id"],
      _max: { created_at: true },
      _count: { _all: true },
    });
    if (groups.length === 0) return jsonResponse({ threads: [] }, 200, origin);

    groups.sort(
      (a, b) =>
        (b._max.created_at?.getTime() ?? 0) - (a._max.created_at?.getTime() ?? 0),
    );
    const top = groups.slice(0, 100);
    const ids = top.map((g) => g.client_id);

    const [clients, unreadGroups, lasts] = await Promise.all([
      db.clients.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true, access_code: true, facility_id: true },
      }),
      db.client_messages.groupBy({
        by: ["client_id"],
        where: { sender: "client", read_at: null },
        _count: { _all: true },
      }),
      Promise.all(
        top.map((g) =>
          db.client_messages.findFirst({
            where: { client_id: g.client_id },
            orderBy: { created_at: "desc" },
            select: { sender: true, body: true, created_at: true },
          }),
        ),
      ),
    ]);

    const clientById = new Map(clients.map((c) => [c.id, c]));
    const unreadById = new Map(unreadGroups.map((u) => [u.client_id, u._count._all]));

    const facilityIds = clients
      .map((c) => c.facility_id)
      .filter((x): x is string => !!x);
    const facilities = facilityIds.length
      ? await db.facilities.findMany({
          where: { id: { in: facilityIds } },
          select: { id: true, name: true },
        })
      : [];
    const facilityById = new Map(facilities.map((f) => [f.id, f.name]));

    const threads = top
      .map((g, i) => {
        const c = clientById.get(g.client_id);
        const last = lasts[i];
        return {
          clientId: g.client_id,
          accessCode: c?.access_code ?? null,
          email: c?.email ?? null,
          facilityName: c?.facility_id
            ? facilityById.get(c.facility_id) ?? null
            : null,
          lastMessage: last?.body ?? "",
          lastFrom: last?.sender ?? null,
          lastAt: last?.created_at?.toISOString() ?? null,
          unread: unreadById.get(g.client_id) ?? 0,
          total: g._count._all,
        };
      })
      // Need an accessCode to open/reply; drop orphaned threads.
      .filter((t) => t.accessCode);

    return jsonResponse({ threads }, 200, origin);
  } catch {
    return errorResponse("Failed to load threads", 500, origin);
  }
}
