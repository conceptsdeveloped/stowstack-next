import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  TrendingUp,
  ClipboardCheck,
  LineChart,
} from "lucide-react";
import { CAL_BOOKING_URL } from "@/lib/booking";

const title = "Free Tools for Storage Operators";
const description =
  "Free, no-signup calculators and tools for self-storage operators. Triangulate your NOI, model marketing ROI, and run a free facility audit. Built by an operator.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "https://storageads.com/tools" },
  openGraph: {
    title: `${title} | StorageAds`,
    description,
    url: "https://storageads.com/tools",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title} | StorageAds`,
    description,
  },
  robots: { index: true, follow: true },
};

type Tool = {
  href: string;
  label: string;
  blurb: string;
  cta: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  live: boolean;
};

const TOOLS: Tool[] = [
  {
    href: "/tools/noi-calculator",
    label: "NOI Calculator",
    blurb:
      "Tally your storage-specific income and operating expenses — labor, property tax, utilities, insurance, management — and triangulate net operating income, your expense ratio, per-unit economics, and what it all implies your facility is worth.",
    cta: "Open calculator",
    icon: Calculator,
    live: true,
  },
  {
    href: "/calculator",
    label: "Marketing ROI Calculator",
    blurb:
      "Plug in your units, occupancy, rate, and ad budget to model the move-ins, added revenue, and return on ad spend a marketing program can produce for your facility.",
    cta: "Open calculator",
    icon: TrendingUp,
    live: true,
  },
  {
    href: "/audit-tool",
    label: "Free Facility Marketing Audit",
    blurb:
      "Enter your facility and get a marketing diagnostic in minutes — how you show up on Google, where you're leaking move-ins, and the gaps a competitor is using against you.",
    cta: "Run the audit",
    icon: ClipboardCheck,
    live: true,
  },
  {
    href: "/diagnostic",
    label: "Visibility Diagnostic",
    blurb:
      "A quick read on how findable your facility is when someone in your market searches for storage right now.",
    cta: "Run the diagnostic",
    icon: LineChart,
    live: true,
  },
];

export default function ToolsPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-light)" }}>
      {/* ── Header ── */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(250,249,245,0.9)",
          backdropFilter: "blur(12px)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Back to homepage"
              className="p-2 -ml-2 transition-opacity hover:opacity-70"
              style={{ color: "var(--text-tertiary)" }}
            >
              <ArrowLeft size={20} />
            </Link>
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <span
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  fontSize: 17,
                  color: "var(--color-dark)",
                }}
              >
                storage<span style={{ color: "var(--brand-gold)" }}>ads</span>
              </span>
            </Link>
          </div>
          <a
            href={CAL_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-dark)",
              color: "var(--color-light)",
            }}
          >
            Book a Call
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="max-w-2xl mb-12">
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: "var(--color-mid-gray)" }}
          >
            Operator tools
          </span>
          <h1
            className="text-3xl sm:text-4xl font-bold mt-2 mb-3"
            style={{ color: "var(--color-dark)", letterSpacing: "-0.03em" }}
          >
            Free tools for storage operators
          </h1>
          <p
            className="text-base leading-relaxed"
            style={{ color: "var(--color-body-text)" }}
          >
            No signup, no email wall. Run the numbers on your facility the way an
            operator actually thinks about them. Built by people who run storage,
            tested on our own facilities first.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TOOLS.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="group rounded-2xl p-6 flex flex-col transition-all hover:-translate-y-0.5"
                style={{
                  background: "var(--color-light)",
                  border: "1px solid var(--color-light-gray)",
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span
                    className="inline-flex items-center justify-center rounded-xl h-11 w-11"
                    style={{ background: "var(--color-light-gray)" }}
                  >
                    <Icon size={20} style={{ color: "var(--color-dark)" }} />
                  </span>
                </div>
                <h2
                  className="text-lg font-semibold mb-2"
                  style={{ color: "var(--color-dark)", letterSpacing: "-0.02em" }}
                >
                  {t.label}
                </h2>
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: "var(--color-body-text)" }}
                >
                  {t.blurb}
                </p>
                <span
                  className="inline-flex items-center gap-1.5 text-sm font-medium mt-5"
                  style={{ color: "var(--color-dark)" }}
                >
                  {t.cta}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div
          className="rounded-2xl p-8 mt-12 text-center"
          style={{
            background: "var(--color-dark)",
            color: "var(--color-light)",
          }}
        >
          <h3 className="text-xl font-bold mb-2">
            Want the numbers to move in your favor?
          </h3>
          <p
            className="text-sm mb-6 max-w-md mx-auto leading-relaxed"
            style={{ color: "var(--color-mid-gray)" }}
          >
            StorageAds runs the Meta and Google ads, builds a landing page for
            every ad, and proves which campaigns filled units. One bill per
            facility per month.
          </p>
          <a
            href={CAL_BOOKING_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{
              background: "var(--color-light)",
              color: "var(--color-dark)",
            }}
          >
            Book a Call
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </main>
    </div>
  );
}
