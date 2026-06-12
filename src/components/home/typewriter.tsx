"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Cycling proof lines, typed character by character with a blinking
 * block cursor. Same words and pacing as the previous hero typewriter:
 * 80ms/char typing, 2200ms hold, half-speed delete. Reduced motion
 * renders the first line, static.
 */
const TYPEWRITER_WORDS = [
  "34 move-ins in 90 days.",
  "71% to 84% occupancy in one quarter.",
  "Create demand. Capture demand. Recapture demand.",
  "REIT-grade tools to reach 100% occupancy.",
  "Stop leaking $72,000 a year to the REIT down the road.",
];

const TYPE_MS = 80;
const HOLD_MS = 2200;

export default function Typewriter({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const reduce = useReducedMotion();
  const [text, setText] = useState(TYPEWRITER_WORDS[0]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduce) {
      // Reset asynchronously (lint: no sync setState in effect body).
      const id = setTimeout(() => setText(TYPEWRITER_WORDS[0]), 0);
      return () => clearTimeout(id);
    }
    let word = 0;
    let pos = TYPEWRITER_WORDS[0].length;
    let deleting = false;

    function tick() {
      const current = TYPEWRITER_WORDS[word];
      if (!deleting && pos < current.length) {
        pos += 1;
        setText(current.slice(0, pos));
        timer.current = setTimeout(tick, TYPE_MS);
      } else if (!deleting) {
        deleting = true;
        timer.current = setTimeout(tick, HOLD_MS);
      } else if (pos > 0) {
        pos -= 1;
        setText(current.slice(0, pos));
        timer.current = setTimeout(tick, TYPE_MS / 2);
      } else {
        deleting = false;
        word = (word + 1) % TYPEWRITER_WORDS.length;
        timer.current = setTimeout(tick, TYPE_MS);
      }
    }
    timer.current = setTimeout(tick, HOLD_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reduce]);

  return (
    <p
      className={className}
      aria-label={TYPEWRITER_WORDS[0]}
      style={{
        fontFamily: "var(--mono)",
        fontSize: 13,
        fontWeight: 600,
        color: "var(--accent)",
        minHeight: "1.5em",
        ...style,
      }}
    >
      <span aria-hidden="true">
        {text}
        {!reduce && (
          <span
            style={{
              display: "inline-block",
              width: "0.5em",
              height: "0.95em",
              background: "var(--accent)",
              verticalAlign: "-0.12em",
              marginLeft: 3,
              animation: "mono-blink 1.05s steps(1) infinite",
            }}
          />
        )}
      </span>
    </p>
  );
}
