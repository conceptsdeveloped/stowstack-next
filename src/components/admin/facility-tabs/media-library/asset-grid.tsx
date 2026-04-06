"use client"

import { useState } from "react"
import {
  Loader2,
  Image as ImageIcon,
  Film,
  FileText,
  Trash2,
  Eye,
} from "lucide-react"
import { ImageWithFallback } from "./image-with-fallback"
import type { Asset } from "./types"
import { IMAGE_TYPE_FILTERS } from "./types"

interface AssetGridProps {
  assets: Asset[]
  adminKey: string
  onAssetDeleted: (assetId: string) => void
  onError: (msg: string) => void
}

export function AssetGrid({
  assets,
  adminKey,
  onAssetDeleted,
  onError,
}: AssetGridProps) {
  const [typeFilter, setTypeFilter] = useState("all")
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  async function deleteAsset(assetId: string) {
    setDeletingIds((prev) => new Set(prev).add(assetId))
    try {
      await fetch("/api/facility-assets", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-Key": adminKey,
        },
        body: JSON.stringify({ assetId }),
      })
      onAssetDeleted(assetId)
    } catch {
      onError("Failed to delete asset. Please try again.")
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(assetId)
        return next
      })
    }
  }

  const filteredAssets =
    typeFilter === "all"
      ? assets
      : typeFilter === "scrape"
        ? assets.filter((a) => a.source === "website_scrape")
        : assets.filter((a) => a.type === typeFilter)

  const photos = filteredAssets.filter(
    (a) => a.type === "photo" || a.type === "logo" || a.type === "brand"
  )
  const videoAssets = filteredAssets.filter((a) => a.type === "video")
  const documents = filteredAssets.filter((a) => a.type === "document")

  return (
    <>
      {/* ---- Image type filter tabs ---- */}
      {assets.length > 0 && (
        <div className="flex items-center gap-1 border-b border-[var(--border-subtle)] pb-px">
          {IMAGE_TYPE_FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? assets.length
                : f.value === "scrape"
                  ? assets.filter((a) => a.source === "website_scrape").length
                  : assets.filter((a) => a.type === f.value).length
            if (f.value !== "all" && count === 0) return null
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  typeFilter === f.value
                    ? "border-[var(--color-gold)] text-[var(--color-dark)]"
                    : "border-transparent text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)]"
                }`}
              >
                {f.label}
                <span className="ml-1 text-[var(--color-mid-gray)]">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* ---- Asset grid ---- */}
      {filteredAssets.length > 0 && (
        <div className="space-y-6">
          {/* Photos / logos / brand */}
          {photos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ImageIcon size={15} className="text-[var(--color-mid-gray)]" />
                <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                  Images
                </h4>
                <span className="text-xs text-[var(--color-mid-gray)]">
                  ({photos.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {photos.map((asset) => (
                  <div key={asset.id} className="relative group">
                    <ImageWithFallback
                      src={asset.url}
                      alt=""
                      className="h-32 w-full"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-end p-2">
                      <div className="flex gap-1 w-full items-center">
                        <span className="flex-1 text-xs text-white/80 truncate">
                          {asset.source === "uploaded"
                            ? "Uploaded"
                            : asset.source === "website_scrape"
                              ? "Scraped"
                              : asset.source === "stock_library"
                                ? "Stock"
                                : asset.source === "manual"
                                  ? "Manual"
                                  : asset.source}
                        </span>
                        <a
                          href={asset.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 bg-[var(--color-dark)]/20 rounded hover:bg-[var(--color-dark)]/30 text-white transition-colors"
                        >
                          <Eye size={12} />
                        </a>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteAsset(asset.id)
                          }}
                          disabled={deletingIds.has(asset.id)}
                          className="p-1 bg-red-600/80 rounded hover:bg-red-600 text-white disabled:opacity-40 transition-colors"
                        >
                          {deletingIds.has(asset.id) ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Videos */}
          {videoAssets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Film size={15} className="text-[var(--color-mid-gray)]" />
                <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                  Videos
                </h4>
                <span className="text-xs text-[var(--color-mid-gray)]">
                  ({videoAssets.length})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {videoAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="relative border border-[var(--border-subtle)] rounded-lg overflow-hidden bg-[var(--bg-elevated)]"
                  >
                    <video
                      src={asset.url}
                      className="h-32 w-full object-cover"
                      preload="metadata"
                    />
                    <div className="p-2 flex items-center justify-between">
                      <span className="text-xs text-[var(--color-mid-gray)] truncate">
                        {(asset.metadata as { filename?: string })?.filename ||
                          "Video"}
                      </span>
                      <button
                        onClick={() => deleteAsset(asset.id)}
                        disabled={deletingIds.has(asset.id)}
                        className="p-1 text-red-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                      >
                        {deletingIds.has(asset.id) ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Trash2 size={12} />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {documents.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={15} className="text-[var(--color-mid-gray)]" />
                <h4 className="text-sm font-semibold text-[var(--color-dark)]">
                  Documents
                </h4>
                <span className="text-xs text-[var(--color-mid-gray)]">
                  ({documents.length})
                </span>
              </div>
              <div className="space-y-2">
                {documents.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 p-3 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-elevated)]"
                  >
                    <FileText size={18} className="text-[var(--color-mid-gray)]" />
                    <a
                      href={asset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 text-sm text-[var(--color-dark)] hover:underline truncate"
                    >
                      {(asset.metadata as { filename?: string })?.filename ||
                        "Document"}
                    </a>
                    <span className="text-xs text-[var(--color-mid-gray)]">
                      {asset.source}
                    </span>
                    <button
                      onClick={() => deleteAsset(asset.id)}
                      disabled={deletingIds.has(asset.id)}
                      className="p-1 text-red-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                    >
                      {deletingIds.has(asset.id) ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtered empty state */}
      {assets.length > 0 && filteredAssets.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--color-mid-gray)]">
            No assets match the selected filter.
          </p>
        </div>
      )}
    </>
  )
}
