import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Sparkles, Wrench, Bug } from "lucide-react";
import { getChangelogByMonth, type ChangelogCategory } from "@/lib/changelog-data";

export const metadata: Metadata = {
  title: "Changelog",
  description:
    "Every shipped improvement to StorageAds: new features, refinements, and fixes, straight from our build log.",
  openGraph: {
    title: "Changelog | StorageAds",
    description:
      "Every shipped improvement to StorageAds: new features, refinements, and fixes.",
    url: "https://storageads.com/changelog",
  },
  twitter: {
    card: "summary_large_image",
    title: "Changelog | StorageAds",
    description: "Every shipped improvement to StorageAds.",
  },
};

const CATEGORY: Record<
  ChangelogCategory,
  { label: string; Icon: typeof Sparkles; color: string; bg: string }
> = {
  feature: {
    label: "New",
    Icon: Sparkles,
    color: "var(--color-dark)",
    bg: "var(--color-light-gray)",
  },
  improvement: {
    label: "Improved",
    Icon: Wrench,
    color: "var(--color-blue)",
    bg: "color-mix(in srgb, var(--color-blue) 12%, transparent)",
  },
  fix: {
    label: "Fixed",
    Icon: Bug,
    color: "var(--color-green)",
    bg: "color-mix(in srgb, var(--color-green) 12%, transparent)",
  },
};

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function ChangelogPage() {
  const months = getChangelogByMonth();

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--bg-void)", color: "var(--text-primary)" }}
    >
      {/* Nav */}
      <header
        className="sticky top-0 z-[100] border-b"
        style={{
          background: "var(--bg-void)",
          borderColor: "var(--border-subtle)",
        }}
      >
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <Link
            href="/"
            className="p-2 -ml-2 transition-colors"
            style={{ color: "var(--text-tertiary)" }}
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </Link>
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              letterSpacing: "-0.5px",
            }}
          >
            <span style={{ color: "var(--color-dark)" }}>storage</span>
            <span style={{ color: "var(--color-gold)" }}>ads</span>
          </span>
          <span className="text-sm ml-2" style={{ color: "var(--text-tertiary)" }}>
            / Changelog
          </span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1
          className="font-semibold mb-3"
          style={{
            fontSize: "var(--text-section-head)",
            lineHeight: "var(--leading-tight)",
            letterSpacing: "var(--tracking-tight)",
          }}
        >
          Changelog
        </h1>
        <p
          className="mb-14"
          style={{
            color: "var(--text-secondary)",
            fontSize: "var(--text-body)",
            maxWidth: "520px",
          }}
        >
          Every meaningful change we ship to StorageAds: new features,
          refinements, and fixes. Pulled straight from our build log.
        </p>

        {months.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)" }}>Nothing shipped yet.</p>
        ) : (
          <div className="space-y-14">
            {months.map((month) => (
              <section key={month.key}>
                <h2
                  className="mb-5 text-xs font-semibold uppercase"
                  style={{
                    color: "var(--text-tertiary)",
                    letterSpacing: "0.08em",
                  }}
                >
                  {month.label}
                </h2>

                <ul className="space-y-3">
                  {month.entries.map((entry) => {
                    const config = CATEGORY[entry.category] ?? CATEGORY.improvement;
                    const { Icon } = config;
                    return (
                      <li
                        key={entry.id}
                        className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                        style={{
                          borderColor: "var(--border-subtle)",
                          background: "var(--bg-elevated)",
                        }}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span
                            className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={{ color: config.color, background: config.bg }}
                          >
                            <Icon size={11} />
                            {config.label}
                          </span>
                          <span
                            className="text-sm leading-relaxed"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {entry.title}
                          </span>
                        </div>
                        <span
                          className="shrink-0 text-xs sm:pl-4"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {formatDay(entry.date)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
