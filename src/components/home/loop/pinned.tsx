"use client";

import { useEffect, useRef } from "react";
import { m, useMotionValue, useTransform, type MotionValue } from "framer-motion";
import { LOOP_STAGES, DEMO, microLabel } from "./data";
import AdCard, { DoorsIllustration } from "./ad-card";
import { ReservePanel } from "./page-frame";
import LedgerFinale from "./ledger-finale";

/**
 * The pinned scroll scene (lg+, motion allowed). One canvas, four
 * stages, ~3.4 viewport-heights of scroll:
 *
 *   p 0.00–0.24  the ad runs (standalone card)
 *   p 0.20–0.30  hand-off: the page assembles around the ad's content
 *   p 0.30–0.52  the ad-matched landing page
 *   p 0.52–0.66  the page scrolls to the embedded storEDGE reserve flow
 *   p 0.66–0.80  hand-off: spend connects to the move-in
 *   p 0.80–1.00  the ledger finale (facility grid + cost per move-in)
 *
 * Transform/opacity only. Scroll stays native — the section is simply
 * taller than the viewport and the stage is position:sticky. Centering
 * lives on static wrapper divs so animated y/scale never collide with
 * the centering transform.
 */

/**
 * Scroll progress through the tall wrapper, measured fresh from
 * getBoundingClientRect on every scroll frame. (framer's useScroll
 * caches target offsets, which go stale here: the dynamically imported
 * sections above this one change the wrapper's document position after
 * mount.)
 */
function useStickyProgress(ref: React.RefObject<HTMLDivElement | null>): MotionValue<number> {
  const p = useMotionValue(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      p.set(total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0);
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, p]);
  return p;
}

/** Static absolute-centering shell for each canvas artifact. */
function Centered({
  width,
  children,
}: {
  width: number | string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width,
      }}
    >
      {children}
    </div>
  );
}

