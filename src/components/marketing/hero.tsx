"use client";

import { useState, useEffect, useRef } from "react";
import {
  ArrowRight,
  Play,
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
  ShieldCheck,
  Layers,
  Globe,
  Activity,
  ChevronDown,
  Smartphone,
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
      setIsDeleting(false);
      setWordIdx((i) => (i + 1) % words.length);
    }
    setDisplay(word.slice(0, charIdx));
    return () => clearTimeout(timeout);
  }, [active, charIdx, isDeleting, wordIdx, words, typingSpeed, pauseMs]);
  return display;
}

function useAutoTab(count: number, intervalMs = 3500, active = false) {
  const [tab, setTab] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => setTab((t) => (t + 1) % count), intervalMs);
    return () => clearInterval(timer);
  }, [count, intervalMs, active]);
  return [tab, setTab] as const;
}

function useMouseTilt(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    function handleMove(e: MouseEvent) {
      const rect = el!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setTilt({ x: y * -4, y: x * 4 });
    }
    function handleLeave() { setTilt({ x: 0, y: 0 }); }
    el.addEventListener("mousemove", handleMove);
    el.addEventListener("mouseleave", handleLeave);
    return () => { el.removeEventListener("mousemove", handleMove); el.removeEventListener("mouseleave", handleLeave); };
  }, [enabled]);
  return { ref, tilt };
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
  { icon: Megaphone, label: "Meta & Google Ads", desc: "Full-funnel campaigns across platforms" },
  { icon: FileText, label: "Landing Pages", desc: "Ad-specific, conversion-optimized" },
  { icon: Target, label: "Full Attribution", desc: "Ad → page → reservation → move-in" },
  { icon: Zap, label: "storEDGE Integration", desc: "Embedded rental & reservation flow" },
  { icon: BarChart3, label: "Revenue Analytics", desc: "ROAS by creative & campaign" },
  { icon: Eye, label: "A/B Testing", desc: "Revenue-based winner selection" },
  { icon: Sparkles, label: "AI Creative Studio", desc: "Generate ads, copy & pages" },
  { icon: Activity, label: "Live Monitoring", desc: "Real-time performance alerts" },
];

const TYPEWRITER_WORDS = ["Fill units.", "Prove ROAS.", "Cut waste.", "Scale revenue.", "Win move-ins."];

const NOTIFICATION_FEED = [
  { text: "New move-in — Climate Control 10x10", time: "2m", color: "var(--color-blue)", icon: "🎯" },
  { text: "Conversion rate: 12.3% (+2.1%)", time: "15m", color: "var(--color-green)", icon: "📈" },
  { text: "Google CPC dropped to $1.82", time: "1h", color: "var(--color-gold)", icon: "💰" },
  { text: "A/B winner: First Month Free", time: "3h", color: "var(--color-green)", icon: "🏆" },
  { text: "New reservation — 5x10 unit", time: "4h", color: "var(--color-blue)", icon: "📦" },
];

