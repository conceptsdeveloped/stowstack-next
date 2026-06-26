import { describe, expect, it } from "vitest";
import { resolveFacilityScope } from "@/lib/facility-context";
import type { Facility } from "@/types/facility";

const fac = (id: string, name = id): Facility =>
  ({ id, name, location: "", status: "active" }) as Facility;

const ONE = [fac("a", "Riverside")];
const MANY = [fac("a", "Riverside"), fac("b", "Lakeside"), fac("c", "Hilltop")];

describe("resolveFacilityScope", () => {
  it("auto-selects the only facility, ignoring URL/persisted", () => {
    expect(resolveFacilityScope(ONE, null, null).currentId).toBe("a");
    expect(resolveFacilityScope(ONE, "b", "c").currentId).toBe("a");
  });

  it("uses a valid URL param over the persisted selection", () => {
    const r = resolveFacilityScope(MANY, "b", "c");
    expect(r.currentId).toBe("b");
    expect((r.current as Facility).id).toBe("b");
  });

  it("falls back to the persisted selection when the URL has no param", () => {
    // The core fix: scope survives navigation to a bare href.
    expect(resolveFacilityScope(MANY, null, "c").currentId).toBe("c");
  });

  it("treats persisted 'all' as a sticky choice, not a facility", () => {
    expect(resolveFacilityScope(MANY, null, "all").currentId).toBe("all");
  });

  it("rolls up to 'all' when nothing is selected", () => {
    expect(resolveFacilityScope(MANY, null, null).currentId).toBe("all");
  });

  it("ignores stale ids no longer in the list", () => {
    expect(resolveFacilityScope(MANY, "gone", null).currentId).toBe("all");
    expect(resolveFacilityScope(MANY, null, "gone").currentId).toBe("all");
  });

  it("ignores a persisted facility when the URL param is explicitly present", () => {
    // URL param is authoritative; a different remembered id must not win.
    expect(resolveFacilityScope(MANY, "a", "c").currentId).toBe("a");
  });
});
