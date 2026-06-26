"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Bell,
  LayoutDashboard,
  Megaphone,
  FileText,
  BarChart3,
  Settings,
  Play,
  Pause,
  RotateCw,
  ArrowUpRight,
  Target,
  Zap,
} from "lucide-react";
import {
  useMouseTilt,
  useLiveInViewport,
  useReducedMotion,
  useTweenedNumber,
} from "./hooks";
import {
  HERO_DEMO_MONTHS,
  HERO_DEMO_LAST_INDEX,
  HERO_DEMO_AUTOSTART_DELAY_MS,
  HERO_DEMO_TICK_MS,
  DASHBOARD_ROWS,
  CHANNEL_DOT,
  SPARKLINE_PATH,
} from "./content";
import { DemoPreviewStrip } from "./demo-preview-strip";

export function DashboardMockup({ isVisible }: { isVisible: boolean }) {
  const { ref: tiltRef, tilt } = useMouseTilt(isVisible);
  // Live in-viewport signal — used to pause auto-play when the hero
  // scrolls off-screen so we don't burn CPU running a setInterval no one
  // can see, and users returning to the page get a fresh start.
  const { ref: presenceRef, present } = useLiveInViewport<HTMLDivElement>(0.2);

  // Interactive 6-month playback. Mirrors the /demo page's scrubber so the
  // hero proves the product is real — you can press play and watch the
  // metrics compound in front of you.
  //
  // Initial state is the FINAL month: SSR / no-JS / reduced-motion users see
  // the best numbers up front, the same way a typical SaaS hero shows its
  // strongest metric. Auto-play rewinds to month 0 and walks forward.
  const [activeMonth, setActiveMonth] = useState(HERO_DEMO_LAST_INDEX);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const reduced = useReducedMotion();

  // Auto-start playback the first time the hero becomes visible. Skip if
  // the user has touched the controls (don't fight them) or prefers
  // reduced motion (let them scrub manually instead).
  useEffect(() => {
    if (!isVisible || reduced || hasUserInteracted) return;
    const start = setTimeout(() => {
      setActiveMonth(0);
      setIsPlaying(true);
    }, HERO_DEMO_AUTOSTART_DELAY_MS);
    return () => clearTimeout(start);
  }, [isVisible, reduced, hasUserInteracted]);

  // Effective playback gate — combines user intent (isPlaying) with
  // courtesy pauses (hover, off-screen). Keeps state minimal and avoids
  // an explosion of "if isPlaying && !isHovered && present" checks.
  const shouldPlay = isPlaying && !isHovered && present;

  useEffect(() => {
    if (!shouldPlay) return;
    const tick = setInterval(() => {
      setActiveMonth((prev) => {
        if (prev >= HERO_DEMO_LAST_INDEX) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, HERO_DEMO_TICK_MS);
    return () => clearInterval(tick);
  }, [shouldPlay]);

  const current = HERO_DEMO_MONTHS[activeMonth];
  const cumulative = HERO_DEMO_MONTHS.slice(0, activeMonth + 1);
  const totalSpend = cumulative.reduce((s, m) => s + m.spend, 0);
  const totalMoveIns = cumulative.reduce((s, m) => s + m.moveIns, 0);
  const avgCpm = current.cpm;
  const isAtEnd = activeMonth >= HERO_DEMO_LAST_INDEX;

  // Tweened display values — animate smoothly between months so the
  // dashboard reads as a live system, not a snapping mock.
  const tSpend = useTweenedNumber(totalSpend);
  const tMoveIns = useTweenedNumber(totalMoveIns);
  const tCpm = useTweenedNumber(avgCpm);
  const tCpmDelta = useTweenedNumber(
    activeMonth > 0 ? HERO_DEMO_MONTHS[0].cpm - avgCpm : 0,
  );

  function handleTogglePlay() {
    setHasUserInteracted(true);
    if (isAtEnd && !isPlaying) {
      setActiveMonth(0);
      setIsPlaying(true);
      return;
    }
    setIsPlaying((p) => !p);
  }

  function handleScrubTo(i: number) {
    setHasUserInteracted(true);
    setIsPlaying(false);
    setActiveMonth(i);
  }

  // Keyboard scrubbing — ← / → step months, Home / End jump to bounds,
  // Space / Enter toggle play. Wired on the scrubber container so it only
  // captures when the user has focused that region.
  function handleKey(e: React.KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        handleScrubTo(Math.max(0, activeMonth - 1));
        break;
      case "ArrowRight":
        e.preventDefault();
        handleScrubTo(Math.min(HERO_DEMO_LAST_INDEX, activeMonth + 1));
        break;
      case "Home":
        e.preventDefault();
        handleScrubTo(0);
        break;
      case "End":
        e.preventDefault();
        handleScrubTo(HERO_DEMO_LAST_INDEX);
        break;
      case " ":
      case "Enter":
        // Only intercept when focus is on the scrubber row itself, not
        // a button child (buttons already handle Space/Enter natively).
        if (e.target === e.currentTarget) {
          e.preventDefault();
          handleTogglePlay();
        }
        break;
    }
  }

  return (
    <div
      ref={presenceRef}
      className="relative w-full transition-all duration-[400ms]"
      style={{
        transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(4px)",
      }}
      role="region"
      aria-label="Interactive 6-month campaign demo for a sample storage facility"
    >
      {/* Neutral glow — replaces the old gold halo */}
      <div
        className="absolute -inset-6 rounded-3xl pointer-events-none hidden lg:block"
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(20,20,19,0.05), transparent 65%)",
          filter: "blur(30px)",
        }}
        aria-hidden="true"
      />

      <div ref={tiltRef} style={{ perspective: "1400px" }}>
        <div
          className="w-full rounded-2xl overflow-hidden border bg-[var(--color-light)] transition-transform duration-300"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{
            borderColor: "rgba(0,0,0,0.08)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.04)",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          <div className="flex">
            {/* Sidebar */}
            <div
              className="hidden sm:flex flex-col items-center py-4 gap-2 flex-shrink-0"
              style={{ width: "52px", background: "var(--color-dark)" }}
              aria-hidden="true"
            >
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center mb-2"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
              >
                <span className="text-[10px] font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)", color: "var(--color-light)" }}>SA</span>
              </div>
              {[LayoutDashboard, Megaphone, FileText, BarChart3, Settings].map((SideIcon, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: i === 0 ? "rgba(255,255,255,0.1)" : "transparent",
                    border: i === 0 ? "1px solid rgba(255,255,255,0.14)" : "1px solid transparent",
                  }}
                >
                  <SideIcon size={14} style={{ color: i === 0 ? "var(--color-light)" : "rgba(255,255,255,0.35)" }} />
                </div>
              ))}
              <div className="flex-1" />
              <div className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
            </div>

            {/* Content column */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* Top bar */}
              <div
                className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b"
                style={{ borderColor: "var(--border-subtle)", background: "rgba(250,249,245,0.6)" }}
              >
                <div className="h-7 w-36 sm:w-48 rounded-md flex items-center gap-2 px-2.5" style={{ background: "var(--border-subtle)" }}>
                  <Search size={11} style={{ color: "var(--text-tertiary)" }} />
                  <span className="text-[10px] hidden sm:inline" style={{ color: "var(--text-tertiary)" }}>Search campaigns…</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--border-subtle)" }}>
                      <Bell size={11} style={{ color: "var(--text-tertiary)" }} />
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full" style={{ background: "var(--color-green)" }} />
                  </div>
                  <div className="w-6 h-6 rounded-full" style={{ background: "var(--color-light-gray)", border: "1px solid var(--border-subtle)" }} />
                </div>
              </div>

              {/* Header */}
              <div className="flex items-end justify-between px-4 sm:px-5 pt-4 sm:pt-5 pb-2">
                <div>
                  <h3
                    className="text-[13px] sm:text-sm font-semibold"
                    style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}
                  >
                    Campaign performance
                  </h3>
                  <p className="text-[10px] sm:text-[11px] mt-0.5 tabular-nums" style={{ color: "var(--text-tertiary)" }}>
                    {current.label} · Month {activeMonth + 1} of {HERO_DEMO_MONTHS.length}
                  </p>
                </div>
                {/* Sparkline — progressively draws as months play. The
                    path's total length is ~140; we mask it with a dash
                    offset proportional to (1 - activeMonth/last) so each
                    tick extends the line a bit further. */}
                <div className="flex items-center gap-2">
                  <span className="text-[9px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>
                    Cost / move-in
                  </span>
                  <svg width="96" height="22" viewBox="0 0 96 22" fill="none" aria-hidden="true">
                    <path
                      d={SPARKLINE_PATH}
                      stroke="var(--color-green)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      fill="none"
                      style={{
                        strokeDasharray: 140,
                        strokeDashoffset: isVisible
                          ? 140 -
                            140 *
                              ((activeMonth + 1) / HERO_DEMO_MONTHS.length)
                          : 140,
                        transition:
                          "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)",
                      }}
                    />
                  </svg>
                </div>
              </div>

              {/* Interactive playback — scrubber + play/restart toggle.
                  Lives between the header and the stat strip so it reads
                  as a chrome control, not chart data.

                  Keyboard: focus the row and use ← / → to scrub, Home /
                  End to jump to bounds, Space / Enter to toggle play. */}
              <div
                className="px-4 sm:px-5 mt-1 mb-2 flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-light)] rounded-md"
                tabIndex={0}
                role="group"
                aria-label="Campaign month scrubber. Use arrow keys to navigate, space to play."
                onKeyDown={handleKey}
              >
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-light)]"
                  style={{
                    background: "var(--color-dark)",
                    color: "var(--color-light)",
                  }}
                  aria-label={
                    isPlaying
                      ? "Pause campaign playback"
                      : isAtEnd
                      ? "Replay campaign from month 1"
                      : "Play campaign from current month"
                  }
                  aria-pressed={isPlaying}
                >
                  {isPlaying ? (
                    <Pause size={11} />
                  ) : isAtEnd ? (
                    <RotateCw size={11} />
                  ) : (
                    <Play size={11} className="ml-px" />
                  )}
                </button>
                <div
                  className="flex-1 flex items-center gap-1"
                  role="presentation"
                >
                  {HERO_DEMO_MONTHS.map((m, i) => {
                    const isActive = i === activeMonth;
                    const isReached = i <= activeMonth;
                    return (
                      <button
                        key={m.label}
                        type="button"
                        onClick={() => handleScrubTo(i)}
                        className="flex-1 h-1.5 rounded-full transition-all cursor-pointer hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-light)]"
                        style={{
                          background: isReached
                            ? "var(--color-dark)"
                            : "var(--border-subtle)",
                          transform: isActive ? "scaleY(1.5)" : "scaleY(1)",
                        }}
                        aria-label={`Jump to ${m.label}`}
                        aria-current={isActive ? "true" : undefined}
                        title={m.label}
                      />
                    );
                  })}
                </div>
                <span
                  className="text-[10px] font-semibold tabular-nums flex-shrink-0 hidden sm:inline"
                  style={{
                    color: shouldPlay ? "var(--color-dark)" : "var(--text-tertiary)",
                    fontFamily: "var(--font-heading)",
                    letterSpacing: "0.04em",
                  }}
                  aria-hidden="true"
                >
                  {shouldPlay ? (
                    <span className="inline-flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: "var(--color-green)",
                          animation: "hero-live-dot 1.2s ease-in-out infinite",
                        }}
                      />
                      LIVE
                    </span>
                  ) : isPlaying && (isHovered || !present) ? (
                    "PAUSED"
                  ) : (
                    current.short.toUpperCase()
                  )}
                </span>
              </div>

              {/* Stat strip — values drive off the active month and animate
                  smoothly between them via useTweenedNumber so the whole
                  panel reads as a live system, not a static mock.

                  aria-live="polite" lets screen reader users hear updates
                  without interrupting their flow. Numbers are rounded for
                  display because mid-tween fractional dollars would be
                  noisy ("$1,847.32 → $1,847.65"). */}
              <div
                className="grid grid-cols-3 gap-2 px-4 sm:px-5 mt-2"
                role="group"
                aria-label={`Campaign totals through ${current.label}`}
                aria-live="polite"
                aria-atomic="false"
              >
                {[
                  {
                    label: "Total spend",
                    value: `$${Math.round(tSpend).toLocaleString()}`,
                    delta: `Through ${current.short}`,
                    deltaColor: "var(--text-tertiary)",
                  },
                  {
                    label: "Move-ins",
                    value: `${Math.round(tMoveIns)}`,
                    delta: `+${current.moveIns} this month`,
                    deltaColor: "var(--color-green)",
                  },
                  {
                    label: "Avg cost / move-in",
                    value: `$${Math.round(tCpm)}`,
                    delta:
                      activeMonth > 0
                        ? `−$${Math.round(tCpmDelta)} vs Oct`
                        : "Starting point",
                    deltaColor:
                      activeMonth > 0
                        ? "var(--color-green)"
                        : "var(--text-tertiary)",
                  },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-2.5 sm:p-3 border"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: "var(--color-light)",
                      transition:
                        "opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
                      transitionDelay: `${200 + i * 80}ms`,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? "translateY(0)" : "translateY(6px)",
                    }}
                  >
                    <div
                      className="text-[9px] sm:text-[10px] uppercase tracking-wide"
                      style={{
                        color: "var(--text-tertiary)",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {s.label}
                    </div>
                    {/* key={activeMonth} forces a remount each tick, which
                        re-triggers the hero-value-flash animation — a tiny
                        "value just updated" pulse without manual timers. */}
                    <div
                      key={`${s.label}-${activeMonth}`}
                      className="text-base sm:text-lg font-semibold mt-1 tabular-nums"
                      style={{
                        color: "var(--color-dark)",
                        fontFamily: "var(--font-heading)",
                        lineHeight: 1,
                        animation: reduced
                          ? undefined
                          : "hero-value-flash 700ms ease-out",
                      }}
                    >
                      {s.value}
                    </div>
                    {s.delta && (
                      <div
                        className="text-[9px] sm:text-[10px] mt-1 font-medium"
                        style={{ color: s.deltaColor }}
                      >
                        {s.delta}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="px-4 sm:px-5 pt-4 pb-4 sm:pb-5 flex-1 min-w-0">
                <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border-subtle)" }}>
                  <table className="w-full text-left" style={{ borderCollapse: "collapse" }}>
                    <caption className="sr-only">
                      Campaign performance for {current.label}, month{" "}
                      {activeMonth + 1} of {HERO_DEMO_MONTHS.length}
                    </caption>
                    <thead>
                      <tr style={{ background: "var(--color-light-gray)" }}>
                        {["Campaign", "Spend", "Clicks", "Res.", "Move-ins", "Cost / MI"].map((h, i) => (
                          <th
                            key={h}
                            scope="col"
                            className={`text-[9px] sm:text-[10px] uppercase tracking-wide px-2.5 sm:px-3 py-2 font-semibold ${i > 0 ? "text-right tabular-nums" : ""} ${i > 2 ? "hidden sm:table-cell" : ""}`}
                            style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {DASHBOARD_ROWS.map((row, i) => {
                        // DASHBOARD_ROWS represent the final-month state.
                        // Scale volume by rowScale and CPM inversely by the
                        // ratio of current vs. final-month CPM so earlier
                        // months show higher CPMs and lower volume.
                        const scale = current.rowScale;
                        const cpmMul =
                          current.cpm /
                          HERO_DEMO_MONTHS[HERO_DEMO_MONTHS.length - 1].cpm;
                        const dynSpend = Math.round(row.spend * scale);
                        const dynClicks = Math.round(row.clicks * scale);
                        const dynRes = Math.max(
                          1,
                          Math.round(row.reservations * scale),
                        );
                        const dynMoveIns = Math.max(
                          1,
                          Math.round(row.moveIns * scale),
                        );
                        const dynCpm = Math.round(row.cpm * cpmMul);
                        // No prior month → no trend; otherwise inherit the
                        // baked-in improving story.
                        const dynTrend = activeMonth === 0 ? "flat" : row.trend;
                        return (
                          <tr
                            key={row.campaign}
                            style={{
                              borderTop: "1px solid var(--border-subtle)",
                              transition:
                                "opacity 500ms ease-out, transform 500ms ease-out",
                              transitionDelay: `${450 + i * 70}ms`,
                              opacity: isVisible ? 1 : 0,
                              transform: isVisible
                                ? "translateY(0)"
                                : "translateY(4px)",
                            }}
                          >
                            <td
                              className="px-2.5 sm:px-3 py-2 text-[10px] sm:text-[11px]"
                              style={{ color: "var(--color-dark)" }}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                  style={{
                                    background:
                                      CHANNEL_DOT[row.channel] ||
                                      "var(--color-dark)",
                                  }}
                                  aria-label={`${row.channel} channel`}
                                />
                                <span className="font-medium truncate">
                                  {row.campaign}
                                </span>
                              </div>
                            </td>
                            <td
                              className="px-2.5 sm:px-3 py-2 text-right text-[10px] sm:text-[11px] tabular-nums transition-colors duration-500"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              ${dynSpend.toLocaleString()}
                            </td>
                            <td
                              className="px-2.5 sm:px-3 py-2 text-right text-[10px] sm:text-[11px] tabular-nums transition-colors duration-500"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {dynClicks}
                            </td>
                            <td
                              className="hidden sm:table-cell px-3 py-2 text-right text-[11px] tabular-nums transition-colors duration-500"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {dynRes}
                            </td>
                            <td
                              className="hidden sm:table-cell px-3 py-2 text-right text-[11px] tabular-nums font-medium transition-colors duration-500"
                              style={{ color: "var(--color-dark)" }}
                            >
                              {dynMoveIns}
                            </td>
                            <td
                              className="hidden sm:table-cell px-3 py-2 text-right text-[11px] tabular-nums"
                              style={{ color: "var(--color-dark)" }}
                            >
                              <span className="inline-flex items-center gap-1">
                                <span className="font-semibold">${dynCpm}</span>
                                {dynTrend === "down" && (
                                  <svg
                                    width="9"
                                    height="9"
                                    viewBox="0 0 8 8"
                                    aria-label="trending down"
                                  >
                                    <path
                                      d="M4 1V7M4 7L1.5 4.5M4 7L6.5 4.5"
                                      stroke="var(--color-green)"
                                      strokeWidth="1.3"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      fill="none"
                                    />
                                  </svg>
                                )}
                                {dynTrend === "flat" && (
                                  <span
                                    className="w-2 h-px"
                                    style={{ background: "var(--text-tertiary)" }}
                                    aria-label="flat"
                                  />
                                )}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module preview strip — three small live tiles that hint at the
          breadth of the full /demo page beyond the campaign table above.
          Each tile is driven by the same activeMonth playback state, so
          they all move in lockstep with the main dashboard. Desktop-only
          (the mobile proof panel handles the same job on small viewports).

          Each tile is a Link to /demo so a click on any module takes the
          curious user into the real thing. */}
      <DemoPreviewStrip
        activeMonth={activeMonth}
        cumulative={cumulative}
        current={current}
      />

      {/* Demo footer — small caption that turns the playback into a
          path to the full /demo page. Auto-play proves the dashboard is
          real; this link lets the curious go deeper. Left caption tells
          the user the dashboard is interactive; right link draws the eye
          (subtle accent pulse) once playback completes. */}
      <div className="mt-3 flex items-center justify-center gap-3 text-[11px]">
        <span
          className="inline-flex items-center gap-1.5"
          style={{
            color: "var(--text-tertiary)",
            fontFamily: "var(--font-heading)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{
              background: shouldPlay
                ? "var(--color-green)"
                : "var(--border-medium)",
              animation: shouldPlay
                ? "hero-live-dot 1.2s ease-in-out infinite"
                : undefined,
            }}
            aria-hidden="true"
          />
          {shouldPlay
            ? "Playing · hover to pause"
            : isAtEnd
            ? "Demo complete · see the full version"
            : reduced
            ? "Interactive · use the scrubber"
            : "Interactive · press play"}
        </span>
        <span style={{ color: "var(--border-medium)" }} aria-hidden="true">
          ·
        </span>
        <Link
          href="/demo"
          className="inline-flex items-center gap-1 font-semibold rounded-md px-1.5 py-0.5 transition-all hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-dark)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-light)]"
          style={{
            color: "var(--color-dark)",
            fontFamily: "var(--font-heading)",
            // Pulse only when playback has truly stopped at the end —
            // not during the final tick when isPlaying is still true.
            background:
              isAtEnd && !isPlaying && !reduced
                ? "var(--accent-glow)"
                : undefined,
            animation:
              isAtEnd && !isPlaying && !reduced
                ? "hero-cta-pulse 2.4s ease-in-out infinite"
                : undefined,
          }}
        >
          Open the full demo
          <ArrowUpRight size={11} />
        </Link>
      </div>

      {/* Floating channel pills — desktop only. Recolored to charcoal /
          blue / green / neutral purple. No gold anywhere. */}
      {[
        { label: "Meta Ads", icon: Megaphone, pos: { top: "-22px", right: "32px" }, bg: "rgba(106,155,204,0.08)", border: "rgba(106,155,204,0.25)", color: "#5a8bb8", anim: "hero-float-a", dur: "4s", ad: "0s", td: "650ms" },
        { label: "Landing Pages", icon: FileText, pos: { top: "-28px", left: "150px" }, bg: "rgba(20,20,19,0.05)", border: "rgba(20,20,19,0.18)", color: "var(--color-dark)", anim: "hero-float-b", dur: "3.5s", ad: "1s", td: "780ms" },
        { label: "Move-ins", icon: Target, pos: { bottom: "-20px", right: "110px" }, bg: "rgba(120,140,93,0.08)", border: "rgba(120,140,93,0.25)", color: "#6a7d50", anim: "hero-float-a", dur: "3.8s", ad: "1.8s", td: "910ms" },
        { label: "storEDGE", icon: Zap, pos: { bottom: "-26px", left: "64px" }, bg: "rgba(140,120,180,0.06)", border: "rgba(140,120,180,0.25)", color: "#8a70b0", anim: "hero-float-b", dur: "4.2s", ad: "0.5s", td: "1040ms" },
      ].map((pill) => {
        const PillIcon = pill.icon;
        return (
          <div
            key={pill.label}
            className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border shadow-sm"
            style={{
              ...pill.pos,
              background: pill.bg,
              borderColor: pill.border,
              color: pill.color,
              fontFamily: "var(--font-heading)",
              animation: `${pill.anim} ${pill.dur} ease-in-out infinite`,
              animationDelay: pill.ad,
              transition: "opacity 600ms, transform 600ms",
              transitionDelay: pill.td,
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "scale(1)" : "scale(0.85)",
            }}
          >
            <PillIcon size={12} /> {pill.label}
          </div>
        );
      })}
    </div>
  );
}
