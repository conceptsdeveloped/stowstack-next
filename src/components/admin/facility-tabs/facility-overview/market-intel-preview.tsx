"use client"

import { Target } from "lucide-react"

export function MarketIntelPreview({
  competitorCount,
}: {
  competitorCount: number
}) {
  return (
    <div className="border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)] px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-[var(--color-gold)]" />
          <h4 className="text-sm font-semibold text-[var(--color-dark)]">
            Market Intelligence
          </h4>
        </div>
        <span className="text-xs text-[var(--color-body-text)]">
          {competitorCount} competitor{competitorCount !== 1 ? "s" : ""}{" "}
          found
        </span>
      </div>
      <p className="text-xs text-[var(--color-mid-gray)] mt-1">
        View the Market Intel tab for full competitor analysis, demand
        drivers, and demographics.
      </p>
    </div>
  )
}
