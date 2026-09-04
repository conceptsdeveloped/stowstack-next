/**
 * End-to-end proof of the RESPOND r9 chain, against the real database and the
 * real modules — not a SQL replica.
 *
 * NOT part of the default suite: the filename deliberately avoids `.test.ts` so
 * `npm run test` stays hermetic. Run it explicitly:
 *
 *   npx vitest run --include 'src/**\/*.integration.ts'
 *
 * It creates a temp facility, drives the whole chain, and deletes everything it
 * made.
 */
import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";

// The db singleton reads DATABASE_URL at import, and the pooled endpoint is
// unreliable from a laptop — point it at the direct one before anything loads.
const env = fs.readFileSync(".env.local", "utf8");
const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
process.env.DATABASE_URL = pick("DIRECT_URL") || pick("DATABASE_URL") || "";

const { db } = await import("@/lib/db");
const { captureUnitMix, detectInventoryForFacility } = await import("@/lib/events/detect");
const { notifyWaitlist } = await import("@/lib/respond/waitlist");
const { __setMessageProvider } = await import("@/lib/messaging/index");
const { optOut } = await import("@/lib/messaging/send");
import type { MessageProvider, SendRequest, SendResult } from "@/lib/messaging/types";

const MARK = "__chain_integration__";
const sent: SendRequest[] = [];

/** A provider that reports itself LIVE, so the real send path is exercised. */
class FakeLive implements MessageProvider {
  id = "fake";
  live = true;
  async send(req: SendRequest): Promise<SendResult> {
    sent.push(req);
    return { providerId: `fake_${sent.length}`, status: "sent" };
  }
}
__setMessageProvider(new FakeLive());

let facilityId = "";
const phones = { first: "+15125550101", second: "+15125550102", optedOut: "+15125550103" };

afterAll(async () => {
  if (facilityId) {
    await db.$executeRaw`DELETE FROM message_log WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM message_optout WHERE phone IN (${phones.optedOut})`;
    await db.$executeRaw`DELETE FROM unit_waitlist WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM jobs WHERE tenant_key = ${facilityId}`;
    await db.$executeRaw`DELETE FROM domain_events WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM facility_pms_unit_history WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM facility_pms_units WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM facilities WHERE id = ${facilityId}::uuid`;
  }
  __setMessageProvider(null);
  await db.$disconnect();
});

