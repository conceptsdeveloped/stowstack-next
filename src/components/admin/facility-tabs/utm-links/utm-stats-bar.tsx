"use client"

import { Search, Plus, Download } from "lucide-react"
import type { UTMLink } from "./types"
import { buildDestinationUrl } from "./utm-link-card"

const PROD_URL = "https://storageads.com"

interface UTMStatsBarProps {
  links: UTMLink[]
  filteredLinks: UTMLink[]
  searchQuery: string
  onSearchChange: (query: string) => void
  filterSource: string
  onFilterSourceChange: (source: string) => void
  sortBy: "date" | "clicks" | "name"
  onSortByChange: (sort: "date" | "clicks" | "name") => void
  uniqueSources: string[]
  showForm: boolean
  onToggleForm: () => void
}

export default function UTMStatsBar({
  links,
  filteredLinks,
  searchQuery,
  onSearchChange,
  filterSource,
  onFilterSourceChange,
  sortBy,
  onSortByChange,
  uniqueSources,
  showForm,
  onToggleForm,
}: UTMStatsBarProps) {
  const inputCls =
    "w-full px-3 py-2 rounded-lg border text-sm bg-[var(--color-light)] border-[var(--border-subtle)] text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:border-[var(--color-gold)]/50 outline-none transition-all"

  const totalClicks = links.reduce(
    (sum, l) => sum + (l.click_count || 0),
    0
  )
  const topLink = links.length
    ? links.reduce(
        (top, l) =>
          (l.click_count || 0) > (top.click_count || 0) ? l : top,
        links[0]
      )
    : null

  const exportCSV = () => {
    const headers = [
      "Label",
      "Landing Page",
      "Source",
      "Medium",
      "Campaign",
      "Content",
      "Term",
      "Tracking URL",
      "Destination URL",
      "Clicks",
      "Created",
      "Last Click",
    ]
    const rows = filteredLinks.map((l) => [
      l.label,
      l.landing_page_title || "Homepage",
      l.utm_source,
      l.utm_medium,
      l.utm_campaign || "",
      l.utm_content || "",
      l.utm_term || "",
      `${PROD_URL}/api/r?c=${l.short_code}`,
      buildDestinationUrl(l),
      l.click_count || 0,
      new Date(l.created_at || "").toLocaleDateString(),
      l.last_clicked_at
        ? new Date(l.last_clicked_at).toLocaleDateString()
        : "",
    ])
    const csv = [headers, ...rows]
      .map((r) =>
        r
          .map((c) => `"${String(c).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `utm-links-${new Date().toISOString().split("T")[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-dark)]">
            UTM Link Builder
          </h3>
          <p className="text-xs text-[var(--color-mid-gray)]">
            Create tracked links for campaigns and measure click-through
            performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {links.length > 0 && (
            <button
              onClick={exportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg border border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)] transition-colors"
              title="Export links as CSV"
            >
              <Download size={14} />
              CSV
            </button>
          )}
          <button
            onClick={onToggleForm}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-gold)] text-[var(--color-light)] text-sm font-medium rounded-lg hover:bg-[var(--color-gold)]/90 transition-colors"
          >
            <Plus size={14} />
            {showForm ? "Cancel" : "New Link"}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {links.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--bg-elevated)]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
              Total Links
            </p>
            <p className="text-lg font-semibold text-[var(--color-dark)]">
              {links.length}
            </p>
          </div>
          <div className="border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--bg-elevated)]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
              Total Clicks
            </p>
            <p className="text-lg font-semibold text-[var(--color-dark)]">
              {totalClicks}
            </p>
          </div>
          <div className="border border-[var(--border-subtle)] rounded-lg p-3 bg-[var(--bg-elevated)]">
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-mid-gray)]">
              Top Performer
            </p>
            <p className="text-sm font-semibold text-[var(--color-dark)] truncate">
              {topLink && (topLink.click_count || 0) > 0
                ? topLink.label
                : "--"}
            </p>
            {topLink && (topLink.click_count || 0) > 0 && (
              <p className="text-xs text-[var(--color-mid-gray)]">
                {topLink.click_count} clicks
              </p>
            )}
          </div>
        </div>
      )}

      {/* Search + filter + sort bar */}
      {links.length > 1 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex-1 min-w-[180px]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-mid-gray)]"
              />
              <input
                className={`${inputCls} pl-8`}
                placeholder="Search links..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
            </div>
          </div>
          <select
            className={`px-3 py-2 rounded-lg border text-sm bg-[var(--color-light)] border-[var(--border-subtle)] text-[var(--color-dark)] outline-none`}
            value={filterSource}
            onChange={(e) => onFilterSourceChange(e.target.value)}
          >
            <option value="all">All sources</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            className={`px-3 py-2 rounded-lg border text-sm bg-[var(--color-light)] border-[var(--border-subtle)] text-[var(--color-dark)] outline-none`}
            value={sortBy}
            onChange={(e) =>
              onSortByChange(e.target.value as "date" | "clicks" | "name")
            }
          >
            <option value="date">Newest first</option>
            <option value="clicks">Most clicks</option>
            <option value="name">A-Z</option>
          </select>
        </div>
      )}
    </>
  )
}
