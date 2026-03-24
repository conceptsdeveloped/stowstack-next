"use client";

import { ArrowRight, Shield, Zap, Target, BarChart3, Megaphone } from "lucide-react";
import { useInView } from "./use-in-view";
import AnimatedTextCycle from "@/components/animated-text-cycle";

const CALCOM_URL =
  process.env.NEXT_PUBLIC_CALCOM_LINK || "https://cal.com/stowstack/30min";

const BADGES = [
  { icon: Shield, label: "Operator-Founded" },
  { icon: Zap, label: "storEDGE Integrated" },
  { icon: Target, label: "Full-Funnel Attribution" },
  { icon: BarChart3, label: "Revenue-Based A/B Testing" },
  { icon: Megaphone, label: "Meta Ads Specialists" },
];

export default function Hero() {
  const { ref, isVisible } = useInView(0.1);

  return (
    <section
      id="hero"
      aria-label="Hero — full-funnel demand engine for self-storage"
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "var(--bg-void)" }}
    >
      {/* Ambient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.04), transparent 70%)",
        }}
      />

      <div
        ref={ref}
        className="relative section-content text-center py-20 md:py-32 px-6"
      >
        {/* Operator badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-sm font-medium mb-8 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
          style={{
            background: "var(--accent-glow)",
            borderColor: "rgba(59,130,246,0.3)",
            color: "#93c5fd",
          }}
        >
          Built by an operator. Tested at my own facilities first.
        </div>

        {/* Headline */}
        <h1
          className={`mx-auto max-w-5xl font-black transition-all duration-1000 delay-200 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
          style={{
            fontSize: "var(--text-hero)",
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          Stop losing units to{" "}
          <AnimatedTextCycle
            words={[
              "bad marketing",
              "invisible ads",
              "broken attribution",
              "wasted ad spend",
              "slow landing pages",
            ]}
            interval={2800}
          />
          <br />
          <span style={{ color: "var(--text-primary)" }}>
            Start proving every dollar.
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className={`mx-auto max-w-3xl mt-6 text-lg md:text-xl transition-all duration-1000 delay-400 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
          style={{
            color: "var(--text-secondary)",
            lineHeight: "var(--leading-normal)",
          }}
        >
          StorageAds is a full-funnel acquisition and conversion system for
          self-storage. Ad-specific landing pages, embedded reservation,
          and full attribution — from ad click to move-in.
        </p>

        {/* CTAs */}
        <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 transition-all duration-1000 delay-600 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          <a href="#cta" className="btn-primary text-lg">
            Get a Free Facility Audit
            <ArrowRight size={18} />
          </a>
          <a
            href={CALCOM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg border font-semibold transition-all"
            style={{
              borderColor: "var(--border-medium)",
              color: "var(--text-secondary)",
            }}
          >
            Book a Strategy Call
          </a>
        </div>

        {/* Credential badges */}
        <div
          className={`flex flex-wrap items-center justify-center gap-3 mt-12 transition-all duration-1000 delay-800 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-6"
          }`}
        >
          {BADGES.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium"
                style={{
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-tertiary)",
                }}
              >
                <Icon size={12} />
                {badge.label}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce" aria-hidden="true">
        <div
          className="w-6 h-10 rounded-full border-2 flex justify-center pt-2"
          style={{ borderColor: "var(--border-medium)" }}
        >
          <div
            className="w-1 h-2 rounded-full"
            style={{ background: "var(--text-tertiary)" }}
          />
        </div>
      </div>
    </section>
  );
}
