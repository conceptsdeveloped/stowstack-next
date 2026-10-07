import type { FacilityType } from "./stamps";

/**
 * Facility identity, Instrument Calm (library entry 008, STAMPS.md): a facility
 * stamp states facts, never a hash. Initials stenciled like a unit number, the
 * facility's primary unit type, a two-digit sequence, and a speakable slug.
 * `initials` and `facilitySlug` are exact ports of the kit's tools/stamps.py.
 */

const STOP = new Set(["the", "and", "of", "inc", "llc", "co"]);
const isAlnum = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

/** "Northside Storage" → "NS"; one-word names take their first two letters. */
export function initials(name: string): string {
  const cleaned = [...name].map((ch) => (isAlnum(ch) || ch === " " ? ch : " ")).join("");
  const words = cleaned.split(/\s+/).filter((w) => w && !STOP.has(w.toLowerCase()));
  const use = words.length ? words : name.split(/\s+/).filter(Boolean);
  if (use.length >= 2) return (use[0][0] + use[1][0]).toUpperCase();
  return (use[0] ?? "").slice(0, 2).toUpperCase();
}

/** "Northside Storage" → "northside-01": lowercase, "storage" and "self" dropped, two-digit sequence. */
export function facilitySlug(name: string, seq = 1): string {
  const cleaned = [...name].map((ch) => (isAlnum(ch) || ch === " " ? ch.toLowerCase() : " ")).join("");
  const base = cleaned
    .split(/\s+/)
    .filter((w) => w && w !== "storage" && w !== "self")
    .join("-");
  return `${base || "facility"}-${String(seq).padStart(2, "0")}`;
}

const CLIMATE = /climate|\bcc\b|heated|temperature/i;
const VEHICLE = /parking|\brv\b|boat|vehicle|car\b|trailer/i;
const BUSINESS = /business|office|commercial|warehouse|workshop/i;
const DRIVE_UP = /drive[\s-]?up/i;

/**
 * The facility's primary unit type, from its unit mix: whichever kind holds
 * the most units. "tower" is a building form the data can't see, so it is
 * never inferred.
 */
export function primaryUnitType(units: { unitType: string; features: string[]; total: number }[]): FacilityType {
  const totals: Record<Exclude<FacilityType, "tower">, number> = {
    drive_up: 0,
    climate_controlled: 0,
    vehicle: 0,
    business: 0,
    general: 0,
  };
  for (const u of units) {
    const text = `${u.unitType} ${u.features.join(" ")}`;
    const kind = CLIMATE.test(text)
      ? "climate_controlled"
      : VEHICLE.test(text)
        ? "vehicle"
        : BUSINESS.test(text)
          ? "business"
          : DRIVE_UP.test(text)
            ? "drive_up"
            : "general";
    totals[kind] += Math.max(0, u.total);
  }
  const order = ["drive_up", "climate_controlled", "vehicle", "business", "general"] as const;
  let best: (typeof order)[number] = "drive_up";
  for (const k of order) if (totals[k] > totals[best]) best = k;
  return units.length ? best : "general";
}
