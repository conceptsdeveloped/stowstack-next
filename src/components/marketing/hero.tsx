"use client";

import { MONO, Label, Dot, Display } from "@/components/mono";
import { useClock } from "@/hooks/use-live-data";

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  BarChart3,
  Megaphone,
  FileText,
  Target,
  TrendingUp,
  Zap,
  MousePointerClick,
  Eye,
  DollarSign,
  Sparkles,
  Layers,
  Globe,
  Activity,
  ChevronDown,
  Smartphone,
  ArrowUpRight,
  LineChart,
  PieChart,
  Search,
  Bell,
  Settings,
  LayoutDashboard,
  Star,
} from "lucide-react";
import { useInView } from "./use-in-view";
import { SplitFlap as SplitFlapComponent } from "./split-flap";

const CALCOM_URL =
  process.env.NEXT_PUBLIC_CALCOM_LINK || "https://cal.com/storageads/30min";

/* ═══════════════════════════════════════════
   HOOKS
   ═══════════════════════════════════════════ */

function useCountUp(target: number, duration = 2000, decimals = 0, active = false) {
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
function useRevealCountUp(target: number, active: boolean, duration = 1800) {
  const [value, setValue] = useState(0);
  const animatedRef = useRef(false);
  useEffect(() => {
    if (!active) return;
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (animatedRef.current || prefersReduced) {
      animatedRef.current = true;
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

function useFlashOnChange<T>(value: T, ms = 600) {
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(value);
  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    setFlashing(true);
    const t = setTimeout(() => setFlashing(false), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return flashing;
}

function useTypewriter(words: string[], active: boolean, typingSpeed = 80, pauseMs = 2200) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
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

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

function useMouseTilt(enabled: boolean) {
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

function useStaggeredReveal(count: number, active: boolean, baseDelay = 0, stagger = 80) {
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

/* ═══════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════ */

const STATS = [
  { value: 34, prefix: "", suffix: "", label: "Move-ins (90 days)", decimals: 0, icon: TrendingUp },
  { value: 41, prefix: "$", suffix: "", label: "Cost per move-in", decimals: 0, icon: DollarSign },
  { value: 8.7, prefix: "", suffix: "%", label: "LP conversion rate", decimals: 1, icon: MousePointerClick },
  { value: 35, prefix: "", suffix: "x", label: "Return on ad spend", decimals: 0, icon: BarChart3 },
];

const CAPABILITIES = [
  { icon: Megaphone, label: "Meta & Google Ads", desc: "Both channels, run by an operator who fills units", color: "var(--color-blue)" },
  { icon: FileText, label: "Landing Pages", desc: "One page per ad, with the offer that ad promised", color: "var(--color-dark)" },
  { icon: Target, label: "Move-in Tracking", desc: "Ad → page → reservation → move-in", color: "var(--color-green)" },
  { icon: Zap, label: "storEDGE Integration", desc: "Renter never leaves your branded page", color: "#8a70b0" },
  { icon: BarChart3, label: "Revenue Reporting", desc: "What you spent. What you got. What each one cost.", color: "var(--color-dark)" },
  { icon: Eye, label: "A/B Testing", desc: "Winners picked by move-ins, not clicks", color: "var(--color-blue)" },
  { icon: Sparkles, label: "AI Creative Studio", desc: "Generate ad copy, headlines, and page variants", color: "var(--color-green)" },
  { icon: Activity, label: "Live Monitoring", desc: "Real-time performance alerts", color: "#8a70b0" },
];

const PIPELINE_STEPS = [
  { icon: Megaphone, label: "Ad", sublabel: "Meta / Google" },
  { icon: FileText, label: "Page", sublabel: "Custom LP" },
  { icon: Smartphone, label: "Reserve", sublabel: "storEDGE" },
  { icon: Target, label: "Move-in", sublabel: "Attributed" },
];

const TYPEWRITER_WORDS = ["Fill units.", "Prove ROAS.", "Kill bad spend.", "Track every move-in.", "Win your zip code."];

const FEATURE_HIGHLIGHTS = [
  { icon: LineChart, title: "Revenue Attribution", stat: "35x ROAS", desc: "Track every dollar from ad impression to signed lease. Know exactly which campaigns produce move-ins." },
  { icon: FileText, title: "Smart Landing Pages", stat: "8.7% CVR", desc: "Custom pages per ad with embedded storEDGE rental. No more generic website sends." },
  { icon: Sparkles, title: "AI Creative Engine", stat: "4x faster", desc: "Generate ad copy, headlines, and page variants. Test winners automatically by revenue." },
  { icon: PieChart, title: "Occupancy Intelligence", stat: "Live data", desc: "Market-wide occupancy and pricing intelligence scraped from every competitor in your radius." },
];

const BEFORE_AFTER = [
  { before: "Vanity metrics (clicks, impressions)", after: "Revenue attribution per ad" },
  { before: "Generic website as landing page", after: "Custom LP per campaign" },
  { before: "Monthly agency PDF report", after: "Real-time live dashboard" },
  { before: "Guessing which ads work", after: "Move-in level tracking" },
];

/* ═══════════════════════════════════════════
   KEYFRAMES
   ═══════════════════════════════════════════ */

function HeroStyles() {
  return (
    <style>{`
      @keyframes hero-float-a{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
      @keyframes hero-float-b{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
      @keyframes hero-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
      @keyframes hero-glow-pulse{0%,100%{opacity:0.5}50%{opacity:1}}
      @keyframes hero-shimmer{0%{background-position:200% 0}50%{background-position:-200% 0}100%{background-position:200% 0}}
      @keyframes hero-orb-drift{0%{transform:translate(0,0)}100%{transform:translate(30px,-20px)}}
      @keyframes hero-live-dot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.3;transform:scale(0.7)}}
      @keyframes hero-gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes hero-scroll-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
      @keyframes hero-pipeline-flow{0%{width:0}100%{width:100%}}
      @keyframes hero-border-glow{0%,100%{box-shadow:0 0 0 1px rgba(181,139,63,0.08),0 20px 50px rgba(0,0,0,0.07)}50%{box-shadow:0 0 0 1px rgba(181,139,63,0.2),0 20px 60px rgba(181,139,63,0.08),0 40px 100px rgba(0,0,0,0.04)}}
      @keyframes hero-blur-in{0%{opacity:0;filter:blur(8px);transform:translateY(16px)}100%{opacity:1;filter:blur(0);transform:translateY(0)}}
      @keyframes hero-scale-in{0%{opacity:0;transform:scale(0.85)}100%{opacity:1;transform:scale(1)}}
      @keyframes hero-slide-right{0%{opacity:0;transform:translateX(-24px)}100%{opacity:1;transform:translateX(0)}}
      @keyframes hero-slide-left{0%{opacity:0;transform:translateX(24px)}100%{opacity:1;transform:translateX(0)}}
      @keyframes hero-rotate-in{0%{opacity:0;transform:rotate(-3deg) scale(0.95)}100%{opacity:1;transform:rotate(0) scale(1)}}
      @keyframes hero-number-pop{0%{opacity:0;transform:scale(0.6)}60%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
      @keyframes hero-draw-check{0%{stroke-dashoffset:24}100%{stroke-dashoffset:0}}
      @keyframes hero-bar-fill{0%{width:0}100%{width:var(--bar-width)}}
      @keyframes hero-card-lift{0%{box-shadow:0 1px 3px rgba(0,0,0,0.04)}100%{box-shadow:0 8px 24px rgba(0,0,0,0.08)}}
      @keyframes hero-ticker-scroll{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes hero-badge-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
      .stat-cell{padding:16px 12px 18px}
      @media (min-width:480px){.stat-cell{padding:20px 16px 22px}}
      @media (min-width:768px){.stat-cell{padding:22px 20px 24px}}
      /* "proves" gradient text. Defined here (not inline) so the
         .urbit-landing [style*="linear-gradient"] kill-switch in
         globals.css doesn't strip it. */
      .hero-proves-gradient{
        background-image:linear-gradient(135deg,var(--accent),var(--color-blue),var(--accent-hover));
        background-size:200% 200%;
        -webkit-background-clip:text;
        background-clip:text;
        color:transparent;
        -webkit-text-fill-color:transparent;
        animation:hero-gradient-shift 3s ease-in-out infinite;
      }
      /* Scoped reduce-motion override — kills hero's looping animations
         (float, pulse, shimmer, gradient shift, scroll bounce) while
         leaving fade-in transitions intact at a much shorter duration. */
      @media (prefers-reduced-motion: reduce) {
        #hero *, #hero *::before, #hero *::after {
          animation-duration: 0.001ms !important;
          animation-iteration-count: 1 !important;
          animation-delay: 0ms !important;
        }
      }
    `}</style>
  );
}

/* ═══════════════════════════════════════════
   BACKGROUND
   ═══════════════════════════════════════════ */

function DotGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <svg className="w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="hero-dots" x="0" y="0" width="32" height="32" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hero-dots)" />
      </svg>
      <div className="absolute w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full" style={{ top: "10%", left: "5%", background: "radial-gradient(circle, var(--accent-glow), transparent 70%)", animation: "hero-orb-drift 12s ease-in-out infinite alternate" }} />
      <div className="absolute w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full" style={{ bottom: "5%", right: "0%", background: "radial-gradient(circle, var(--color-blue-light), transparent 70%)", animation: "hero-orb-drift 10s ease-in-out infinite alternate-reverse" }} />
      <div className="absolute w-[200px] h-[200px] rounded-full" style={{ top: "40%", right: "20%", background: "radial-gradient(circle, var(--color-green-light), transparent 70%)", animation: "hero-orb-drift 14s ease-in-out infinite alternate" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   ANIMATED PIPELINE FLOW
   Shows: Ad → Page → Reserve → Move-in
   ═══════════════════════════════════════════ */

export function PipelineFlow({ isVisible }: { isVisible: boolean }) {
  const [activeStep, setActiveStep] = useState(-1);

  useEffect(() => {
    if (!isVisible) return;
    const timers = PIPELINE_STEPS.map((_, i) =>
      setTimeout(() => setActiveStep(i), 1200 + i * 500)
    );
    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <div
      className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
      style={{ transitionDelay: "900ms" }}
    >
      <div className="flex items-center justify-between max-w-sm mx-auto lg:mx-0 relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px]" style={{ background: "var(--border-subtle)" }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--color-green))",
              width: activeStep >= 3 ? "100%" : activeStep >= 0 ? `${(activeStep + 1) * 33}%` : "0%",
              transition: "width 0.6s cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>

        {PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isActive = i <= activeStep;
          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center" style={{ width: "25%" }}>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-500"
                style={{
                  background: isActive ? "var(--bg-elevated)" : "var(--color-light)",
                  borderColor: isActive ? "var(--accent)" : "var(--border-subtle)",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  boxShadow: isActive ? "0 4px 12px var(--accent-glow)" : "none",
                }}
              >
                <Icon size={16} style={{ color: isActive ? "var(--accent)" : "var(--text-tertiary)", transition: "color 0.3s" }} />
              </div>
              <span
                className="text-[11px] font-semibold mt-1.5 transition-colors duration-300"
                style={{ fontFamily: "var(--font-heading)", color: isActive ? "var(--color-dark)" : "var(--text-tertiary)" }}
              >
                {step.label}
              </span>
              <span className="text-[9px]" style={{ color: "var(--text-tertiary)" }}>{step.sublabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STAT COUNTER
   ═══════════════════════════════════════════ */

function StatItem({ stat, active, delay }: { stat: (typeof STATS)[0]; active: boolean; delay: number }) {
  const count = useCountUp(stat.value, 2200, stat.decimals, active);
  const Icon = stat.icon;
  return (
    <div
      className="flex items-center gap-3 transition-all duration-700"
      style={{ transitionDelay: `${delay}ms`, opacity: active ? 1 : 0, transform: active ? "translateY(0)" : "translateY(16px)" }}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--accent-glow)", border: "1px solid var(--border-medium)" }}>
        <Icon size={18} style={{ color: "var(--accent)" }} />
      </div>
      <div>
        <div className="font-semibold leading-none" style={{ fontFamily: "var(--serif)", fontSize: "clamp(1.5rem, 3vw, 2rem)", letterSpacing: "-0.03em", color: "var(--color-dark)" }}>
          {stat.prefix}{stat.decimals > 0 ? count.toFixed(stat.decimals) : Math.round(count)}{stat.suffix}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{stat.label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD MOCKUP
   ═══════════════════════════════════════════ */

// Demo data — designed to match the public stats on the rest of the site so
// the numbers reconcile between hero, ROI, and funnel sections.
const DASHBOARD_ROWS = [
  { campaign: "Two Paws — 10x10 Climate", channel: "Meta", spend: 847, clicks: 312, reservations: 14, moveIns: 9, cpm: 94, trend: "down" as const },
  { campaign: "Midway — Drive-up", channel: "Google", spend: 612, clicks: 198, reservations: 11, moveIns: 7, cpm: 87, trend: "down" as const },
  { campaign: "Two Paws — Boat / RV", channel: "Meta", spend: 423, clicks: 156, reservations: 6, moveIns: 4, cpm: 106, trend: "flat" as const },
  { campaign: "Midway — Climate retarget", channel: "Meta", spend: 298, clicks: 89, reservations: 5, moveIns: 4, cpm: 74, trend: "down" as const },
];

const CHANNEL_DOT: Record<string, string> = {
  Meta: "var(--color-dark)",
  Google: "var(--color-blue)",
  Retargeting: "var(--color-green)",
};

// Sparkline path for the avg cost-per-move-in trend (12 points). In SVG
// y=0 is top, so a descending line starts at a small y and ends at a
// large y — i.e. cost was higher 30 days ago and is lower now.
const SPARKLINE_PATH = "M0 4 C8 5, 16 6, 24 8 S40 11, 48 13 S64 15, 72 16 S88 17, 96 18";

export function DashboardMockup({ isVisible }: { isVisible: boolean }) {
  const { ref: tiltRef, tilt } = useMouseTilt(isVisible);
  const avgCpm = useRevealCountUp(91, isVisible, 800);

  return (
    <div
      className="relative w-full transition-all duration-[400ms]"
      style={{
        transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(4px)",
      }}
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
                  <p className="text-[10px] sm:text-[11px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    Last 30 days
                  </p>
                </div>
                {/* Sparkline */}
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
                        strokeDashoffset: isVisible ? 0 : 140,
                        transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1) 300ms",
                      }}
                    />
                  </svg>
                </div>
              </div>

              {/* Stat strip */}
              <div className="grid grid-cols-3 gap-2 px-4 sm:px-5 mt-2">
                {[
                  { label: "Total spend", value: "$2,180", delta: null },
                  { label: "Move-ins", value: "24", delta: null },
                  { label: "Avg cost / move-in", value: `$${avgCpm}`, delta: "−18% vs prior 30d", deltaColor: "var(--color-green)" },
                ].map((s, i) => (
                  <div
                    key={s.label}
                    className="rounded-xl p-2.5 sm:p-3 border"
                    style={{
                      borderColor: "var(--border-subtle)",
                      background: "var(--color-light)",
                      transition: "opacity 600ms cubic-bezier(0.16,1,0.3,1), transform 600ms cubic-bezier(0.16,1,0.3,1)",
                      transitionDelay: `${200 + i * 80}ms`,
                      opacity: isVisible ? 1 : 0,
                      transform: isVisible ? "translateY(0)" : "translateY(6px)",
                    }}
                  >
                    <div className="text-[9px] sm:text-[10px] uppercase tracking-wide" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>
                      {s.label}
                    </div>
                    <div
                      className="text-base sm:text-lg font-semibold mt-1 tabular-nums"
                      style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)", lineHeight: 1 }}
                    >
                      {s.value}
                    </div>
                    {s.delta && (
                      <div className="text-[9px] sm:text-[10px] mt-1 font-medium" style={{ color: s.deltaColor }}>
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
                    <caption className="sr-only">Campaign performance for the last 30 days</caption>
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
                      {DASHBOARD_ROWS.map((row, i) => (
                        <tr
                          key={row.campaign}
                          style={{
                            borderTop: "1px solid var(--border-subtle)",
                            transition: "opacity 500ms ease-out, transform 500ms ease-out",
                            transitionDelay: `${450 + i * 70}ms`,
                            opacity: isVisible ? 1 : 0,
                            transform: isVisible ? "translateY(0)" : "translateY(4px)",
                          }}
                        >
                          <td className="px-2.5 sm:px-3 py-2 text-[10px] sm:text-[11px]" style={{ color: "var(--color-dark)" }}>
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ background: CHANNEL_DOT[row.channel] || "var(--color-dark)" }}
                                aria-label={`${row.channel} channel`}
                              />
                              <span className="font-medium truncate">{row.campaign}</span>
                            </div>
                          </td>
                          <td className="px-2.5 sm:px-3 py-2 text-right text-[10px] sm:text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                            ${row.spend.toLocaleString()}
                          </td>
                          <td className="px-2.5 sm:px-3 py-2 text-right text-[10px] sm:text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                            {row.clicks}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2 text-right text-[11px] tabular-nums" style={{ color: "var(--text-secondary)" }}>
                            {row.reservations}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2 text-right text-[11px] tabular-nums font-medium" style={{ color: "var(--color-dark)" }}>
                            {row.moveIns}
                          </td>
                          <td className="hidden sm:table-cell px-3 py-2 text-right text-[11px] tabular-nums" style={{ color: "var(--color-dark)" }}>
                            <span className="inline-flex items-center gap-1">
                              <span className="font-semibold">${row.cpm}</span>
                              {row.trend === "down" && (
                                <svg width="9" height="9" viewBox="0 0 8 8" aria-label="trending down">
                                  <path d="M4 1V7M4 7L1.5 4.5M4 7L6.5 4.5" stroke="var(--color-green)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                                </svg>
                              )}
                              {row.trend === "flat" && (
                                <span className="w-2 h-px" style={{ background: "var(--text-tertiary)" }} aria-label="flat" />
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating channel pills — desktop only. Recolored to charcoal /
          blue / green / neutral purple. No gold anywhere. */}
      {[
        { label: "Meta Ads", icon: Megaphone, pos: { top: "-22px", right: "32px" }, bg: "rgba(106,155,204,0.08)", border: "rgba(106,155,204,0.25)", color: "#5a8bb8", anim: "hero-float-a", dur: "4s", ad: "0s", td: "650ms" },
        { label: "Landing Pages", icon: FileText, pos: { top: "-28px", left: "150px" }, bg: "rgba(20,20,19,0.05)", border: "rgba(20,20,19,0.18)", color: "var(--color-dark)", anim: "hero-float-b", dur: "3.5s", ad: "1s", td: "780ms" },
        { label: "Attribution", icon: Target, pos: { bottom: "-20px", right: "110px" }, bg: "rgba(120,140,93,0.08)", border: "rgba(120,140,93,0.25)", color: "#6a7d50", anim: "hero-float-a", dur: "3.8s", ad: "1.8s", td: "910ms" },
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

/* ═══════════════════════════════════════════
   MOBILE LIVE ACTIVITY TICKER
   Visible only on mobile (below sm) so they
   don't miss the live feed hidden in dashboard
   ═══════════════════════════════════════════ */

type PublicActivityEvent = {
  id: string;
  platform: string;
  locale: string | null;
  createdAt: string;
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function platformGlyph(p: string): string {
  if (p.startsWith("google")) return "↗";
  if (p.startsWith("tiktok")) return "▸";
  return "●"; // meta / default
}

export function MobileLiveTicker({ isVisible }: { isVisible: boolean }) {
  const [events, setEvents] = useState<PublicActivityEvent[]>([]);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/public-activity")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (alive && d?.events) setEvents(d.events);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Need at least 3 to make a scrolling track feel populated; otherwise hide.
  if (events.length < 3) return null;

  // Double the list for seamless infinite scroll.
  const track = [...events, ...events];

  return (
    <div
      className="sm:hidden overflow-hidden rounded-xl border transition-all duration-700"
      style={{
        borderColor: "var(--border-subtle)",
        background: "var(--bg-elevated)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(12px)",
        transitionDelay: "1200ms",
      }}
    >
      <div className="flex items-center gap-1.5 px-3 py-2 border-b" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-green)", animation: "hero-live-dot 2s ease-in-out infinite" }} />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--color-dark)", fontFamily: "var(--font-primary)" }}>Live</span>
      </div>
      <div className="overflow-hidden relative" style={{ height: "36px" }}>
        <div className="flex items-center gap-8 absolute left-0 whitespace-nowrap" style={{ animation: "hero-ticker-scroll 25s linear infinite" }}>
          {track.map((e, i) => (
            <span key={`${e.id}-${i}`} className="flex items-center gap-2 text-[11px]" style={{ fontFamily: "var(--font-primary)" }}>
              <span style={{ color: "var(--color-green)" }}>{platformGlyph(e.platform)}</span>
              <span style={{ color: "var(--color-dark)", fontWeight: 500 }}>
                {e.locale ? `A facility in ${e.locale}` : "A facility"} published a {e.platform} campaign
              </span>
              <span style={{ color: "var(--text-tertiary)" }}>{formatRelative(e.createdAt)}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   FEATURE HIGHLIGHT CARDS
   Interactive cards with hover lift + animated icons
   ═══════════════════════════════════════════ */

export function FeatureHighlights({ isVisible }: { isVisible: boolean }) {
  const revealed = useStaggeredReveal(FEATURE_HIGHLIGHTS.length, isVisible, 200, 120);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {FEATURE_HIGHLIGHTS.map((feat, i) => {
        const Icon = feat.icon;
        const isHovered = hoveredIdx === i;
        return (
          <div
            key={feat.title}
            className="relative rounded-2xl border p-5 transition-all duration-500 cursor-default group"
            style={{
              borderColor: isHovered ? "var(--accent)" : "var(--border-subtle)",
              background: "var(--bg-alt)",
              opacity: revealed[i] ? 1 : 0,
              transform: revealed[i]
                ? isHovered ? "translateY(-4px)" : "translateY(0)"
                : "translateY(20px) scale(0.95)",
              boxShadow: isHovered
                ? "0 12px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(181,139,63,0.1)"
                : "0 1px 3px rgba(0,0,0,0.04)",
            }}
            onMouseEnter={() => setHoveredIdx(i)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-all duration-500"
              style={{
                background: isHovered ? "rgba(181,139,63,0.12)" : "rgba(181,139,63,0.06)",
                border: "1px solid rgba(181,139,63,0.15)",
                transform: isHovered ? "scale(1.1) rotate(-3deg)" : "scale(1)",
              }}
            >
              <Icon size={18} style={{ color: "var(--color-gold)" }} />
            </div>

            {/* Stat badge */}
            <div
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold mb-2 transition-all duration-300"
              style={{
                background: "rgba(181,139,63,0.08)",
                color: "var(--color-gold)",
                fontFamily: "var(--font-heading)",
                transform: isHovered ? "translateX(2px)" : "translateX(0)",
              }}
            >
              {feat.stat}
            </div>

            {/* Title */}
            <h3
              className="text-sm font-semibold mb-1"
              style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}
            >
              {feat.title}
            </h3>

            {/* Description */}
            <p className="text-xs leading-relaxed" style={{ color: "var(--text-secondary)", maxWidth: "none" }}>
              {feat.desc}
            </p>

            {/* Hover arrow */}
            <div
              className="absolute top-4 right-4 transition-all duration-300"
              style={{
                opacity: isHovered ? 1 : 0,
                transform: isHovered ? "translate(0, 0)" : "translate(-4px, 4px)",
              }}
            >
              <ArrowUpRight size={14} style={{ color: "var(--color-gold)" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   BEFORE / AFTER COMPARISON
   Animated check reveals
   ═══════════════════════════════════════════ */

export function BeforeAfterComparison({ isVisible }: { isVisible: boolean }) {
  const revealed = useStaggeredReveal(BEFORE_AFTER.length, isVisible, 400, 150);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {BEFORE_AFTER.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-3 rounded-xl border p-4 transition-all duration-600"
          style={{
            borderColor: "var(--border-subtle)",
            background: "var(--bg-elevated)",
            opacity: revealed[i] ? 1 : 0,
            transform: revealed[i] ? "translateX(0)" : i % 2 === 0 ? "translateX(-16px)" : "translateX(16px)",
          }}
        >
          <div className="flex flex-col items-center gap-1 flex-shrink-0 mt-0.5">
            {/* X icon for before */}
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(176,74,58,0.1)" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2.5 2.5L7.5 7.5M7.5 2.5L2.5 7.5" stroke="var(--color-red)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            {/* Arrow down */}
            <div className="w-px h-3" style={{ background: "var(--border-medium)" }} />
            {/* Check icon for after */}
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(120,140,93,0.12)" }}>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path
                  d="M2 5.5L4 7.5L8 3"
                  stroke="var(--color-green)"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 12,
                    strokeDashoffset: revealed[i] ? 0 : 12,
                    transition: "stroke-dashoffset 0.6s ease-out",
                    transitionDelay: `${600 + i * 150}ms`,
                  }}
                />
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] line-through" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>
              {item.before}
            </div>
            <div className="text-[12px] font-semibold mt-1" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>
              {item.after}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   CAPABILITIES INTERACTIVE GRID
   ═══════════════════════════════════════════ */

export function CapabilitiesGrid({ isVisible }: { isVisible: boolean }) {
  const revealed = useStaggeredReveal(CAPABILITIES.length, isVisible, 200, 80);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {CAPABILITIES.map((cap, i) => {
        const Icon = cap.icon;
        const isActive = activeIdx === i;
        return (
          <div
            key={cap.label}
            className="relative rounded-xl border p-3 sm:p-4 transition-all duration-400 cursor-default"
            style={{
              borderColor: isActive ? "rgba(181,139,63,0.3)" : "var(--border-subtle)",
              background: isActive ? "var(--bg-elevated)" : "transparent",
              opacity: revealed[i] ? 1 : 0,
              transform: revealed[i]
                ? isActive ? "translateY(-2px) scale(1.02)" : "translateY(0) scale(1)"
                : "translateY(12px) scale(0.95)",
              boxShadow: isActive ? "0 8px 24px rgba(0,0,0,0.06)" : "none",
            }}
            onMouseEnter={() => setActiveIdx(i)}
            onMouseLeave={() => setActiveIdx(null)}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center mb-2 transition-all duration-300"
              style={{
                background: `color-mix(in srgb, ${cap.color} 10%, transparent)`,
                transform: isActive ? "scale(1.15)" : "scale(1)",
              }}
            >
              <Icon size={15} style={{ color: cap.color, transition: "color 0.3s" }} />
            </div>
            <div className="text-[11px] sm:text-xs font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>
              {cap.label}
            </div>
            <div
              className="text-[10px] mt-0.5 leading-snug transition-all duration-300 overflow-hidden"
              style={{
                color: "var(--text-tertiary)",
                maxHeight: isActive ? "40px" : "0px",
                opacity: isActive ? 1 : 0,
              }}
            >
              {cap.desc}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════
   "BECAUSE" — SPLIT-FLAP FULL SENTENCES
   ═══════════════════════════════════════════ */

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

/* ═══════════════════════════════════════════
   ROI TEASER — quick animated value prop
   ═══════════════════════════════════════════ */

export function ROITeaser({ isVisible }: { isVisible: boolean }) {
  const adSpend = useCountUp(2400, 2000, 0, isVisible);
  const moveIns = useCountUp(34, 2200, 0, isVisible);
  const costPerMI = useCountUp(41, 2000, 0, isVisible);
  const revenue = useCountUp(27200, 2400, 0, isVisible);

  const stats = [
    { label: "Ad Spend", value: `$${adSpend.toLocaleString()}`, sub: "per month", color: "var(--color-blue)" },
    { label: "Move-ins", value: String(moveIns), sub: "attributed", color: "var(--color-green)" },
    { label: "Cost / Move-in", value: `$${costPerMI}`, sub: "average", color: "var(--accent)" },
    { label: "Revenue", value: `$${revenue.toLocaleString()}`, sub: "90 days", color: "var(--color-green)" },
  ];

  return (
    <div
      className="relative overflow-hidden transition-all duration-700"
      style={{
        border: "2px solid var(--border-medium)",
        background: "var(--bg-elevated)",
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(20px)",
        transitionDelay: "300ms",
      }}
    >
      {/* Header bar. Uses --bg-hi (palette's "lifted cell" tone) so the
          h1–h6 forced `color: var(--text-accent) !important` contrasts
          against it on every palette. Previously used --color-dark which
          aliases to --text — making text ≈ bg on dark palettes. */}
      <div
        className="flex items-center gap-3 px-6 sm:px-8 py-4"
        style={{ background: "var(--bg-hi)", borderBottom: "2px solid var(--border-medium)" }}
      >
        <DollarSign size={18} style={{ color: "var(--text)", opacity: 0.5 }} />
        <h3
          className="text-xs sm:text-sm font-bold tracking-wider uppercase"
          style={{ fontFamily: "var(--font-heading)", color: "var(--text-inverse)", letterSpacing: "0.08em" }}
        >
          90-Day Performance Snapshot
        </h3>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {stats.map((item, i) => (
          <div
            key={item.label}
            className="relative transition-all duration-500"
            style={{
              padding: "1.25rem 1.5rem",
              borderRight: i < 3 ? "1px solid var(--border-medium)" : "none",
              borderBottom: "1px solid var(--border-medium)",
              opacity: isVisible ? 1 : 0,
              transform: isVisible ? "translateY(0)" : "translateY(12px)",
              transitionDelay: `${500 + i * 100}ms`,
            }}
          >
            <div
              className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase mb-2"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)", letterSpacing: "0.06em" }}
            >
              {item.label}
            </div>
            <div
              className="text-2xl sm:text-3xl font-bold leading-none"
              style={{ fontFamily: "var(--serif)", letterSpacing: "-0.03em", color: item.color }}
            >
              {item.value}
            </div>
            <div
              className="text-[10px] sm:text-[11px] mt-1.5 font-medium"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}
            >
              {item.sub}
            </div>
          </div>
        ))}
      </div>

      {/* ROAS bar */}
      <div className="flex items-center gap-4 px-6 sm:px-8 py-4" style={{ background: "var(--bg-surface)" }}>
        <span
          className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase flex-shrink-0"
          style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)", letterSpacing: "0.06em" }}
        >
          ROAS
        </span>
        <div className="flex-1 h-4 overflow-hidden" style={{ background: "var(--border-medium)" }}>
          <div
            className="h-full transition-all"
            style={{
              background: "linear-gradient(90deg, var(--accent), var(--color-green))",
              width: isVisible ? "88%" : "0%",
              transitionDuration: "1.8s",
              transitionDelay: "800ms",
              transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            }}
          />
        </div>
        <span
          className="text-lg sm:text-xl font-bold flex-shrink-0"
          style={{ color: "var(--color-green)", fontFamily: "var(--serif)", letterSpacing: "-0.03em" }}
        >
          35x
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HERO STATUS STRIP — ultra-thin ribbon between nav and hero content.
   Left: live pulse + "MARKETING INFRASTRUCTURE · BUILT FOR SELF-STORAGE".
   Right: revision date · wall clock · compliance tag.
   Ported from the handoff hero reference §205.
   This is the natural home for the clock — NOT crammed into the nav.
   ═══════════════════════════════════════════ */

function HeroStatusStrip() {
  const clock = useClock();
  return (
    <div
      style={{
        position: "relative",
        top: "var(--nav-height)",
        marginTop: "calc(var(--nav-height) * -1)",
        paddingTop: "var(--nav-height)",
      }}
    >
      <div
        style={{
          borderBottom: `1px solid ${MONO.line}`,
          borderTop: `1px solid ${MONO.line}`,
        }}
      >
        <div
          className="max-w-[1320px] mx-auto px-5 sm:px-8 lg:px-14"
          style={{
            padding: "8px 20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <Label style={{ color: MONO.accent, fontWeight: 500 }}>
            <Dot live color={MONO.accent} style={{ marginRight: 8, verticalAlign: "middle" }} />
            MARKETING INFRASTRUCTURE · BUILT FOR SELF-STORAGE
          </Label>
          <Label style={{ color: MONO.textDim }}>
            REV {clock.ymd} · {clock.hms} {clock.tz} · SOC2
          </Label>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIVE STATS STRIP — NULL//TRACE theme
   Real aggregates from /api/public-stats. Each stat is a Panel with
   eyebrow + index, big serif Display number, categorical hue, and an
   italic serif editorial caption below. LIVE tag + square Dot pulses
   because this is real live data and we want operators to see that.
   Cards auto-hide when their stat is 0 or null.
   ═══════════════════════════════════════════ */

type StatCard = {
  key: string;
  rawValue: number;
  format: "count" | "money";
  label: string;
  caption: string;
  hue: string;
  delta?: string;
  context?: string;
};

function formatCount(n: number): string {
  if (n >= 1_000_000_000)
    return `${(n / 1_000_000_000).toFixed(n >= 10_000_000_000 ? 0 : 1).replace(/\.0$/, "")}B`;
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1000)
    return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k`;
  return n.toLocaleString();
}

function StatCell({
  card,
  index,
  isVisible,
}: {
  card: StatCard;
  index: number;
  isVisible: boolean;
}) {
  const animated = useRevealCountUp(card.rawValue, isVisible, 1800);
  const flashing = useFlashOnChange(card.rawValue);
  const display =
    card.format === "money" ? `$${formatCount(animated)}` : formatCount(animated);

  return (
    <div
      className="stat-cell"
      style={{
        background: MONO.bgAlt,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        position: "relative",
        minWidth: 0,
        overflow: "hidden",
        animation: flashing ? "mono-flash 600ms ease-out" : undefined,
      }}
    >
      <div
        style={{
          display: "block",
          minWidth: 0,
        }}
      >
        {card.context && (
          <div
            style={{
              display: "block",
              marginBottom: 4,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            <Label
              style={{
                color: MONO.textFaint,
                fontSize: 9,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
                maxWidth: "100%",
              }}
            >
              {card.context}
            </Label>
          </div>
        )}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            minWidth: 0,
            flexWrap: "wrap",
          }}
        >
          <Label style={{ color: MONO.textFaint, fontSize: 9, flex: "0 0 auto" }}>
            #{String(index + 1).padStart(2, "0")}
          </Label>
          <Label
            style={{
              color: MONO.textDim,
              minWidth: 0,
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              flex: "1 1 auto",
            }}
          >
            {card.label}
          </Label>
        </div>
      </div>
      <Display
        size={64}
        style={{
          color: card.hue,
          fontSize: "clamp(3rem, 6.5vw, 4.5rem)",
          lineHeight: 0.95,
        }}
      >
        {display}
      </Display>
      <div style={{ height: 1, background: MONO.lineDim, marginTop: 4 }} />
      {card.delta && (
        <Label
          style={{
            color: MONO.hueC,
            fontWeight: 500,
            fontSize: 10,
            letterSpacing: "0.08em",
          }}
        >
          {card.delta}
        </Label>
      )}
      <span
        style={{
          fontFamily: MONO.serif,
          fontStyle: "italic",
          fontSize: 13,
          lineHeight: 1.5,
          color: MONO.textDim,
          maxWidth: "40ch",
        }}
      >
        {card.caption}
      </span>
    </div>
  );
}

export function LiveStatsStrip({ isVisible }: { isVisible: boolean }) {
  const clock = useClock();

  // Industry + forecast cards only. The alpha portfolio numbers don't yet
  // reflect what's actually being built behind the scenes, so showing the
  // raw platform counts (60 ads / 7 audits) was misleading. Instead the
  // strip tells the "$50B market → here's what we're building toward"
  // story via two clearly-labeled data types:
  //   INDUSTRY (public, sourced) → hueB
  //   FORECAST (year-one targets) → hueC
  const cards: StatCard[] = [
    // ─── INDUSTRY · 2026 ─────────────────────────────────────────────
    // Sourced public figures — Blake to confirm final values + citations.
    {
      key: "market",
      rawValue: 50_000_000_000,
      format: "money",
      label: "US storage market",
      caption:
        "the US self-storage industry by annual revenue (Self Storage Association, 2026). Marketing is the slowest part of it to modernize.",
      hue: MONO.hueB,
      context: "INDUSTRY · 2026",
    },
    {
      key: "industry-facilities",
      rawValue: 52_000,
      format: "count",
      label: "Facilities nationwide",
      caption:
        "independent + REIT self-storage facilities in the US (SpareFoot industry data). Most still buy ads on faith.",
      hue: MONO.hueB,
      context: "INDUSTRY · 2026",
    },
    {
      key: "agency-cpa",
      rawValue: 200,
      format: "money",
      label: "Typical agency CPA",
      caption:
        "what self-storage operators pay traditional agencies per move-in. We optimize for fewer, better clicks instead.",
      hue: MONO.hueB,
      context: "INDUSTRY · BENCHMARK",
    },

    // ─── FORECAST · YEAR 1 ───────────────────────────────────────────
    // Placeholder targets — replace with Blake's actual year-one goals.
    {
      key: "y1-spend",
      rawValue: 10_000_000,
      format: "money",
      label: "Spend tracked goal",
      caption:
        "attributable ad spend StorageAds will route through the platform by EOY. Every dollar tied to a move-in or audited away.",
      hue: MONO.hueC,
      context: "FORECAST · YEAR 1",
    },
    {
      key: "y1-facilities",
      rawValue: 250,
      format: "count",
      label: "Facilities goal",
      caption:
        "operators live on the platform by EOY. Partner operators carry the growth.",
      hue: MONO.hueC,
      context: "FORECAST · YEAR 1",
    },
    {
      key: "y1-moveins",
      rawValue: 10_000,
      format: "count",
      label: "Move-ins attributed",
      caption:
        "leases tied to specific creatives, channels, and pages — not last-click guesses or vendor reports.",
      hue: MONO.hueC,
      context: "FORECAST · YEAR 1",
    },
  ];

  // 6 cards land at 3-col × 2-row on desktop, 2-col stack on mobile.
  // Hairline seams via 1px gap on a line-colored background.
  const gridClass = "grid grid-cols-2 md:grid-cols-3";

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? "translateY(0)" : "translateY(12px)",
        transition: "all 700ms",
        transitionDelay: "1600ms",
        border: `1px solid ${MONO.line}`,
        background: MONO.line, // hairline seam color showing through gaps
      }}
    >
      {/* Section header — § NN NUMBERS · LIVE ← kicker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 14px",
          borderBottom: `1px solid ${MONO.line}`,
          gap: 12,
          background: MONO.bgAlt,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}>
          <Label style={{ color: MONO.accent, fontWeight: 500, whiteSpace: "nowrap" }}>§ 00 · NUMBERS</Label>
          <span className="hidden sm:inline" style={{ minWidth: 0, overflow: "hidden" }}>
            <Label
              style={{ color: MONO.textDim, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "inline-block", maxWidth: "100%" }}
            >
              n = {cards.length} · industry · forecast
            </Label>
          </span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
          <Dot live color={MONO.accent} />
          <Label style={{ color: MONO.accent, fontWeight: 500, whiteSpace: "nowrap" }}>LIVE · {clock.hms}</Label>
        </div>
      </div>

      {/* Stat cells — hairline seams via 1px gap on line-colored background */}
      <div className={gridClass} style={{ gap: 1, background: MONO.line }}>
        {cards.map((c, i) => (
          <StatCell key={c.key} card={c} index={i} isVisible={isVisible} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   STATS BAR — page-level section, extracted from Hero per IA spec.
   Renders the four hero-stat counters (move-ins, cost per MI, LP CVR, ROAS).
   Consumed at slot 6 (Proof) in page.tsx.
   ═══════════════════════════════════════════ */

export function StatsBar() {
  const { ref, isVisible } = useInView(0.1);
  return (
    <section ref={ref} aria-label="Key performance stats" className="relative border-t" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-surface)" }}>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-8 lg:px-14 py-10 sm:py-14">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
          {STATS.map((stat, i) => (
            <StatItem key={stat.label} stat={stat} active={isVisible} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════
   HERO — Main Export (Angelo's original 2-column layout).
   H1 + typewriter + subhead + pipeline + 2 CTAs + 3 trust badges on the
   left; DashboardMockup on the right. Stats/ROI/Features/etc. that used
   to render below this in Angelo's commit are now lifted into named
   exports and consumed from page.tsx at slot 3/4/5/6 per the IA spec.
   ═══════════════════════════════════════════ */

export default function Hero() {
  const { ref, isVisible } = useInView(0.02);
  const typedText = useTypewriter(TYPEWRITER_WORDS, isVisible);

  return (
    <section id="hero" aria-label="StorageAds: fill units and prove which ads did it" className="relative overflow-hidden" style={{ background: "var(--color-light)" }}>
      <HeroStyles />
      <DotGrid />
      <HeroStatusStrip />

      {/* ── Hero content ── */}
      <div ref={ref} className="relative w-full pt-16 sm:pt-20 lg:pt-24 pb-10 lg:pb-14 px-5 sm:px-8 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-14 items-center max-w-[1280px] mx-auto">

          {/* ── Left column ── */}
          <div className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            {/* Headline */}
            <h1
              className={`font-semibold transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ fontSize: "clamp(1.75rem, 5.5vw, 3.25rem)", lineHeight: 1.12, letterSpacing: "-0.03em", fontFamily: "var(--serif)" }}
            >
              Ad spend in = move-ins out.
            </h1>

            {/* Typewriter */}
            <div className={`mt-3 h-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: "200ms" }}>
              <span className="text-lg sm:text-xl font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--serif)", letterSpacing: "-0.03em" }}>{typedText}</span>
              <span className="inline-block w-0.5 h-5 ml-0.5 align-middle rounded-full" style={{ background: "var(--color-gold)", animation: "hero-pulse 1s ease-in-out infinite" }} />
            </div>

            {/* Subheadline */}
            <p
              className={`mt-2.5 text-[15px] sm:text-base transition-all duration-1000 mx-auto lg:mx-0 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ color: "var(--text-secondary)", lineHeight: 1.55, transitionDelay: "350ms", maxWidth: "460px" }}
            >
              The REITs operate marketing teams and proprietary tools built around that equation. It&apos;s not a secret, and it&apos;s not new. StorageAds is that infrastructure, productized for independent operators to take control of their occupancy rates through proactive marketing and demand generation.
            </p>

            {/* Pipeline flow — shows the Ad → Page → Reserve → Move-in journey */}
            <div className="mt-5 mb-5">
              <PipelineFlow isVisible={isVisible} />
            </div>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row items-center lg:items-start gap-3 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: "500ms" }}>
              <a href="#cta" className="btn-primary text-base group">
                Get your free facility audit — instant results
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <a href={CALCOM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border font-semibold text-base transition-all hover:border-[var(--color-gold)]/30 hover:shadow-sm" style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)", fontFamily: "var(--font-heading)" }}>
                Book a call to review with our team
              </a>
            </div>

            {/* Trust signals — three badges per Angelo's original */}
            <div className={`mt-5 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "650ms" }}>
              <div className="flex items-center gap-4 justify-center lg:justify-start flex-wrap">
                {[
                  { icon: Layers, text: "storEDGE integrated" },
                  { icon: Globe, text: "Tested on our own facilities first" },
                  { icon: Star, text: "Move-in level attribution" },
                ].map((badge, i) => {
                  const BadgeIcon = badge.icon;
                  return (
                    <div key={badge.text} className="flex items-center gap-1.5 text-xs transition-all duration-500" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)", transitionDelay: `${750 + i * 100}ms`, opacity: isVisible ? 1 : 0 }}>
                      <BadgeIcon size={13} style={{ color: "var(--color-gold)", opacity: 0.7 }} />
                      {badge.text}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── Right column — Dashboard ── */}
          {/* Dense desktop UI with 3D tilt + horizontal-scroll tabs. Not
              suited to <lg; MobileLiveTicker below (at slot 6) carries the
              mobile signal. */}
          <div className="hidden lg:block">
            <DashboardMockup isVisible={isVisible} />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={`flex justify-center pb-4 transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1500ms" }}>
        <a href="#problem" className="flex flex-col items-center gap-1 group" aria-label="Scroll to learn more">
          <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>Learn more</span>
          <ChevronDown size={16} style={{ color: "var(--text-tertiary)", animation: "hero-scroll-bounce 2s ease-in-out infinite" }} />
        </a>
      </div>
    </section>
  );
}
