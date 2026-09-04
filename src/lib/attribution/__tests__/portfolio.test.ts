import { describe, expect, it } from "vitest";
import {
  MAX_FACILITIES,
  deriveRates,
  parseFacilityIds,
  sumTotals,
  type FacilityRow,
} from "@/lib/attribution/portfolio";

const U = (n: number) => `0000000${n}-1111-2222-3333-444444444444`.slice(-36);
const row = (o: Partial<FacilityRow>): FacilityRow => ({
  facility_id: U(1), facility_name: "F", spend: 0, leads: 0, move_ins: 0,
  revenue: 0, cpl: 0, cost_per_move_in: 0, ...o,
});

describe("parseFacilityIds", () => {
  it("rejects a missing list rather than silently querying everything", () => {
    expect(parseFacilityIds(null).error).toBeTruthy();
    expect(parseFacilityIds("").error).toBeTruthy();
    expect(parseFacilityIds("  ,  ").error).toBeTruthy();
  });

  // The ids reach SQL. Anything that is not a UUID is refused before it gets there.
  it("refuses non-UUIDs", () => {
    expect(parseFacilityIds("not-a-uuid").error).toBe("facilityIds must be UUIDs");
    expect(parseFacilityIds(`${U(1)},'; DROP TABLE facilities;--`).error).toBe("facilityIds must be UUIDs");
    expect(parseFacilityIds(`${U(1)},`).ids).toEqual([U(1)]);
  });

  it("caps the list — an unbounded IN is its own denial of service", () => {
    const many = Array.from({ length: MAX_FACILITIES + 1 }, (_, i) => U(i % 9)).join(",");
    expect(parseFacilityIds(many).error).toMatch(/too many/);
  });

  it("dedupes", () => {
    expect(parseFacilityIds(`${U(1)},${U(1)},${U(2)}`).ids).toEqual([U(1), U(2)]);
  });

  it("accepts a clean list and trims whitespace", () => {
    expect(parseFacilityIds(` ${U(1)} , ${U(2)} `).ids).toEqual([U(1), U(2)]);
  });
});

describe("deriveRates", () => {
  it("computes the three rates", () => {
    expect(deriveRates(1000, 50, 10, 200)).toEqual({ cpl: 20, cost_per_move_in: 100, roas: 2.4 });
  });

  // Every one of these is a division that would otherwise produce Infinity or
  // NaN and render as garbage on the dashboard.
  it("returns 0 rather than dividing by zero", () => {
    expect(deriveRates(1000, 0, 0, 0)).toEqual({ cpl: 0, cost_per_move_in: 0, roas: 0 });
    expect(deriveRates(0, 10, 2, 100)).toEqual({ cpl: 0, cost_per_move_in: 0, roas: 0 });
  });

  it("rounds to cents", () => {
    expect(deriveRates(100, 3, 3, 0).cpl).toBe(33.33);
  });
});

describe("sumTotals", () => {
  it("adds across facilities", () => {
    const t = sumTotals([
      row({ facility_id: U(1), spend: 1000, leads: 40, move_ins: 10, revenue: 150 }),
      row({ facility_id: U(2), spend: 500, leads: 10, move_ins: 5, revenue: 100 }),
    ]);
    expect(t).toMatchObject({ facilities: 2, spend: 1500, leads: 50, move_ins: 15, revenue: 250 });
  });

  // The portfolio number is spend/move-ins across the whole portfolio, NOT the
  // mean of each facility's rate — averaging rates would weight a tiny facility
  // the same as a large one and quietly misstate the headline metric.
  it("computes portfolio cost per move-in from the sums, not by averaging rates", () => {
    const t = sumTotals([
      row({ facility_id: U(1), spend: 1000, leads: 10, move_ins: 10, cost_per_move_in: 100 }),
      row({ facility_id: U(2), spend: 900, leads: 10, move_ins: 1, cost_per_move_in: 900 }),
    ]);
    expect(t.cost_per_move_in).toBe(172.73); // 1900 / 11, not (100+900)/2
  });

  it("survives an empty portfolio", () => {
    expect(sumTotals([])).toMatchObject({ facilities: 0, spend: 0, cost_per_move_in: 0, roas: 0 });
  });

  it("counts a facility with spend and no move-ins — that is the point of the report", () => {
    const t = sumTotals([row({ spend: 800, leads: 5, move_ins: 0 })]);
    expect(t.spend).toBe(800);
    expect(t.cost_per_move_in).toBe(0); // undefined, not infinite
  });
});
