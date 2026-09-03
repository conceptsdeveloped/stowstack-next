import { describe, expect, it } from "vitest";
import {
  DELINQUENCY_DAYS,
  EVENT_TYPES,
  diffInventory,
  diffRentRoll,
  type RentRollRow,
  type UnitTypeRow,
} from "@/lib/events/types";
import { ALL_SUBSCRIBER_QUEUES, SUBSCRIBERS } from "@/lib/events/subscribers";

const F = "11111111-1111-1111-1111-111111111111";
const AT = "2026-09-01T00:00:00.000Z";

const row = (o: Partial<RentRollRow> & { unit: string }): RentRollRow => ({
  account: "A1", tenant_name: "Pat", rent_rate: 100, days_past_due: 0, rental_start: null, ...o,
});
const types = (e: { type: string }[]) => e.map((x) => x.type).sort();

describe("diffRentRoll — the first upload", () => {
  // The most expensive mistake this function could make: treating a customer's
  // existing tenants as fresh move-ins and mailing all of them a welcome kit
  // on day one of onboarding.
  it("emits NOTHING when there is no previous snapshot", () => {
    const next = [row({ unit: "A1" }), row({ unit: "A2" }), row({ unit: "A3" })];
    expect(diffRentRoll([], next, AT, F)).toEqual([]);
  });
});

describe("diffRentRoll — move in and out", () => {
  it("a new unit is a move-in", () => {
    const e = diffRentRoll([row({ unit: "A1" })], [row({ unit: "A1" }), row({ unit: "A2", account: "B" })], AT, F);
    expect(types(e)).toEqual(["unit.moved_in"]);
    expect(e[0].payload).toMatchObject({ unit: "A2", account: "B" });
  });

  it("a vanished unit is a move-out", () => {
    const e = diffRentRoll([row({ unit: "A1" }), row({ unit: "A2" })], [row({ unit: "A1" })], AT, F);
    expect(types(e)).toEqual(["unit.moved_out"]);
    expect(e[0].payload).toMatchObject({ unit: "A2" });
  });

  it("a unit changing hands is BOTH a move-out and a move-in", () => {
    const e = diffRentRoll(
      [row({ unit: "A1", account: "OLD", tenant_name: "Old" })],
      [row({ unit: "A1", account: "NEW", tenant_name: "New" })], AT, F);
    expect(types(e)).toEqual(["unit.moved_in", "unit.moved_out"]);
    // Both have subscribers — a winback for the leaver, a welcome for the arriver.
    expect(e.find((x) => x.type === "unit.moved_out")!.payload).toMatchObject({ account: "OLD" });
    expect(e.find((x) => x.type === "unit.moved_in")!.payload).toMatchObject({ account: "NEW" });
  });

  it("an unchanged roll emits nothing", () => {
    const same = [row({ unit: "A1" }), row({ unit: "A2", account: "B" })];
    expect(diffRentRoll(same, same.map((r) => ({ ...r })), AT, F)).toEqual([]);
  });

  it("move-in prefers the real rental_start over the snapshot date", () => {
    const e = diffRentRoll([row({ unit: "A1" })], [row({ unit: "A1" }), row({ unit: "A2", rental_start: "2026-08-14" })], AT, F);
    expect(e[0].occurredAt).toBe("2026-08-14");
  });
});

describe("diffRentRoll — rate changes", () => {
  it("detects an increase and says so", () => {
    const e = diffRentRoll([row({ unit: "A1", rent_rate: 100 })], [row({ unit: "A1", rent_rate: 120 })], AT, F);
    expect(types(e)).toEqual(["unit.rate_changed"]);
    expect(e[0].payload).toMatchObject({ from: 100, to: 120, increase: true });
  });

  it("detects a decrease", () => {
    const e = diffRentRoll([row({ unit: "A1", rent_rate: 120 })], [row({ unit: "A1", rent_rate: 100 })], AT, F);
    expect(e[0].payload).toMatchObject({ increase: false });
  });

  it("ignores a missing rate rather than inventing a change", () => {
    expect(diffRentRoll([row({ unit: "A1", rent_rate: null })], [row({ unit: "A1", rent_rate: 100 })], AT, F)).toEqual([]);
    expect(diffRentRoll([row({ unit: "A1", rent_rate: 100 })], [row({ unit: "A1", rent_rate: null })], AT, F)).toEqual([]);
  });

  it("keys on the snapshot, so a rate that moves back down is a second real change", () => {
    const up = diffRentRoll([row({ unit: "A1", rent_rate: 100 })], [row({ unit: "A1", rent_rate: 120 })], "2026-09-01", F);
    const dn = diffRentRoll([row({ unit: "A1", rent_rate: 120 })], [row({ unit: "A1", rent_rate: 100 })], "2026-10-01", F);
    expect(up[0].sourceKey).not.toBe(dn[0].sourceKey);
  });
});

