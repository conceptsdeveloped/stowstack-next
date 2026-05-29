"use client";

import { MONO, Label, Dot } from "@/components/mono";
import { useClock } from "@/hooks/use-live-data";
import Cite from "../cite";

export function HeroStatusStrip() {
  const clock = useClock();
  return (
    // Sit directly under the fixed nav. Previous version used a
    // position:relative + top + negative-margin trick which offsets the box
    // visually but not in layout — that caused the H1 eyebrow below to render
    // ON TOP of the strip's bottom border on iPhone 17 Pro Max. Using plain
    // marginTop keeps layout and visual positions aligned, and adding the
    // safe-area inset ensures the strip clears the dynamic island / notch.
    <div
      style={{
        marginTop:
          "calc(var(--nav-height) + env(safe-area-inset-top, 0px))",
        borderBottom: `1px solid ${MONO.line}`,
        borderTop: `1px solid ${MONO.line}`,
      }}
    >
      <div
        className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-14"
        style={{
          padding: "8px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          whiteSpace: "nowrap",
          overflow: "hidden",
        }}
      >
        <Label style={{ color: MONO.accent, fontWeight: 500 }}>
          <Dot live color={MONO.accent} style={{ marginRight: 8, verticalAlign: "middle" }} />
          {/* On mobile the right-side REV/clock/SOC2 line eats half the row,
              so we drop the second clause until sm:+ to keep the row clean. */}
          <span className="sm:hidden">MARKETING INFRASTRUCTURE</span>
          <span className="hidden sm:inline">
            MARKETING INFRASTRUCTURE · BUILT FOR SELF-STORAGE
          </span>
        </Label>
        {/* Center benchmark tile — desktop only. Surfaces the REIT-vs-independent
            occupancy gap (the central thesis) as a live read on the strip. The
            ¹ ² ref links into the SourcesNote block at the page bottom. */}
        <Label
          className="hidden lg:inline-flex"
          style={{ color: MONO.textDim, alignItems: "center", gap: 6 }}
        >
          <span style={{ color: MONO.accent }}>OCC GAP</span>
          <span style={{ color: MONO.text, fontWeight: 600 }}>5 PTS</span>
          <span>· REIT 92.6 / IND 87.2</span>
          <Cite n={[1, 2]} />
        </Label>
        <Label style={{ color: MONO.textDim }}>
          {/* Mobile: REV date only. Tablet+: full timestamp + compliance tag. */}
          <span className="sm:hidden">REV {clock.ymd}</span>
          <span className="hidden sm:inline">
            REV {clock.ymd} · {clock.hms} {clock.tz} · SOC2
          </span>
        </Label>
      </div>
    </div>
  );
}
