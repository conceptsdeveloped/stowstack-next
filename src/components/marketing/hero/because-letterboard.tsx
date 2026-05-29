"use client";

import { useState, useEffect } from "react";
import { SplitFlap as SplitFlapComponent } from "../split-flap";
import { BECAUSE_MESSAGES } from "./content";

/** Count how many rows a message needs at a given column width (word-wrap) */
function rowsNeeded(msg: string, cols: number): number {
  const words = msg.split(" ");
  let lines = 0;
  let current = 0;
  for (const word of words) {
    if (current === 0) {
      current = word.length;
      lines = 1;
    } else if (current + 1 + word.length <= cols) {
      current += 1 + word.length;
    } else {
      lines++;
      current = word.length;
    }
  }
  return lines;
}

/** Calculate minimum rows needed so ALL messages fit at a given column width */
function minRowsForMessages(messages: string[], cols: number): number {
  let max = 1;
  for (const msg of messages) {
    const needed = rowsNeeded(msg, cols);
    if (needed > max) max = needed;
  }
  return max;
}

function ResponsiveSplitFlap({ messages, holdTime }: { messages: string[]; holdTime: number }) {
  const [layout, setLayout] = useState({ cols: 26, rows: 4 });

  useEffect(() => {
    function update() {
      const w = window.innerWidth;
      let cols: number;
      if (w < 400) {
        cols = 14;
      } else if (w < 480) {
        cols = 16;
      } else if (w < 640) {
        cols = 20;
      } else if (w < 768) {
        cols = 24;
      } else if (w < 1024) {
        cols = 30;
      } else {
        cols = 36;
      }
      const rows = minRowsForMessages(messages, cols);
      setLayout({ cols, rows });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [messages]);

  return <SplitFlapComponent messages={messages} cols={layout.cols} rows={layout.rows} holdTime={holdTime} />;
}

export function BecauseLetterboard() {
  return (
    <section
      aria-label="Because (split-flap pain refrain)"
      className="relative border-t overflow-hidden"
      style={{ borderColor: "var(--border-subtle)", background: "var(--color-dark)" }}
    >
      <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-12 text-center">
        {/* "storageads.com — because" label */}
        <div className="mb-4 sm:mb-6">
          <span
            className="text-sm sm:text-base font-semibold tracking-wide"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", letterSpacing: "0.05em" }}
          >
            storageads.com
          </span>
          <span
            className="mx-2 sm:mx-3 text-xs sm:text-sm uppercase tracking-[0.2em] font-medium"
            style={{ fontFamily: "var(--font-heading)", color: "var(--color-light)" }}
          >
            because...
          </span>
        </div>

        {/* Split-flap display — responsive cols/rows */}
        <ResponsiveSplitFlap messages={BECAUSE_MESSAGES} holdTime={4500} />
      </div>
    </section>
  );
}
