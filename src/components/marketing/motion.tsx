"use client";

/* ═══════════════════════════════════════════════════════════════════════════
 * MOTION — site-wide scroll-animation toolkit
 *
 * A small set of reduced-motion-aware primitives that give the marketing site
 * a world-class, editorial sense of motion without fighting the flat NULL//TRACE
 * aesthetic (square corners, no inline gradients, no drop shadows). Everything
 * reuses the existing motion tokens in globals.css (--ease-dramatic, --duration-*)
 * and the reveal CSS lives in globals.css under "SCROLL REVEAL PRIMITIVES".
 *
 *   <Reveal>            scroll-triggered entrance (up / left / right / scale / blur)
 *   <RevealText>        word-by-word blur-rise for headlines — the "text pops" move
 *   <CountUp>           number that counts up when it scrolls into view
 *   <MagneticButton>    primary CTA that leans toward the cursor
 *   useParallax()       scroll-linked translate for decorative elements
 *   usePrefersReducedMotion()
 *
 * Design intent: motion should feel like paper settling — fast in, gentle stop
 * (easeOutExpo). Reveals trigger a little before the element is fully on screen
 * so content is already arriving as you reach it, never popping in late.
 * ═══════════════════════════════════════════════════════════════════════════ */

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type ReactNode,
} from "react";

/* ─── prefers-reduced-motion ───
 * SSR-safe: returns false on the server and the first client render (so the
 * markup matches and React doesn't throw a hydration mismatch), then flips to
 * the real value in an effect. When true, every primitive below renders its
 * final, static state — no transforms, no observers. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Defer the initial read one frame so this isn't a synchronous in-effect
    // setState; keeps the first client render matching the server, then syncs.
    const raf = requestAnimationFrame(() => setReduced(mq.matches));
    mq.addEventListener("change", onChange);
    return () => {
      cancelAnimationFrame(raf);
      mq.removeEventListener("change", onChange);
    };
  }, []);
  return reduced;
}

/* ─── useInViewOnce ───
 * One-shot reveal trigger. `rootMargin` pulls the trigger line up from the bottom
 * of the viewport so reveals start as the element enters, not after.
 *
 * Robustness (content must never stay hidden):
 *  - If IntersectionObserver is unavailable, reveal immediately.
 *  - If the element is already on screen at mount (above the fold, or a refresh
 *    landing mid-page), reveal on the next frames rather than waiting on IO's
 *    initial callback, which some embedded browsers fire unreliably. The double
 *    rAF lets the hidden state paint once so the entrance still animates. */
function useInViewOnce<T extends HTMLElement>(
  rootMargin = "0px 0px -12% 0px",
  amount = 0,
) {
  const ref = useRef<T>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          obs.disconnect();
        }
      },
      { rootMargin, threshold: amount },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [rootMargin, amount]);
  return { ref, shown };
}

type RevealVariant = "up" | "down" | "left" | "right" | "scale" | "blur" | "fade";

/* ─── Reveal ───
 * Wrap any block of content. It starts hidden (per the CSS in globals.css keyed
 * on [data-reveal]) and animates in when it scrolls into view. */
