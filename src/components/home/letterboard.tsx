"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { SplitFlap } from "@/components/marketing/split-flap";

/**
 * The pain refrain on a split-flap departure board, on the ink ground.
 * Same 13 messages and 4500ms hold as before. Two fixes over the old
 * wrapper: the label no longer references the banned gold token (the
 * brand-locked --brand-gold appears only on the "ads" letters, matching
 * the logo mandate), and reduced motion now renders a static message
 * instead of a still-cycling board.
 */
const BECAUSE_MESSAGES = [
  "A SIGN ON A CHAINLINK FENCE IS NOT AN ACQUISITION STRATEGY",
  "WE'RE ON PAGE 2 OF GOOGLE IS NOT A MARKETING PLAN",
  "YOUR COMPETITOR FILLED 40 UNITS LAST MONTH AND YOU HAVE NO IDEA HOW",
  "YOU ASKED YOUR AGENCY WHICH ADS DROVE MOVE-INS AND THEY CHANGED THE SUBJECT",
  "YOU'RE PAYING $200 PER MOVE-IN AND CALLING IT BRAND AWARENESS",
  "YOUR AGENCY SENDS YOU A REPORT EVERY MONTH AND YOU DON'T UNDERSTAND A SINGLE LINE ON IT",
  "DRONE FOOTAGE OF YOUR ROOF HAS 200 VIEWS AND ZERO RESERVATIONS",
  "YOU JUST PAID GOOGLE $6 SO SOMEONE COULD CLICK YOUR AD TO PAY THEIR BILL",
  "EXTRA SPACE IS RUNNING 14 CAMPAIGNS IN YOUR ZIP CODE AND YOU'RE RUNNING VIBES",
  "YOUR BEST AD GOT 3 LIKES AND TWO WERE EMPLOYEES",
  "YOU'VE BEEN ABOUT TO LAUNCH A CAMPAIGN SINCE Q2 OF LAST YEAR",
  "YOUR GOOGLE BUSINESS LISTING IS DOING MORE WORK THAN YOUR ENTIRE MARKETING BUDGET",
  "THE MARKETING MEETING WAS YOU AND YOUR MANAGER STARING AT GOOGLE REVIEWS",
];

function colsForWidth(w: number): number {
  if (w < 400) return 14;
  if (w < 480) return 16;
  if (w < 640) return 20;
  if (w < 768) return 24;
  if (w < 1024) return 30;
  return 36;
}

/** Mirror of split-flap's wrapMessage line counting, for row sizing. */
function linesNeeded(msg: string, cols: number): number {
  const words = msg.split(" ");
  let lines = 0;
  let current = "";
  for (const word of words) {
    if (current.length === 0) current = word;
    else if (current.length + 1 + word.length <= cols) current += " " + word;
    else {
      lines += 1;
      current = word;
    }
  }
  return lines + (current ? 1 : 0);
}

export default function Letterboard() {
  const reduce = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const [cols, setCols] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setCols(colsForWidth(el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rows = cols
    ? Math.max(...BECAUSE_MESSAGES.map((mm) => linesNeeded(mm, cols)))
    : 0;

  return (
    <section
      aria-label="Because (split-flap pain refrain)"
      className="ground-ink"
    >
      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 lg:px-10 py-12 sm:py-16">
        <p
          className="mb-6"
          style={{
            fontFamily: "var(--mono)",
            fontSize: 11,
            letterSpacing: "var(--track-label)",
            textTransform: "uppercase",
            color: "var(--text-on-ink-dim)",
          }}
        >
          <span style={{ color: "var(--bg)", fontWeight: 700 }}>storage</span>
          <span style={{ color: "var(--brand-gold)", fontWeight: 700 }}>ads</span>
          <span>.com</span>
          <span style={{ marginLeft: 10 }}>because...</span>
        </p>

        <div ref={containerRef}>
          {reduce ? (
            <p
              style={{
                fontFamily: "var(--serif)",
                fontWeight: 200,
                letterSpacing: "var(--track-display)",
                fontSize: "clamp(1.625rem, 1rem + 3.2vw, 3.5rem)",
                lineHeight: 1.15,
                color: "var(--bg)",
                textTransform: "uppercase",
                maxWidth: 980,
              }}
            >
              {BECAUSE_MESSAGES[0]}
            </p>
          ) : (
            cols && (
              <SplitFlap
                messages={BECAUSE_MESSAGES}
                cols={cols}
                rows={rows}
                holdTime={4500}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}
