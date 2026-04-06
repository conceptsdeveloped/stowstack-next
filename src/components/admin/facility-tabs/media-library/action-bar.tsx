"use client"

import { useState } from "react"
import {
  Loader2,
  Globe,
  Image as ImageIcon,
  Plus,
  Link,
} from "lucide-react"

interface ActionBarProps {
  adminKey: string
  facilityId: string
  onAssetAdded: (asset: { id: string; facility_id: string; created_at: string; type: string; source: string; url: string; metadata: Record<string, unknown> | null }) => void
  onScrapeResult: (result: {
    images?: { url: string; alt: string }[]
    videos?: { url: string; type: string }[]
    contact?: { phones: string[]; emails: string[] }
    headings?: string[]
    pagesScraped?: number
    pagesCrawled?: string[]
    pageCopy?: string[]
    services?: { heading?: string; description?: string }[]
    promotions?: { text: string }[]
  } | null) => void
  onAssetsRefreshed: (assets: { id: string; facility_id: string; created_at: string; type: string; source: string; url: string; metadata: Record<string, unknown> | null }[]) => void
  onError: (msg: string) => void
  showLibrary: boolean
  onToggleLibrary: () => void
}

export function ActionBar({
  adminKey,
  facilityId,
  onAssetAdded,
  onScrapeResult,
  onAssetsRefreshed,
  onError,
  showLibrary,
  onToggleLibrary,
}: ActionBarProps) {
  const [scrapeUrl, setScrapeUrl] = useState("")
  const [scraping, setScraping] = useState(false)
  const [addUrl, setAddUrl] = useState("")
  const [addingUrl, setAddingUrl] = useState(false)

  async function addAssetByUrl(url: string, source = "manual") {
    try {
      const res = await fetch("/api/facility-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          url,
          type: "photo",
          source,
          metadata: {},
        }),
      })
      const data = await res.json()
      if (data.asset) onAssetAdded(data.asset)
    } catch {
      onError("Failed to add asset. Please check the URL and try again.")
    }
  }

  async function handleAddUrl() {
    if (!addUrl.trim()) return
    setAddingUrl(true)
    await addAssetByUrl(addUrl.trim(), "manual")
    setAddUrl("")
    setAddingUrl(false)
  }

  async function scrapeWebsite() {
    if (!scrapeUrl.trim()) return
    setScraping(true)
    onScrapeResult(null)
    try {
      const res = await fetch("/api/scrape-website", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ url: scrapeUrl.trim(), facilityId }),
      })
      const data = await res.json()
      if (data.scraped) {
        onScrapeResult(data)
        // Refresh assets since scraping may auto-save some
        const assetsRes = await fetch(
          `/api/facility-assets?facilityId=${facilityId}`,
          { headers: { "X-Admin-Key": adminKey } }
        )
        const assetsData = await assetsRes.json()
        if (assetsData.assets) onAssetsRefreshed(assetsData.assets)
      } else {
        onScrapeResult({
          images: [],
          headings: [data.error || "Scrape returned no data"],
        })
      }
    } catch {
      onScrapeResult({
        images: [],
        headings: ["Scrape request failed. Check the URL and try again."],
      })
    } finally {
      setScraping(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Website scraper row */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[280px]">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Globe
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-mid-gray)]"
              />
              <input
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") scrapeWebsite()
                }}
                placeholder="Enter facility website URL to scrape..."
                className="w-full pl-9 pr-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-elevated)] text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 focus:ring-1 focus:ring-[var(--color-gold)]/25"
              />
            </div>
            <button
              onClick={scrapeWebsite}
              disabled={scraping || !scrapeUrl.trim()}
              className="flex items-center gap-1.5 px-4 py-2 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded-lg hover:bg-[var(--color-gold)]/90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
            >
              {scraping ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Globe size={14} />
              )}
              {scraping ? "Scraping..." : "Scrape"}
            </button>
          </div>
        </div>

        {/* Stock library toggle */}
        <button
          onClick={onToggleLibrary}
          className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg border transition-colors ${
            showLibrary
              ? "bg-[var(--color-gold)] text-[var(--color-light)] border-[var(--color-gold)]"
              : "border-[var(--border-subtle)] text-[var(--color-body-text)] hover:bg-[var(--color-light-gray)]"
          }`}
        >
          <ImageIcon size={14} />
          Stock Library
        </button>
      </div>

      {/* URL-based asset add row */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Link
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-mid-gray)]"
          />
          <input
            value={addUrl}
            onChange={(e) => setAddUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddUrl()
            }}
            placeholder="Paste image URL to add to library..."
            className="w-full pl-9 pr-3 py-2 border border-[var(--border-subtle)] rounded-lg text-sm bg-[var(--bg-elevated)] text-[var(--color-dark)] placeholder:text-[var(--color-mid-gray)] focus:outline-none focus:border-[var(--color-gold)]/50 focus:ring-1 focus:ring-[var(--color-gold)]/25"
          />
        </div>
        <button
          onClick={handleAddUrl}
          disabled={addingUrl || !addUrl.trim()}
          className="flex items-center gap-1.5 px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--color-dark)] text-xs font-medium rounded-lg hover:bg-[var(--color-light-gray)] disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap transition-colors"
        >
          {addingUrl ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Plus size={14} />
          )}
          Add Image
        </button>
      </div>
    </div>
  )
}
