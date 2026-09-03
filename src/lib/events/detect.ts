/**
 * Detection — turn PMS snapshots into domain events (MISSION.md s7).
 *
 * The only historical source this product has is `facility_pms_rent_roll`,
 * which carries a `snapshot_date` per upload. Comparing the two most recent
 * snapshots for a facility yields move-ins, move-outs, rate changes and the
 * delinquency ladder.
 *
 * ⚠️ `inventory.available` is NOT produced here. `facility_pms_units` is
 * upserted current state — it has `last_updated` but no `snapshot_date`, so
 * there is no previous row to diff against. The rule itself exists and is
 * tested (`diffInventory`); it needs either a `snapshot_date` on that table or
 * a small units-history table before it can be wired. That is a schema change
 * and it is logged as a follow-on rather than guessed at here.
 */

import { db } from "@/lib/db";
import { emit, type EmitResult } from "./bus";
import { diffRentRoll, type RentRollRow } from "./types";

/** Facilities with at least two rent-roll snapshots — the only ones diffable. */
export async function facilitiesWithHistory(afterId?: string, limit = 25): Promise<string[]> {
  const rows = await db.$queryRaw<{ facility_id: string }[]>`
    SELECT facility_id
    FROM facility_pms_rent_roll
    WHERE (${afterId ?? null}::uuid IS NULL OR facility_id > ${afterId ?? null}::uuid)
    GROUP BY facility_id
    HAVING count(DISTINCT snapshot_date) >= 2
    ORDER BY facility_id ASC
    LIMIT ${limit}
  `;
  return rows.map((r) => r.facility_id);
}

export async function detectForFacility(facilityId: string): Promise<EmitResult> {
  const dates = await db.$queryRaw<{ snapshot_date: Date }[]>`
    SELECT DISTINCT snapshot_date FROM facility_pms_rent_roll
    WHERE facility_id = ${facilityId}::uuid
    ORDER BY snapshot_date DESC LIMIT 2
  `;
  if (dates.length < 2) return { emitted: 0, duplicates: 0, fannedOut: 0 };

  const [curDate, prevDate] = dates.map((d) => d.snapshot_date);
  const load = (d: Date) => db.$queryRaw<RentRollRow[]>`
    SELECT unit, account, tenant_name,
           rent_rate::float8 AS rent_rate,
           days_past_due,
           rental_start::text AS rental_start
    FROM facility_pms_rent_roll
    WHERE facility_id = ${facilityId}::uuid AND snapshot_date = ${d}
  `;

  const [next, prev] = await Promise.all([load(curDate), load(prevDate)]);
  const events = diffRentRoll(prev, next, curDate.toISOString(), facilityId);

  // The facility is the fair-share bucket: one customer's 12,000-unit roll must
  // not monopolise the workers ahead of everybody else's.
  return emit(events, facilityId);
}