const PIPELINE_STEPS = [
  { icon: Megaphone, label: "Ad", sublabel: "Meta / Google" },
  { icon: FileText, label: "Page", sublabel: "Custom LP" },
  { icon: Smartphone, label: "Reserve", sublabel: "storEDGE" },
  { icon: Target, label: "Move-in", sublabel: "Attributed" },
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
      @keyframes hero-underline-draw{0%{width:0}100%{width:100%}}
      @keyframes hero-gradient-shift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes hero-scroll-bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(6px)}}
      @keyframes hero-pipeline-flow{0%{width:0}100%{width:100%}}
      @keyframes hero-border-glow{0%,100%{box-shadow:0 0 0 1px rgba(181,139,63,0.08),0 20px 50px rgba(0,0,0,0.07)}50%{box-shadow:0 0 0 1px rgba(181,139,63,0.2),0 20px 60px rgba(181,139,63,0.08),0 40px 100px rgba(0,0,0,0.04)}}
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
      <div className="absolute w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full" style={{ top: "10%", left: "5%", background: "radial-gradient(circle, rgba(181,139,63,0.06), transparent 70%)", animation: "hero-orb-drift 12s ease-in-out infinite alternate" }} />
      <div className="absolute w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] rounded-full" style={{ bottom: "5%", right: "0%", background: "radial-gradient(circle, rgba(106,155,204,0.05), transparent 70%)", animation: "hero-orb-drift 10s ease-in-out infinite alternate-reverse" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   ANIMATED PIPELINE FLOW
   Shows: Ad → Page → Reserve → Move-in
   ═══════════════════════════════════════════ */

function PipelineFlow({ isVisible }: { isVisible: boolean }) {
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
      <div className="flex items-center justify-between max-w-md mx-auto lg:mx-0 relative">
        {/* Connecting line */}
        <div className="absolute top-5 left-[10%] right-[10%] h-[2px]" style={{ background: "var(--border-subtle)" }}>
          <div
            className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, var(--color-gold), var(--color-green))",
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
                  borderColor: isActive ? "var(--color-gold)" : "var(--border-subtle)",
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  boxShadow: isActive ? "0 4px 12px rgba(181,139,63,0.15)" : "none",
                }}
              >
                <Icon size={16} style={{ color: isActive ? "var(--color-gold)" : "var(--text-tertiary)", transition: "color 0.3s" }} />
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
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(181,139,63,0.08)", border: "1px solid rgba(181,139,63,0.15)" }}>
        <Icon size={18} style={{ color: "var(--color-gold)" }} />
      </div>
      <div>
        <div className="font-bold leading-none" style={{ fontFamily: "var(--font-heading)", fontSize: "clamp(1.5rem, 3vw, 2rem)", color: "var(--color-dark)" }}>
          {stat.prefix}{stat.decimals > 0 ? count.toFixed(stat.decimals) : Math.round(count)}{stat.suffix}
        </div>
        <div className="text-xs mt-0.5" style={{ color: "var(--text-secondary)", fontFamily: "var(--font-body)" }}>{stat.label}</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LIVE FEED
   ═══════════════════════════════════════════ */

