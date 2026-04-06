"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, Image as ImageIcon, X } from "lucide-react"

import type { Asset, ScrapeResult } from "./media-library/types"
import { ActionBar } from "./media-library/action-bar"
import { ScrapeResults } from "./media-library/scrape-results"
import { StockLibrary } from "./media-library/stock-library"
import { AssetGrid } from "./media-library/asset-grid"

export default function MediaLibrary({
  facilityId,
  adminKey,
}: {
  facilityId: string
  adminKey: string
}) {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null)
  const [showLibrary, setShowLibrary] = useState(false)

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/facility-assets?facilityId=${facilityId}`,
        { headers: { "X-Admin-Key": adminKey } }
      )
      const data = await res.json()
      if (data.assets) setAssets(data.assets)
      else setError(data.error || "Failed to load assets")
    } catch {
      setError("Failed to load assets")
    } finally {
      setLoading(false)
    }
  }, [facilityId, adminKey])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  function handleAssetAdded(asset: Asset) {
    setAssets((prev) => [asset, ...prev])
  }

  function handleAssetDeleted(assetId: string) {
    setAssets((prev) => prev.filter((a) => a.id !== assetId))
  }

  async function handleAddScrapedImage(img: { url: string; alt: string }) {
    try {
      const res = await fetch("/api/facility-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          url: img.url,
          type: "photo",
          source: "website_scrape",
          metadata: {},
        }),
      })
      const data = await res.json()
      if (data.asset) setAssets((prev) => [data.asset, ...prev])
    } catch {
      setError("Failed to add asset. Please check the URL and try again.")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  if (error && assets.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => {
            setError(null)
            setLoading(true)
            fetchAssets()
          }}
          className="mt-3 text-xs text-[var(--color-gold)] hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 mb-4">
          <p className="flex-1 text-sm text-red-300">{error}</p>
          <button type="button" onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <ActionBar
        adminKey={adminKey}
        facilityId={facilityId}
        onAssetAdded={handleAssetAdded}
        onScrapeResult={setScrapeResult}
        onAssetsRefreshed={setAssets}
        onError={setError}
        showLibrary={showLibrary}
        onToggleLibrary={() => setShowLibrary((v) => !v)}
      />

      {scrapeResult && (
        <ScrapeResults
          scrapeResult={scrapeResult}
          assets={assets}
          onAddScrapedImage={handleAddScrapedImage}
          onDismiss={() => setScrapeResult(null)}
        />
      )}

      {showLibrary && (
        <StockLibrary
          adminKey={adminKey}
          facilityId={facilityId}
          assets={assets}
          onAssetAdded={handleAssetAdded}
          onError={setError}
        />
      )}

      <AssetGrid
        assets={assets}
        adminKey={adminKey}
        onAssetDeleted={handleAssetDeleted}
        onError={setError}
      />

      {assets.length === 0 && !scrapeResult && !showLibrary && (
        <div className="text-center py-12">
          <div className="mx-auto w-12 h-12 rounded-full bg-[var(--color-light-gray)] flex items-center justify-center mb-3">
            <ImageIcon size={20} className="text-[var(--color-mid-gray)]" />
          </div>
          <p className="text-sm text-[var(--color-body-text)]">
            No assets yet. Scrape a website, browse the stock library, or paste
            an image URL to get started.
          </p>
        </div>
      )}
    </div>
  )
}
