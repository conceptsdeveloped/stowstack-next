'use client';

import { useRef, useEffect, useCallback, useState } from 'react';
import styles from './split-flap.module.css';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#@&!?+-=';
const CASCADE_DELAY = 50;
const FLIP_INTERVAL_START = 35;
const FLIP_INTERVAL_END = 60;
const RAND_FLIPS_MIN = 4;
const RAND_FLIPS_MAX = 10;
const FLIP_DURATION = 320;
const NBSP = '\u00A0';

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

/** Word-wrap a message into fixed-width rows */
function wrapMessage(msg: string, cols: number, rows: number): string[] {
  const words = msg.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    if (current.length === 0) {
      current = word;
    } else if (current.length + 1 + word.length <= cols) {
      current += ' ' + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);

  // Pad to exact number of rows, center each line
  const result: string[] = [];
  // Center vertically if fewer lines than rows
  const startRow = Math.max(0, Math.floor((rows - lines.length) / 2));
  for (let r = 0; r < rows; r++) {
    const lineIdx = r - startRow;
    if (lineIdx >= 0 && lineIdx < lines.length) {
      const line = lines[lineIdx];
      // Center horizontally
      const pad = Math.max(0, Math.floor((cols - line.length) / 2));
      result.push((' '.repeat(pad) + line).padEnd(cols, ' ').substring(0, cols));
    } else {
      result.push(' '.repeat(cols));
    }
  }
  return result;
}

interface SplitFlapProps {
  messages: string[];
  cols?: number;
  rows?: number;
  holdTime?: number;
}

