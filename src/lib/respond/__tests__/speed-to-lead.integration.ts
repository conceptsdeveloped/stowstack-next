/**
 * Speed-to-lead against the real database (MISSION.md RESPOND r5).
 *
 *   npx vitest run --config vitest.integration.config.ts
 */
import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";

const env = fs.readFileSync(".env.local", "utf8");
const pick = (k: string) => (env.match(new RegExp(`^${k}=(.*)$`, "m")) || [])[1]?.trim().replace(/^["']|["']$/g, "");
process.env.DATABASE_URL = pick("DIRECT_URL") || pick("DATABASE_URL") || "";

const { db } = await import("@/lib/db");
const { respondToNewLead, unansweredLeads, TARGET_SECONDS } = await import("@/lib/respond/speed-to-lead");
const { __setMessageProvider } = await import("@/lib/messaging/index");
const { optOut } = await import("@/lib/messaging/send");
const { setLanguage } = await import("@/lib/messaging/language");
import type { MessageProvider, SendRequest, SendResult } from "@/lib/messaging/types";

const MARK = "__speed_to_lead_integration__";
const OPERATOR = "+15125559100";
const sent: SendRequest[] = [];
class FakeLive implements MessageProvider {
  id = "fake"; live = true;
  async send(req: SendRequest): Promise<SendResult> {
    sent.push(req);
    return { providerId: `fake_${sent.length}`, status: "sent" };
  }
}
__setMessageProvider(new FakeLive());

let facilityId = "";
let noContactFacilityId = "";
const phones = ["+15125559001", "+15125559002", "+15125559003", "+15125559004", "+15125559005"];

afterAll(async () => {
  await db.$executeRaw`DELETE FROM message_log WHERE to_number = ANY(${[...phones, OPERATOR]}::text[])`;
  await db.$executeRaw`DELETE FROM message_optout WHERE phone = ANY(${phones}::text[])`;
  await db.$executeRaw`DELETE FROM contact_language WHERE phone = ANY(${phones}::text[])`;
  for (const f of [facilityId, noContactFacilityId]) {
    if (!f) continue;
    await db.$executeRaw`DELETE FROM partial_leads WHERE facility_id = ${f}::uuid`;
    await db.$executeRaw`DELETE FROM facilities WHERE id = ${f}::uuid`;
  }
  __setMessageProvider(null);
  await db.$disconnect();
});

/** A lead as the submit routes leave it: converted, status new, submitted now. */
const submit = async (opts: {
  phone: string | null;
  facility: string;
  createdMinutesAgo?: number;
  convertedSecondsAgo?: number;
}) => {
  const rows = await db.$queryRaw<{ id: string }[]>`
    INSERT INTO partial_leads (facility_id, session_id, name, phone, unit_size,
                               lead_status, converted, created_at, converted_at, updated_at)
    VALUES (${opts.facility}::uuid, ${`${MARK}${Math.random()}`}, 'Dana Reeves', ${opts.phone}, '10x10',
            'new', TRUE,
            now() - (${opts.createdMinutesAgo ?? 0}::int * interval '1 minute'),
            now() - (${opts.convertedSecondsAgo ?? 0}::int * interval '1 second'),
            now())
    RETURNING id`;
  return rows[0].id;
};

const to = (n: string) => sent.filter((m) => m.to === n);

describe("setup", () => {
  it("creates a facility with an operator contact number", async () => {
    const f = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO facilities (name, location, status, contact_name, contact_phone)
      VALUES (${MARK}, ${MARK}, 'intake', 'Blake', ${OPERATOR}) RETURNING id`;
    facilityId = f[0].id;

    const g = await db.$queryRaw<{ id: string }[]>`
      INSERT INTO facilities (name, location, status)
      VALUES (${MARK + "_nocontact"}, ${MARK}, 'intake') RETURNING id`;
    noContactFacilityId = g[0].id;
    expect(facilityId).toBeTruthy();
  });
});

describe("both halves go out", () => {
  let leadId = "";

  it("texts the lead AND alerts the operator", async () => {
    leadId = await submit({ phone: phones[0], facility: facilityId });
    const res = await respondToNewLead(leadId);
    expect(res.acked).toBe(true);
    expect(res.alerted).toBe(true);

    const ack = to(phones[0])[0];
    expect(ack.body).toContain("Dana");
    expect(ack.body).toContain(MARK);
    expect(ack.body).toMatch(/STOP/);

    const alert = to(OPERATOR)[0];
    expect(alert.body).toContain("Dana");
    expect(alert.body).toContain(phones[0]); // the operator needs the number to call
    expect(alert.body).toContain("10x10");
  });

  // Internal message to a business contact who is not a marketing recipient.
  it("the operator alert carries no opt-out line", () => {
    expect(to(OPERATOR)[0].body).not.toMatch(/STOP/);
  });

  it("stamps the response time, measured in the right direction", async () => {
    const rows = await db.$queryRaw<{ ms: number | null }[]>`
      SELECT EXTRACT(EPOCH FROM (first_response_at - converted_at)) * 1000 AS ms
      FROM partial_leads WHERE id = ${leadId}::uuid`;
    expect(rows[0].ms).not.toBeNull();
    expect(Number(rows[0].ms)).toBeGreaterThanOrEqual(0);
    expect(Number(rows[0].ms)).toBeLessThan(TARGET_SECONDS * 1000);
  });

  it("a replayed request sends nothing more and does not rewrite the timing", async () => {
    const before = sent.length;
    const firstStamp = await db.$queryRaw<{ t: Date }[]>`
      SELECT first_response_at AS t FROM partial_leads WHERE id = ${leadId}::uuid`;
    const res = await respondToNewLead(leadId);
    expect(sent.length).toBe(before);
    expect(res.acked).toBe(false);
    expect(res.alerted).toBe(false);
    const afterStamp = await db.$queryRaw<{ t: Date }[]>`
      SELECT first_response_at AS t FROM partial_leads WHERE id = ${leadId}::uuid`;
    expect(afterStamp[0].t.getTime()).toBe(firstStamp[0].t.getTime());
  });
});

describe("latency is measured from the submit, not the first keystroke", () => {
  /**
   * `created_at` is when they first touched the form — the beacon writes that
   * row while they are still typing. Measuring from it would report an hour-long
   * response to a lead we answered in two seconds.
   */
  it("ignores an hour-old created_at", async () => {
    const leadId = await submit({ phone: phones[1], facility: facilityId, createdMinutesAgo: 60 });
    const res = await respondToNewLead(leadId);
    expect(res.acked).toBe(true);
    expect(res.latencyMs).not.toBeNull();
    expect(res.latencyMs!).toBeLessThan(TARGET_SECONDS * 1000);
  });
});

describe("one half failing does not suppress the other", () => {
  /**
   * The half that actually rents the unit is the operator alert. A lead who has
   * opted out of texts has not opted the operator out of being told they exist.
   */
  it("still alerts the operator when the lead has opted out", async () => {
    await optOut(phones[2], "stop_reply", "test");
    const leadId = await submit({ phone: phones[2], facility: facilityId });
    const res = await respondToNewLead(leadId);
    expect(res.acked).toBe(false);
    expect(res.alerted).toBe(true);
    expect(to(phones[2])).toHaveLength(0);
  });

  it("still texts the lead when the facility has no contact number", async () => {
    const leadId = await submit({ phone: phones[3], facility: noContactFacilityId });
    const res = await respondToNewLead(leadId);
    expect(res.acked).toBe(true);
    expect(res.alerted).toBe(false);
  });

  it("reports honestly when there is nobody to reach at all", async () => {
    const leadId = await submit({ phone: null, facility: noContactFacilityId });
    expect(await respondToNewLead(leadId)).toEqual({
      acked: false, alerted: false, latencyMs: null, reason: "no-numbers",
    });
  });

  it("does nothing for a lead it has no record of", async () => {
    const res = await respondToNewLead("00000000-0000-0000-0000-000000000000");
    expect(res.reason).toBe("no-lead");
  });
});

describe("language", () => {
  it("acknowledges a Spanish-speaking lead in Spanish", async () => {
    await setLanguage(phones[4], "es", "form");
    const leadId = await submit({ phone: phones[4], facility: facilityId });
    await respondToNewLead(leadId);
    const ack = to(phones[4])[0];
    expect(ack.body).toMatch(/gracias/i);
    expect(ack.body).toMatch(/PARAR/);
    expect(ack.body).not.toMatch(/STOP/);
  });
});

describe("the sweep", () => {
  it("finds a lead nobody answered", async () => {
    const leadId = await submit({ phone: phones[0], facility: facilityId });
    const found = await unansweredLeads();
    expect(found.map((l) => l.id)).toContain(leadId);
  });

  it("does not re-find one that was answered", async () => {
    const leadId = await submit({ phone: phones[1], facility: facilityId });
    await respondToNewLead(leadId);
    const found = await unansweredLeads();
    expect(found.map((l) => l.id)).not.toContain(leadId);
  });
});