function LiveFeed({ isVisible }: { isVisible: boolean }) {
  const [visibleCount, setVisibleCount] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    const timers = NOTIFICATION_FEED.map((_, i) =>
      setTimeout(() => setVisibleCount((c) => Math.max(c, i + 1)), 1600 + i * 600)
    );
    return () => timers.forEach(clearTimeout);
  }, [isVisible]);

  return (
    <div className="flex flex-col gap-1.5">
      {NOTIFICATION_FEED.map((item, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg px-2.5 py-1.5 border transition-all duration-500"
          style={{
            background: i < visibleCount ? "var(--bg-elevated)" : "transparent",
            borderColor: i < visibleCount ? "var(--border-subtle)" : "transparent",
            opacity: i < visibleCount ? 1 : 0,
            transform: i < visibleCount ? "translateX(0) scale(1)" : "translateX(20px) scale(0.95)",
          }}
        >
          <span className="text-[10px] mt-0.5 flex-shrink-0">{item.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] leading-snug truncate" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)", fontWeight: 500 }}>{item.text}</div>
            <div className="text-[9px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>{item.time}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DASHBOARD MOCKUP
   ═══════════════════════════════════════════ */

function DashboardMockup({ isVisible }: { isVisible: boolean }) {
  const tabs = ["Overview", "Campaigns", "Pages", "Attribution"];
  const [activeTab, setActiveTab] = useAutoTab(tabs.length, 4000, isVisible);
  const { ref: tiltRef, tilt } = useMouseTilt(isVisible);

  return (
    <div
      className="relative w-full transition-all duration-1000"
      style={{ transitionDelay: "200ms", opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0) scale(1)" : "translateY(40px) scale(0.96)" }}
    >
      {/* Glow */}
      <div className="absolute -inset-6 rounded-3xl pointer-events-none hidden lg:block" style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(181,139,63,0.1), transparent 65%)", filter: "blur(30px)", animation: "hero-glow-pulse 4s ease-in-out infinite" }} />

      {/* Mouse-follow tilt wrapper */}
      <div ref={tiltRef} style={{ perspective: "1400px" }}>
        <div
          className="w-full rounded-2xl overflow-hidden border transition-all duration-300"
          style={{
            borderColor: "rgba(0,0,0,0.08)",
            background: "var(--bg-elevated)",
            animation: "hero-border-glow 6s ease-in-out infinite",
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
            transformStyle: "preserve-3d",
          }}
        >
          {/* Shimmer */}
          <div className="absolute inset-0 pointer-events-none z-10" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.25) 50%, transparent 60%)", backgroundSize: "200% 100%", animation: "hero-shimmer 5s ease-in-out infinite", animationDelay: "2s" }} />

          <div className="flex" style={{ height: "clamp(300px, 40vw, 480px)" }}>
            {/* Sidebar */}
            <div className="hidden sm:flex flex-col items-center py-4 gap-2 flex-shrink-0" style={{ width: "52px", background: "var(--color-dark)" }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2" style={{ background: "var(--color-gold)" }}>
                <span className="text-[10px] font-bold text-white" style={{ fontFamily: "var(--font-heading)" }}>SA</span>
              </div>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-500" style={{ background: i === 0 ? "rgba(181,139,63,0.2)" : "transparent", border: i === 0 ? "1px solid rgba(181,139,63,0.4)" : "1px solid transparent", transitionDelay: `${500 + i * 60}ms`, opacity: isVisible ? 1 : 0 }}>
                  <div className="w-3.5 h-3.5 rounded-sm" style={{ background: i === 0 ? "var(--color-gold)" : "rgba(255,255,255,0.12)", opacity: i === 0 ? 1 : 0.5 }} />
                </div>
              ))}
              <div className="flex-1" />
              <div className="w-7 h-7 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Top bar */}
              <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b transition-all duration-500" style={{ borderColor: "var(--border-subtle)", background: "rgba(250,249,245,0.5)", transitionDelay: "400ms", opacity: isVisible ? 1 : 0 }}>
                <div className="h-7 w-28 sm:w-36 rounded-md flex items-center gap-2 px-2.5" style={{ background: "var(--border-subtle)" }}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="5" cy="5" r="4" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" /><line x1="8.5" y1="8.5" x2="11" y2="11" stroke="rgba(0,0,0,0.2)" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  <span className="text-[10px] hidden sm:inline" style={{ color: "var(--text-tertiary)" }}>Search facilities...</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: "var(--border-subtle)" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v4M6 9v.01M2 5.5C2 3 3.8 1 6 1s4 2 4 4.5c0 1.5-.5 2.5-1 3.5H3c-.5-1-1-2-1-3.5z" stroke="rgba(0,0,0,0.25)" strokeWidth="1" strokeLinecap="round" /></svg>
                    </div>
                    <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 animate-pulse" style={{ background: "var(--color-red)", borderColor: "var(--bg-elevated)" }} />
                  </div>
                  <div className="w-6 h-6 rounded-full" style={{ background: "var(--color-gold-light)", border: "1px solid rgba(181,139,63,0.2)" }} />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-0.5 sm:gap-1 px-3 sm:px-4 pt-3 pb-0 transition-all duration-500 overflow-x-auto" style={{ transitionDelay: "500ms", opacity: isVisible ? 1 : 0 }}>
                {tabs.map((tab, i) => (
                  <button key={tab} onClick={() => setActiveTab(i)} className="px-2 sm:px-3 py-1.5 rounded-md text-[10px] sm:text-[11px] font-medium transition-all duration-300 flex-shrink-0 relative" style={{ fontFamily: "var(--font-heading)", background: activeTab === i ? "rgba(181,139,63,0.1)" : "transparent", color: activeTab === i ? "var(--color-gold)" : "var(--text-tertiary)", border: activeTab === i ? "1px solid rgba(181,139,63,0.2)" : "1px solid transparent" }}>
                    {tab}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 p-3 sm:p-4 flex flex-col gap-2.5 overflow-hidden">
                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: "Move-ins", value: "34", change: "+12%", accent: "var(--color-green)", up: true },
                    { label: "Cost / MI", value: "$41", change: "-18%", accent: "var(--color-green)", up: false },
                    { label: "Conv. Rate", value: "8.7%", change: "+3.2%", accent: "var(--color-gold)", up: true },
                  ].map((card, i) => (
                    <div key={i} className="rounded-xl p-2 sm:p-2.5 border transition-all duration-600" style={{ borderColor: "var(--border-subtle)", background: "var(--color-light)", transitionDelay: `${600 + i * 100}ms`, opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(10px)" }}>
                      <div className="text-[9px] sm:text-[10px]" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>{card.label}</div>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm sm:text-base font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)", lineHeight: 1 }}>{card.value}</span>
                        <span className="text-[9px] font-semibold flex items-center gap-0.5" style={{ color: card.accent, fontFamily: "var(--font-heading)" }}>
                          <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d={card.up ? "M4 7V1M4 1L1.5 3.5M4 1L6.5 3.5" : "M4 1V7M4 7L1.5 4.5M4 7L6.5 4.5"} stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                          {card.change}
                        </span>
                      </div>
                      <svg viewBox="0 0 80 20" className="w-full h-3 mt-1" preserveAspectRatio="none">
                        <path d={i === 0 ? "M0 18 C10 16, 20 14, 30 12 S50 6, 60 4 S75 2, 80 1" : i === 1 ? "M0 4 C10 6, 20 10, 30 12 S50 16, 60 14 S75 8, 80 6" : "M0 16 C10 14, 20 10, 30 8 S50 5, 60 3 S75 2, 80 1"} fill="none" stroke={card.accent} strokeWidth="1.5" strokeLinecap="round" style={{ strokeDasharray: 120, strokeDashoffset: isVisible ? 0 : 120, transition: "stroke-dashoffset 1.5s cubic-bezier(0.16,1,0.3,1)", transitionDelay: `${900 + i * 150}ms` }} />
                      </svg>
                    </div>
                  ))}
                </div>

                {/* Chart + Feed */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-[1.5fr_1fr] gap-2 min-h-0">
                  {/* Chart */}
                  <div className="relative rounded-xl border overflow-hidden transition-all duration-600" style={{ borderColor: "var(--border-subtle)", background: "var(--color-light)", transitionDelay: "800ms", opacity: isVisible ? 1 : 0 }}>
                    <div className="flex items-center justify-between px-3 pt-2">
                      <span className="text-[10px] sm:text-[11px] font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>Revenue Attribution</span>
                      <div className="flex gap-2">
                        {[{ l: "Meta", c: "var(--color-blue)" }, { l: "Google", c: "var(--color-gold)" }, { l: "Organic", c: "var(--color-green)" }].map((leg) => (
                          <span key={leg.l} className="flex items-center gap-0.5 text-[8px]" style={{ color: "var(--text-tertiary)" }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: leg.c }} />{leg.l}
                          </span>
                        ))}
                      </div>
                    </div>
                    <svg viewBox="0 0 400 140" className="w-full" preserveAspectRatio="none" style={{ display: "block", height: "calc(100% - 24px)" }}>
                      {[35, 60, 85, 110, 135].map((y) => (<line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(0,0,0,0.03)" />))}
                      {[{ y: 38, l: "$15k" }, { y: 63, l: "$10k" }, { y: 88, l: "$5k" }, { y: 113, l: "$2k" }].map((a) => (<text key={a.y} x="8" y={a.y} fontSize="7" fill="rgba(0,0,0,0.18)" fontFamily="var(--font-heading)">{a.l}</text>))}
                      <defs>
                        <linearGradient id="hcfb" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(106,155,204,0.15)" /><stop offset="100%" stopColor="rgba(106,155,204,0)" /></linearGradient>
                        <linearGradient id="hcfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(181,139,63,0.12)" /><stop offset="100%" stopColor="rgba(181,139,63,0)" /></linearGradient>
                        <linearGradient id="hcfgr" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="rgba(120,140,93,0.1)" /><stop offset="100%" stopColor="rgba(120,140,93,0)" /></linearGradient>
                      </defs>
                      <path d="M30 110 C60 105,100 90,140 78 S220 55,280 42 S350 30,395 22 L395 140 L30 140Z" fill="url(#hcfb)" className="transition-opacity duration-1000" style={{ opacity: isVisible ? 1 : 0, transitionDelay: "1000ms" }} />
                      <path d="M30 110 C60 105,100 90,140 78 S220 55,280 42 S350 30,395 22" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" style={{ strokeDasharray: 600, strokeDashoffset: isVisible ? 0 : 600, transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", transitionDelay: "900ms" }} />
                      <path d="M30 120 C60 118,100 108,140 98 S220 80,280 68 S350 52,395 40 L395 140 L30 140Z" fill="url(#hcfg)" className="transition-opacity duration-1000" style={{ opacity: isVisible ? 1 : 0, transitionDelay: "1100ms" }} />
                      <path d="M30 120 C60 118,100 108,140 98 S220 80,280 68 S350 52,395 40" fill="none" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" style={{ strokeDasharray: 600, strokeDashoffset: isVisible ? 0 : 600, transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", transitionDelay: "1000ms" }} />
                      <path d="M30 128 C60 126,100 120,140 112 S220 98,280 88 S350 72,395 62 L395 140 L30 140Z" fill="url(#hcfgr)" className="transition-opacity duration-1000" style={{ opacity: isVisible ? 1 : 0, transitionDelay: "1200ms" }} />
                      <path d="M30 128 C60 126,100 120,140 112 S220 98,280 88 S350 72,395 62" fill="none" stroke="var(--color-green)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="4 3" style={{ strokeDashoffset: isVisible ? 0 : 600, transition: "stroke-dashoffset 2s cubic-bezier(0.16,1,0.3,1)", transitionDelay: "1100ms" }} />
                      <circle cx="395" cy="22" r="3.5" fill="var(--color-blue)" className="transition-opacity duration-500" style={{ opacity: isVisible ? 1 : 0, transitionDelay: "2200ms" }} />
                      <circle cx="395" cy="40" r="3.5" fill="var(--color-gold)" className="transition-opacity duration-500" style={{ opacity: isVisible ? 1 : 0, transitionDelay: "2300ms" }} />
                      <circle cx="395" cy="62" r="3" fill="var(--color-green)" className="transition-opacity duration-500" style={{ opacity: isVisible ? 1 : 0, transitionDelay: "2400ms" }} />
                    </svg>
                  </div>

                  {/* Live feed */}
                  <div className="hidden sm:flex flex-col rounded-xl border overflow-hidden transition-all duration-600" style={{ borderColor: "var(--border-subtle)", background: "var(--color-light)", transitionDelay: "900ms", opacity: isVisible ? 1 : 0 }}>
                    <div className="flex items-center gap-1.5 px-3 pt-2 pb-1">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--color-green)", animation: "hero-live-dot 2s ease-in-out infinite" }} />
                      <span className="text-[10px] sm:text-[11px] font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>Live Activity</span>
                    </div>
                    <div className="flex-1 px-1.5 pb-1.5 overflow-hidden">
                      <LiveFeed isVisible={isVisible} />
                    </div>
                  </div>
                </div>

                {/* Campaign row */}
                <div className="grid grid-cols-3 gap-2 transition-all duration-600" style={{ transitionDelay: "1000ms", opacity: isVisible ? 1 : 0, transform: isVisible ? "translateY(0)" : "translateY(8px)" }}>
                  {[
                    { name: "FB — Climate", movins: "14", bar: "82%", color: "var(--color-blue)" },
                    { name: "Google — 10x10", movins: "11", bar: "65%", color: "var(--color-gold)" },
                    { name: "IG — Free Mo.", movins: "9", bar: "52%", color: "var(--color-green)" },
                  ].map((c, i) => (
                    <div key={i} className="rounded-lg border p-1.5 sm:p-2" style={{ borderColor: "var(--border-subtle)", background: "var(--color-light)" }}>
                      <div className="text-[9px] sm:text-[10px] font-semibold truncate" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>{c.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border-subtle)" }}>
                          <div className="h-full rounded-full transition-all duration-1200" style={{ background: c.color, width: isVisible ? c.bar : "0%", transitionDelay: `${1300 + i * 150}ms` }} />
                        </div>
                        <span className="text-[8px] sm:text-[9px] font-bold flex-shrink-0" style={{ color: c.color, fontFamily: "var(--font-heading)" }}>{c.movins} MI</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating pills — desktop */}
      {[
        { label: "Meta Ads", icon: Megaphone, pos: { top: "2%", right: "-5%" }, bg: "rgba(106,155,204,0.08)", border: "rgba(106,155,204,0.25)", color: "#5a8bb8", anim: "hero-float-a", dur: "4s", ad: "0s", td: "1400ms" },
        { label: "Landing Pages", icon: FileText, pos: { top: "40%", right: "-8%" }, bg: "rgba(181,139,63,0.06)", border: "rgba(181,139,63,0.25)", color: "var(--color-gold)", anim: "hero-float-b", dur: "3.5s", ad: "1s", td: "1550ms" },
        { label: "Attribution", icon: Target, pos: { bottom: "18%", right: "-4%" }, bg: "rgba(120,140,93,0.08)", border: "rgba(120,140,93,0.25)", color: "#6a7d50", anim: "hero-float-a", dur: "3.8s", ad: "1.8s", td: "1700ms" },
        { label: "storEDGE", icon: Zap, pos: { bottom: "5%", left: "-3%" }, bg: "rgba(140,120,180,0.06)", border: "rgba(140,120,180,0.25)", color: "#8a70b0", anim: "hero-float-b", dur: "4.2s", ad: "0.5s", td: "1850ms" },
      ].map((pill) => {
        const PillIcon = pill.icon;
        return (
          <div key={pill.label} className="absolute hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border shadow-sm transition-all duration-700" style={{ ...pill.pos, background: pill.bg, borderColor: pill.border, color: pill.color, fontFamily: "var(--font-heading)", animation: `${pill.anim} ${pill.dur} ease-in-out infinite`, animationDelay: pill.ad, transitionDelay: pill.td, opacity: isVisible ? 1 : 0, scale: isVisible ? "1" : "0.8" }}>
            <PillIcon size={12} /> {pill.label}
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
  "THE LAST AGENCY SHOWED YOU CLICKS YOU ASKED ABOUT MOVE-INS THEY CHANGED THE SUBJECT",
  "YOU'RE PAYING $200 PER MOVE-IN AND CALLING IT BRAND AWARENESS",
  "YOUR MANAGER JUST ASKED WHAT ROAS MEANS AND NOBODY IN THE ROOM KNEW",
  "DRONE FOOTAGE OF YOUR ROOF HAS 200 VIEWS AND ZERO RESERVATIONS",
  "YOU JUST PAID GOOGLE $6 SO SOMEONE COULD CLICK YOUR AD TO PAY THEIR BILL",
  "EXTRA SPACE IS RUNNING 14 CAMPAIGNS IN YOUR ZIP CODE AND YOU'RE RUNNING VIBES",
  "YOUR BEST AD GOT 3 LIKES AND TWO WERE EMPLOYEES",
  "YOU'VE BEEN ABOUT TO LAUNCH A CAMPAIGN SINCE Q2 OF LAST YEAR",
  "YOUR SPAREFOOT LISTING IS DOING MORE WORK THAN YOUR ENTIRE MARKETING BUDGET",
  "THE MARKETING MEETING WAS YOU AND YOUR MANAGER STARING AT GOOGLE REVIEWS",
];

function BecauseLetterboard() {
  return (
    <div
      className="relative border-t overflow-hidden"
      style={{ borderColor: "var(--border-subtle)", background: "var(--color-dark)" }}
    >
      <div className="max-w-[1280px] mx-auto px-3 sm:px-6 lg:px-10 py-8 sm:py-12 text-center">
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
            style={{ fontFamily: "var(--font-heading)", color: "rgba(250,249,245,0.25)" }}
          >
            because
          </span>
        </div>

        {/* Split-flap display — 30 cols x 3 rows, word-wrapped */}
        <SplitFlapComponent messages={BECAUSE_MESSAGES} cols={30} rows={3} holdTime={4500} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HERO — Main Export
   ═══════════════════════════════════════════ */

export default function Hero() {
  const { ref, isVisible } = useInView(0.02);
  const { ref: statsRef, isVisible: statsVisible } = useInView(0.1);
  const { ref: capsRef, isVisible: capsVisible } = useInView(0.1);
  const typedText = useTypewriter(TYPEWRITER_WORDS, isVisible);

  return (
    <section id="hero" aria-label="StorageAds — full-funnel demand engine for self-storage" className="relative overflow-hidden" style={{ background: "var(--color-light)" }}>
      <HeroStyles />
      <DotGrid />

      {/* ── Hero content ── */}
      <div ref={ref} className="relative w-full pt-24 sm:pt-28 lg:pt-32 pb-10 lg:pb-14 px-7 sm:px-10 lg:px-14">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-10 lg:gap-14 items-center max-w-[1280px] mx-auto">

          {/* ── Left column ── */}
          <div className="text-center lg:text-left max-w-xl mx-auto lg:mx-0">
            {/* Headline */}
            <h1
              className={`font-black transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ fontSize: "clamp(1.85rem, 5vw, 3.25rem)", lineHeight: 1.12, letterSpacing: "-0.03em", fontFamily: "var(--font-heading)" }}
            >
              The marketing system that{" "}
              <span className="relative inline-block">
                <span style={{ background: "linear-gradient(135deg, var(--color-gold), #D4A853, var(--color-gold-hover))", backgroundSize: "200% 200%", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: "hero-gradient-shift 3s ease-in-out infinite" }}>
                  proves
                </span>
                <span className="absolute bottom-0 left-0 h-[3px] rounded-full" style={{ background: "linear-gradient(90deg, var(--color-gold), var(--color-gold-hover))", animation: isVisible ? "hero-underline-draw 0.8s ease-out 0.6s both" : "none", width: 0 }} />
              </span>{" "}
              which ads produce move-ins.
            </h1>

            {/* Typewriter */}
            <div className={`mt-3 h-8 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: "200ms" }}>
              <span className="text-lg sm:text-xl font-semibold" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>{typedText}</span>
              <span className="inline-block w-0.5 h-5 ml-0.5 align-middle rounded-full" style={{ background: "var(--color-gold)", animation: "hero-pulse 1s ease-in-out infinite" }} />
            </div>

            {/* Subheadline */}
            <p
              className={`mt-2.5 text-[15px] sm:text-base transition-all duration-1000 mx-auto lg:mx-0 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
              style={{ color: "var(--text-secondary)", lineHeight: 1.55, transitionDelay: "350ms", maxWidth: "460px" }}
            >
              Ad-specific landing pages with embedded rental flow. Full-funnel attribution from impression to signed lease. Every dollar accounted for.
            </p>

            {/* Pipeline flow — shows the Ad → Page → Reserve → Move-in journey */}
            <div className="mt-6 mb-6">
              <PipelineFlow isVisible={isVisible} />
            </div>

            {/* CTAs */}
            <div className={`flex flex-col sm:flex-row items-center lg:items-start gap-3 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: "500ms" }}>
              <a href="#cta" className="btn-primary text-base group">
                Get a Free Facility Audit
                <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </a>
              <a href={CALCOM_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border font-semibold text-base transition-all hover:border-[var(--color-gold)]/30 hover:shadow-sm" style={{ borderColor: "var(--border-medium)", color: "var(--text-secondary)", fontFamily: "var(--font-heading)" }}>
                <Play size={14} style={{ color: "var(--color-gold)" }} />
                See How It Works
              </a>
            </div>

            {/* Trust signals */}
            <div className={`mt-6 transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: "650ms" }}>
              <div className="flex items-center gap-4 justify-center lg:justify-start flex-wrap">
                {[
                  { icon: ShieldCheck, text: "Operator-founded" },
                  { icon: Layers, text: "storEDGE integrated" },
                  { icon: Globe, text: "50+ facilities" },
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
          <DashboardMockup isVisible={isVisible} />
        </div>
      </div>

      {/* Scroll indicator */}
      <div className={`flex justify-center pb-6 transition-all duration-700 ${isVisible ? "opacity-100" : "opacity-0"}`} style={{ transitionDelay: "1500ms" }}>
        <a href="#problem" className="flex flex-col items-center gap-1 group" aria-label="Scroll to learn more">
          <span className="text-[11px] font-medium" style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-heading)" }}>Learn more</span>
          <ChevronDown size={16} style={{ color: "var(--text-tertiary)", animation: "hero-scroll-bounce 2s ease-in-out infinite" }} />
        </a>
      </div>

      {/* ── Stats bar ── */}
      <div ref={statsRef} className="relative border-t" style={{ borderColor: "var(--border-subtle)", background: "rgba(255,255,255,0.5)" }}>
        <div className="max-w-[1280px] mx-auto px-7 sm:px-10 lg:px-14 py-8 sm:py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {STATS.map((stat, i) => (
              <StatItem key={stat.label} stat={stat} active={statsVisible} delay={i * 120} />
            ))}
          </div>
        </div>
      </div>

      {/* ── "Because" letterboard ── */}
      <BecauseLetterboard />

      {/* ── Capabilities grid ── */}
      <div ref={capsRef} className="relative border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <div className="max-w-[1280px] mx-auto px-7 sm:px-10 lg:px-14 py-8 sm:py-10">
          <div className={`text-center mb-6 transition-all duration-700 ${capsVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
            <h2 className="text-lg sm:text-xl font-bold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
              Everything you need to <span style={{ color: "var(--color-gold)" }}>fill units</span>
            </h2>
            <p className="text-sm mt-1 mx-auto" style={{ color: "var(--text-secondary)", maxWidth: "420px" }}>
              One platform. Ads, pages, attribution, optimization — all connected.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            {CAPABILITIES.map((cap, i) => {
              const Icon = cap.icon;
              return (
                <div key={cap.label} className="flex items-start gap-2.5 p-3 sm:flex-col sm:items-center sm:text-center sm:p-3.5 rounded-xl border transition-all duration-500 hover:border-[var(--color-gold)]/25 hover:shadow-md hover:-translate-y-0.5 group cursor-default" style={{ borderColor: "var(--border-subtle)", background: "var(--bg-elevated)", transitionDelay: `${i * 60}ms`, opacity: capsVisible ? 1 : 0, transform: capsVisible ? "translateY(0)" : "translateY(16px)" }}>
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center flex-shrink-0 sm:mb-2 transition-all duration-300 group-hover:scale-110" style={{ background: "rgba(181,139,63,0.06)", border: "1px solid rgba(181,139,63,0.12)" }}>
                    <Icon size={16} style={{ color: "var(--color-gold)" }} />
                  </div>
                  <div className="min-w-0 sm:w-full">
                    <div className="text-[12px] sm:text-[13px] font-semibold leading-tight" style={{ color: "var(--color-dark)", fontFamily: "var(--font-heading)" }}>{cap.label}</div>
                    <div className="text-[10px] sm:text-[11px] mt-0.5 sm:mt-1 leading-snug" style={{ color: "var(--text-tertiary)" }}>{cap.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
