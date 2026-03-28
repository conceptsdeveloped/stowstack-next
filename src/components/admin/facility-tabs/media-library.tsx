"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Loader2,
  Globe,
  Image as ImageIcon,
  Film,
  FileText,
  Trash2,
  ImageOff,
  Eye,
  Plus,
  Link,
  X,
} from "lucide-react"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Asset {
  id: string
  facility_id: string
  created_at: string
  type: string
  source: string
  url: string
  metadata: Record<string, unknown> | null
}

interface StockImage {
  id: string
  url: string
  alt: string
  category: string
}

interface ScrapeResult {
  images?: { url: string; alt: string }[]
  videos?: { url: string; type: string }[]
  contact?: { phones: string[]; emails: string[] }
  headings?: string[]
  pagesScraped?: number
  pagesCrawled?: string[]
  pageCopy?: string[]
  services?: { heading?: string; description?: string }[]
  promotions?: { text: string }[]
}

const STOCK_CATEGORIES = [
  "all",
  "exterior",
  "interior",
  "moving",
  "packing",
  "lifestyle",
  "vehicle",
] as const

const IMAGE_TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "photo", label: "Photos" },
  { value: "logo", label: "Logos" },
  { value: "brand", label: "Brand" },
  { value: "scrape", label: "Scraped" },
] as const

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ImageWithFallback({
  src,
  alt,
  className,
}: {
  src: string
  alt: string
  className: string
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  )

  return (
    <div className={`relative overflow-hidden rounded-lg ${className}`}>
      <div className="absolute inset-0" />

      {status === "loading" && (
        <div className="absolute inset-0 bg-[var(--color-light-gray)] animate-pulse flex items-center justify-center z-10">
          <ImageIcon size={16} className="text-[var(--color-mid-gray)]" />
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 bg-[var(--bg-elevated)] flex flex-col items-center justify-center gap-1 z-10">
          <ImageOff size={16} className="text-[var(--color-mid-gray)]" />
          <span className="text-[10px] text-[var(--color-mid-gray)]">Failed to load</span>
        </div>
      )}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          status === "loaded"
            ? "opacity-100"
            : status === "error"
              ? "hidden"
              : "opacity-0"
        }`}
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function MediaLibrary({
  facilityId,
  adminKey,
}: {
  facilityId: string
  adminKey: string
}) {
  // ---- State ----
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState("all")

  // Scraper
  const [scrapeUrl, setScrapeUrl] = useState("")
  const [scraping, setScraping] = useState(false)
  const [scrapeResult, setScrapeResult] = useState<ScrapeResult | null>(null)

  // Stock library
  const [showLibrary, setShowLibrary] = useState(false)
  const [libraryFilter, setLibraryFilter] = useState<string>("all")
  const [stockImages, setStockImages] = useState<StockImage[]>([])
  const [stockLoading, setStockLoading] = useState(false)

  // URL-based asset add
  const [addUrl, setAddUrl] = useState("")
  const [addingUrl, setAddingUrl] = useState(false)

  // Deleting state
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // ---- Data fetching ----
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

  // ---- Actions ----

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
      setAssets((prev) => prev.filter((a) => a.id !== assetId))
    } catch {
      setError('Failed to delete asset. Please try again.')
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(assetId)
        return next
      })
    }
  }

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
      if (data.asset) setAssets((prev) => [data.asset, ...prev])
    } catch {
      setError('Failed to add asset. Please check the URL and try again.')
    }
  }

  async function handleAddUrl() {
    if (!addUrl.trim()) return
    setAddingUrl(true)
    await addAssetByUrl(addUrl.trim(), "manual")
    setAddUrl("")
    setAddingUrl(false)
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
      if (data.asset) setAssets((prev) => [data.asset, ...prev])
    } catch {
      setError('Failed to add stock image. Please try again.')
    }
  }

  async function addScrapedImage(img: { url: string; alt: string }) {
    await addAssetByUrl(img.url, "website_scrape")
  }

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
      setError('Failed to load stock images. Please try again.')
    } finally {
      setStockLoading(false)
    }
  }

  async function scrapeWebsite() {
    if (!scrapeUrl.trim()) return
    setScraping(true)
    setScrapeResult(null)
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
        setScrapeResult(data)
        // Refresh assets since scraping may auto-save some
        const assetsRes = await fetch(
          `/api/facility-assets?facilityId=${facilityId}`,
          { headers: { "X-Admin-Key": adminKey } }
        )
        const assetsData = await assetsRes.json()
        if (assetsData.assets) setAssets(assetsData.assets)
      } else {
        setScrapeResult({
          images: [],
          headings: [data.error || "Scrape returned no data"],
        })
      }
    } catch {
      setScrapeResult({
        images: [],
        headings: ["Scrape request failed. Check the URL and try again."],
      })
    } finally {
      setScraping(false)
    }
  }

  // ---- Filtered assets ----
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

  // ---- Render ----

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={20} className="animate-spin text-[var(--color-gold)]" />
      </div>
    )
  }

  if (error) {
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

      {/* ---- Action bar: scraper + stock toggle + URL add ---- */}
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
            onClick={() => {
              const next = !showLibrary
              setShowLibrary(next)
              if (next && !stockImages.length) loadStockImages("all")
            }}
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

      {/* ---- Scrape results ---- */}
      {scrapeResult && (
        <div className="border border-[var(--border-subtle)] rounded-xl overflow-hidden bg-[var(--bg-elevated)]">
          <div className="px-4 py-3 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[var(--color-dark)]">
              Scraped from Website
              {scrapeResult.pagesScraped && (
                <span className="ml-2 text-xs font-normal text-[var(--color-mid-gray)]">
                  ({scrapeResult.pagesScraped} pages crawled)
                </span>
              )}
            </h4>
            <button
              onClick={() => setScrapeResult(null)}
              className="p-1 text-[var(--color-mid-gray)] hover:text-[var(--color-body-text)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          <div className="border-t border-[var(--border-subtle)] px-4 py-4 space-y-4">
            {/* Images */}
            {scrapeResult.images && scrapeResult.images.length > 0 ? (
              <>
                <p className="text-xs text-[var(--color-mid-gray)] mb-2">
                  {scrapeResult.images.length} images found
                </p>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {scrapeResult.images.slice(0, 24).map((img, i) => {
                    const alreadyAdded = assets.some((a) => a.url === img.url)
                    return (
                      <div key={i} className="relative group">
                        <ImageWithFallback
                          src={img.url}
                          alt={img.alt || ""}
                          className="h-20 w-full"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                          {alreadyAdded ? (
                            <span className="text-xs text-white font-medium">
                              Added
                            </span>
                          ) : (
                            <button
                              onClick={() => addScrapedImage(img)}
                              className="px-2 py-1 bg-[var(--color-gold)] text-[var(--color-light)] text-xs font-medium rounded hover:bg-[var(--color-gold)]/80 transition-colors"
                            >
                              + Add to Library
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : (
              <p className="text-sm text-[var(--color-mid-gray)]">
                No usable images found. The site may use JavaScript-rendered
                images that require a browser to load.
              </p>
            )}

            {/* Services */}
            {scrapeResult.services && scrapeResult.services.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                  Services / Features Found:
                </p>
                <div className="flex flex-wrap gap-2">
                  {scrapeResult.services.slice(0, 12).map((s, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-lg bg-[var(--color-light-gray)] text-[var(--color-body-text)]"
                    >
                      {s.heading || s.description?.slice(0, 60)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Promotions */}
            {scrapeResult.promotions &&
              scrapeResult.promotions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                    Promotions / Specials:
                  </p>
                  {scrapeResult.promotions.slice(0, 5).map((p, i) => (
                    <p
                      key={i}
                      className="text-xs text-[var(--color-dark)] p-2 rounded-lg mb-1 bg-[var(--color-blue)]/10"
                    >
                      {p.text}
                    </p>
                  ))}
                </div>
              )}

            {/* Page copy */}
            {scrapeResult.pageCopy && scrapeResult.pageCopy.length > 0 && (
              <details className="text-xs text-[var(--color-mid-gray)]">
                <summary className="font-medium cursor-pointer hover:underline">
                  Site Copy ({scrapeResult.pageCopy.length} paragraphs
                  extracted)
                </summary>
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {scrapeResult.pageCopy.slice(0, 20).map((t, i) => (
                    <p
                      key={i}
                      className="text-xs text-[var(--color-dark)] p-2 rounded bg-[var(--color-light-gray)]"
                    >
                      {t}
                    </p>
                  ))}
                </div>
              </details>
            )}

            {/* Videos */}
            {scrapeResult.videos && scrapeResult.videos.length > 0 && (
              <div>
                <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                  Videos found:
                </p>
                {scrapeResult.videos.map((v, i) => (
                  <a
                    key={i}
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[var(--color-gold)] hover:underline"
                  >
                    <Film size={12} /> {v.url.slice(0, 80)}...
                  </a>
                ))}
              </div>
            )}

            {/* Contact info */}
            {scrapeResult.contact &&
              (scrapeResult.contact.phones.length > 0 ||
                scrapeResult.contact.emails.length > 0) && (
                <div className="flex gap-4">
                  {scrapeResult.contact.phones.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                        Phones:
                      </p>
                      {scrapeResult.contact.phones.map((p, i) => (
                        <p key={i} className="text-xs text-[var(--color-dark)]">
                          {p}
                        </p>
                      ))}
                    </div>
                  )}
                  {scrapeResult.contact.emails.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-[var(--color-mid-gray)] mb-1">
                        Emails:
                      </p>
                      {scrapeResult.contact.emails.map((e, i) => (
                        <p key={i} className="text-xs text-[var(--color-dark)]">
                          {e}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

            {/* Pages crawled */}
            {scrapeResult.pagesCrawled &&
              scrapeResult.pagesCrawled.length > 1 && (
                <details className="text-xs text-[var(--color-mid-gray)]">
                  <summary className="font-medium cursor-pointer hover:underline">
                    Pages crawled ({scrapeResult.pagesCrawled.length})
                  </summary>
                  <div className="mt-1 space-y-0.5">
                    {scrapeResult.pagesCrawled.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[var(--color-gold)] hover:underline truncate"
                      >
                        {url}
                      </a>
                    ))}
                  </div>
                </details>
              )}
          </div>
        </div>
      )}

      {/* ---- Stock library ---- */}
      {showLibrary && (
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
      )}

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

      {/* ---- Empty state ---- */}
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

      {/* Filtered empty state */}
      {assets.length > 0 && filteredAssets.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-[var(--color-mid-gray)]">
            No assets match the selected filter.
          </p>
        </div>
      )}
    </div>
  )
}
