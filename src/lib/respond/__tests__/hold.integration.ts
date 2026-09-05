/**
 * The reservation lock, against the real database (MISSION.md s10).
 *
 * The claim that matters is that two callers cannot both take the last unit.
 * That is a concurrency property, and the only honest way to test it is to fire
 * concurrent requests at a real Postgres and count what got through.
 *
 *   npx vitest run --config vitest.integration.config.ts
 */
import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
process.env.DATABASE_URL = pick("DIRECT_URL") || pick("DATABASE_URL") || "";

const { db } = await import("@/lib/db");
const { availabilityFor, expireHolds, placeHold, releaseHold } = await import("@/lib/respond/hold");

const MARK = "__hold_integration__";
let facilityId = "";

afterAll(async () => {
  if (facilityId) {
    await db.$executeRaw`DELETE FROM unit_hold WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM facility_pms_units WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM facilities WHERE id = ${facilityId}::uuid`;
  }
  await db.$disconnect();
});

describe("unit hold", () => {
  it("sets up a facility with exactly one free 10x10", async () => {
    const f = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO facilities (name, location, status) VALUES (${MARK}, ${MARK}, 'intake') RETURNING id`;
    facilityId = f[0].id;
    await db.$executeRaw`
      INSERT INTO facility_pms_units (facility_id, unit_type, size_label, total_count, occupied_count, street_rate)
      VALUES (${facilityId}::uuid, '10x10', '10x10', 10, 9, 149),
             (${facilityId}::uuid, '5x5', '5x5', 10, 10, 79)`;

    const a = await availabilityFor(facilityId, "10x10");
    expect(a).toMatchObject({ vacant: 1, held: 0, available: 1 });

    const soldOut = await availabilityFor(facilityId, "5x5");
    expect(soldOut.available).toBe(0);
  });

  it("takes a hold and the unit stops being available", async () => {
    const h = await placeHold({ facilityId, sizeLabel: "10x10", phone: "+15125550111", source: "call" });
    expect(h.held).toBe(true);
    const a = await availabilityFor(facilityId, "10x10");
    expect(a).toMatchObject({ vacant: 1, held: 1, available: 0 });
  });

  it("refuses a second hold when nothing is left", async () => {
    const h = await placeHold({ facilityId, sizeLabel: "10x10", phone: "+15125550222", source: "call" });
    expect(h).toEqual({ held: false, reason: "none-available" });
  });

  it("refuses to hold a sold-out size at all", async () => {
    const h = await placeHold({ facilityId, sizeLabel: "5x5", phone: "+15125550333", source: "web" });
    expect(h).toEqual({ held: false, reason: "none-available" });
  });

  it("does not let one person accumulate holds on the same size", async () => {
    await db.$executeRaw`DELETE FROM unit_hold WHERE facility_id = ${facilityId}::uuid`;
    const first = await placeHold({ facilityId, sizeLabel: "10x10", phone: "+15125550444" });
    expect(first.held).toBe(true);
    const again = await placeHold({ facilityId, sizeLabel: "10x10", phone: "+15125550444" });
    expect(again).toEqual({ held: false, reason: "already-held" });
  });

  it("releasing puts the unit back", async () => {
    const held = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM unit_hold WHERE facility_id = ${facilityId}::uuid AND status = 'active' LIMIT 1`;
    expect(await releaseHold(held[0].id)).toBe(true);
    expect((await availabilityFor(facilityId, "10x10")).available).toBe(1);
    // A second release is a no-op rather than an error.
    expect(await releaseHold(held[0].id)).toBe(false);
  });

  it("an expired hold frees the unit immediately, without waiting for a sweep", async () => {
    await db.$executeRaw`DELETE FROM unit_hold WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`
      INSERT INTO unit_hold (facility_id, size_label, held_for_phone, source, status, expires_at)
      VALUES (${facilityId}::uuid, '10x10', '+15125550555', 'call', 'active', now() - interval '1 minute')`;

    // Availability must already ignore it — a free unit that looks taken until a
    // cron runs is a lost rental.
    expect((await availabilityFor(facilityId, "10x10")).available).toBe(1);
    expect(await expireHolds()).toBeGreaterThanOrEqual(1);

    const status = await db.$queryRaw<{ status: string }[]>`
      SELECT status FROM unit_hold WHERE facility_id = ${facilityId}::uuid`;
    expect(status[0].status).toBe("expired");
  });

  // The whole point of s10.
  it("TWO CALLERS RACING FOR THE LAST UNIT: exactly one wins", async () => {
    await db.$executeRaw`DELETE FROM unit_hold WHERE facility_id = ${facilityId}::uuid`;
    expect((await availabilityFor(facilityId, "10x10")).available).toBe(1);

    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        placeHold({ facilityId, sizeLabel: "10x10", phone: `+1512555${String(9000 + i)}`, source: "call" })
      )
    );

    const won = results.filter((r) => r.held);
    expect(won).toHaveLength(1);

    const active = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM unit_hold
      WHERE facility_id = ${facilityId}::uuid AND status = 'active' AND expires_at > now()`;
    expect(active[0].n).toBe(1);
    expect((await availabilityFor(facilityId, "10x10")).available).toBe(0);
  });
});
