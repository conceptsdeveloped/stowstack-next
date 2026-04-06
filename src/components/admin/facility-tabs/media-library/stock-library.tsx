"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { ImageWithFallback } from "./image-with-fallback"
import type { Asset, StockImage } from "./types"
import { STOCK_CATEGORIES } from "./types"

interface StockLibraryProps {
  adminKey: string
  facilityId: string
  assets: Asset[]
  onAssetAdded: (asset: Asset) => void
  onError: (msg: string) => void
}

export function StockLibrary({
  adminKey,
  facilityId,
  assets,
  onAssetAdded,
  onError,
}: StockLibraryProps) {
  const [libraryFilter, setLibraryFilter] = useState<string>("all")
  const [stockImages, setStockImages] = useState<StockImage[]>([])
  const [stockLoading, setStockLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)

  async function loadStockImages(cat: string) {
    setLibraryFilter(cat)
    setStockLoading(true)
    try {
      const res = await fetch(`/api/stock-images?category=${cat}`, {
        headers: { "X-Admin-Key": adminKey },
      })
      const data = await res.json()
      if (data.images) setStockImages(data.images)
    } catch {
      onError("Failed to load stock images. Please try again.")
    } finally {
      setStockLoading(false)
    }
  }

  // Load on first render
  if (!initialized) {
    setInitialized(true)
    loadStockImages("all")
  }

  async function addStockImage(stockItem: { url: string; alt: string }) {
    try {
      const res = await fetch("/api/facility-assets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({
          facilityId,
          url: stockItem.url,
          type: "photo",
          source: "stock_library",
          metadata: { alt: stockItem.alt },
        }),
      })
      const data = await res.json()
      if (data.asset) onAssetAdded(data.asset)
    } catch {
      onError("Failed to add stock image. Please try again.")
    }
  }

  return (
    <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
      <div className="px-4 py-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-[var(--color-dark)]">
          Stock Library — Self-Storage Images
        </h4>
        <div className="flex gap-1 flex-wrap">
          {STOCK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => loadStockImages(cat)}
              className={`px-2 py-1 text-xs rounded-md transition-colors ${
                libraryFilter === cat
                  ? "bg-[var(--color-gold)] text-[var(--color-light)]"
                  : "text-[var(--color-mid-gray)] hover:bg-[var(--color-light-gray)]"
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t border-[var(--border-subtle)] px-4 py-4">
        {stockLoading ? (
          <div className="flex justify-center py-6">
            <Loader2
              size={18}
              className="animate-spin text-[var(--color-gold)]"
            />
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {stockImages.map((stock) => {
              const alreadyAdded = assets.some(
                (a) => a.url === stock.url
              )
              return (
                <div key={stock.id} className="relative group">
                  <ImageWithFallback
                    src={stock.url}
                    alt={stock.alt}
                    className="h-24 w-full"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    {alreadyAdded ? (
                      <span className="text-xs text-white font-medium">
                        Added
                      </span>
                    ) : (
                      <button
                        onClick={() => addStockImage(stock)}
                        className="px-2 py-1 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded hover:bg-[var(--color-gold)]/80 transition-colors"
                      >
                        + Add to Library
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-mid-gray)] mt-1 truncate">
                    {stock.alt}
                  </p>
                </div>
              )
            })}
            {stockImages.length === 0 && (
              <p className="col-span-6 text-center text-xs text-[var(--color-mid-gray)] py-4">
                No images found for this category.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
