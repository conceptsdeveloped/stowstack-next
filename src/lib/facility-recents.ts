/**
 * Shared "recently used facilities" store. Both the sidebar/header facility
 * switcher and the inline picker on scope-aware tool pages read and write this,
 * so a facility you select anywhere becomes a recent everywhere.
 */
const RECENTS_KEY = "storageads_facility_recents";
const MAX_RECENTS = 6;

export function readFacilityRecents(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Move `id` to the front of the recents list (capped) and persist. Returns the new list. */
export function pushFacilityRecent(id: string): string[] {
  const next = [id, ...readFacilityRecents().filter((x) => x !== id)].slice(0, MAX_RECENTS);
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}
