import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIMEZONE, EARLIEST_HOUR, LATEST_HOUR, MAX_DAYS_AHEAD,
  NO_SHOW_GRACE_MINUTES, REMIND_1H_MINUTES, REMIND_24H_MINUTES, SWEEP_WINDOW_MINUTES,
  formatTourTime, hourInZone, sameLocalDay, withinBookableHours,
} from "@/lib/respond/tour";
import { COPY } from "@/lib/messaging/copy";
import { segmentCount } from "@/lib/messaging/types";

/** 2026-09-12T19:30:00Z — 2:30pm in Chicago, 3:30pm in New York. */
const WHEN = new Date("2026-09-12T19:30:00Z");

describe("hourInZone", () => {
  it("reads the local hour, not the server's", () => {
    expect(hourInZone(WHEN, "America/Chicago")).toBe(14);
    expect(hourInZone(WHEN, "America/New_York")).toBe(15);
    expect(hourInZone(WHEN, "UTC")).toBe(19);
  });
  // Intl renders midnight as 24 with hour12:false, which would break every
  // comparison against EARLIEST_HOUR.
  it("normalises midnight to 0 rather than 24", () => {
    expect(hourInZone(new Date("2026-09-12T05:00:00Z"), "America/Chicago")).toBe(0);
  });
  it("returns null for a zone that does not exist instead of throwing", () => {
    expect(hourInZone(WHEN, "Mars/Olympus")).toBeNull();
  });
});

describe("formatTourTime", () => {
  it("says the day and time the way a person would", () => {
    expect(formatTourTime(WHEN, "America/Chicago", "full")).toBe("Sat, Sep 12 at 2:30 PM");
  });
  it("says just the time for the hour-before reminder", () => {
    expect(formatTourTime(WHEN, "America/Chicago", "time")).toBe("2:30 PM");
  });
  it("says tomorrow for the day-before reminder", () => {
    expect(formatTourTime(WHEN, "America/Chicago", "relative-day")).toBe("tomorrow at 2:30 PM");
  });
  it("renders in the facility's zone, not the server's", () => {
    expect(formatTourTime(WHEN, "America/New_York", "time")).toBe("3:30 PM");
  });
  // A bad zone in the database must not take the booking down with it.
  it("falls back to the default zone rather than throwing", () => {
    expect(formatTourTime(WHEN, "Mars/Olympus", "time")).toBe(
      formatTourTime(WHEN, DEFAULT_TIMEZONE, "time")
    );
  });
});

describe("withinBookableHours", () => {
  const now = new Date("2026-09-12T15:00:00Z"); // 10am Chicago

  it("accepts a normal afternoon slot", () => {
    expect(withinBookableHours(WHEN, "America/Chicago", now)).toEqual({ ok: true });
  });

  it("refuses a time in the past", () => {
    expect(withinBookableHours(new Date("2026-09-12T14:00:00Z"), "America/Chicago", now))
      .toEqual({ ok: false, reason: "past" });
  });

  it("refuses a date beyond the booking horizon", () => {
    const far = new Date(now.getTime() + (MAX_DAYS_AHEAD + 1) * 86_400_000);
    expect(withinBookableHours(far, "America/Chicago", now).reason).toBe("too-far");
  });

  /**
   * The reason this is zone-aware at all. 03:00 UTC is 10pm the previous day in
   * Chicago — a server-hour check would call it fine.
   */
  it("refuses the middle of the night in the FACILITY's zone", () => {
    const night = new Date("2026-09-13T03:00:00Z"); // 10pm Chicago, 11pm New York
    expect(withinBookableHours(night, "America/Chicago", now).reason).toBe("outside-hours");
  });

  it("treats the boundary hours as inclusive-open", () => {
    const dayAt = (h: number) => {
      // h o'clock Chicago on 2026-09-13 (CDT, UTC-5)
      return new Date(Date.UTC(2026, 8, 13, h + 5, 0, 0));
    };
    expect(withinBookableHours(dayAt(EARLIEST_HOUR), "America/Chicago", now).ok).toBe(true);
    expect(withinBookableHours(dayAt(EARLIEST_HOUR - 1), "America/Chicago", now).reason).toBe("outside-hours");
    expect(withinBookableHours(dayAt(LATEST_HOUR - 1), "America/Chicago", now).ok).toBe(true);
    expect(withinBookableHours(dayAt(LATEST_HOUR), "America/Chicago", now).reason).toBe("outside-hours");
  });

  it("refuses an unparseable date rather than booking it", () => {
    expect(withinBookableHours(new Date("nonsense"), "America/Chicago", now).reason).toBe("invalid");
  });
});

