"use client";

import { useState, useEffect, useRef } from "react";

export function useCountUp(target: number, duration = 2000, decimals = 0, active = false) {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number>(0);
  useEffect(() => {
    if (!active) return;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setValue(parseFloat((eased * target).toFixed(decimals)));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, duration, decimals]);
  return value;
}

// Animates 0 → target on first reveal; subsequent target updates snap into
// place without re-animating. Honors prefers-reduced-motion by snapping
// immediately to the final value.
export function useRevealCountUp(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  const animatedRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animatedRef.current || prefersReduced) {
      animatedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional snap to final value (reduced-motion / already-animated)
      setValue(target);
      return;
    }
    animatedRef.current = true;
    const start = performance.now();
    let raf = 0;
    function tick(now: number) {
      const elapsed = now - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - (1 - p) * (1 - p);
      setValue(Math.round(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

export function useFlashOnChange<T>(value: T, ms = 600) {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional flash trigger on value change
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return flashing;
}

export function useTypewriter(words: string[], active: boolean, typingSpeed = 80, pauseMs = 2200) {
  // Initial state shows words[0] fully typed. Previously the typewriter
  // started at "" and the user saw a lone blinking cursor floating in a
  // void below the H1 for the first ~80ms + IntersectionObserver delay
  // (often 200-500ms). On mobile that void was ~56px of reserved height
  // and looked like a broken page. Pre-typed initial state means the first
  // paint has real text; the effect's first run sees charIdx === word.length
  // and schedules the pause → delete cycle naturally.
  const [display, setDisplay] = useState(words[0] ?? "");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(words[0]?.length ?? 0);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    if (!active) return;
    const word = words[wordIdx];
    let timeout: ReturnType<typeof setTimeout>;
    if (!isDeleting && charIdx < word.length) {
      timeout = setTimeout(() => setCharIdx((c) => c + 1), typingSpeed);
    } else if (!isDeleting && charIdx === word.length) {
      timeout = setTimeout(() => setIsDeleting(true), pauseMs);
    } else if (isDeleting && charIdx > 0) {
      timeout = setTimeout(() => setCharIdx((c) => c - 1), typingSpeed / 2);
    } else if (isDeleting && charIdx === 0) {
      setIsDeleting(false); // eslint-disable-line react-hooks/set-state-in-effect -- state machine transition
      setWordIdx((i) => (i + 1) % words.length);
    }
    setDisplay(word.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [active, charIdx, isDeleting, wordIdx, words, typingSpeed, pauseMs]);
  return display;
}

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync initial media-query state into React
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

export function useMouseTilt(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!enabled || reduced) return;
    const el = ref.current;
    if (!el) return;
    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: y * -3, y: x * 3 });
    }
    function handleLeave() { setTilt({ x: 0, y: 0 }); }
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => { el.removeEventListener("mousemove", handleMove); el.removeEventListener("mouseleave", handleLeave); };
  }, [enabled, reduced]);
  return { ref, tilt };
}

// Smoothly interpolates between value transitions. Re-targeting mid-tween
// picks up from the current displayed value (held in a ref so the effect
// stays target-driven and we don't infinite-loop on the value dep). Honors
// prefers-reduced-motion by bypassing the tween and returning `target`
// directly — no setState-in-effect required for the reduced path.
export function useTweenedNumber(target: number, durationMs = 700) {
  const [value, setValue] = useState(target);
  const valueRef = useRef(target);
  const rafRef = useRef<number>(0);
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) {
      // Make sure no in-flight animation overrides the snap-to value.
      cancelAnimationFrame(rafRef.current);
      valueRef.current = target;
      return;
    }
    const from = valueRef.current;
    if (from === target) return;
    const start = performance.now();
    cancelAnimationFrame(rafRef.current);
    function tick(now: number) {
      const elapsed = now - start;
      const p = Math.min(elapsed / durationMs, 1);
      // easeOutCubic — fast start, gentle finish
      const eased = 1 - Math.pow(1 - p, 3);
      const next = from + (target - from) * eased;
      valueRef.current = next;
      setValue(next);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, durationMs, reduced]);
  // Reduced-motion users skip the tween entirely; they get the latest target
  // at every render. Keeps the snap synchronous without setState-in-effect.
  return reduced ? target : value;
}

// Live boolean for whether the ref is currently in the viewport. Unlike
// useInView (one-shot, sticks at true), this flips back to false when the
// element scrolls out — used to pause demo playback when off-screen so we
// don't burn CPU and so users returning to the dashboard see a coherent
// state, not whatever frame they happened to land on.
export function useLiveInViewport<T extends Element>(threshold = 0.2) {
  const ref = useRef<T>(null);
  const [present, setPresent] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setPresent(entry.isIntersecting),
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, present };
}

export function useStaggeredReveal(count: number, active: boolean, baseDelay = 0, stagger = 80) {
  const [revealed, setRevealed] = useState<boolean[]>(new Array(count).fill(false));
  useEffect(() => {
    if (!active) return;
    const timers = Array.from({ length: count }, (_, i) =>
      setTimeout(() => setRevealed((prev) => { const next = [...prev]; next[i] = true; return next; }), baseDelay + i * stagger)
    );
    return () => timers.forEach(clearTimeout);
  }, [active, count, baseDelay, stagger]);
  return revealed;
}
