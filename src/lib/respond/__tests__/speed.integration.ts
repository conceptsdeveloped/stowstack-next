/**
 * Missed-call text-back and abandoned rescue, against the real database.
 *
 *   npx vitest run --config vitest.integration.config.ts
 */
import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
process.env.DATABASE_URL = pick("DIRECT_URL") || pick("DATABASE_URL") || "";

const { db } = await import("@/lib/db");
const { textBackMissedCall } = await import("@/lib/respond/missed-call");
const { findAbandoned, rescueAbandoned } = await import("@/lib/respond/abandoned");
const { __setMessageProvider } = await import("@/lib/messaging/index");
const { optOut } = await import("@/lib/messaging/send");
import type { MessageProvider, SendRequest, SendResult } from "@/lib/messaging/types";

const MARK = "__speed_integration__";
const sent: SendRequest[] = [];
class FakeLive implements MessageProvider {
  id = "fake"; live = true;
  async send(req: SendRequest): Promise<SendResult> {
    sent.push(req);
    return { providerId: `fake_${sent.length}`, status: "sent" };
  }
}
__setMessageProvider(new FakeLive());

let facilityId = "", trackingId = "";
const caller = "+15125557001";
const abandoner = "+15125557002";
const optedOutCaller = "+15125557003";

afterAll(async () => {
  if (facilityId) {
    await db.$executeRaw`DELETE FROM message_log WHERE to_number IN (${caller}, ${abandoner}, ${optedOutCaller})`;
    await db.$executeRaw`DELETE FROM message_optout WHERE phone = ${optedOutCaller}`;
    await db.$executeRaw`DELETE FROM partial_leads WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM call_logs WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM call_tracking_numbers WHERE facility_id = ${facilityId}::uuid`;
    await db.$executeRaw`DELETE FROM facilities WHERE id = ${facilityId}::uuid`;
  }
  __setMessageProvider(null);
  await db.$disconnect();
});

const makeCall = async (sid: string, from: string) => {
  await db.$executeRaw`
    INSERT INTO call_logs (tracking_number_id, facility_id, twilio_call_sid, caller_number, status, started_at, updated_at)
    VALUES (${trackingId}::uuid, ${facilityId}::uuid, ${sid}, ${from}, 'no-answer', now(), now())`;
};

describe("missed-call text-back (r3)", () => {
  it("sets up a facility with a tracked number", async () => {
    const f = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO facilities (name, location, status) VALUES (${MARK}, ${MARK}, 'intake') RETURNING id`;
    facilityId = f[0].id;
    const t = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO call_tracking_numbers (facility_id, label, twilio_sid, phone_number, forward_to)
      VALUES (${facilityId}::uuid, ${MARK}, ${"PN" + MARK}, '+15125550001', '+15125550002') RETURNING id`;
    trackingId = t[0].id;
    expect(trackingId).toBeTruthy();
  });

  it("texts back a missed caller, from the tracked number they dialled", async () => {
    await makeCall("CA_missed_1", caller);
    const res = await textBackMissedCall("CA_missed_1");
    expect(res.sent).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe(caller);
    expect(sent[0].from).toBe("+15125550001");
    expect(sent[0].body).toContain(MARK);
    expect(sent[0].body).toMatch(/STOP/);
  });

  it("marks the call so an operator can see it was handled", async () => {
    const rows = await db.$queryRaw<{ call_outcome: string | null }[]>`
      SELECT call_outcome FROM call_logs WHERE twilio_call_sid = 'CA_missed_1'`;
    expect(rows[0].call_outcome).toBe("texted_back");
  });

  it("a replayed webhook for the same call sends nothing", async () => {
    const before = sent.length;
    const res = await textBackMissedCall("CA_missed_1");
    expect(res.sent).toBe(false);
    expect(sent.length).toBe(before);
  });

  // Somebody anxious enough to redial three times does not need three texts.
  it("a redial inside the cooldown sends nothing, even though it is a different call", async () => {
    const before = sent.length;
    await makeCall("CA_missed_2", caller);
    const res = await textBackMissedCall("CA_missed_2");
    expect(res).toEqual({ sent: false, reason: "cooldown" });
    expect(sent.length).toBe(before);
  });

  it("never texts back a number that opted out", async () => {
    await optOut(optedOutCaller, "stop_reply", "test");
    await makeCall("CA_missed_3", optedOutCaller);
    const before = sent.length;
    const res = await textBackMissedCall("CA_missed_3");
    expect(res.sent).toBe(false);
    expect(sent.length).toBe(before);
  });

  it("does nothing for a call it has no record of", async () => {
    expect(await textBackMissedCall("CA_does_not_exist")).toEqual({ sent: false, reason: "no-call-record" });
  });
});

describe("abandoned rescue (r8)", () => {
  const insertLead = (phone: string, minutesAgo: number, over: Record<string, unknown> = {}) => db.$executeRaw`
    INSERT INTO partial_leads (facility_id, session_id, name, phone, unit_size, lead_status, converted, created_at)
    VALUES (${facilityId}::uuid, ${`s${minutesAgo}${phone}`}, 'Dana Reeves', ${phone}, '10x10',
            ${(over.lead_status as string) ?? "partial"}, ${(over.converted as boolean) ?? false},
            now() - (${minutesAgo}::int * interval '1 minute'))`;

  it("ignores a lead that is too fresh — they may still be filling the form", async () => {
    await insertLead(abandoner, 2);
    const found = await findAbandoned();
    expect(found.filter((l) => l.phone === abandoner)).toHaveLength(0);
    await db.$executeRaw`DELETE FROM partial_leads WHERE facility_id = ${facilityId}::uuid`;
  });

  it("ignores a lead that is too old — the email sequence owns it", async () => {
    await insertLead(abandoner, 300);
    expect((await findAbandoned()).filter((l) => l.phone === abandoner)).toHaveLength(0);
    await db.$executeRaw`DELETE FROM partial_leads WHERE facility_id = ${facilityId}::uuid`;
  });

  it("ignores a lead that already converted", async () => {
    await insertLead(abandoner, 30, { converted: true, lead_status: "moved_in" });
    expect((await findAbandoned()).filter((l) => l.phone === abandoner)).toHaveLength(0);
    await db.$executeRaw`DELETE FROM partial_leads WHERE facility_id = ${facilityId}::uuid`;
  });

  it("texts a genuinely abandoned lead inside the window", async () => {
    await insertLead(abandoner, 30);
    const before = sent.length;
    const res = await rescueAbandoned();
    expect(res.sent).toBeGreaterThanOrEqual(1);
    const mine = sent.slice(before).find((m) => m.to === abandoner);
    expect(mine).toBeTruthy();
    expect(mine!.body).toContain("Dana");
    expect(mine!.body).toContain("10x10");
    expect(mine!.body).toMatch(/STOP/);
  });

  // The guard is the message log itself, not a flag that could drift from it.
  it("never rescues the same lead twice", async () => {
    const before = sent.length;
    const res = await rescueAbandoned();
    expect(sent.slice(before).filter((m) => m.to === abandoner)).toHaveLength(0);
    expect(res.found).toBe(0);
  });
});
