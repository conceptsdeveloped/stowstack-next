import { describe, expect, it } from "vitest";
import { COOLDOWN_MINUTES, SHORT_CALL_SECONDS, isMissedCall, missedCallText } from "@/lib/respond/missed-call";
import { RESCUE_AFTER_MINUTES, RESCUE_BEFORE_MINUTES, rescueText } from "@/lib/respond/abandoned";
import { segmentCount } from "@/lib/messaging/types";

describe("isMissedCall", () => {
  it("counts the obvious misses", () => {
    ["no-answer", "busy", "failed", "canceled"].forEach((s) =>
      expect(isMissedCall({ status: s, duration: 0 })).toBe(true)
    );
  });

  // Twilio reports `completed` both for a real conversation and for a call that
  // hit voicemail and was abandoned. Duration is the only thing that separates
  // them, and the caller experienced the second as a missed call.
  it("counts a connected-but-instantly-ended call as missed", () => {
    expect(isMissedCall({ status: "completed", duration: 3 })).toBe(true);
    expect(isMissedCall({ status: "completed", duration: SHORT_CALL_SECONDS - 1 })).toBe(true);
  });

  it("does NOT count a real conversation", () => {
    expect(isMissedCall({ status: "completed", duration: SHORT_CALL_SECONDS })).toBe(false);
    expect(isMissedCall({ status: "completed", duration: 240 })).toBe(false);
  });

  it("ignores in-progress statuses so we do not text mid-call", () => {
    ["ringing", "in-progress", "queued"].forEach((s) =>
      expect(isMissedCall({ status: s, duration: 0 })).toBe(false)
    );
  });

  it("is not fooled by case or nulls", () => {
    expect(isMissedCall({ status: "NO-ANSWER", duration: null })).toBe(true);
    expect(isMissedCall({ status: null, duration: null })).toBe(false);
  });
});

describe("missed-call copy", () => {
  it("names the facility, invites a reply, and carries an opt-out", () => {
    const m = missedCallText("Midway Storage");
    expect(m).toContain("Midway Storage");
    expect(m).toMatch(/STOP/);
  });
  it("is one segment and plain ASCII", () => {
    const m = missedCallText("Longhorn State Storage Springtown");
    expect(segmentCount(m)).toBe(1);
    expect(/^[\x20-\x7e]*$/.test(m)).toBe(true);
  });
  // Three texts to somebody who redialled three times is how a helpful reply
  // becomes a complaint.
  it("has a cooldown long enough to survive a redial", () => {
    expect(COOLDOWN_MINUTES).toBeGreaterThanOrEqual(30);
  });
});

describe("abandoned-rescue window", () => {
  // Too early and they only stepped away from the form; too late and "you were
  // just looking at this" stops being true and starts being creepy.
  it("opens late enough to be a real abandonment", () => {
    expect(RESCUE_AFTER_MINUTES).toBeGreaterThanOrEqual(5);
  });
  it("closes before it gets creepy, leaving the rest to the email sequence", () => {
    expect(RESCUE_BEFORE_MINUTES).toBeLessThanOrEqual(240);
    expect(RESCUE_BEFORE_MINUTES).toBeGreaterThan(RESCUE_AFTER_MINUTES);
  });
});

describe("rescue copy", () => {
  const base = { name: "Dana Reeves", unitSize: "10x10", facilityName: "Midway Storage" };

  it("uses the first name, the size and the facility", () => {
    const m = rescueText(base);
    expect(m).toContain("Dana");
    expect(m).not.toContain("Reeves");
    expect(m).toContain("10x10");
    expect(m).toContain("Midway Storage");
  });

  it("degrades without a name or size rather than printing null", () => {
    const m = rescueText({ name: null, unitSize: null, facilityName: "Midway" });
    expect(m).toContain("a unit");
    expect(m).not.toMatch(/null|undefined/);
  });

  it("is one segment and plain ASCII", () => {
    expect(segmentCount(rescueText(base))).toBe(1);
    expect(/^[\x20-\x7e]*$/.test(rescueText(base))).toBe(true);
  });

  it("always carries an opt-out", () => {
    expect(rescueText(base)).toMatch(/STOP/);
  });
});