describe("diffRentRoll — the delinquency ladder", () => {
  it("fires once per threshold newly crossed", () => {
    const e = diffRentRoll([row({ unit: "A1", days_past_due: 0 })], [row({ unit: "A1", days_past_due: 6 })], AT, F);
    expect(types(e)).toEqual(["tenant.delinquent"]);
    expect(e[0].payload).toMatchObject({ threshold: 5, daysPastDue: 6 });
  });

  it("a jump past several thresholds emits one event each, not one lumped", () => {
    const e = diffRentRoll([row({ unit: "A1", days_past_due: 0 })], [row({ unit: "A1", days_past_due: 20 })], AT, F);
    expect(e.filter((x) => x.type === "tenant.delinquent").map((x) => x.payload.threshold)).toEqual([...DELINQUENCY_DAYS]);
    expect(new Set(e.map((x) => x.sourceKey)).size).toBe(3); // distinct, so all three deliver
  });

  it("does NOT re-fire a threshold already crossed", () => {
    const e = diffRentRoll([row({ unit: "A1", days_past_due: 7 })], [row({ unit: "A1", days_past_due: 9 })], AT, F);
    expect(e).toEqual([]);
  });

  it("fires the next rung as the tenant slips further", () => {
    const e = diffRentRoll([row({ unit: "A1", days_past_due: 7 })], [row({ unit: "A1", days_past_due: 11 })], AT, F);
    expect(e.map((x) => x.payload.threshold)).toEqual([10]);
  });

  it("a tenant who catches up and slips again does not double-fire the same rung", () => {
    // 6 -> 0 -> 6. The ladder is keyed by threshold, not by episode, so the
    // customer is not texted twice for the same rung. Deliberate: annoying a
    // paying tenant costs more than a missed second notice.
    const back = diffRentRoll([row({ unit: "A1", days_past_due: 0 })], [row({ unit: "A1", days_past_due: 6 })], AT, F);
    const first = diffRentRoll([row({ unit: "A1", days_past_due: 0 })], [row({ unit: "A1", days_past_due: 6 })], AT, F);
    expect(back[0].sourceKey).toBe(first[0].sourceKey);
  });

  it("a brand-new tenant already past due still enters the ladder", () => {
    const e = diffRentRoll([row({ unit: "A1" })], [row({ unit: "A1" }), row({ unit: "A2", account: "B", days_past_due: 12 })], AT, F);
    expect(types(e)).toEqual(["tenant.delinquent", "tenant.delinquent", "unit.moved_in"]);
  });
});

describe("diffInventory — the waitlist trigger", () => {
  const u = (o: Partial<UnitTypeRow> & { size_label: string }): UnitTypeRow => ({
    unit_type: "storage", vacant_count: 0, total_count: 10, occupied_count: 10, street_rate: 99, ...o,
  });

  it("fires only on the zero-to-something edge", () => {
    const e = diffInventory([u({ size_label: "10x10", vacant_count: 0 })], [u({ size_label: "10x10", vacant_count: 1 })], AT, F);
    expect(types(e)).toEqual(["inventory.available"]);
    expect(e[0].payload).toMatchObject({ sizeLabel: "10x10", available: 1, streetRate: 99 });
  });

  it("a size that already had vacancy is not news", () => {
    expect(diffInventory([u({ size_label: "10x10", vacant_count: 2 })], [u({ size_label: "10x10", vacant_count: 3 })], AT, F)).toEqual([]);
  });

  it("selling out is not an availability event", () => {
    expect(diffInventory([u({ size_label: "10x10", vacant_count: 2 })], [u({ size_label: "10x10", vacant_count: 0 })], AT, F)).toEqual([]);
  });

  it("derives vacancy when the column is null", () => {
    const e = diffInventory(
      [u({ size_label: "5x5", vacant_count: null, total_count: 10, occupied_count: 10 })],
      [u({ size_label: "5x5", vacant_count: null, total_count: 10, occupied_count: 8 })], AT, F);
    expect(e[0].payload).toMatchObject({ available: 2 });
  });

  it("a size never seen before is new inventory, not a re-opening", () => {
    expect(diffInventory([u({ size_label: "10x10" })], [u({ size_label: "10x10" }), u({ size_label: "20x20", vacant_count: 4 })], AT, F)).toEqual([]);
  });

  it("emits nothing without a baseline", () => {
    expect(diffInventory([], [u({ size_label: "10x10", vacant_count: 5 })], AT, F)).toEqual([]);
  });
});

describe("source keys are the identity of the fact, not of the run", () => {
  it("re-detecting the same change yields identical keys, so emit dedupes it", () => {
    const a = diffRentRoll([row({ unit: "A1" })], [row({ unit: "A1" }), row({ unit: "A2", account: "B" })], AT, F);
    const b = diffRentRoll([row({ unit: "A1" })], [row({ unit: "A1" }), row({ unit: "A2", account: "B" })], "2026-12-25", F);
    expect(a[0].sourceKey).toBe(b[0].sourceKey); // move-in identity ignores when we noticed
  });

  it("keys stay inside the column width", () => {
    const e = diffRentRoll(
      [row({ unit: "A".repeat(120) })],
      [row({ unit: "A".repeat(120), account: "B".repeat(120) })], AT, F);
    e.forEach((x) => expect(x.sourceKey.length).toBeLessThanOrEqual(300));
  });
});

describe("subscriber map", () => {
  it("every event type has an entry", () => {
    EVENT_TYPES.forEach((t) => expect(SUBSCRIBERS[t]).toBeDefined());
  });
  it("the capabilities that were waiting on an X are wired to one", () => {
    expect(SUBSCRIBERS["unit.moved_in"]).toContain("mail.welcome-kit");       // MAIL m2
    expect(SUBSCRIBERS["unit.moved_in"]).toContain("retain.autopay-push");    // RETAIN t4
    expect(SUBSCRIBERS["tenant.delinquent"]).toContain("retain.delinquency-notice"); // RETAIN t3
    expect(SUBSCRIBERS["unit.rate_changed"]).toContain("mail.rate-increase-letter"); // MAIL m5
    expect(SUBSCRIBERS["inventory.available"]).toContain("respond.waitlist-notify"); // RESPOND r9
  });
  it("queue names are unique and non-empty", () => {
    const all = Object.values(SUBSCRIBERS).flat();
    expect(ALL_SUBSCRIBER_QUEUES.length).toBe(new Set(all).size);
    all.forEach((q) => expect(q.length).toBeGreaterThan(0));
  });
});
