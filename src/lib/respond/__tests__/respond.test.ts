import { describe, expect, it } from "vitest";
import { HOLD_MINUTES } from "@/lib/respond/hold";
import { REPLIES, classifyInbound } from "@/lib/messaging/inbound";
import { segmentCount } from "@/lib/messaging/types";

describe("classifyInbound", () => {
  // STOP wins outright and is checked first. Missing one is a legal failure;
  // a false positive costs one un-sent marketing text.
  it("treats every standard stop keyword as an opt-out", () => {
    ["STOP", "stop", "Stop!", " unsubscribe ", "CANCEL", "quit", "end", "optout"]
      .forEach((w) => expect(classifyInbound(w)).toBe("stop"));
  });

  it("recognises resubscribe", () => {
    expect(classifyInbound("START")).toBe("start");
    expect(classifyInbound("unstop")).toBe("start");
  });

  // "YES" means "hold the unit", not "resubscribe" — the two must not collide,
  // because treating a hold request as a resubscribe loses the rental.
  it("reads YES as a confirmation, not a resubscribe", () => {
    ["YES", "yes", "y", "Yep", "ok", "confirm"].forEach((w) =>
      expect(classifyInbound(w)).toBe("confirm")
    );
  });

  it("recognises help", () => {
    expect(classifyInbound("HELP")).toBe("help");
    expect(classifyInbound("info")).toBe("help");
  });

  it("leaves a real question alone rather than auto-replying noise", () => {
    expect(classifyInbound("do you have anything bigger?")).toBe("unknown");
    expect(classifyInbound("can I stop by tomorrow")).toBe("unknown");
    expect(classifyInbound("")).toBe("unknown");
    expect(classifyInbound(null)).toBe("unknown");
  });
});

describe("inbound replies", () => {
  it("every reply is one segment and plain ASCII", () => {
    const all = [
      REPLIES.stop, REPLIES.start, REPLIES.help, REPLIES.heldGone, REPLIES.noHold,
      REPLIES.heldOk("10x10", HOLD_MINUTES), REPLIES.heldOk(null, HOLD_MINUTES),
    ];
    all.forEach((m) => {
      expect(segmentCount(m)).toBe(1);
      expect(/^[\x20-\x7e]*$/.test(m)).toBe(true); // no curly quotes, no dashes, no emoji
    });
  });

  it("the stop confirmation tells them how to come back", () => {
    expect(REPLIES.stop).toMatch(/START/);
  });

  // Carriers expect HELP to identify the sender and mention rates.
  it("the help reply identifies the sender and mentions rates", () => {
    expect(REPLIES.help).toMatch(/StorageAds/);
    expect(REPLIES.help).toMatch(/rates may apply/i);
    expect(REPLIES.help).toMatch(/STOP/);
  });

  it("the hold confirmation states the window so nobody assumes it is theirs forever", () => {
    expect(REPLIES.heldOk("10x10", 30)).toContain("30 minutes");
    expect(REPLIES.heldOk("10x10", 30)).toContain("10x10");
    expect(REPLIES.heldOk(null, 30)).not.toContain("null");
  });
});

describe("hold window", () => {
  it("is long enough to finish a call and short enough not to strand a unit", () => {
    expect(HOLD_MINUTES).toBeGreaterThanOrEqual(15);
    expect(HOLD_MINUTES).toBeLessThanOrEqual(60);
  });
});