export function SplitFlap({ messages, cols: colsProp, rows: rowsProp, holdTime = 4000 }: SplitFlapProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const currentCharsRef = useRef<string[][]>([]);
  const runningRef = useRef(false);
  const [flapSize, setFlapSize] = useState({ width: 42, height: 60, fontSize: 34 });

  const cols = colsProp ?? 30;
  const rows = rowsProp ?? 3;
  const _totalCells = cols * rows;

  // Responsive sizing based on viewport and cols
  useEffect(() => {
    function updateSize() {
      // Measure the actual board element width if rendered, else estimate from viewport
      const boardEl = boardRef.current;
      let containerWidth: number;
      if (boardEl && boardEl.parentElement) {
        containerWidth = boardEl.parentElement.clientWidth;
      } else {
        // Estimate: min of viewport and 1280px max-w, minus horizontal section padding
        const vw = window.innerWidth;
        const sectionPad = vw < 640 ? 24 : vw < 1024 ? 48 : 80; // px-3/px-6/px-10 * 2
        containerWidth = Math.min(vw, 1280) - sectionPad;
      }

      // Board frame padding depends on viewport
      const vw = window.innerWidth;
      // CSS: 20px each side desktop, 10px each side <640, 6px each side <400 + 2px border each side
      const framePadH = vw < 400 ? 12 : vw < 640 ? 20 : 40;
      const frameBorder = 4; // 2px border each side
      const boardPadding = framePadH + frameBorder;
      const gapSize = vw < 640 ? 1 : 2; // matches CSS gap
      const totalGaps = (cols - 1) * gapSize;
      const availableForFlaps = containerWidth - boardPadding - totalGaps;
      const maxFlapW = Math.floor(availableForFlaps / cols);
      // Clamp: min 12px (readable on mobile), max 42px (desktop)
      const w = Math.max(12, Math.min(42, maxFlapW));
      const h = Math.max(17, Math.floor(w * 1.43));
      const f = Math.max(9, Math.floor(w * 0.8));
      setFlapSize({ width: w, height: h, fontSize: f });
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [cols]);

  // Get a flap unit's child elements by row and col
  const getUnit = useCallback((row: number, col: number) => {
    const board = boardRef.current;
    if (!board) return null;
    const rowEls = board.querySelectorAll(`.${styles.boardRow}`);
    if (!rowEls[row]) return null;
    return rowEls[row].children[col] as HTMLElement | null;
  }, []);

  // Set a character without animation
  const setChar = useCallback((row: number, col: number, char: string) => {
    const unit = getUnit(row, col);
    if (!unit) return;
    const display = char === ' ' ? NBSP : char;
    unit.querySelectorAll(`.${styles.flapChar}`).forEach((el) => {
      el.textContent = display;
    });
    if (!currentCharsRef.current[row]) currentCharsRef.current[row] = new Array(cols).fill(' ');
    currentCharsRef.current[row][col] = char;
  }, [getUnit, cols]);

  // Animate a single flap flip
  const flipOnce = useCallback((row: number, col: number, fromChar: string, toChar: string) => {
    return new Promise<void>((resolve) => {
      const unit = getUnit(row, col);
      if (!unit) { resolve(); return; }

      const fromDisplay = fromChar === ' ' ? NBSP : fromChar;
      const toDisplay = toChar === ' ' ? NBSP : toChar;

      const topEl = unit.querySelector(`.${styles.top}`) as HTMLElement;
      const bottomEl = unit.querySelector(`.${styles.bottom}`) as HTMLElement;
      const flipTopEl = unit.querySelector(`.${styles.flipTop}`) as HTMLElement;
      const flipBottomEl = unit.querySelector(`.${styles.flipBottom}`) as HTMLElement;
      const shadowEl = unit.querySelector(`.${styles.flipShadow}`) as HTMLElement;

      if (!topEl || !bottomEl || !flipTopEl || !flipBottomEl || !shadowEl) { resolve(); return; }

      topEl.querySelector(`.${styles.flapChar}`)!.textContent = fromDisplay;
      bottomEl.querySelector(`.${styles.flapChar}`)!.textContent = fromDisplay;
      flipTopEl.querySelector(`.${styles.flapChar}`)!.textContent = fromDisplay;
      flipBottomEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;
      bottomEl.querySelector(`.${styles.flapChar}`)!.textContent = toDisplay;

      flipTopEl.classList.remove(styles.flipping);
      flipBottomEl.classList.remove(styles.flipping);
      shadowEl.classList.remove(styles.visible);

      void flipTopEl.offsetWidth;
      void flipBottomEl.offsetWidth;
      void shadowEl.offsetWidth;

      flipTopEl.classList.add(styles.flipping);
      flipBottomEl.classList.add(styles.flipping);
      shadowEl.classList.add(styles.visible);

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

        if (!currentCharsRef.current[row]) currentCharsRef.current[row] = new Array(cols).fill(' ');
        currentCharsRef.current[row][col] = toChar;
        resolve();
      }, FLIP_DURATION);
    });
  }, [getUnit, cols]);

  // Animate a column through random chars then land
  const animateCell = useCallback(async (row: number, col: number, targetChar: string) => {
    const current = currentCharsRef.current[row]?.[col] ?? ' ';
    if (current === targetChar) return;

    const numFlips = RAND_FLIPS_MIN + Math.floor(Math.random() * (RAND_FLIPS_MAX - RAND_FLIPS_MIN));

    for (let i = 0; i < numFlips; i++) {
      const intermediateChar = CHARS[Math.floor(Math.random() * CHARS.length)];
      const progress = i / numFlips;
      const interval = FLIP_INTERVAL_START + (FLIP_INTERVAL_END - FLIP_INTERVAL_START) * progress;
      const cur = currentCharsRef.current[row]?.[col] ?? ' ';
      await flipOnce(row, col, cur, intermediateChar);
      await sleep(interval);
    }

    const cur = currentCharsRef.current[row]?.[col] ?? ' ';
    await flipOnce(row, col, cur, targetChar);
  }, [flipOnce]);

  // Transition to a new message (multi-row)
  const transitionTo = useCallback((message: string) => {
    const wrapped = wrapMessage(message, cols, rows);
    const promises: Promise<void>[] = [];

    for (let r = 0; r < rows; r++) {
      const line = wrapped[r];
      for (let c = 0; c < cols; c++) {
        const targetChar = line[c] ?? ' ';
        // Cascade: left to right, top to bottom
        const delay = (r * cols + c) * CASCADE_DELAY;

        const p = new Promise<void>((resolve) => {
          setTimeout(() => {
            animateCell(r, c, targetChar).then(resolve);
          }, delay);
        });
        promises.push(p);
      }
    }

    return Promise.all(promises);
  }, [cols, rows, animateCell]);

  // Main loop
  useEffect(() => {
    if (runningRef.current) return;
    runningRef.current = true;

    // Initialize
    currentCharsRef.current = [];
    for (let r = 0; r < rows; r++) {
      currentCharsRef.current[r] = new Array(cols).fill(' ');
      for (let c = 0; c < cols; c++) {
        setChar(r, c, ' ');
      }
    }

    let cancelled = false;

    async function run() {
      await sleep(800);

      let idx = 0;
      while (!cancelled) {
        const msg = messages[idx % messages.length];
        await transitionTo(msg);
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
  }, [messages, cols, rows, holdTime, setChar, transitionTo]);

  // Build flap units as React elements — multiple rows
  const rowElements = Array.from({ length: rows }, (_, r) => (
    <div key={r} className={styles.boardRow}>
      {Array.from({ length: cols }, (_, c) => (
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
      ))}
    </div>
  ));

  return (
    <div className={styles.boardFrame} ref={boardRef}>
      <div className={`${styles.boardRivet} ${styles.rivetTl}`} />
      <div className={`${styles.boardRivet} ${styles.rivetTr}`} />
      <div className={`${styles.boardRivet} ${styles.rivetBl}`} />
      <div className={`${styles.boardRivet} ${styles.rivetBr}`} />
      {rowElements}
    </div>
  );
}
