"use client";

import {
  Truck,
  Heart,
  Home,
  Package,
  Hammer,
  Building2,
  GraduationCap,
  Car,
  Calendar,
} from "lucide-react";
import { useInView } from "./use-in-view";

const TRIGGERS = [
  {
    icon: Truck,
    title: "Moving & Relocation",
    body: "Local and long-distance moves. We know this demand from running U-Haul dealerships and a moving company.",
  },
  {
    icon: Heart,
    title: "Divorce & Life Disruption",
    body: "Urgent belongings management with high intent. These prospects convert fast if your campaign reaches them first.",
  },
  {
    icon: Home,
    title: "Downsizing",
    body: "Transitioning to smaller space. Overflow storage is mandatory, not optional. High LTV tenants.",
  },
  {
    icon: Package,
    title: "Estate Cleanouts",
    body: "Sorting inherited belongings. Temporary but high-volume. Often invisible to agencies that do not understand the demand cycle.",
  },
  {
    icon: Hammer,
    title: "Remodeling & Renovation",
    body: "Home projects require clearing rooms. Predictable seasonal demand we target proactively with pre-season campaigns.",
  },
  {
    icon: Building2,
    title: "Business Overflow",
    body: "Contractors, e-commerce sellers, small businesses needing inventory staging. Commercial tenants with longer lease durations.",
  },
  {
    icon: GraduationCap,
    title: "College Transitions",
    body: "Students cycling in and out between semesters. Repeatable annual demand we build campaign calendars around.",
  },
  {
    icon: Car,
    title: "Vehicle / RV / Boat Storage",
    body: "Seasonal vehicle storage with premium rates. We have built and operated heated indoor storage for this vertical.",
  },
  {
    icon: Calendar,
    title: "Seasonal & Overflow",
    body: "Holiday items, sports gear, off-season belongings. Consistent base demand that fills standard units year-round.",
  },
];

export default function DemandTriggers() {
  const { ref, isVisible } = useInView(0.08);

  return (
    <section
      ref={ref}
      id="demand-triggers"
      aria-label="Storage demand triggers we target with Meta ads"
      className="section"
      style={{ background: "var(--color-light)" }}
    >
      <div className="section-content">
        {/* Heading */}
        <div
          className={`max-w-3xl mx-auto text-center mb-14 sm:mb-16 transition-all duration-700 ${
            isVisible
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4"
          }`}
        >
          <h2
            className="font-semibold"
            style={{
              fontSize: "var(--text-section-head)",
              color: "var(--text-primary)",
              fontFamily: "var(--font-heading)",
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
            }}
          >
            We understand storage demand because we see these triggers in our
            own facilities every week.
          </h2>
          <p
            className="mt-5 mx-auto"
            style={{
              color: "var(--text-secondary)",
              fontSize: "var(--text-body)",
              lineHeight: "var(--leading-normal)",
              maxWidth: "62ch",
            }}
          >
            This is not abstract persona work. It is lived operational
            intelligence. Meta lets us put your facility in front of these
            prospects before they ever open Google.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {TRIGGERS.map((trigger, i) => {
            const Icon = trigger.icon;
            return (
              <div
                key={trigger.title}
                className={`group relative rounded-2xl border p-6 transition-all duration-500 hover:-translate-y-0.5 ${
                  isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-4"
                }`}
                style={{
                  borderColor: "var(--border-subtle)",
                  background: "var(--color-light-gray)",
                  transitionDelay: `${150 + i * 60}ms`,
                }}
              >
                {/* Icon tile */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors"
                  style={{
                    background: "color-mix(in srgb, var(--color-green) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--color-green) 25%, transparent)",
                  }}
                >
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    style={{ color: "var(--color-green)" }}
                  />
                </div>

                {/* Title */}
                <h3
                  className="font-semibold mb-2"
                  style={{
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-heading)",
                    fontSize: "1.0625rem",
                    letterSpacing: "-0.01em",
                    lineHeight: 1.3,
                  }}
                >
                  {trigger.title}
                </h3>

                {/* Body */}
                <p
                  style={{
                    color: "var(--text-secondary)",
                    fontSize: "0.875rem",
                    lineHeight: 1.55,
                  }}
                >
                  {trigger.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