describe("sameLocalDay", () => {
  it("compares calendar days in the given zone", () => {
    const evening = new Date("2026-09-13T01:00:00Z"); // 8pm Sep 12 in Chicago
    expect(sameLocalDay(WHEN, evening, "America/Chicago")).toBe(true);
    // Same two instants, but in UTC they fall on different dates.
    expect(sameLocalDay(WHEN, evening, "UTC")).toBe(false);
  });
});

describe("windows are coherent with each other", () => {
  // A sweep narrower than its own interval would miss tours entirely.
  it("the sweep window is wider than the interval it runs on", () => {
    expect(SWEEP_WINDOW_MINUTES).toBeGreaterThan(5);
  });
  it("the two reminders are a day and an hour, in that order", () => {
    expect(REMIND_24H_MINUTES).toBe(24 * 60);
    expect(REMIND_1H_MINUTES).toBe(60);
    expect(REMIND_24H_MINUTES).toBeGreaterThan(REMIND_1H_MINUTES);
  });
  // Shorter than this and we call somebody a no-show while they are parking.
  it("the no-show grace is long enough to be fair", () => {
    expect(NO_SHOW_GRACE_MINUTES).toBeGreaterThanOrEqual(30);
  });
  // And short enough that "sorry we missed you today" is still true.
  it("but short enough to still be the same day", () => {
    expect(NO_SHOW_GRACE_MINUTES).toBeLessThan(4 * 60);
  });
});

describe("tour copy", () => {
  const base = { name: "Dana Reeves", when: "Sat, Sep 12 at 2:30 PM", facilityName: "Longhorn State Storage" };

  (["en", "es"] as const).forEach((lang) => {
    const c = COPY[lang];
    const cap = lang === "es" ? 3 : 1;

    it(`${lang}: every tour message names the facility and the time`, () => {
      [c.tourConfirmed(base), c.tourReminder24(base), c.tourReminder1(base)].forEach((m) => {
        expect(m).toContain(base.facilityName);
        expect(m).toContain(base.when);
      });
    });

    it(`${lang}: every tour message carries an opt-out`, () => {
      const optOut = lang === "es" ? /PARAR/ : /STOP/;
      [c.tourConfirmed(base), c.tourReminder24(base), c.tourReminder1(base),
       c.tourNoShow({ name: base.name, facilityName: base.facilityName })]
        .forEach((m) => expect(m).toMatch(optOut));
    });

    it(`${lang}: stays inside the segment budget`, () => {
      [c.tourConfirmed(base), c.tourReminder24(base), c.tourReminder1(base),
       c.tourNoShow({ name: base.name, facilityName: base.facilityName })]
        .forEach((m) => expect(segmentCount(m), `${m.length} chars`).toBeLessThanOrEqual(cap));
    });

    it(`${lang}: degrades without a name rather than printing null`, () => {
      const m = c.tourConfirmed({ ...base, name: null });
      expect(m).not.toMatch(/null|undefined/);
      expect(m).not.toMatch(/\s{2,}/);
      expect(m).toBe(m.trim());
    });
  });

  it("uses the first name only", () => {
    expect(COPY.en.tourConfirmed(base)).toContain("Dana");
    expect(COPY.en.tourConfirmed(base)).not.toContain("Reeves");
  });

  // The no-show message is the rebooking ask; if it stops offering, it is just
  // an apology and r7 has no purpose.
  it("the no-show message offers to rebook", () => {
    expect(COPY.en.tourNoShow({ name: "Dana", facilityName: "X" })).toMatch(/rebook/i);
    expect(COPY.es.tourNoShow({ name: "Dana", facilityName: "X" })).toMatch(/reagendamos/i);
  });
});