export function Reveal({
  children,
  as = "div",
  variant = "up",
  delay = 0,
  rootMargin,
  amount,
  className,
  style,
  id,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  as?: ElementType;
  variant?: RevealVariant;
  /** stagger offset in ms */
  delay?: number;
  rootMargin?: string;
  amount?: number;
  className?: string;
  style?: CSSProperties;
  id?: string;
  "aria-label"?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, shown } = useInViewOnce<HTMLElement>(rootMargin, amount);
  const Tag = as as ElementType;

  if (reduced) {
    return (
      <Tag className={className} style={style} id={id} aria-label={ariaLabel}>
        {children}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      id={id}
      aria-label={ariaLabel}
      className={className}
      data-reveal={variant}
      data-shown={shown ? "" : undefined}
      style={{ ["--reveal-delay" as string]: `${delay}ms`, ...style } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* ─── RevealText ───
 * Splits a headline into words and blur-rises each one with a stagger when it
 * scrolls into view. This is the "make the text pop" primitive — drop it inside
 * an existing heading and keep the heading's own classes/size.
 *
 * Accessibility: the container carries an aria-label with the full string and the
 * word spans are aria-hidden, so screen readers read the sentence once, cleanly. */
export function RevealText({
  children,
  className,
  style,
  step = 42,
  start = 0,
  rootMargin = "0px 0px -10% 0px",
}: {
  children: string;
  className?: string;
  style?: CSSProperties;
  /** ms between each word */
  step?: number;
  /** initial delay before the first word, ms */
  start?: number;
  rootMargin?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, shown } = useInViewOnce<HTMLSpanElement>(rootMargin);

  if (reduced) {
    return (
      <span className={className} style={style}>
        {children}
      </span>
    );
  }

  const words = children.split(" ");
  return (
    <span
      ref={ref}
      className={`reveal-text ${className ?? ""}`}
      data-shown={shown ? "" : undefined}
      style={style}
      aria-label={children}
    >
      {words.map((word, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="rt-word"
          style={{ ["--rt-delay" as string]: `${start + i * step}ms` } as CSSProperties}
        >
          {word}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

/* ─── CountUp ───
 * Eased 0 → value count when scrolled into view. Honors reduced motion by
 * snapping to the final value. Tabular numerals come from .urbit-landing. */
export function CountUp({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  duration = 1600,
  className,
  style,
}: {
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const reduced = usePrefersReducedMotion();
  const { ref, shown } = useInViewOnce<HTMLSpanElement>("0px 0px -8% 0px");
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!shown) return;
    if (reduced) {
      const raf = requestAnimationFrame(() => setDisplay(value));
      return () => cancelAnimationFrame(raf);
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(eased * value);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [shown, reduced, value, duration]);

  return (
    <span ref={ref} className={className} style={style}>
      {prefix}
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ─── useParallax ───
 * Returns a ref; while the element is near the viewport its content is nudged
 * vertically as you scroll, at `speed` × scroll distance. Negative speed moves
 * against the scroll (classic depth). Decorative only — no-op under reduced
 * motion or on coarse pointers (saves battery on the iPhone-heavy audience). */
export function useParallax<T extends HTMLElement>(speed = -0.12) {
  const ref = useRef<T>(null);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      const elementCenter = rect.top + rect.height / 2;
      const offset = (elementCenter - viewportCenter) * speed;
      el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => window.removeEventListener("scroll", onScroll);
  }, [speed, reduced]);
  return ref;
}

/* ─── MagneticButton ───
 * Renders a link/button that leans toward the cursor while hovered, then springs
 * back on leave. Buttons are exempt from the flat-aesthetic resets, so this is a
 * sanctioned place for a little life. No-op under reduced motion / coarse pointer. */
export function MagneticButton({
  children,
  href,
  className,
  style,
  strength = 0.4,
  target,
  rel,
  onClick,
  "aria-label": ariaLabel,
}: {
  children: ReactNode;
  href?: string;
  className?: string;
  style?: CSSProperties;
  /** 0–1, how far it follows the cursor */
  strength?: number;
  target?: string;
  rel?: string;
  onClick?: () => void;
  "aria-label"?: string;
}) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (reduced) return;
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - (rect.left + rect.width / 2);
      const y = e.clientY - (rect.top + rect.height / 2);
      // Clamp the pull so the button can't drift far enough to collide with a
      // neighboring CTA — premium magnetism is a few pixels, not a lurch.
      const max = 10;
      const tx = Math.max(-max, Math.min(max, x * strength));
      const ty = Math.max(-max, Math.min(max, y * strength));
      el.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
    };
    const onLeave = () => {
      el.style.transform = "translate(0, 0)";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced, strength]);

  return (
    <a
      ref={ref}
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      aria-label={ariaLabel}
      className={className}
      style={{ transition: "transform 0.45s var(--ease-dramatic)", ...style }}
    >
      {children}
    </a>
  );
}
