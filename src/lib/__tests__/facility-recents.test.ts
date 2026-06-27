import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { pushFacilityRecent, readFacilityRecents } from "@/lib/facility-recents";

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

describe("facility recents", () => {
  it("starts empty", () => {
    expect(readFacilityRecents()).toEqual([]);
  });

  it("pushes a facility to the front and persists it", () => {
    expect(pushFacilityRecent("a")).toEqual(["a"]);
    expect(readFacilityRecents()).toEqual(["a"]);
  });

  it("moves an existing id to the front without duplicating", () => {
    pushFacilityRecent("a");
    pushFacilityRecent("b");
    pushFacilityRecent("c");
    expect(pushFacilityRecent("a")).toEqual(["a", "c", "b"]);
  });

  it("caps the list at 6 most-recent", () => {
    for (const id of ["a", "b", "c", "d", "e", "f", "g"]) pushFacilityRecent(id);
    const recents = readFacilityRecents();
    expect(recents).toHaveLength(6);
    expect(recents[0]).toBe("g"); // newest first
    expect(recents).not.toContain("a"); // oldest evicted
  });

  it("ignores malformed persisted data", () => {
    localStorage.setItem("storageads_facility_recents", "not json");
    expect(readFacilityRecents()).toEqual([]);
  });

  it("filters out non-string entries from persisted data", () => {
    localStorage.setItem(
      "storageads_facility_recents",
      JSON.stringify(["a", 5, null, "b"]),
    );
    expect(readFacilityRecents()).toEqual(["a", "b"]);
  });
});