describe("PMS change → event → waitlist text", () => {
  it("sets up a sold-out facility with a waitlist", async () => {
    const f = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO facilities (name, location, status) VALUES (${MARK}, ${MARK}, 'intake') RETURNING id`;
    facilityId = f[0].id;

    const t1 = new Date("2026-09-01T10:00:00Z");
    await db.$executeRaw`
      INSERT INTO facility_pms_units (facility_id, unit_type, size_label, total_count, occupied_count, street_rate, last_updated)
      VALUES (${facilityId}::uuid, '10x10', '10x10', 10, 10, 149, ${t1}),
             (${facilityId}::uuid, '5x5', '5x5', 10, 8, 79, ${t1})`;

    await db.$executeRaw`
      INSERT INTO unit_waitlist (facility_id, size_label, contact_name, contact_phone, source)
      VALUES (${facilityId}::uuid, '10x10', 'Dana Reeves', ${phones.first}, 'test'),
             (${facilityId}::uuid, '10x10', 'Sam Ortiz', ${phones.second}, 'test'),
             (${facilityId}::uuid, '10x10', 'Opted Out', ${phones.optedOut}, 'test')`;

    // Somebody on the list has already said STOP. That must be honoured.
    await optOut(phones.optedOut, "stop_reply", "test");

    expect(facilityId).toBeTruthy();
  });

  it("the first capture is a baseline and emits nothing", async () => {
    expect(await captureUnitMix(facilityId)).toBe(2);
    const res = await detectInventoryForFacility(facilityId);
    expect(res.emitted).toBe(0); // only one mark exists
  });

  it("a 10x10 freeing up emits exactly one inventory.available and fans it out", async () => {
    await db.$executeRaw`
      UPDATE facility_pms_units SET occupied_count = 9, last_updated = ${new Date("2026-09-01T10:30:00Z")}
      WHERE facility_id = ${facilityId}::uuid AND unit_type = '10x10'`;
    // the 5x5 already had vacancy — it must NOT produce an event
    await db.$executeRaw`
      UPDATE facility_pms_units SET occupied_count = 7, last_updated = ${new Date("2026-09-01T10:30:00Z")}
      WHERE facility_id = ${facilityId}::uuid AND unit_type = '5x5'`;

    const res = await detectInventoryForFacility(facilityId);
    expect(res.emitted).toBe(1);
    expect(res.fannedOut).toBe(1); // one subscriber: respond.waitlist-notify

    const events = await db.$queryRaw<{ type: string; payload: Record<string, unknown> }[]>`
      SELECT type, payload FROM domain_events WHERE facility_id = ${facilityId}::uuid`;
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe("inventory.available");
    expect(events[0].payload.sizeLabel).toBe("10x10");

    const jobs = await db.$queryRaw<{ queue: string; status: string }[]>`
      SELECT queue, status FROM jobs WHERE tenant_key = ${facilityId}`;
    expect(jobs).toHaveLength(1);
    expect(jobs[0].queue).toBe("respond.waitlist-notify");
  });

  it("texts the waiting list, skipping the person who opted out", async () => {
    const ev = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM domain_events WHERE facility_id = ${facilityId}::uuid LIMIT 1`;

    const res = await notifyWaitlist({
      eventId: ev[0].id, facilityId, sizeLabel: "10x10", available: 1, streetRate: 149,
    });

    expect(res.matched).toBe(2);   // notifyCount(1) === 2
    expect(res.sent).toBe(2);      // the opted-out entry is beyond that window here
    expect(sent).toHaveLength(2);
    expect(sent[0].to).toBe(phones.first);
    expect(sent[0].body).toContain("10x10");
    expect(sent[0].body).toContain("STOP");

    const logged = await db.$queryRaw<{ status: string; to_number: string }[]>`
      SELECT status, to_number FROM message_log WHERE facility_id = ${facilityId}::uuid ORDER BY created_at`;
    expect(logged.filter((l) => l.status === "sent")).toHaveLength(2);

    const notified = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM unit_waitlist
      WHERE facility_id = ${facilityId}::uuid AND status = 'notified'`;
    expect(notified[0].n).toBe(2);
  });

  it("re-running the same notification sends nothing — the dedupe key holds", async () => {
    const before = sent.length;
    const ev = await db.$queryRaw<{ id: string }[]>`
      SELECT id FROM domain_events WHERE facility_id = ${facilityId}::uuid LIMIT 1`;
    // Put them back on the list so matching is not what stops the resend.
    await db.$executeRaw`
      UPDATE unit_waitlist SET status = 'waiting' WHERE facility_id = ${facilityId}::uuid`;

    const res = await notifyWaitlist({
      eventId: ev[0].id, facilityId, sizeLabel: "10x10", available: 1, streetRate: 149,
    });

    expect(res.sent).toBe(0);
    expect(sent.length).toBe(before); // nothing reached the provider
  });

  it("never texts an opted-out number, even when it is the only match", async () => {
    const before = sent.length;
    await db.$executeRaw`
      UPDATE unit_waitlist SET status = 'cancelled'
      WHERE facility_id = ${facilityId}::uuid AND contact_phone <> ${phones.optedOut}`;
    await db.$executeRaw`
      UPDATE unit_waitlist SET status = 'waiting'
      WHERE facility_id = ${facilityId}::uuid AND contact_phone = ${phones.optedOut}`;

    const res = await notifyWaitlist({
      eventId: "00000000-0000-4000-8000-000000000001",
      facilityId, sizeLabel: "10x10", available: 1, streetRate: 149,
    });

    expect(res.matched).toBe(1);
    expect(res.sent).toBe(0);
    expect(sent.length).toBe(before);

    const suppressed = await db.$queryRaw<{ status: string; error: string | null }[]>`
      SELECT status, error FROM message_log
      WHERE facility_id = ${facilityId}::uuid AND to_number = ${phones.optedOut}`;
    expect(suppressed[0]?.status).toBe("suppressed");
    expect(suppressed[0]?.error).toBe("opted-out");
  });
});
