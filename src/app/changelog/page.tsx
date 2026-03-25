"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles, Wrench, Zap } from "lucide-react";

type ChangelogType = "feature" | "improvement" | "fix";

interface ChangelogEntry {
  id: string;
  date: string;
  type: ChangelogType;
  title: string;
  description: string;
}

const TYPE_CONFIG: Record<ChangelogType, { label: string; color: string; bg: string; icon: typeof Sparkles }> = {
  feature: { label: "New", color: "var(--color-gold)", bg: "var(--color-gold-light)", icon: Sparkles },
  improvement: { label: "Improved", color: "var(--color-blue)", bg: "rgba(106,155,204,0.15)", icon: Zap },
  fix: { label: "Fixed", color: "var(--color-green)", bg: "rgba(120,140,93,0.15)", icon: Wrench },
};

// Changelog entries — extend this array as new features ship
const ENTRIES: ChangelogEntry[] = [
  {
    id: "1",
    date: "2026-03-24",
    type: "feature",
    title: "Multi-facility dashboard",
    description: "Switch between facilities with the new sidebar selector. View global roll-up stats or drill into individual facility performance.",
  },
  {
    id: "2",
    date: "2026-03-24",
    type: "feature",
    title: "Campaign creation wizard",
    description: "Create campaigns with a guided 6-step wizard. Set budget, targeting, creative, and landing page — all in one flow.",
  },
  {
    id: "3",
    date: "2026-03-24",
    type: "feature",
    title: "Command palette",
    description: "Press ⌘K to search campaigns, navigate pages, or run quick actions. Keyboard-first navigation across the entire dashboard.",
  },
  {
    id: "4",
    date: "2026-03-24",
    type: "improvement",
    title: "Settings redesign",
    description: "Settings page rebuilt with tabbed navigation. Profile, integrations, notifications, billing, team, and data management — all organized.",
  },
  {
    id: "5",
    date: "2026-03-24",
    type: "feature",
    title: "Full-funnel attribution",
    description: "storEDGE embed integration with complete tracking from ad click → landing page → reservation → move-in. Every dollar accounted for.",
  },
];

export default function ChangelogPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--color-light)" }}>
      <header className="border-b" style={{ borderColor: "var(--color-light-gray)" }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center gap-3">
          <Link href="/" className="text-lg font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
            <span>storage</span><span style={{ color: "var(--color-gold)" }}>ads</span>
          </Link>
          <span style={{ color: "var(--color-mid-gray)" }}>/</span>
          <span className="text-sm" style={{ fontFamily: "var(--font-heading)", color: "var(--color-mid-gray)" }}>Changelog</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-semibold mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
          Changelog
        </h1>
        <p className="text-base mb-10" style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)" }}>
          What's new in StorageAds. Features, improvements, and fixes.
        </p>

        <div className="space-y-8">
          {ENTRIES.map((entry) => {
            const typeCfg = TYPE_CONFIG[entry.type];
            const Icon = typeCfg.icon;
            return (
              <div key={entry.id} className="flex gap-4">
                <div className="shrink-0 pt-1">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: typeCfg.bg }}
                  >
                    <Icon className="h-4 w-4" style={{ color: typeCfg.color }} />
                  </div>
                </div>
                <div className="min-w-0 flex-1 pb-8 border-b" style={{ borderColor: "var(--color-light-gray)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ fontFamily: "var(--font-heading)", color: typeCfg.color, backgroundColor: typeCfg.bg }}
                    >
                      {typeCfg.label}
                    </span>
                    <span className="text-xs" style={{ fontFamily: "var(--font-body)", color: "var(--color-mid-gray)" }}>
                      {new Date(entry.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <h3 className="text-base font-medium mb-1" style={{ fontFamily: "var(--font-heading)", color: "var(--color-dark)" }}>
                    {entry.title}
                  </h3>
                  <p className="text-sm" style={{ fontFamily: "var(--font-body)", color: "var(--color-body-text)", lineHeight: 1.6 }}>
                    {entry.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
