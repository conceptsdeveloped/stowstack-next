/**
 * Tour booking, reminders and no-show recovery against the real database
 * (MISSION.md RESPOND r6/r7).
 *
 *   npx vitest run --config vitest.integration.config.ts
 */
import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
process.env.DATABASE_URL = pick("DIRECT_URL") || pick("DATABASE_URL") || "";

const { db } = await import("@/lib/db");
const T = await import("@/lib/respond/tour");
const { __setMessageProvider } = await import("@/lib/messaging/index");
import type { MessageProvider, SendRequest, SendResult } from "@/lib/messaging/types";

const MARK = "__tour_integration__";
const sent: SendRequest[] = [];
class FakeLive implements MessageProvider {
  id = "fake"; live = true;
  async send(req: SendRequest): Promise<SendResult> {
    sent.push(req);
    return { providerId: `fake_${sent.length}`, status: "sent" };
  }
}
__setMessageProvider(new FakeLive());

/**
 * A zone in which it is currently the middle of the working day, so the
 * quiet-hours gate never makes this suite depend on when it is run.
 */
const ZONE = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "Asia/Tokyo", "Europe/London", "Australia/Sydney", "Asia/Kolkata"]
  .find((z) => { const h = T.hourInZone(new Date(), z); return h != null && h >= 10 && h <= 16; })
  ?? "America/Chicago";

let facilityId = "";
const phones = ["+15125560001", "+15125560002", "+15125560003", "+15125560004"];
const at = (minutesFromNow: number) => new Date(Date.now() + minutesFromNow * 60_000);
/**
 * Whole days ahead, so the LOCAL hour is preserved and stays inside the
 * bookable window wherever ZONE happens to be. Adding a few hundred minutes
 * instead pushes the local time past 8pm and `withinBookableHours` — correctly
 * — refuses the booking.
 */
const inDays = (n: number) => at(n * 24 * 60);

afterAll(async () => {
  await db.$executeRaw`DELETE FROM message_log WHERE to_number = ANY(${phones}::text[])`;
  await db.$executeRaw`DELETE FROM contact_language WHERE phone = ANY(${phones}::text[])`;
  if (facilityId) {
    await db.$executeRaw`DELETE FROM facility_tours WHERE facility_id = ${facilityId}::uuid`;
    // By session_id, not facility_id: partial_leads.facility_id is ON DELETE
    // SET NULL, so a lead orphaned by an earlier failed run is no longer
    // reachable through the facility at all.
    await db.$executeRaw`DELETE FROM partial_leads WHERE session_id LIKE ${MARK + "%"}`;
    await db.$executeRaw`DELETE FROM facilities WHERE id = ${facilityId}::uuid`;
  }
  __setMessageProvider(null);
  await db.$disconnect();
});

const statusOf = async (id: string) => (await db.$queryRaw<{ status: string }[]>`
  SELECT status FROM facility_tours WHERE id = ${id}::uuid`)[0]?.status;

describe("setup", () => {
  it("creates a facility in a working-hours zone", async () => {
    const f = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO facilities (name, location, status, timezone)
      VALUES (${MARK}, ${MARK}, 'intake', ${ZONE}) RETURNING id`;
    facilityId = f[0].id;
    expect(T.hourInZone(new Date(), ZONE)).toBeGreaterThanOrEqual(10);
  });
});

describe("booking", () => {
  let tourId = "";

  it("books a tour and confirms it immediately", async () => {
    const when = at(90);
    const res = await T.bookTour({
      facilityId, phone: phones[0], scheduledAt: when, name: "Dana Reeves", sizeLabel: "10x10",
    });
    expect(res.booked).toBe(true);
    expect(res.rescheduled).toBe(false);
    expect(res.confirmSent).toBe(true);
    tourId = res.id!;

    const msg = sent.find((m) => m.to === phones[0]);
    expect(msg!.body).toContain("Dana");
    expect(msg!.body).toContain(MARK);
    expect(msg!.body).toMatch(/STOP/);
  });

  /**
   * The partial unique index doing its job. A second booking for the same person
   * at the same facility is a reschedule — without this a double-submitted form
   * produces two tours and two sets of reminders.
   */
  it("treats a second booking as a reschedule, not a second tour", async () => {
    const res = await T.bookTour({ facilityId, phone: phones[0], scheduledAt: at(200) });
    expect(res.booked).toBe(true);
    expect(res.rescheduled).toBe(true);
    expect(res.id).toBe(tourId);

    const n = await db.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM facility_tours
      WHERE facility_id = ${facilityId}::uuid AND contact_phone = ${phones[0]}`;
    expect(n[0].n).toBe(1);
  });

  it("keeps the name and size it already had when a reschedule omits them", async () => {
    const row = await db.$queryRaw<{ contact_name: string; size_label: string }[]>`
      SELECT contact_name, size_label FROM facility_tours WHERE id = ${tourId}::uuid`;
    expect(row[0].contact_name).toBe("Dana Reeves");
    expect(row[0].size_label).toBe("10x10");
  });

  it("confirms a reschedule, because the new time is a new fact", async () => {
    expect(sent.filter((m) => m.to === phones[0])).toHaveLength(2);
  });

  it("refuses times that are certainly mistakes", async () => {
    for (const [when, reason] of [[at(-60), "past"], [at(90 * 24 * 60), "too-far"]] as const) {
      const res = await T.bookTour({ facilityId, phone: phones[1], scheduledAt: when });
      expect(res).toMatchObject({ booked: false, reason });
    }
  });

  it("refuses a facility it does not know", async () => {
    const res = await T.bookTour({
      facilityId: "00000000-0000-0000-0000-000000000000", phone: phones[1], scheduledAt: at(90),
    });
    expect(res.reason).toBe("unknown-facility");
  });
});