export default function LoopPinned() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const p = useStickyProgress(wrapperRef);

  /* Stage 1 — standalone ad (present from frame zero) */
  const adOpacity = useTransform(p, [0.2, 0.28], [1, 0]);
  const adScale = useTransform(p, [0.2, 0.28], [1, 0.84]);
  const adY = useTransform(p, [0.2, 0.28], ["0%", "-14%"]);

  /* Stage 2/3 — page frame */
  const frameOpacity = useTransform(p, [0.22, 0.3, 0.72, 0.8], [0, 1, 1, 0]);
  const frameScale = useTransform(p, [0.22, 0.32, 0.72, 0.8], [0.95, 1, 1, 0.93]);
  const pageY = useTransform(p, [0.52, 0.64], ["0%", "-56%"]);
  const inheritTag = useTransform(p, [0.3, 0.34, 0.5, 0.54], [0, 1, 1, 0.4]);

  /* Stage 4 — ledger finale */
  const finaleOpacity = useTransform(p, [0.76, 0.84], [0, 1]);
  const finaleY = useTransform(p, [0.76, 0.86], [28, 0]);

  /* Pipeline chips light per stage */
  const chip0 = useTransform(p, [0, 0.01, 0.28, 0.3], [0.35, 1, 1, 0.35]);
  const chip1 = useTransform(p, [0.28, 0.3, 0.5, 0.52], [0.35, 1, 1, 0.35]);
  const chip2 = useTransform(p, [0.5, 0.52, 0.64, 0.66], [0.35, 1, 1, 0.35]);
  const chip3 = useTransform(p, [0.64, 0.66], [0.35, 1]);
  const chips = [chip0, chip1, chip2, chip3];

  /* Rail item emphasis */
  const rail0 = useTransform(p, [0, 0.001, 0.28, 0.33], [1, 1, 1, 0.32]);
  const rail1 = useTransform(p, [0.25, 0.3, 0.5, 0.55], [0.32, 1, 1, 0.32]);
  const rail2 = useTransform(p, [0.47, 0.52, 0.64, 0.69], [0.32, 1, 1, 0.32]);
  const rail3 = useTransform(p, [0.61, 0.66], [0.32, 1]);
  const rails = [rail0, rail1, rail2, rail3];

  return (
    <div ref={wrapperRef} style={{ height: "440vh" }} className="hidden lg:block">
      <div className="home-pin">
        <div
          className="max-w-[1380px] mx-auto px-10 h-full flex flex-col"
          style={{ paddingTop: "calc(var(--nav-height) + 20px)", paddingBottom: 24 }}
        >
          {/* Pipeline strip */}
          <div
            className="flex items-center gap-0"
            style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}
          >
            {LOOP_STAGES.map((s, i) => (
              <m.div
                key={s.pipeline}
                className="flex items-baseline gap-2 flex-1"
                style={{
                  opacity: chips[i],
                  padding: "9px 14px",
                  borderRight: i < 3 ? "1px solid var(--line-dim)" : undefined,
                }}
              >
                <span style={{ ...microLabel, color: "var(--accent)" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  style={{
                    fontFamily: "var(--serif)",
                    fontWeight: 800,
                    fontSize: 14,
                    letterSpacing: "-0.02em",
                    color: "var(--text-accent)",
                  }}
                >
                  {s.pipeline}
                </span>
                <span className="hidden xl:inline" style={{ ...microLabel, color: "var(--text-faint)" }}>
                  {s.pipelineSub}
                </span>
                {i < 3 && (
                  <span aria-hidden="true" style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 11 }}>
                    →
                  </span>
                )}
              </m.div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-12 gap-10 items-center min-h-0">
            {/* Left rail */}
            <div className="col-span-4 flex gap-5">
              <div style={{ position: "relative", width: 1, background: "var(--line-dim)" }} aria-hidden="true">
                <m.div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "var(--accent)",
                    transformOrigin: "top",
                    scaleY: p,
                  }}
                />
              </div>
              <div className="flex flex-col gap-7">
                {LOOP_STAGES.map((s, i) => (
                  <m.div key={s.title} style={{ opacity: rails[i] }}>
                    <p style={{ ...microLabel, color: "var(--accent)", marginBottom: 6 }}>
                      Step {String(i + 1).padStart(2, "0")} · {s.pipeline}
                    </p>
                    <h3 style={{ fontSize: 19, marginBottom: 6 }}>{s.title}</h3>
                    <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--text-dim)", maxWidth: 360 }}>
                      {s.body}
                    </p>
                  </m.div>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div className="col-span-8 relative" style={{ height: "min(64vh, 620px)" }}>
              {/* Stage 1 — the ad */}
              <Centered width={330}>
                <m.div style={{ opacity: adOpacity, scale: adScale, y: adY }}>
                  <AdCard />
                </m.div>
              </Centered>

              {/* Stage 2/3 — the page */}
              <Centered width="min(560px, 92%)">
                <m.div style={{ opacity: frameOpacity, scale: frameScale }}>
                  <div style={{ background: "var(--bg-alt)", border: "1px solid var(--line-hi)" }}>
                    {/* Browser chrome */}
                    <div className="flex items-center gap-2" style={{ padding: "7px 10px", borderBottom: "1px solid var(--line)" }}>
                      <span aria-hidden="true" className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span key={i} style={{ width: 7, height: 7, border: "1px solid var(--line-hi)" }} />
                        ))}
                      </span>
                      <span
                        className="flex-1 min-w-0"
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 10,
                          color: "var(--text-dim)",
                          border: "1px solid var(--line-dim)",
                          background: "var(--bg)",
                          padding: "3px 8px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {DEMO.url}
                      </span>
                    </div>
                    {/* Scrolling page viewport */}
                    <div style={{ height: 360, overflow: "hidden" }}>
                      <m.div style={{ y: pageY, willChange: "transform" }}>
                        <div style={{ padding: 12 }}>
                          <m.p style={{ ...microLabel, color: "var(--accent)", marginBottom: 8, opacity: inheritTag }}>
                            Built from the ad
                          </m.p>
                          {/* The page hero inherits the ad's content */}
                          <div style={{ border: "1px solid var(--line-hi)", background: "var(--bg)" }}>
                            <div style={{ position: "relative" }}>
                              <DoorsIllustration height={120} />
                              <span style={{ ...microLabel, position: "absolute", left: 8, bottom: 8, background: "var(--text)", color: "var(--bg)", padding: "2px 6px" }}>
                                {DEMO.campaign}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-3" style={{ padding: "12px" }}>
                              <div>
                                <p style={{ fontSize: 18, fontWeight: 800, color: "var(--text-accent)", letterSpacing: "-0.02em" }}>
                                  {DEMO.creative}
                                </p>
                                <p style={{ fontSize: 11, color: "var(--text-dim)" }}>{DEMO.facility}</p>
                              </div>
                              <span style={{ ...microLabel, border: "1px solid var(--text)", color: "var(--text)", padding: "6px 10px", whiteSpace: "nowrap" }}>
                                Reserve
                              </span>
                            </div>
                          </div>
                        </div>
                        <div style={{ padding: "0 12px 12px" }}>
                          <ReservePanel active />
                          <div className="grid grid-cols-3 gap-2" style={{ marginTop: 8 }} aria-hidden="true">
                            {[0, 1, 2].map((i) => (
                              <div key={i} style={{ height: 30, background: "var(--ink-a06)" }} />
                            ))}
                          </div>
                        </div>
                      </m.div>
                    </div>
                  </div>
                </m.div>
              </Centered>

              {/* Stage 4 — the finale */}
              <Centered width="min(560px, 92%)">
                <m.div style={{ opacity: finaleOpacity, y: finaleY }}>
                  <p style={{ ...microLabel, color: "var(--accent)", marginBottom: 10 }}>
                    The loop closes
                  </p>
                  <LedgerFinale />
                </m.div>
              </Centered>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
