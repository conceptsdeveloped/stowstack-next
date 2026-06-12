/**
 * Motion tokens — single source of truth for every animation on the
 * redesigned homepage. No component defines its own duration, ease, or
 * stagger; everything imports from here so the whole page moves like one
 * hand built it. Tune the page's feel from this file.
 *
 * Rules enforced by the primitives in src/components/motion/:
 *  - transform / opacity / filter only — never layout properties
 *  - scroll reveals fire once
 *  - nothing exceeds 1.2s except ambient loops
 *  - prefers-reduced-motion collapses every primitive to static
 */

type Bezier = [number, number, number, number];

export const EASE: { out: Bezier; inOut: Bezier; exit: Bezier } = {
  /** Primary ease — fast launch, decisive landing. */
  out: [0.22, 1, 0.36, 1],
  /** Crossfades inside the pinned loop scene. */
  inOut: [0.65, 0, 0.35, 1],
  /** Elements leaving (mobile menu close, scene hand-offs). */
  exit: [0.4, 0, 1, 1],
};

export const DUR = {
  fast: 0.3,
  base: 0.55,
  slow: 0.85,
  /** Ceiling. Only the hero lockup and CountUp may use it. */
  max: 1.1,
} as const;

export const STAGGER = {
  tight: 0.06,
  base: 0.09,
  loose: 0.14,
} as const;

/** Shared whileInView viewport config — reveals fire once. */
export const VIEWPORT = { once: true, margin: "-90px" } as const;

/** Standard reveal travel distance (px). */
export const RISE = 16;

/* ── Variant factories ── */

export const fadeRise = (y: number = RISE, dur: number = DUR.base, delay = 0) => ({
  hidden: { opacity: 0, y },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: dur, delay, ease: EASE.out },
  },
});

export const staggerParent = (
  stagger: number = STAGGER.base,
  delayChildren = 0,
) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren } },
});
