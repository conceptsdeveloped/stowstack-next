'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import styles from './split-flap.module.css';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@&!?+-=';
const CASCADE_DELAY = 70;
const FLIP_INTERVAL_START = 35;
const FLIP_INTERVAL_END = 60;
const RAND_FLIPS_MIN = 4;
const RAND_FLIPS_MAX = 12;
const FLIP_DURATION = 320;
const NBSP = '\u00A0';

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

interface SplitFlapProps {
  messages: string[];
  cols?: number;
  holdTime?: number;
}

export function SplitFlap({ messages, cols: colsProp, holdTime = 4000 }: SplitFlapProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const currentCharsRef = useRef<string[]>([]);
  const runningRef = useRef(false);
  const [flapSize, setFlapSize] = useState({ width: 42, height: 60, fontSize: 34 });

  // Compute responsive cols and flap size
  const cols = colsProp ?? 16;

  // Responsive sizing
  useEffect(() => {
    function updateSize() {
      const vw = window.innerWidth;
      if (vw < 400) {
        // Tiny mobile
        const w = Math.floor((vw - 40) / cols) - 2;
        setFlapSize({ width: Math.max(16, w), height: Math.max(24, Math.floor(w * 1.43)), fontSize: Math.max(12, Math.floor(w * 0.8)) });
      } else if (vw < 640) {
        const w = Math.floor((vw - 40) / cols) - 2;
        setFlapSize({ width: Math.max(20, w), height: Math.max(30, Math.floor(w * 1.43)), fontSize: Math.max(16, Math.floor(w * 0.8)) });
      } else if (vw < 900) {
        const w = Math.min(32, Math.floor((vw - 60) / cols) - 3);
        setFlapSize({ width: w, height: Math.floor(w * 1.43), fontSize: Math.floor(w * 0.8) });
      } else {
        setFlapSize({ width: 42, height: 60, fontSize: 34 });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [cols]);

  // Get a flap unit's child elements
  const getUnit = useCallback((col: number) => {
    const board = boardRef.current;
    if (!board) return null;
    const row = board.querySelector(`.${styles.boardRow}`);
    if (!row) return null;
    return row.children[col] as HTMLElement | null;
  }, []);

  // Set a character without animation
  const setChar = useCallback((col: number, char: string) => {
    const unit = getUnit(col);
    if (!unit) return;
    const display = char === ' ' ? NBSP : char;
    unit.querySelectorAll(`.${styles.flapChar}`).forEach((el) => {
      el.textContent = display;
    });
    currentCharsRef.current[col] = char;
  }, [getUnit]);

  // Animate a single flap flip — exact port of flipOnce()
  const flipOnce = useCallback((col: number, fromChar: string, toChar: string) => {
    return new Promise<void>((resolve) => {
      const unit = getUnit(col);
      if (!unit) { resolve(); return; }

      const fromDisplay = fromChar === ' ' ? NBSP : fromChar;
      const toDisplay = toChar === ' ' ? NBSP : toChar;

      const topEl = unit.querySelector(`.${styles.top}`) as HTMLElement;
      const bottomEl = unit.querySelector(`.${styles.bottom}`) as HTMLElement;
      const flipTopEl = unit.querySelector(`.${styles.flipTop}`) as HTMLElement;
      const flipBottomEl = unit.querySelector(`.${styles.flipBottom}`) as HTMLElement;
      const shadowEl = unit.querySelector(`.${styles.flipShadow}`) as HTMLElement;

      if (!topEl || !bottomEl || !flipTopEl || !flipBottomEl || !shadowEl) { resolve(); return; }

      // Current state: top and bottom show fromChar
      topEl.querySelector(`.${styles.flapChar}`)!.textContent = fromDisplay;
      bottomEl.querySelector(`.${styles.flapChar}`)!.textContent = fromDisplay;

      // Flip-top shows OLD char (folds down and disappears)
      flipTopEl.querySelector(`.${styles.flapChar}`)!.textContent = fromDisplay;

      // Flip-bottom shows NEW char (folds up into place)
      flipBottomEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;

      // Static bottom shows NEW char (revealed as flip-top folds away)
      bottomEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;

      // Reset animations
      flipTopEl.classList.remove(styles.flipping);
      flipBottomEl.classList.remove(styles.flipping);
      shadowEl.classList.remove(styles.visible);

      // Force reflow
      void flipTopEl.offsetWidth;
      void flipBottomEl.offsetWidth;
      void shadowEl.offsetWidth;

      // Trigger
      flipTopEl.classList.add(styles.flipping);
      flipBottomEl.classList.add(styles.flipping);
      shadowEl.classList.add(styles.visible);

      // After animation completes, set final state
      setTimeout(() => {
        flipTopEl.classList.remove(styles.flipping);
        flipBottomEl.classList.remove(styles.flipping);
        shadowEl.classList.remove(styles.visible);

        flipTopEl.style.transform = '';
        flipBottomEl.style.transform = '';

        topEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;
        bottomEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;
        flipTopEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;
        flipBottomEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;

        currentCharsRef.current[col] = toChar;
        resolve();
      }, FLIP_DURATION);
    });
  }, [getUnit]);

  // Animate column through random chars then land — exact port of animateColumn()
  const animateColumn = useCallback(async (col: number, targetChar: string) => {
    if (currentCharsRef.current[col] === targetChar) return;

    const numFlips = RAND_FLIPS_MIN + Math.floor(Math.random() * (RAND_FLIPS_MAX - RAND_FLIPS_MIN));

    for (let i = 0; i < numFlips; i++) {
      const intermediateChar = CHARS[Math.floor(Math.random() * CHARS.length)];
      const progress = i / numFlips;
      const interval = FLIP_INTERVAL_START + (FLIP_INTERVAL_END - FLIP_INTERVAL_START) * progress;

      await flipOnce(col, currentCharsRef.current[col], intermediateChar);
      await sleep(interval);
    }

    // Final flip to target
    await flipOnce(col, currentCharsRef.current[col], targetChar);
  }, [flipOnce]);

  // Transition to new message — exact port of transitionTo()
  const transitionTo = useCallback((message: string) => {
    const padded = message.padEnd(cols, ' ').substring(0, cols).toUpperCase();

    const promises: Promise<void>[] = [];
    for (let c = 0; c < cols; c++) {
      const targetChar = padded[c];
      const delay = c * CASCADE_DELAY;

      const p = new Promise<void>((resolve) => {
        setTimeout(() => {
          animateColumn(c, targetChar).then(resolve);
        }, delay);
      });
      promises.push(p);
    }

    return Promise.all(promises);
  }, [cols, animateColumn]);

  // Main loop
  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    currentCharsRef.current = new Array(cols).fill(' ');

    // Initialize all to blank
    for (let c = 0; c < cols; c++) {
      setChar(c, ' ');
    }

    let cancelled = false;

    async function run() {
      await sleep(600);

      let idx = 0;
      while (!cancelled) {
        const msg = messages[idx % messages.length];

        // Center the message
        const pad = Math.max(0, Math.floor((cols - msg.length) / 2));
        const centered = ' '.repeat(pad) + msg;

        await transitionTo(centered);
        if (cancelled) break;
        await sleep(holdTime);
        idx++;
      }
    }

    run();

    return () => {
      cancelled = true;
      runningRef.current = false;
    };
  }, [messages, cols, holdTime, setChar, transitionTo]);

  // Build flap units as React elements
  const flapUnits = Array.from({ length: cols }, (_, c) => (
    <div
      key={c}
      className={styles.flapUnit}
      style={{
        '--flap-width': `${flapSize.width}px`,
        '--flap-height': `${flapSize.height}px`,
        '--flap-font-size': `${flapSize.fontSize}px`,
      } as React.CSSProperties}
    >
      <div className={styles.top}><span className={styles.flapChar}>{NBSP}</span></div>
      <div className={styles.bottom}><span className={styles.flapChar}>{NBSP}</span></div>
      <div className={styles.flipTop}><span className={styles.flapChar}>{NBSP}</span></div>
      <div className={styles.flipBottom}><span className={styles.flapChar}>{NBSP}</span></div>
      <div className={styles.flipShadow}></div>
    </div>
  ));

  return (
    <div className={styles.boardFrame} ref={boardRef}>
      <div className={`${styles.boardRivet} ${styles.rivetTl}`} />
      <div className={`${styles.boardRivet} ${styles.rivetTr}`} />
      <div className={`${styles.boardRivet} ${styles.rivetBl}`} />
      <div className={`${styles.boardRivet} ${styles.rivetBr}`} />
      <div className={styles.boardRow}>
        {flapUnits}
      </div>
    </div>
  );
}