describe("reminders", () => {
  it("sends the day-before reminder to a tour ~24h out", async () => {
    await T.bookTour({ facilityId, phone: phones[2], scheduledAt: at(T.REMIND_24H_MINUTES - 5), name: "Sam" });
    const before = sent.length;
    const res = await T.sweepReminders24();
    expect(res.sent).toBeGreaterThanOrEqual(1);
    const msg = sent.slice(before).find((m) => m.to === phones[2]);
    expect(msg!.body).toMatch(/tomorrow/i);
  });

  // The dedupe key on the message log is the guard, not a column on the tour.
  it("does not send it twice", async () => {
    const before = sent.length;
    await T.sweepReminders24();
    expect(sent.slice(before).filter((m) => m.to === phones[2])).toHaveLength(0);
  });

  it("sends the hour-before reminder to a tour ~1h out, with the time in it", async () => {
    await T.bookTour({ facilityId, phone: phones[3], scheduledAt: at(55), name: "Alex" });
    const before = sent.length;
    const res = await T.sweepReminders1();
    expect(res.sent).toBeGreaterThanOrEqual(1);
    const msg = sent.slice(before).find((m) => m.to === phones[3]);
    expect(msg!.body).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });

  it("leaves a tour that is not due yet alone", async () => {
    const before = sent.length;
    await T.sweepReminders1();
    expect(sent.slice(before).filter((m) => m.to === phones[0])).toHaveLength(0);
  });
});

describe("no-show recovery (r7)", () => {
  it("marks a tour nobody turned up for and offers to rebook", async () => {
    const res0 = await T.bookTour({ facilityId, phone: phones[1], scheduledAt: at(60), name: "Kim" });
    // Move it into the past, past the grace period.
    await db.$executeRaw`
      UPDATE facility_tours SET scheduled_at = now() - interval '90 minutes'
      WHERE id = ${res0.id}::uuid`;

    const before = sent.length;
    const res = await T.sweepNoShows();
    expect(res.found).toBeGreaterThanOrEqual(1);
    expect(await statusOf(res0.id!)).toBe("no_show");

    const msg = sent.slice(before).find((m) => m.to === phones[1]);
    expect(msg!.body).toMatch(/missed you/i);
    expect(msg!.body).toMatch(/STOP/);
  });

  it("does not re-sweep a tour it has already marked", async () => {
    const res = await T.sweepNoShows();
    expect(res.found).toBe(0);
  });

  it("leaves a tour inside its grace period alone", async () => {
    const res0 = await T.bookTour({ facilityId, phone: phones[2], scheduledAt: at(60) });
    await db.$executeRaw`
      UPDATE facility_tours SET scheduled_at = now() - interval '10 minutes'
      WHERE id = ${res0.id}::uuid`;
    await T.sweepNoShows();
    expect(await statusOf(res0.id!)).toBe("booked");
  });
});

describe("operator actions", () => {
  it("completing a tour moves the lead to toured", async () => {
    const lead = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO partial_leads (facility_id, session_id, name, phone, lead_status, converted, updated_at)
      VALUES (${facilityId}::uuid, ${MARK + Math.random()}, 'Jo', ${phones[3]}, 'new', TRUE, now())
      RETURNING id`;
    await db.$executeRaw`DELETE FROM facility_tours WHERE contact_phone = ${phones[3]}`;
    const res = await T.bookTour({
      facilityId, phone: phones[3], scheduledAt: at(120), leadId: lead[0].id,
    });
    expect(await T.completeTour(res.id!)).toBe(true);
    expect(await statusOf(res.id!)).toBe("completed");

    const after = await db.$queryRaw<{ lead_status: string }[]>`
      SELECT lead_status FROM partial_leads WHERE id = ${lead[0].id}::uuid`;
    expect(after[0].lead_status).toBe("toured");
  });

  it("cancelling frees the slot so they can book again", async () => {
    await db.$executeRaw`DELETE FROM facility_tours WHERE contact_phone = ${phones[0]}`;
    const a = await T.bookTour({ facilityId, phone: phones[0], scheduledAt: inDays(1) });
    expect(await T.cancelTour(a.id!)).toBe(true);
    const b = await T.bookTour({ facilityId, phone: phones[0], scheduledAt: inDays(2) });
    expect(b.booked).toBe(true);
    expect(b.id).not.toBe(a.id); // a genuinely new tour, not a reschedule of a dead one
  });

  it("cancelling twice reports honestly", async () => {
    const a = await T.bookTour({ facilityId, phone: phones[1], scheduledAt: inDays(3) });
    expect(await T.cancelTour(a.id!)).toBe(true);
    expect(await T.cancelTour(a.id!)).toBe(false);
  });
});
