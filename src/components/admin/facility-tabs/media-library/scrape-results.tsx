"use client"

import { Film, X } from "lucide-react"
import { ImageWithFallback } from "./image-with-fallback"
import type { Asset, ScrapeResult } from "./types"

interface ScrapeResultsProps {
  scrapeResult: ScrapeResult
  assets: Asset[]
  onAddScrapedImage: (img: { url: string; alt: string }) => void
  onDismiss: () => void
}

export function ScrapeResults({
  scrapeResult,
  assets,
  onAddScrapedImage,
  onDismiss,
}: ScrapeResultsProps) {
  return (
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
          onClick={onDismiss}
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
                          onClick={() => onAddScrapedImage(img)}
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
  )
}
